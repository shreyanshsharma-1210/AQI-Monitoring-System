"""
api/routes/rankings.py — City weather & AQI ranking endpoints
Returns latest temperature/AQI per city, suitable for leaderboard-style views.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from api.core.db import get_db

router = APIRouter(prefix="/rankings", tags=["rankings"])


# ── Weather Rankings ──────────────────────────────────────────────────────────

@router.get("/weather")
async def weather_rankings(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the most recent temperature reading per city, sorted hottest first.
    Client can reverse the list for coldest ranking.
    """
    result = await db.execute(
        text("""
            SELECT DISTINCT ON (h.city_id)
                h.city_id,
                cr.display_name AS city,
                cr.country_code,
                h.temp,
                h.humidity,
                h.wind_speed,
                h.uv_index,
                h.aqi,
                h.health_category,
                h.recorded_at
            FROM station_aqi_history h
            JOIN city_registry cr ON cr.id = h.city_id
            WHERE h.temp IS NOT NULL
              AND h.temp <> 0
              AND h.diff = 1
            ORDER BY h.city_id, h.recorded_at DESC NULLS LAST
        """)
    )
    rows = result.mappings().all()

    # Sort hottest first, then trim to limit
    sorted_rows = sorted(rows, key=lambda r: r["temp"] or 0, reverse=True)[:limit]
    return [dict(r) for r in sorted_rows]


# ── AQI Rankings ─────────────────────────────────────────────────────────────

@router.get("/aqi")
async def aqi_rankings(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the most recent AQI reading per city, sorted most-polluted first.
    Client reverses for cleanest ranking.
    """
    result = await db.execute(
        text("""
            SELECT DISTINCT ON (h.city_id)
                h.city_id,
                cr.display_name AS city,
                cr.country_code,
                h.aqi,
                h.health_category,
                h.pm25,
                h.pm10,
                h.no2,
                h.o3,
                h.recorded_at
            FROM station_aqi_history h
            JOIN city_registry cr ON cr.id = h.city_id
            WHERE h.aqi IS NOT NULL
              AND h.diff = 1
            ORDER BY h.city_id, h.recorded_at DESC NULLS LAST
        """)
    )
    rows = result.mappings().all()

    sorted_rows = sorted(rows, key=lambda r: r["aqi"] or 0, reverse=True)[:limit]
    return [dict(r) for r in sorted_rows]

