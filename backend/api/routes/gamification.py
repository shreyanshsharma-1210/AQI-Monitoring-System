from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from api.core.db import get_db
from api.services import gamification_service as gsvc

router = APIRouter(prefix="/gamification", tags=["Gamification"])


# ── Request schemas ───────────────────────────────────────────────────────────

class CheckinRequest(BaseModel):
    user_id: str


class ChallengeCompleteRequest(BaseModel):
    user_id: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/checkin")
async def checkin(body: CheckinRequest, db: AsyncSession = Depends(get_db)):
    """
    Process daily check-in for a user.
    Idempotent — safe to call multiple times per day (only awards once).
    """
    return await gsvc.daily_checkin(db, body.user_id)


@router.get("/stats/{user_id}")
async def get_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return full gamification stats + earned badges for a user."""
    return await gsvc.get_user_stats(db, user_id)


@router.get("/leaderboard")
async def global_leaderboard(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Global leaderboard — top users by points."""
    return await gsvc.get_leaderboard(db, limit=limit)


@router.get("/leaderboard/city/{city_id}")
async def city_leaderboard(
    city_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """City-specific leaderboard — users whose preferred city matches."""
    return await gsvc.get_leaderboard(db, limit=limit, city_id=city_id)


@router.get("/challenges")
async def todays_challenges(
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return today's 3 daily challenges. Optionally mark which are completed by user_id."""
    return await gsvc.get_todays_challenges(db, user_id=user_id)


@router.post("/challenges/{challenge_id}/complete")
async def complete_challenge(
    challenge_id: int,
    body: ChallengeCompleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Mark a daily challenge as completed and award points."""
    result = await gsvc.complete_challenge(db, body.user_id, challenge_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed"))
    return result
