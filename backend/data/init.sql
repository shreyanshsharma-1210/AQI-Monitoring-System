-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- City Registry
CREATE TABLE IF NOT EXISTS city_registry (
    id SERIAL PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    waqi_slug VARCHAR(100) UNIQUE NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lon DECIMAL(9,6) NOT NULL,
    country_code CHAR(2) NOT NULL
);

-- City Stations
CREATE TABLE IF NOT EXISTS city_stations (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES city_registry(id) ON DELETE CASCADE,
    station_name VARCHAR(150) NOT NULL,
    waqi_station_id VARCHAR(20) NOT NULL,
    lat DECIMAL(9,6),
    lon DECIMAL(9,6)
);

-- Station AQI History
CREATE TABLE IF NOT EXISTS station_aqi_history (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES city_registry(id),
    station_id INTEGER REFERENCES city_stations(id),
    aqi INTEGER,
    pm25 DECIMAL(6,2),
    pm10 DECIMAL(6,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    time INTEGER NOT NULL,
    diff SMALLINT NOT NULL
);

-- Insert Default Indian Cities
INSERT INTO city_registry (display_name, waqi_slug, lat, lon, country_code) VALUES
('New Delhi', 'delhi', 28.6139, 77.2090, 'IN'),
('Mumbai', 'mumbai', 19.0760, 72.8777, 'IN'),
('Bengaluru', 'bangalore', 12.9716, 77.5946, 'IN'),
('Kolkata', 'kolkata', 22.5726, 88.3639, 'IN'),
('Chennai', 'chennai', 13.0827, 80.2707, 'IN'),
('Hyderabad', 'hyderabad', 17.3850, 78.4867, 'IN')
ON CONFLICT DO NOTHING;

-- Insert Stations for Delhi
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Anand Vihar, Delhi', '@7021', 28.6469, 77.3163),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Aerocity, Delhi', '@8659', 28.5562, 77.0999),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Punjabi Bagh, Delhi', '@8026', 28.6719, 77.1322)
ON CONFLICT DO NOTHING;
