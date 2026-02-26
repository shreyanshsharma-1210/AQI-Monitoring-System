"""
api/services/aqi_service.py — Business logic for AQI data processing.
Currently provides the Year-over-Year insight computation.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


ORDINALS = {1: "1st", 2: "2nd", 3: "3rd"}


async def get_yoy_insight(city_id: int, db: AsyncSession) -> dict:
    """
    Compares today's AQI against the same calendar day across all years
    available in station_aqi_history.

    Returns:
        - insight: pre-built English sentence  (None if <2 years of data)
        - years_data: list of {year, aqi} sorted worst→best
        - current_rank: rank of the current year (1 = worst)
        - worst: {year, aqi}
        - best:  {year, aqi}
    """
    today = datetime.now(tz=timezone.utc)
    month, day = today.month, today.day

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

    if not rows or len(rows) < 2:
        return {"insight": None, "years_data": [], "current_rank": None,
                "worst": None, "best": None}

    years_data    = [{"year": r["year"], "aqi": r["avg_aqi"]} for r in rows]
    current_year  = today.year
    current_entry = next((r for r in years_data if r["year"] == current_year), None)
    rank          = (years_data.index(current_entry) + 1) if current_entry else None
    worst         = years_data[0]
    best          = years_data[-1]

    rank_str = ORDINALS.get(rank, f"{rank}th") if rank else "N/A"
    aqi_val  = current_entry["aqi"] if current_entry else "N/A"

    insight = (
        f"Today's AQI of {aqi_val} ranks {rank_str} worst for this calendar day "
        f"across {len(years_data)} years of data. "
        f"The worst recorded was {worst['aqi']} AQI in {worst['year']}, "
        f"the best was {best['aqi']} AQI in {best['year']}."
    )

    return {
        "insight":      insight,
        "years_data":   years_data,
        "current_rank": rank,
        "worst":        worst,
        "best":         best,
    }
