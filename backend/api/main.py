import socketio
import asyncio
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as aioredis
from api.core.config import settings
from api.services.redis_bridge import redis_to_socket_bridge
from api.routes import aqi, users, history, rankings, gamification

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: connect to Redis and start bridge
    try:
        app.state.redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        # Start the Redis-Socket.IO bridge as a background task
        app.state.bridge_task = asyncio.create_task(redis_to_socket_bridge(sio))
    except Exception as e:
        print(f"Startup error: {e}")
    
    yield
    # Shutdown
    if hasattr(app.state, 'bridge_task'):
        app.state.bridge_task.cancel()
    if hasattr(app.state, 'redis'):
        await app.state.redis.close()

app = FastAPI(title="AQI Monitoring API", lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(aqi.router, prefix="/api/aqi", tags=["AQI"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(rankings.router, prefix="/api", tags=["Rankings"])
app.include_router(gamification.router, prefix="/api", tags=["Gamification"])
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
