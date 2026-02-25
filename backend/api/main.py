import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
import socketio
import redis.asyncio as aioredis
from typing import AsyncGenerator
from .core.config import settings

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: connect to Redis and start bridge
    app.state.redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    yield
    # Shutdown
    await app.state.redis.close()

app = FastAPI(title="AQI Monitoring API", lifespan=lifespan)
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AQI Backend API"}

@sio.on("connect")
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
