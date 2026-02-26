"""
seed_historical.py — Backfills 2–3 years of daily AQI data for all cities.

Since WAQI's free tier does not provide a historical endpoint, this script
generates statistically realistic synthetic data derived from each city's
known pollution profile, seasonal patterns, and day/night variation.

Usage (from project root):
    docker compose exec api python data/seed_historical.py
  or locally:
    cd backend && python data/seed_historical.py
"""

import os
import random
import math
import psycopg2
from datetime import datetime, timedelta, timezone

# ── Connection ────────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://aqi_user:secret@localhost:5432/aqi_db",
).replace("postgresql+asyncpg://", "postgresql://")

# ── City AQI profiles (base AQI + seasonal & hourly modifiers) ────────────────
# Each entry: (base_aqi, winter_mult, summer_mult, monsoon_mult)
# Winter = Dec-Feb, Summer = Mar-Jun, Monsoon = Jul-Sep, Post = Oct-Nov
CITY_PROFILES = {
    "New Delhi":      (180, 1.8, 0.9, 0.55, 1.2),
    "Mumbai":         (95,  1.1, 1.0, 0.6,  1.0),
    "Bengaluru":      (75,  1.0, 1.1, 0.7,  0.95),
    "Kolkata":        (130, 1.5, 1.0, 0.6,  1.1),
    "Chennai":        (80,  1.1, 1.2, 0.65, 1.0),
    "Hyderabad":      (90,  1.1, 1.15, 0.65, 1.0),
    "Ahmedabad":      (120, 1.3, 1.1, 0.55, 1.1),
    "Pune":           (85,  1.1, 1.0, 0.65, 0.95),
    "Jaipur":         (140, 1.5, 1.2, 0.5,  1.1),
    "Lucknow":        (160, 1.7, 0.95, 0.55, 1.2),
    "Kanpur":         (170, 1.75, 0.95, 0.5, 1.2),
    "Nagpur":         (110, 1.2, 1.15, 0.6,  1.05),
    "Patna":          (155, 1.65, 0.9, 0.55, 1.15),
    "Agra":           (150, 1.6, 1.0, 0.52, 1.15),
    "Varanasi":       (145, 1.6, 0.95, 0.55, 1.1),
    "Amritsar":       (155, 1.7, 0.9, 0.5,  1.15),
    "Chandigarh":     (120, 1.4, 0.95, 0.55, 1.1),
    "Bhopal":         (105, 1.2, 1.1, 0.6,  1.0),
    "Indore":         (100, 1.2, 1.1, 0.6,  1.0),
    "Surat":          (110, 1.2, 1.1, 0.6,  1.05),
    "Visakhapatnam":  (85,  1.0, 1.15, 0.7,  1.0),
    "Kochi":          (55,  0.9, 1.0, 0.75, 0.9),
    "Bhubaneswar":    (95,  1.15, 1.1, 0.6,  1.0),
    "Jodhpur":        (135, 1.4, 1.3, 0.5,  1.1),
    "Coimbatore":     (65,  0.95, 1.05, 0.7, 0.9),
    "Guwahati":       (90,  1.15, 1.0, 0.65, 1.0),
    "Raipur":         (115, 1.25, 1.15, 0.6,  1.05),
    "Ranchi":         (100, 1.2, 1.1, 0.6,  1.0),
    "Ghaziabad":      (185, 1.85, 0.9, 0.5,  1.25),
    "Noida":          (175, 1.8, 0.9, 0.52, 1.2),
    "Faridabad":      (170, 1.75, 0.9, 0.52, 1.2),
    "Gurugram":       (165, 1.75, 0.9, 0.52, 1.2),
    "Meerut":         (160, 1.7, 0.9, 0.52, 1.2),
    "Rajkot":         (105, 1.2, 1.15, 0.55, 1.05),
    "Vadodara":       (110, 1.25, 1.1, 0.55, 1.05),
    "Nashik":         (90,  1.1, 1.0, 0.65, 0.95),
    "Aurangabad":     (100, 1.2, 1.1, 0.6,  1.0),
    "Dhanbad":        (155, 1.6, 1.1, 0.6,  1.15),
    "Allahabad":      (150, 1.65, 0.95, 0.55, 1.15),
    "Ludhiana":       (150, 1.65, 0.9, 0.52, 1.15),
}


def seasonal_mult(profile_tuple, month: int) -> float:
    """Returns seasonal multiplier for a given month (1–12)."""
    _, winter, summer, monsoon, post = profile_tuple
    if month in (12, 1, 2):
        return winter
    elif month in (3, 4, 5, 6):
        return summer
    elif month in (7, 8, 9):
        return monsoon
    else:  # 10, 11
        return post


