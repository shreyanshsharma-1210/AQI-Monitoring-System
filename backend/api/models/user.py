from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from api.core.db import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)  # UUID from Supabase
    email = Column(String, unique=True, index=True)
    preferred_city_id = Column(Integer, ForeignKey("city_registry.id"), nullable=True)
    language = Column(String, default="en")  # en, hi, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Optional: relationship to city
    # preferred_city = relationship("City")
