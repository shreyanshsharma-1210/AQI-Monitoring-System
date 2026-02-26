from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, text
from typing import List, Optional
import json
import httpx
from api.core.db import get_db
from api.models.aqi import City, Station, StationAQIHistory
from pydantic import BaseModel

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class CitySchema(BaseModel):
    id: int
    display_name: str
    lat: float
    lon: float
    class Config:
        from_attributes = True

class StationSchema(BaseModel):
    id: int
    city_id: int
    station_name: str
    waqi_station_id: str
    lat: Optional[float]
    lon: Optional[float]
    class Config:
        from_attributes = True

# ── Cities ───────────────────────────────────────────────────────────────────

@router.get("/cities", response_model=List[CitySchema])
async def get_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(City))
    return result.scalars().all()

# ── City latest AQI (aggregate of all stations) ───────────────────────────────

@router.get("/cities/{city_id}/latest")
async def get_latest_aqi(city_id: int, db: AsyncSession = Depends(get_db)):
    stations_result = await db.execute(select(Station).where(Station.city_id == city_id))
    stations = stations_result.scalars().all()
    if not stations:
        raise HTTPException(status_code=404, detail="City or stations not found")

    latest_data = []
    for station in stations:
        history_result = await db.execute(
            select(StationAQIHistory)
            .where(StationAQIHistory.station_id == station.id, StationAQIHistory.diff == 1)
            .order_by(desc(StationAQIHistory.time))
            .limit(1)
        )
        history = history_result.scalar_one_or_none()
        if history:
            latest_data.append({
                "station_id": station.id,
                "station_name": station.station_name,
                "aqi": history.aqi,
                "pm25": history.pm25,
                "pm10": history.pm10,
                "no2": history.no2,
                "o3": history.o3,
                "co": history.co,
                "so2": history.so2,
                "health_category": history.health_category,
                "recorded_at": history.recorded_at,
                "lat": station.lat,
                "lon": station.lon,
            })

    return latest_data

# ── City AQI summary (single number — avg across active stations) ─────────────

