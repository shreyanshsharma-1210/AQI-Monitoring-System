import pathway as pw
import httpx
import asyncio
import time
from datetime import datetime
from pathway_pipeline.city_loader import load_stations

class WAQIStationConnectorSubject(pw.io.python.ConnectorSubject):
    def __init__(self, token, interval=900):
        super().__init__()
        self.stations = load_stations()
        self.token = token
        self.interval = interval

    async def fetch_station(self, client, semaphore, station):
        url = f"https://api.waqi.info/feed/{station['waqi_station_id']}/?token={self.token}"
        async with semaphore:
            try:
                resp = await client.get(url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "ok":
                        d = data["data"]
                        iaqi = d.get("iaqi", {})
                        
                        return {
                            "city_id": station["city_id"],
                            "station_id": station["id"],
                            "city": station["station_name"],
                            "aqi": float(d.get("aqi", 0) if str(d.get("aqi", 0)).isdigit() else 0),
                            "pm25": float(iaqi.get("pm25", {}).get("v", 0.0)),
                            "pm10": float(iaqi.get("pm10", {}).get("v", 0.0)),
                            "no2": float(iaqi.get("no2", {}).get("v", 0.0)),
                            "o3": float(iaqi.get("o3", {}).get("v", 0.0)),
                            "co": float(iaqi.get("co", {}).get("v", 0.0)),
                            "so2": float(iaqi.get("so2", {}).get("v", 0.0)),
                            "lat": float(station["lat"]) if station["lat"] else 0.0,
                            "lon": float(station["lon"]) if station["lon"] else 0.0,
                            "timestamp": d.get("time", {}).get("iso", datetime.utcnow().isoformat()),
                        }
            except Exception as e:
                print(f"[WAQIStation] Error fetching {station['waqi_station_id']}: {e}")
        return None

    async def poll_all(self):
        semaphore = asyncio.Semaphore(10)
        async with httpx.AsyncClient() as client:
            tasks = [self.fetch_station(client, semaphore, s) for s in self.stations]
            results = await asyncio.gather(*tasks)
            for res in results:
                if res is not None:
                    self.next_json(res)

    def run(self):
        while True:
            try:
                # Reload stations just in case new ones were added
                self.stations = load_stations()
                asyncio.run(self.poll_all())
            except Exception as e:
                print(f"[WAQIStation] Polling cycle error: {e}")
            time.sleep(self.interval)
