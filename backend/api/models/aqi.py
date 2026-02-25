from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from api.core.db import Base
from datetime import datetime

class City(Base):
    __tablename__ = "city_registry"
    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, unique=True, index=True)
    lat = Column(Float)
    lon = Column(Float)
    stations = relationship("Station", back_populates="city")

class Station(Base):
    __tablename__ = "city_stations"
    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("city_registry.id"))
    station_name = Column(String)
    waqi_station_id = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    city = relationship("City", back_populates="stations")
    aqi_history = relationship("StationAQIHistory", back_populates="station")

class StationAQIHistory(Base):
    __tablename__ = "station_aqi_history"
    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("city_registry.id"))
    station_id = Column(Integer, ForeignKey("city_stations.id"))
    aqi = Column(Integer)
    pm25 = Column(Float)
    pm10 = Column(Float)
    recorded_at = Column(String) # Stored as string ISO in DB or Datetime
    time = Column(BigInteger)
    diff = Column(Integer)
    station = relationship("Station", back_populates="aqi_history")