def hourly_mult(hour: int) -> float:
    """Rush hours (7–10 AM, 5–9 PM) are worse; deep night is cleanest."""
    if 7 <= hour <= 10:
        return 1.3
    elif 17 <= hour <= 21:
        return 1.25
    elif 2 <= hour <= 5:
        return 0.75
    else:
        return 1.0


def classify_aqi(aqi: float) -> str:
    if aqi <= 50:    return "Good"
    elif aqi <= 100: return "Moderate"
    elif aqi <= 150: return "Unhealthy for Sensitive Groups"
    elif aqi <= 200: return "Unhealthy"
    elif aqi <= 300: return "Very Unhealthy"
    else:            return "Hazardous"


def generate_day_readings(city_name: str, station_id: int, city_id: int,
                           date: datetime.date, readings_per_day: int = 4) -> list:
    """Generate `readings_per_day` synthetic hourly rows for a given date."""
    profile = CITY_PROFILES.get(city_name)
    if not profile:
        return []

    base, *_ = profile
    s_mult = seasonal_mult(profile, date.month)

    rows = []
    hours = [0, 6, 12, 18] if readings_per_day == 4 else list(range(0, 24, 24 // readings_per_day))

    for hour in hours:
        h_mult = hourly_mult(hour)
        aqi = base * s_mult * h_mult * random.uniform(0.80, 1.20)
        aqi = max(5.0, min(500.0, aqi))

        pm25  = aqi * random.uniform(0.35, 0.55)
        pm10  = aqi * random.uniform(0.55, 0.80)
        no2   = aqi * random.uniform(0.05, 0.15)
        o3    = aqi * random.uniform(0.03, 0.10)
        co    = aqi * random.uniform(0.01, 0.04)
        so2   = aqi * random.uniform(0.02, 0.06)

        # Synthetic temperature: India range roughly 8–45°C with seasonal swing
        base_temp = 15 + 15 * math.sin((date.month - 4) * math.pi / 6)
        temp = base_temp + random.uniform(-3.0, 3.0)

        dt = datetime(date.year, date.month, date.day, hour, tzinfo=timezone.utc)
        recorded_at = dt.isoformat()
        unix_time   = int(dt.timestamp())

        rows.append((
            city_id, station_id,
            round(aqi, 1), round(pm25, 2), round(pm10, 2),
            round(no2, 2), round(o3, 2), round(co, 3), round(so2, 2),
            classify_aqi(aqi),
            round(temp, 1),
            random.randint(30, 85),          # humidity
            round(random.uniform(2, 25), 1), # wind_speed
            round(random.uniform(0, 11), 1), # uv_index
            random.randint(0, 60),           # precip_prob
            recorded_at,
            unix_time,
            1,  # diff
        ))

    return rows


def main():
    days_back = int(os.environ.get("SEED_DAYS", "730"))  # 2 years default
    print(f"Connecting to DB …")
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()

    # Load cities + their first station per city
    cur.execute("""
        SELECT cr.id, cr.display_name, cs.id AS station_id
        FROM city_registry cr
        LEFT JOIN LATERAL (
            SELECT id FROM city_stations
            WHERE city_id = cr.id ORDER BY id LIMIT 1
        ) cs ON TRUE
    """)
    cities = cur.fetchall()
    print(f"Found {len(cities)} cities.")

    today    = datetime.utcnow().date()
    start    = today - timedelta(days=days_back)
    total    = 0
    BATCH    = 500

    INSERT_SQL = """
        INSERT INTO station_aqi_history
            (city_id, station_id, aqi, pm25, pm10, no2, o3, co, so2,
             health_category, temp, humidity, wind_speed, uv_index, precip_prob,
             recorded_at, time, diff)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT DO NOTHING
    """

    for city_id, city_name, station_id in cities:
        if station_id is None:
            print(f"  ⚠ {city_name}: no station, skipping.")
            continue

        print(f"  Seeding {city_name} (city_id={city_id}, station_id={station_id}) …", end=" ", flush=True)
        batch = []
        d = start
        while d <= today:
            batch.extend(generate_day_readings(city_name, station_id, city_id, d, readings_per_day=4))
            if len(batch) >= BATCH:
                cur.executemany(INSERT_SQL, batch)
                conn.commit()
                total += len(batch)
                batch = []
            d += timedelta(days=1)

        if batch:
            cur.executemany(INSERT_SQL, batch)
            conn.commit()
            total += len(batch)
        print("done")

    cur.close()
    conn.close()
    print(f"\n✅ Seeded {total:,} rows across {len(cities)} cities ({days_back} days back).")


if __name__ == "__main__":
    main()
