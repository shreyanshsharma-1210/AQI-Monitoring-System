import pathway as pw

class StationAQISchema(pw.Schema):
    city_id: int
    station_id: int
    city: str
    aqi: float
    pm25: float
    pm10: float
    no2: float
    o3: float
    co: float
    so2: float
    lat: float
    lon: float
    timestamp: str

class WeatherSchema(pw.Schema):
    city_id: int
    city: str
    lat: float
    lon: float
    temp: float
    feels_like: float
    humidity: int
    wind_speed: float
    uv_index: float
    precip_prob: int
    forecast_aqi_24h: str
    timestamp: str
