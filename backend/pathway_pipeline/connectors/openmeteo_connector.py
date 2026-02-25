import pathway as pw
import httpx
import asyncio
import time
import json
from pathway_pipeline.city_loader import load_cities
from datetime import datetime

class OpenMeteoConnectorSubject(pw.io.python.ConnectorSubject):
    def __init__(self, interval=900):
        super().__init__()
        self.cities = load_cities()
        self.interval = interval

    async def fetch_weather(self, client, semaphore, city):
        async with semaphore:
            try:
                # Current weather
                w_resp = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": city["lat"], "longitude": city["lon"],
                        "current": "temperature_2m,relative_humidity_2m,"
                                   "wind_speed_10m,precipitation_probability,"
                                   "uv_index,apparent_temperature",
                        "timezone": "auto",
                    },
                    timeout=10,
                )
                
                # 3-day AQI forecast from CAMS model
                aq_resp = await client.get(
                    "https://air-quality-api.open-meteo.com/v1/air-quality",
                    params={
                        "latitude": city["lat"], "longitude": city["lon"],
                        "hourly": "pm2_5,pm10,nitrogen_dioxide,ozone,european_aqi",
                        "forecast_days": 3, "timezone": "auto",
                    },
                    timeout=10,
                )
                
                if w_resp.status_code == 200 and aq_resp.status_code == 200:
                    w = w_resp.json()
                    aq = aq_resp.json()
                    current = w.get("current", {})
                    forecast_24h = aq.get("hourly", {}).get("european_aqi", [])[:24]
                    
                    return {
                        "city_id": city["id"],
                        "city": city["display_name"],
                        "lat": float(city["lat"]),
                        "lon": float(city["lon"]),
                        "temp": float(current.get("temperature_2m", 0.0) or 0.0),
                        "feels_like": float(current.get("apparent_temperature", 0.0) or 0.0),
                        "humidity": int(current.get("relative_humidity_2m", 0) or 0),
                        "wind_speed": float(current.get("wind_speed_10m", 0.0) or 0.0),
                        "uv_index": float(current.get("uv_index", 0.0) or 0.0),
                        "precip_prob": int(current.get("precipitation_probability", 0) or 0),
                        "forecast_aqi_24h": json.dumps(forecast_24h),
                        "timestamp": current.get("time", datetime.utcnow().isoformat())
                    }
            except Exception as e:
                print(f"[OpenMeteo] Error fetching {city['display_name']}: {e}")
        return None

    async def poll_all(self):
        semaphore = asyncio.Semaphore(10)
        async with httpx.AsyncClient() as client:
            tasks = [self.fetch_weather(client, semaphore, c) for c in self.cities]
            results = await asyncio.gather(*tasks)
            for res in results:
                if res is not None:
                    self.next_json(res)

    def run(self):
        while True:
            try:
                self.cities = load_cities()
                asyncio.run(self.poll_all())
            except Exception as e:
                print(f"[OpenMeteo] Polling cycle error: {e}")
            time.sleep(self.interval)