@router.get("/cities/{city_id}/summary")
async def get_city_summary(city_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    # Try Redis first for sub-second response
    try:
        redis = request.app.state.redis
        # Collect latest per-station data from redis
        stations_result = await db.execute(select(Station).where(Station.city_id == city_id))
        stations = stations_result.scalars().all()
        if not stations:
            raise HTTPException(status_code=404, detail="City not found")

        readings = []
        for s in stations:
            raw = await redis.get(f"station:{s.id}:latest")
            if raw:
                readings.append(json.loads(raw))

        if readings:
            avg_aqi = sum(r["aqi"] for r in readings) / len(readings)
            # Take weather from the first station that has it
            weather_station = next((r for r in readings if r.get("temp")), readings[0])
            return {
                "city_id": city_id,
                "aqi": round(avg_aqi),
                "station_count": len(readings),
                "health_category": _classify(avg_aqi),
                "temp": weather_station.get("temp", 0),
                "feels_like": weather_station.get("feels_like", 0),
                "humidity": weather_station.get("humidity", 0),
                "wind_speed": weather_station.get("wind_speed", 0),
                "uv_index": weather_station.get("uv_index", 0),
                "precip_prob": weather_station.get("precip_prob", 0),
                "forecast_aqi_24h": weather_station.get("forecast_aqi_24h", "[]"),
                "stations": readings,
            }
    except Exception:
        pass

    # Fallback: DB query
    stations_result = await db.execute(select(Station).where(Station.city_id == city_id))
    stations = stations_result.scalars().all()
    if not stations:
        raise HTTPException(status_code=404, detail="City not found")

    latest_data = []
    for station in stations:
        history_result = await db.execute(
            select(StationAQIHistory)
            .where(StationAQIHistory.station_id == station.id, StationAQIHistory.diff == 1)
            .order_by(desc(StationAQIHistory.time))
            .limit(1)
        )
        h = history_result.scalar_one_or_none()
        if h:
            latest_data.append({
                "station_id": station.id,
                "station_name": station.station_name,
                "aqi": h.aqi or 0,
                "pm25": h.pm25 or 0,
                "pm10": h.pm10 or 0,
                "no2": h.no2 or 0,
                "o3": h.o3 or 0,
                "co": h.co or 0,
                "so2": h.so2 or 0,
                "health_category": h.health_category or "",
                "temp": h.temp or 0,
                "feels_like": 0,
                "humidity": h.humidity or 0,
                "wind_speed": h.wind_speed or 0,
                "uv_index": h.uv_index or 0,
                "precip_prob": h.precip_prob or 0,
                "forecast_aqi_24h": h.forecast_aqi_24h or "[]",
                "lat": station.lat or 0,
                "lon": station.lon or 0,
            })

    if not latest_data:
        raise HTTPException(status_code=404, detail="No data yet for this city")

    avg_aqi = sum(r["aqi"] for r in latest_data) / len(latest_data)
    ref = latest_data[0]
    return {
        "city_id": city_id,
        "aqi": round(avg_aqi),
        "station_count": len(latest_data),
        "health_category": _classify(avg_aqi),
        "temp": ref["temp"],
        "feels_like": ref["feels_like"],
        "humidity": ref["humidity"],
        "wind_speed": ref["wind_speed"],
        "uv_index": ref["uv_index"],
        "precip_prob": ref["precip_prob"],
        "forecast_aqi_24h": ref["forecast_aqi_24h"],
        "stations": latest_data,
    }

# ── Stations for a city ───────────────────────────────────────────────────────

@router.get("/cities/{city_id}/stations")
async def get_city_stations(city_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    stations_result = await db.execute(select(Station).where(Station.city_id == city_id))
    stations = stations_result.scalars().all()
    if not stations:
        raise HTTPException(status_code=404, detail="No stations for this city")

    try:
        redis = request.app.state.redis
        out = []
        for s in stations:
            raw = await redis.get(f"station:{s.id}:latest")
            if raw:
                d = json.loads(raw)
                out.append({
                    "id": s.id, "station_name": s.station_name,
                    "lat": s.lat, "lon": s.lon,
                    "aqi": d.get("aqi", 0),
                    "pm25": d.get("pm25", 0), "pm10": d.get("pm10", 0),
                    "health_category": d.get("health_category", ""),
                })
            else:
                out.append({"id": s.id, "station_name": s.station_name,
                             "lat": s.lat, "lon": s.lon, "aqi": None,
                             "pm25": None, "pm10": None, "health_category": None})
        return out
    except Exception:
        pass

    # DB fallback
    out = []
    for s in stations:
        h_result = await db.execute(
            select(StationAQIHistory)
            .where(StationAQIHistory.station_id == s.id, StationAQIHistory.diff == 1)
            .order_by(desc(StationAQIHistory.time)).limit(1)
        )
        h = h_result.scalar_one_or_none()
        out.append({
            "id": s.id, "station_name": s.station_name, "lat": s.lat, "lon": s.lon,
            "aqi": h.aqi if h else None,
            "pm25": h.pm25 if h else None,
            "pm10": h.pm10 if h else None,
            "health_category": h.health_category if h else None,
        })
    return out

# ── Station history (for drill-down chart) ────────────────────────────────────

@router.get("/stations/{station_id}/history")
async def get_station_history(station_id: int, limit: int = 48, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StationAQIHistory)
        .where(StationAQIHistory.station_id == station_id, StationAQIHistory.diff == 1)
        .order_by(desc(StationAQIHistory.time))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "time": r.time,
            "recorded_at": r.recorded_at,
            "aqi": r.aqi, "pm25": r.pm25, "pm10": r.pm10,
            "no2": r.no2, "o3": r.o3, "co": r.co, "so2": r.so2,
            "health_category": r.health_category,
        }
        for r in reversed(rows)
    ]

# ── Weather (Redis cache → OpenMeteo fallback) ────────────────────────────────

