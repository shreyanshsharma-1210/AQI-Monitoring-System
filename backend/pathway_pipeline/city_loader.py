import psycopg2
import os
from contextlib import closing

def get_db_url():
    return os.environ.get("DATABASE_URL", "postgresql://aqi_user:secret@localhost:5432/aqi_db")

def load_cities():
    """Reads all active cities from city_registry."""
    with closing(psycopg2.connect(get_db_url())) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, display_name, waqi_slug, lat, lon FROM city_registry")
            rows = cur.fetchall()
            return [{"id": r[0], "display_name": r[1], "waqi_slug": r[2], "lat": r[3], "lon": r[4]} for r in rows]

def load_stations():
    """Reads all monitoring stations from city_stations."""
    with closing(psycopg2.connect(get_db_url())) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT s.id, s.city_id, s.station_name, s.waqi_station_id, s.lat, s.lon "
                "FROM city_stations s"
            )
            rows = cur.fetchall()
            return [
                {"id": r[0], "city_id": r[1], "station_name": r[2],
                 "waqi_station_id": r[3], "lat": r[4], "lon": r[5]}
                for r in rows
            ]
