from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from api.core.db import get_db
from api.models.user import User
from datetime import datetime

router = APIRouter()

class UserProfileCreate(BaseModel):
    id: str  # UUID from Supabase
    email: str
    preferred_city_id: Optional[int] = None
    language: str = "en"

class UserProfileUpdate(BaseModel):
    preferred_city_id: Optional[int] = None
    language: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    preferred_city_id: Optional[int]
    language: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/users/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    profile: UserProfileCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create or get user profile."""
    # Check if user exists
    result = await db.execute(select(User).where(User.id == profile.id))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        return existing_user
    
    # Create new user
    new_user = User(
        id=profile.id,
        email=profile.email,
        preferred_city_id=profile.preferred_city_id,
        language=profile.language
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.get("/users/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user profile by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.put("/users/profile/{user_id}", response_model=UserProfileResponse)
async def update_user_profile(
    user_id: str,
    profile_update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update user profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile_update.preferred_city_id is not None:
        user.preferred_city_id = profile_update.preferred_city_id
    if profile_update.language is not None:
        user.language = profile_update.language
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user