@router.get("/cities/{city_id}/weather")
async def get_weather(city_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    # Redis cache hit
    try:
        redis = request.app.state.redis
        raw = await redis.get(f"weather:{city_id}")
        if raw:
            return json.loads(raw)
    except Exception:
        pass

    # Fallback: fetch from OpenMeteo directly
    city_result = await db.execute(select(City).where(City.id == city_id))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    async with httpx.AsyncClient() as client:
        try:
            w = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": city.lat, "longitude": city.lon,
                    "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,"
                               "precipitation_probability,uv_index,apparent_temperature",
                    "timezone": "auto",
                },
                timeout=8,
            )
            aq = await client.get(
                "https://air-quality-api.open-meteo.com/v1/air-quality",
                params={
                    "latitude": city.lat, "longitude": city.lon,
                    "hourly": "european_aqi",
                    "forecast_days": 2, "timezone": "auto",
                },
                timeout=8,
            )
            cur = w.json().get("current", {})
            forecast = aq.json().get("hourly", {}).get("european_aqi", [])[:24]
            return {
                "city_id": city_id,
                "temp": cur.get("temperature_2m", 0),
                "feels_like": cur.get("apparent_temperature", 0),
                "humidity": cur.get("relative_humidity_2m", 0),
                "wind_speed": cur.get("wind_speed_10m", 0),
                "uv_index": cur.get("uv_index", 0),
                "precip_prob": cur.get("precipitation_probability", 0),
                "forecast_aqi_24h": json.dumps(forecast),
            }
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Weather fetch failed: {e}")

# ── Pollutant history for a city ─────────────────────────────────────────────

@router.get("/cities/{city_id}/pollutant/{pollutant}")
async def get_pollutant_history(
    city_id: int, pollutant: str, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    valid = {"pm25", "pm10", "no2", "o3", "co", "so2", "aqi"}
    if pollutant not in valid:
        raise HTTPException(status_code=400, detail=f"pollutant must be one of {valid}")
    col = getattr(StationAQIHistory, pollutant)
    result = await db.execute(
        select(StationAQIHistory.time, StationAQIHistory.recorded_at, col)
        .where(StationAQIHistory.city_id == city_id, StationAQIHistory.diff == 1)
        .order_by(desc(StationAQIHistory.time))
        .limit(limit)
    )
    rows = result.all()
    return [{"time": r[0], "recorded_at": r[1], "value": r[2]} for r in reversed(rows)]

# ── Health recommendation ─────────────────────────────────────────────────────

@router.get("/health-recommendation")
async def get_health_rec(aqi: int, age: int = 25, condition: str = "none"):
    recommendations = []
    risk = "Low"

    if aqi <= 50:
        recommendations.append("Air quality is ideal for all outdoor activities.")
    elif aqi <= 100:
        recommendations.append("Air quality is acceptable.")
        if condition != "none":
            recommendations.append("Sensitive groups should reduce prolonged outdoor exertion.")
        risk = "Moderate"
    elif aqi <= 150:
        recommendations.append("Sensitive groups may experience health effects.")
        recommendations.append("Wear a mask (N95) if spending extended time outdoors.")
        risk = "Moderate"
    elif aqi <= 200:
        recommendations.append("Everyone may experience health effects.")
        recommendations.append("Sensitive groups should stay indoors and wear a mask outdoors.")
        risk = "High"
    elif aqi <= 300:
        recommendations.append("Very unhealthy. Avoid all outdoor activities.")
        recommendations.append("Use an air purifier indoors.")
        risk = "Very High"
    else:
        recommendations.append("Hazardous. Remain indoors with windows sealed.")
        recommendations.append("Only go outside if absolutely necessary — wear N95 mask.")
        risk = "Hazardous"

    if age > 65 and aqi > 100:
        recommendations.append("Elderly individuals should take extra precautions.")
    if age < 12 and aqi > 100:
        recommendations.append("Keep children indoors during this period.")

    return {"aqi": aqi, "recommendations": recommendations, "risk_level": risk}

# ── Helper ────────────────────────────────────────────────────────────────────

def _classify(aqi: float) -> str:
    if aqi <= 50:    return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    else:            return "Hazardous"
