import asyncio
import json
import redis.asyncio as aioredis
from api.core.config import settings

async def redis_to_socket_bridge(sio):
    """
    Bridge that listens to Redis Pub/Sub and broadcasts to Socket.IO.
    """
    print("Starting Redis to Socket.IO bridge...")
    redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("aqi:live")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    # Broadcast to all connected clients
                    await sio.emit("aqi_update", data)
                    print(f"Broadcasted update for {data.get('city')}")
                except Exception as e:
                    print(f"Error processing Redis message: {e}")
    except asyncio.CancelledError:
        print("Redis bridge cancelled.")
    finally:
        await pubsub.unsubscribe("aqi:live")
        await redis_client.close()
