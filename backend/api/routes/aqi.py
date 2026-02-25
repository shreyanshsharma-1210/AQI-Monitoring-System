from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from api.core.db import get_db
from api.models.aqi import City, Station, StationAQIHistory
from pydantic import BaseModel

router = APIRouter()

class CitySchema(BaseModel):
    id: int
    display_name: str
    lat: float
    lon: float
    
    class Config:
        from_attributes = True

class AQIUpdateSchema(BaseModel):
    station_id: int
    station_name: str
    aqi: int
    pm25: float
    pm10: float
    recorded_at: str
    health_category: str

@router.get("/cities", response_model=List[CitySchema])
async def get_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(City))
    return result.scalars().all()

@router.get("/cities/{city_id}/latest")
async def get_latest_aqi(city_id: int, db: AsyncSession = Depends(get_db)):
    # Get all stations for the city
    stations_query = select(Station).where(Station.city_id == city_id)
    stations_result = await db.execute(stations_query)
    stations = stations_result.scalars().all()
    
    if not stations:
        raise HTTPException(status_code=404, detail="City or stations not found")
    
    latest_data = []
    for station in stations:
        # Get latest history for this station
        history_query = select(StationAQIHistory)\
            .where(StationAQIHistory.station_id == station.id)\
            .order_by(desc(StationAQIHistory.id))\
            .limit(1)
        history_result = await db.execute(history_query)
        history = history_result.scalar_one_or_none()
        
        if history:
            latest_data.append({
                "station_id": station.id,
                "station_name": station.station_name,
                "aqi": history.aqi,
                "pm25": history.pm25,
                "pm10": history.pm10,
                "recorded_at": history.recorded_at,
                "lat": station.lat,
                "lon": station.lon
            })
            
    return latest_data

@router.get("/health-recommendation")
async def get_health_rec(aqi: int, age: int = 25, condition: str = "none"):
    """
    Algorithmic risk system based on AQI and user factors.
    """
    recommendations = []
    
    if aqi <= 50:
        recommendations.append("Air quality is ideal for all outdoor activities.")
    elif aqi <= 100:
        recommendations.append("Air quality is acceptable. Moderate risk for some.")
        if condition != "none":
            recommendations.append("Sensitive groups should reduce prolonged outdoor exertion.")
    elif aqi <= 150:
        recommendations.append("Members of sensitive groups may experience health effects.")
        recommendations.append("Everyone should limit prolonged outdoor exertion.")
    elif aqi <= 200:
        recommendations.append("Everyone may begin to experience health effects.")
        recommendations.append("Sensitive groups should avoid outdoor activities.")
    else:
        recommendations.append("Health alert: everyone may experience more serious health effects.")
        recommendations.append("Avoid all outdoor physical activity.")
        
    return {
        "aqi": aqi,
        "recommendations": recommendations,
        "risk_level": "High" if aqi > 150 else "Moderate" if aqi > 50 else "Low"
    }
