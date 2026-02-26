from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from api.core.db import Base
from datetime import datetime


class UserGamification(Base):
    __tablename__ = "user_gamification"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    points = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    streak_days = Column(Integer, default=0, nullable=False)
    last_checkin = Column(Date, nullable=True)
    total_checkins = Column(Integer, default=0, nullable=False)
    cities_visited = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    badge_key = Column(String(50), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "badge_key", name="uq_user_badge"),)


class DailyChallenge(Base):
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    challenge_date = Column(Date, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    points_reward = Column(Integer, nullable=False)
    challenge_type = Column(String(50), nullable=False)


class UserChallenge(Base):
    __tablename__ = "user_challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id", ondelete="CASCADE"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "challenge_id", name="uq_user_challenge"),)
