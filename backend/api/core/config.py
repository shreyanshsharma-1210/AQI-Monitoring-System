import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    WAQI_API_KEY: str
    IPINFO_TOKEN: str
    DATABASE_URL: str
    REDIS_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str

    class Config:
        env_file = "../.env"

settings = Settings()
