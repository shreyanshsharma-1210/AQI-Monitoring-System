"""
Gamification service: points, levels, badges, streaks, daily challenges.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional
import hashlib

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.user import User
from api.models.gamification import (
    UserGamification,
    UserBadge,
    DailyChallenge,
    UserChallenge,
)

# ── Level thresholds ──────────────────────────────────────────────────────────
LEVELS = [
    (0,      1,  "Air Newbie"),
    (100,    2,  "Breather"),
    (300,    3,  "Clean Air Advocate"),
    (600,    4,  "AQI Scout"),
    (1_000,  5,  "Pollution Fighter"),
    (2_000,  6,  "Air Guardian"),
    (4_000,  7,  "Eco Warrior"),
    (7_500,  8,  "AQI Master"),
    (12_000, 9,  "Air Quality Champion"),
    (20_000, 10, "BreathKnight"),
]

# ── Badge definitions ─────────────────────────────────────────────────────────
BADGES = {
    "first_breath":  {"emoji": "🌟", "title": "First Breath",    "desc": "Complete your first check-in"},
    "streak_7":      {"emoji": "🔥", "title": "7-Day Streak",    "desc": "Check in 7 days in a row"},
    "streak_30":     {"emoji": "🌱", "title": "Green Streak",    "desc": "Check in 30 days in a row"},
    "data_nerd":     {"emoji": "📊", "title": "Data Nerd",       "desc": "Check in 30 times total"},
    "top_10":        {"emoji": "🏆", "title": "Top 10",          "desc": "Reach city leaderboard top 10"},
}

# ── Challenge pool (rotating) ─────────────────────────────────────────────────
CHALLENGE_POOL = [
    {"title": "Morning Check-In",    "description": "Check the AQI before 10 AM today",             "points_reward": 30, "challenge_type": "checkin"},
    {"title": "City Explorer",       "description": "View AQI data for a city you haven't visited",  "points_reward": 10, "challenge_type": "view_city"},
    {"title": "Log Your Day",        "description": "Record today's check-in and note the reading",  "points_reward": 20, "challenge_type": "checkin"},
    {"title": "Hottest City Hunt",   "description": "Find today's hottest city on the Rankings tab", "points_reward": 10, "challenge_type": "view_rankings"},
    {"title": "Historical Deep-Dive","description": "Explore the Historical Analysis page",          "points_reward": 15, "challenge_type": "view_history"},
    {"title": "Pollution Tracker",   "description": "Check the PM2.5 pollutant page",                "points_reward": 15, "challenge_type": "view_pollutant"},
    {"title": "Heatmap Scout",       "description": "Open the AQI Heatmap",                          "points_reward": 10, "challenge_type": "view_heatmap"},
    {"title": "Double Check",        "description": "Check the AQI at two different times today",    "points_reward": 20, "challenge_type": "checkin"},
    {"title": "3-City Tour",         "description": "Switch between 3 different cities",             "points_reward": 25, "challenge_type": "view_city"},
    {"title": "Stay Informed",       "description": "Read the AQI forecast for your city",           "points_reward": 15, "challenge_type": "checkin"},
    {"title": "Year Comparison",     "description": "Check last year's AQI for your city",           "points_reward": 20, "challenge_type": "view_history"},
    {"title": "Rankings Watcher",    "description": "See which city is the cleanest today",          "points_reward": 10, "challenge_type": "view_rankings"},
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def compute_level(points: int) -> tuple[int, str]:
    level_num, level_name = 1, "Air Newbie"
    for threshold, lvl, name in LEVELS:
        if points >= threshold:
            level_num, level_name = lvl, name
    return level_num, level_name


def _date_seed(d: date) -> int:
    """Deterministic seed from a date."""
    return int(hashlib.md5(d.isoformat().encode()).hexdigest(), 16)


def pick_challenges_for_date(d: date, count: int = 3) -> List[dict]:
    seed = _date_seed(d)
    indices = []
    pool = list(range(len(CHALLENGE_POOL)))
    for i in range(count):
        idx = (seed + i * 31) % len(pool)
        indices.append(pool.pop(idx % len(pool)))
    return [CHALLENGE_POOL[i] for i in indices]


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_or_create_gamification(db: AsyncSession, user_id: str) -> UserGamification:
    result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    g = result.scalar_one_or_none()
    if not g:
        # Ensure parent user row exists (FK requirement)
        user_result = await db.execute(select(User).where(User.id == user_id))
        if not user_result.scalar_one_or_none():
            db.add(User(id=user_id, email=f"{user_id}@local"))
            await db.flush()  # flush so FK satisfies before child insert
        g = UserGamification(user_id=user_id)
        db.add(g)
        await db.commit()
        await db.refresh(g)
    return g


async def _award_badge(db: AsyncSession, user_id: str, badge_key: str) -> bool:
    """Award badge if not already earned. Returns True if newly awarded."""
    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id, UserBadge.badge_key == badge_key)
    )
    if result.scalar_one_or_none():
        return False
    db.add(UserBadge(user_id=user_id, badge_key=badge_key))
    return True


# ── Public service functions ──────────────────────────────────────────────────

async def daily_checkin(db: AsyncSession, user_id: str) -> dict:
    """
    Process daily check-in for a user.
    Returns: { points_earned, total_points, streak_days, badges_earned, already_checked_in }.
    """
    today = date.today()

    g = await get_or_create_gamification(db, user_id)

    # Already checked in today?
    if g.last_checkin == today:
        level_num, level_name = compute_level(g.points)
        return {
            "already_checked_in": True,
            "points_earned": 0,
            "total_points": g.points,
            "streak_days": g.streak_days,
            "level": level_num,
            "level_name": level_name,
            "badges_earned": [],
        }

    # ── Streak calculation ────────────────────────────────────────────────────
    yesterday = today - timedelta(days=1)
    if g.last_checkin == yesterday:
        g.streak_days += 1
    elif g.last_checkin is None or g.last_checkin < yesterday:
        g.streak_days = 1  # reset or start

    g.last_checkin = today
    g.total_checkins += 1

    # ── Points ───────────────────────────────────────────────────────────────
    pts_earned = 10  # base check-in
    if g.streak_days == 7:
        pts_earned += 50   # 7-day streak bonus
    elif g.streak_days == 30:
        pts_earned += 100  # 30-day streak bonus

    g.points += pts_earned

    # ── Level update ─────────────────────────────────────────────────────────
    level_num, level_name = compute_level(g.points)
    g.level = level_num

    g.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(g)

    # ── Badge checks ──────────────────────────────────────────────────────────
    new_badges = []
    if g.total_checkins == 1:
        if await _award_badge(db, user_id, "first_breath"):
            new_badges.append("first_breath")
    if g.streak_days >= 7:
        if await _award_badge(db, user_id, "streak_7"):
            new_badges.append("streak_7")
    if g.streak_days >= 30:
        if await _award_badge(db, user_id, "streak_30"):
            new_badges.append("streak_30")
    if g.total_checkins >= 30:
        if await _award_badge(db, user_id, "data_nerd"):
            new_badges.append("data_nerd")
    if new_badges:
        await db.commit()

    return {
        "already_checked_in": False,
        "points_earned": pts_earned,
        "total_points": g.points,
        "streak_days": g.streak_days,
        "level": level_num,
        "level_name": level_name,
        "badges_earned": new_badges,
    }


async def get_user_stats(db: AsyncSession, user_id: str) -> dict:
    """Return full gamification stats + badges for a user."""
    g = await get_or_create_gamification(db, user_id)
    level_num, level_name = compute_level(g.points)

    # Badges
    result = await db.execute(select(UserBadge).where(UserBadge.user_id == user_id))
    badges = result.scalars().all()
    badge_list = [
        {
            "key": b.badge_key,
            "emoji": BADGES[b.badge_key]["emoji"] if b.badge_key in BADGES else "🏅",
            "title": BADGES[b.badge_key]["title"] if b.badge_key in BADGES else b.badge_key,
            "desc":  BADGES[b.badge_key]["desc"]  if b.badge_key in BADGES else "",
            "earned_at": b.earned_at.isoformat(),
        }
        for b in badges
    ]

    # Next level info
    next_level = None
    for threshold, lvl, name in LEVELS:
        if lvl == level_num + 1:
            next_level = {"threshold": threshold, "name": name}
            break

    today = date.today()
    checked_in_today = g.last_checkin == today

    return {
        "user_id": user_id,
        "points": g.points,
        "level": level_num,
        "level_name": level_name,
        "next_level": next_level,
        "streak_days": g.streak_days,
        "total_checkins": g.total_checkins,
        "cities_visited": g.cities_visited,
        "checked_in_today": checked_in_today,
        "badges": badge_list,
        "all_badges": [
            {
                "key": k,
                "emoji": v["emoji"],
                "title": v["title"],
                "desc":  v["desc"],
                "earned": any(b["key"] == k for b in badge_list),
            }
            for k, v in BADGES.items()
        ],
    }


async def get_leaderboard(db: AsyncSession, limit: int = 50, city_id: Optional[int] = None) -> List[dict]:
    """Return top users sorted by points."""
    if city_id is not None:
        # Filter by users who have this as preferred city
        q = (
            select(UserGamification, User)
            .join(User, User.id == UserGamification.user_id)
            .where(User.preferred_city_id == city_id)
            .order_by(UserGamification.points.desc())
            .limit(limit)
        )
    else:
        q = (
            select(UserGamification, User)
            .join(User, User.id == UserGamification.user_id)
            .order_by(UserGamification.points.desc())
            .limit(limit)
        )

    result = await db.execute(q)
    rows = result.all()

    out = []
    for rank, (g, u) in enumerate(rows, 1):
        level_num, level_name = compute_level(g.points)
        username = u.email.split("@")[0] if u.email else u.id[:8]
        out.append({
            "rank":         rank,
            "user_id":      u.id,
            "username":     username,
            "points":       g.points,
            "level":        level_num,
            "level_name":   level_name,
            "streak_days":  g.streak_days,
        })
    return out


async def get_todays_challenges(db: AsyncSession, user_id: Optional[str] = None) -> List[dict]:
    """
    Return today's 3 challenges. Creates them in DB if not yet seeded.
    If user_id provided, marks which ones the user has completed.
    """
    today = date.today()

    # Check if today's challenges already exist
    result = await db.execute(
        select(DailyChallenge).where(DailyChallenge.challenge_date == today)
    )
    challenges = result.scalars().all()

    if not challenges:
        # Seed today's challenges
        templates = pick_challenges_for_date(today, count=3)
        new_challenges = [
            DailyChallenge(
                challenge_date=today,
                title=t["title"],
                description=t["description"],
                points_reward=t["points_reward"],
                challenge_type=t["challenge_type"],
            )
            for t in templates
        ]
        for c in new_challenges:
            db.add(c)
        await db.commit()
        # Re-fetch
        result = await db.execute(
            select(DailyChallenge).where(DailyChallenge.challenge_date == today)
        )
        challenges = result.scalars().all()

    # Completed challenge IDs for this user
    completed_ids = set()
    if user_id:
        c_ids = [c.id for c in challenges]
        comp_result = await db.execute(
            select(UserChallenge).where(
                UserChallenge.user_id == user_id,
                UserChallenge.challenge_id.in_(c_ids),
            )
        )
        completed_ids = {uc.challenge_id for uc in comp_result.scalars().all()}

    return [
        {
            "id":            c.id,
            "title":         c.title,
            "description":   c.description,
            "points_reward": c.points_reward,
            "challenge_type":c.challenge_type,
            "completed":     c.id in completed_ids,
        }
        for c in challenges
    ]


async def award_points(db: AsyncSession, user_id: str, points: int, reason: str = "") -> dict:
    """
    Award a fixed number of points to a user for a specific action
    (community report, verified report, etc.).
    Creates a gamification row if the user doesn't have one yet.
    """
    g = await get_or_create_gamification(db, user_id)
    g.points += points
    level_num, level_name = compute_level(g.points)
    g.level = level_num
    g.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(g)
    return {
        "points_earned": points,
        "total_points":  g.points,
        "level":         level_num,
        "level_name":    level_name,
        "reason":        reason,
    }


async def complete_challenge(db: AsyncSession, user_id: str, challenge_id: int) -> dict:
    """Mark a challenge as completed and award points."""
    # Verify challenge exists and belongs to today
    result = await db.execute(select(DailyChallenge).where(DailyChallenge.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge or challenge.challenge_date != date.today():
        return {"success": False, "error": "Challenge not found or expired"}

    # Check if already completed
    comp_result = await db.execute(
        select(UserChallenge).where(
            UserChallenge.user_id == user_id,
            UserChallenge.challenge_id == challenge_id,
        )
    )
    if comp_result.scalar_one_or_none():
        return {"success": False, "error": "Already completed this challenge"}

    # Mark completed
    uc = UserChallenge(user_id=user_id, challenge_id=challenge_id)
    db.add(uc)

    # Award points
    g = await get_or_create_gamification(db, user_id)
    g.points += challenge.points_reward
    level_num, level_name = compute_level(g.points)
    g.level = level_num
    g.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(g)

    return {
        "success":      True,
        "points_earned":challenge.points_reward,
        "total_points": g.points,
        "level":        level_num,
        "level_name":   level_name,
    }
