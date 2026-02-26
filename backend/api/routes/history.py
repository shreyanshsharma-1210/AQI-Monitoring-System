"""
api/routes/history.py — Historical AQI analysis endpoints
Provides monthly year-over-year overlay, day/night trend, and date-range stats.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from api.core.db import get_db

router = APIRouter(prefix="/history", tags=["history"])


# ── Monthly Year-over-Year data ───────────────────────────────────────────────

@router.get("/city/{city_id}/monthly")
async def monthly_history(
    city_id: int,
    month: int = Query(..., ge=1, le=12, description="Month number 1–12"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily AQI for the given month across all available years.
    Used for the year-over-year overlay chart.
    """
    result = await db.execute(
        text("""
            SELECT
                EXTRACT(YEAR  FROM recorded_at::timestamp)::int AS year,
                EXTRACT(DAY   FROM recorded_at::timestamp)::int AS day,
                ROUND(AVG(aqi))::int                            AS avg_aqi,
                MAX(aqi)::int                                   AS max_aqi,
                MIN(aqi)::int                                   AS min_aqi,
                COUNT(*)                                        AS sample_count
            FROM station_aqi_history
            WHERE city_id = :city_id
              AND diff = 1
              AND recorded_at IS NOT NULL
              AND EXTRACT(MONTH FROM recorded_at::timestamp) = :month
            GROUP BY year, day
            ORDER BY year, day
        """),
        {"city_id": city_id, "month": month},
    )
    rows = result.mappings().all()
    if not rows:
        return []
    return [dict(r) for r in rows]


# ── Day/Night 24-hour trend ───────────────────────────────────────────────────

@router.get("/city/{city_id}/daynight")
async def day_night_trend(
    city_id: int,
    days: int = Query(30, ge=7, le=365, description="Look-back window in days"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns hourly AQI averages split into day (6 AM–6 PM) and night periods.
    Used for the 24-bar day/night trend chart.
    """
    result = await db.execute(
        text("""
            SELECT
                EXTRACT(HOUR FROM recorded_at::timestamp)::int  AS hour,
                ROUND(AVG(aqi))::int                            AS avg_aqi,
                MAX(aqi)::int                                   AS max_aqi,
                MIN(aqi)::int                                   AS min_aqi,
                CASE
                    WHEN EXTRACT(HOUR FROM recorded_at::timestamp) BETWEEN 6 AND 17
                    THEN 'day'
                    ELSE 'night'
                END                                             AS period
            FROM station_aqi_history
            WHERE city_id = :city_id
              AND diff = 1
              AND recorded_at IS NOT NULL
              AND recorded_at::timestamp > NOW() - make_interval(days => :days)
            GROUP BY hour, period
            ORDER BY hour
        """),
        {"city_id": city_id, "days": days},
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]


# ── Arbitrary date-range stats ────────────────────────────────────────────────

@router.get("/city/{city_id}/range")
async def range_stats(
    city_id: int,
    start: str = Query(..., description="ISO date, e.g. 2024-01-01"),
    end:   str = Query(..., description="ISO date, e.g. 2024-12-31"),
    db: AsyncSession = Depends(get_db),
):
    """Returns AQI min / max / avg and timestamps for an arbitrary date range."""
    try:
        result = await db.execute(
            text("""
                SELECT
                    MIN(aqi)::int                            AS min_aqi,
                    MAX(aqi)::int                            AS max_aqi,
                    ROUND(AVG(aqi))::int                     AS avg_aqi,
                    MIN(recorded_at::timestamp)              AS recorded_min_at,
                    MAX(recorded_at::timestamp)              AS recorded_max_at,
                    COUNT(*)                                 AS sample_count
                FROM station_aqi_history
                WHERE city_id = :city_id
                  AND diff = 1
                  AND recorded_at IS NOT NULL
                  AND recorded_at::timestamp BETWEEN :start::timestamp
                                                  AND (:end::timestamp + INTERVAL '23 hours 59 minutes')
            """),
            {"city_id": city_id, "start": start, "end": end},
        )
        row = result.mappings().first()
        if not row or row["avg_aqi"] is None:
            raise HTTPException(status_code=404, detail="No data for the given range")
        return dict(row)
    except (ValueError, Exception) as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Available years for a city ────────────────────────────────────────────────

@router.get("/city/{city_id}/years")
async def available_years(city_id: int, db: AsyncSession = Depends(get_db)):
    """Returns the list of calendar years that have data for this city."""
    result = await db.execute(
        text("""
            SELECT DISTINCT EXTRACT(YEAR FROM recorded_at::timestamp)::int AS year
            FROM station_aqi_history
            WHERE city_id = :city_id
              AND diff = 1
              AND recorded_at IS NOT NULL
            ORDER BY year
        """),
        {"city_id": city_id},
    )
    rows = result.mappings().all()
    return [r["year"] for r in rows]


# ── Year-over-year comparison for a specific calendar day ────────────────────

@router.get("/city/{city_id}/yoy-day")
async def yoy_day_comparison(
    city_id: int,
    month: int = Query(..., ge=1, le=12),
    day:   int = Query(..., ge=1, le=31),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns one row per year showing the average AQI on the given calendar
    day (month + day). Powers the YoY insight card on the Dashboard.
    """
    result = await db.execute(
        text("""
            SELECT
                EXTRACT(YEAR FROM recorded_at::timestamp)::int AS year,
                ROUND(AVG(aqi))::int                           AS avg_aqi
            FROM station_aqi_history
            WHERE city_id = :city_id
              AND diff = 1
              AND aqi IS NOT NULL
              AND EXTRACT(MONTH FROM recorded_at::timestamp) = :month
              AND EXTRACT(DAY   FROM recorded_at::timestamp) = :day
            GROUP BY year
            ORDER BY avg_aqi DESC
        """),
        {"city_id": city_id, "month": month, "day": day},
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]
