import os
import sys
import json
from pathlib import Path

# Provide absolute path to backend to resolve relative imports
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import pathway as pw
import redis
from pathway_pipeline.connectors.waqi_station_connector import WAQIStationConnectorSubject
from pathway_pipeline.connectors.openmeteo_connector import OpenMeteoConnectorSubject
from pathway_pipeline.schemas import StationAQISchema, WeatherSchema

# Settings
WAQI_TOKEN = os.environ.get("WAQI_API_KEY")
INTERVAL = int(os.environ.get("AQI_POLL_INTERVAL_S", 180))

# ── 1. Ingest via ConnectorSubjects ───────────────────────────────────────────────────────────
station_table = pw.io.python.read(
    WAQIStationConnectorSubject(token=WAQI_TOKEN, interval=INTERVAL), 
    schema=StationAQISchema,
    autocommit_duration_ms=1000
)

weather_table = pw.io.python.read(
    OpenMeteoConnectorSubject(interval=INTERVAL), 
    schema=WeatherSchema,
    autocommit_duration_ms=1000
)

# ── 2. Join on city_id ────────────────────────────────────────────────────────
# LEFT JOIN: keeps station rows even if weather details hasn't arrived
combined = station_table.join(
    weather_table,
    pw.left.city_id == pw.right.city_id,
    how=pw.JoinMode.LEFT
).select(
    city_id=pw.left.city_id,
    station_id=pw.left.station_id,
    city=pw.left.city,
    aqi=pw.left.aqi,
    pm25=pw.left.pm25,
    pm10=pw.left.pm10,
    no2=pw.left.no2,
    o3=pw.left.o3,
    co=pw.left.co,
    so2=pw.left.so2,
    lat=pw.left.lat,
    lon=pw.left.lon,
    recorded_at=pw.left.timestamp,
    temp=pw.right.temp,
    feels_like=pw.right.feels_like,
    humidity=pw.right.humidity,
    wind_speed=pw.right.wind_speed,
    uv_index=pw.right.uv_index,
    precip_prob=pw.right.precip_prob,
    forecast_aqi_24h=pw.right.forecast_aqi_24h,
)

# ── 3. Enrich: classify AQI ───────────────────────────────────────────────────
@pw.udf
def classify_aqi(aqi: float) -> str:
    if aqi <= 50:    return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    else:            return "Hazardous"

enriched = combined.select(
    *pw.this,
    health_category=classify_aqi(pw.this.aqi)
)

# ── 4. Outputs & Deduplication ─────────────────────────────────────────────────
PG_SETTINGS = {
    "host":     os.environ.get("PGHOST",     "postgres"),
    "port":     os.environ.get("PGPORT",     "5432"),
    "dbname":   os.environ.get("PGDATABASE", "aqi_db"),
    "user":     os.environ.get("PGUSER",     "aqi_user"),
    "password": os.environ.get("PGPASSWORD", "secret"),
}

# Write full enriched record to Postgres
pw.io.postgres.write(
    enriched.select(
        city_id=pw.this.city_id,
        station_id=pw.this.station_id,
        aqi=pw.this.aqi,
        pm25=pw.this.pm25,
        pm10=pw.this.pm10,
        no2=pw.this.no2,
        o3=pw.this.o3,
        co=pw.this.co,
        so2=pw.this.so2,
        lat=pw.this.lat,
        lon=pw.this.lon,
        health_category=pw.this.health_category,
        temp=pw.this.temp,
        humidity=pw.this.humidity,
        wind_speed=pw.this.wind_speed,
        uv_index=pw.this.uv_index,
        precip_prob=pw.this.precip_prob,
        forecast_aqi_24h=pw.this.forecast_aqi_24h,
        recorded_at=pw.this.recorded_at,
    ),
    PG_SETTINGS,
    "station_aqi_history"
)

# Redis Sink
redis_host = os.environ.get("REDIS_URL", "redis://localhost:6379").replace("redis://", "").split(":")[0]
r = redis.Redis(host=redis_host, port=6379, db=0)

class RedisPublisherObserver(pw.io.python.ConnectorObserver):
    def on_change(self, key, row, time, is_addition):
        if is_addition:
            try:
                city_id = int(row.get("city_id", 0) or 0)
                record = {
                    "city_id": city_id,
                    "station_id": int(row.get("station_id", 0) or 0),
                    "city": str(row.get("city", "")),
                    "aqi": int(row.get("aqi", 0) or 0),
                    "pm25": float(row.get("pm25") or 0.0),
                    "pm10": float(row.get("pm10") or 0.0),
                    "no2": float(row.get("no2") or 0.0),
                    "o3": float(row.get("o3") or 0.0),
                    "co": float(row.get("co") or 0.0),
                    "so2": float(row.get("so2") or 0.0),
                    "health_category": str(row.get("health_category", "")),
                    "temp": float(row.get("temp") or 0.0),
                    "feels_like": float(row.get("feels_like") or 0.0),
                    "humidity": int(row.get("humidity", 0) or 0),
                    "wind_speed": float(row.get("wind_speed") or 0.0),
                    "uv_index": float(row.get("uv_index") or 0.0),
                    "precip_prob": int(row.get("precip_prob", 0) or 0),
                    "forecast_aqi_24h": row.get("forecast_aqi_24h") or "[]",
                    "lat": float(row.get("lat") or 0.0),
                    "lon": float(row.get("lon") or 0.0)
                }
                # Pub/sub for real-time broadcast
                r.publish('aqi:live', json.dumps(record))
                # Cache latest station reading keyed by station_id
                r.setex(f'station:{record["station_id"]}:latest', 1800, json.dumps(record))
                # Cache city-level weather by city_id (overwrite per cycle — last station wins but weather is per city)
                weather = {
                    "city_id": city_id,
                    "temp": record["temp"],
                    "feels_like": record["feels_like"],
                    "humidity": record["humidity"],
                    "wind_speed": record["wind_speed"],
                    "uv_index": record["uv_index"],
                    "precip_prob": record["precip_prob"],
                    "forecast_aqi_24h": record["forecast_aqi_24h"],
                }
                r.setex(f'weather:{city_id}', 1800, json.dumps(weather))
            except Exception as e:
                print(f"Failed to publish to redis: {e}")
            
    def next_json(self, value): 
        pass
    def next_tabular(self, values): 
        pass
    def request_resume(self): 
        pass

# This will trigger on updates
pw.io.python.write(
    enriched.select(
        city_id=pw.this.city_id,
        station_id=pw.this.station_id,
        city=pw.this.city,
        aqi=pw.this.aqi,
        pm25=pw.this.pm25,
        pm10=pw.this.pm10,
        no2=pw.this.no2,
        o3=pw.this.o3,
        co=pw.this.co,
        so2=pw.this.so2,
        health_category=pw.this.health_category,
        temp=pw.this.temp,
        feels_like=pw.this.feels_like,
        humidity=pw.this.humidity,
        wind_speed=pw.this.wind_speed,
        uv_index=pw.this.uv_index,
        precip_prob=pw.this.precip_prob,
        forecast_aqi_24h=pw.this.forecast_aqi_24h,
        lat=pw.this.lat,
        lon=pw.this.lon,
    ),
    RedisPublisherObserver()
)

pw.run()

if __name__ == "__main__":
    pw.run()
