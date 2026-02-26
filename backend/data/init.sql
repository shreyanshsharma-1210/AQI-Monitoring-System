-- City Registry (must be first — referenced by users, city_stations, station_aqi_history)
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
    aqi FLOAT8,
    pm25 FLOAT8,
    pm10 FLOAT8,
    no2 FLOAT8 DEFAULT 0,
    o3 FLOAT8 DEFAULT 0,
    co FLOAT8 DEFAULT 0,
    so2 FLOAT8 DEFAULT 0,
    lat FLOAT8 DEFAULT 0,
    lon FLOAT8 DEFAULT 0,
    health_category TEXT DEFAULT '',
    temp FLOAT8 DEFAULT 0,
    humidity INTEGER DEFAULT 0,
    wind_speed FLOAT8 DEFAULT 0,
    uv_index FLOAT8 DEFAULT 0,
    precip_prob INTEGER DEFAULT 0,
    forecast_aqi_24h TEXT DEFAULT '[]',
    recorded_at TEXT,
    time BIGINT NOT NULL,
    diff SMALLINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sah_station_time ON station_aqi_history(station_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sah_city_time ON station_aqi_history(city_id, time DESC);
-- Phase 4: historical analysis indexes
CREATE INDEX IF NOT EXISTS idx_sah_city_recorded ON station_aqi_history(city_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sah_city_diff_recorded ON station_aqi_history(city_id, diff, recorded_at);

-- Users (references city_registry, so must come after it)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    preferred_city_id INTEGER REFERENCES city_registry(id) ON DELETE SET NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert All Indian Cities
INSERT INTO city_registry (display_name, waqi_slug, lat, lon, country_code) VALUES
('New Delhi',       'delhi',        28.6139,  77.2090,  'IN'),
('Mumbai',          'mumbai',       19.0760,  72.8777,  'IN'),
('Bengaluru',       'bangalore',    12.9716,  77.5946,  'IN'),
('Kolkata',         'kolkata',      22.5726,  88.3639,  'IN'),
('Chennai',         'chennai',      13.0827,  80.2707,  'IN'),
('Hyderabad',       'hyderabad',    17.3850,  78.4867,  'IN'),
('Ahmedabad',       'ahmedabad',    23.0225,  72.5714,  'IN'),
('Pune',            'pune',         18.5204,  73.8567,  'IN'),
('Jaipur',          'jaipur',       26.9124,  75.7873,  'IN'),
('Lucknow',         'lucknow',      26.8467,  80.9462,  'IN'),
('Kanpur',          'kanpur',       26.4499,  80.3319,  'IN'),
('Nagpur',          'nagpur',       21.1458,  79.0882,  'IN'),
('Patna',           'patna',        25.5941,  85.1376,  'IN'),
('Agra',            'agra',         27.1767,  78.0081,  'IN'),
('Varanasi',        'varanasi',     25.3176,  82.9739,  'IN'),
('Amritsar',        'amritsar',     31.6340,  74.8723,  'IN'),
('Chandigarh',      'chandigarh',   30.7333,  76.7794,  'IN'),
('Bhopal',          'bhopal',       23.2599,  77.4126,  'IN'),
('Indore',          'indore',       22.7196,  75.8577,  'IN'),
('Surat',           'surat',        21.1702,  72.8311,  'IN'),
('Visakhapatnam',   'visakhapatnam',17.6868,  83.2185,  'IN'),
('Kochi',           'kochi',        9.9312,   76.2673,  'IN'),
('Bhubaneswar',     'bhubaneswar',  20.2961,  85.8245,  'IN'),
('Jodhpur',         'jodhpur',      26.2389,  73.0243,  'IN'),
('Coimbatore',      'coimbatore',   11.0168,  76.9558,  'IN'),
('Guwahati',        'guwahati',     26.1445,  91.7362,  'IN'),
('Raipur',          'raipur',       21.2514,  81.6296,  'IN'),
('Ranchi',          'ranchi',       23.3441,  85.3096,  'IN'),
('Ghaziabad',       'ghaziabad',    28.6692,  77.4538,  'IN'),
('Noida',           'noida',        28.5355,  77.3910,  'IN'),
('Faridabad',       'faridabad',    28.4089,  77.3178,  'IN'),
('Gurugram',        'gurugram',     28.4595,  77.0266,  'IN'),
('Meerut',          'meerut',       28.9845,  77.7064,  'IN'),
('Rajkot',          'rajkot',       22.3039,  70.8022,  'IN'),
('Vadodara',        'vadodara',     22.3072,  73.1812,  'IN'),
('Nashik',          'nashik',       19.9975,  73.7898,  'IN'),
('Aurangabad',      'aurangabad',   19.8762,  75.3433,  'IN'),
('Dhanbad',         'dhanbad',      23.7957,  86.4304,  'IN'),
('Allahabad',       'allahabad',    25.4358,  81.8463,  'IN'),
('Ludhiana',        'ludhiana',     30.9010,  75.8573,  'IN'),
('Tiruchirappalli',	'tiruchirappalli',10.7905, 78.7047, 'IN'),
('Madurai',         'madurai',      9.9252,   78.1198,  'IN'),
('Manesar',         'manesar',      28.3588,  76.9366,  'IN'),
('Navi Mumbai',     'navi-mumbai',  19.0330,  73.0297,  'IN'),
('Thane',           'thane',        19.2183,  72.9781,  'IN')
ON CONFLICT DO NOTHING;

-- ── Delhi ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Anand Vihar, Delhi',        '@7021',  28.6469, 77.3163),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Aerocity, Delhi',            '@8659',  28.5562, 77.0999),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Punjabi Bagh, Delhi',        '@8026',  28.6719, 77.1322),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'ITO, Delhi',                 '@7020',  28.6289, 77.2409),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'R.K. Puram, Delhi',          '@7019',  28.5650, 77.1853),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Mandir Marg, Delhi',         '@7018',  28.6363, 77.1993),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Dwarka, Delhi',              '@7017',  28.5921, 77.0460),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Shadipur, Delhi',            '@7022',  28.6508, 77.1448),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Nehru Nagar, Delhi',         '@8024',  28.5688, 77.2500),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Jahangirpuri, Delhi',        '@8025',  28.7304, 77.1631),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Wazirpur, Delhi',            '@8027',  28.6948, 77.1693),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Rohini, Delhi',              '@8028',  28.7166, 77.1176),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Okhla Phase 2, Delhi',       '@12416', 28.5355, 77.2700),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Siri Fort, Delhi',           '@7023',  28.5512, 77.2240),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Patparganj, Delhi',          '@8030',  28.6271, 77.2958),
((SELECT id FROM city_registry WHERE waqi_slug = 'delhi'), 'Burari Crossing, Delhi',     '@8029',  28.7266, 77.2032)
ON CONFLICT DO NOTHING;

-- ── Mumbai ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Bandra, Mumbai',            '@9021',  19.0544, 72.8405),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Borivali, Mumbai',          '@9022',  19.2307, 72.8567),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Chakala-MIDC, Mumbai',      '@9023',  19.1136, 72.8697),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Mazgaon, Mumbai',           '@9024',  18.9648, 72.8443),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Worli, Mumbai',             '@9025',  19.0176, 72.8178),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Sion, Mumbai',              '@9026',  19.0416, 72.8602),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Colaba, Mumbai',            '@9027',  18.9067, 72.8147),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Malad, Mumbai',             '@9028',  19.1866, 72.8487),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Powai, Mumbai',             '@14491', 19.1197, 72.9050),
((SELECT id FROM city_registry WHERE waqi_slug = 'mumbai'), 'Chembur, Mumbai',           '@9020',  19.0622, 72.9005)
ON CONFLICT DO NOTHING;

-- ── Bengaluru ──────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'BTM Layout, Bengaluru',      '@14078', 12.9166, 77.6101),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Bapuji Nagar, Bengaluru',    '@14079', 12.9762, 77.5541),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Hebbal, Bengaluru',          '@14080', 13.0358, 77.5970),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Hombegowda Nagar, Bengaluru','@14081', 12.9440, 77.5914),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Jayanagar, Bengaluru',       '@14082', 12.9258, 77.5933),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Peenya, Bengaluru',          '@14083', 13.0291, 77.5193),
((SELECT id FROM city_registry WHERE waqi_slug = 'bangalore'), 'Silk Board, Bengaluru',      '@14084', 12.9172, 77.6226)
ON CONFLICT DO NOTHING;

-- ── Kolkata ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Rabindra Bharati Univ, Kolkata','@8668', 22.5958, 88.3804),
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Victoria, Kolkata',             '@8670', 22.5448, 88.3426),
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Ballygunge, Kolkata',           '@8669', 22.5268, 88.3672),
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Fort William, Kolkata',         '@8671', 22.5513, 88.3438),
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Jadavpur, Kolkata',             '@8672', 22.4997, 88.3718),
((SELECT id FROM city_registry WHERE waqi_slug = 'kolkata'), 'Ghusuri, Kolkata',              '@8673', 22.5748, 88.3168)
ON CONFLICT DO NOTHING;

-- ── Chennai ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Alandur, Chennai',              '@14021', 13.0019,  80.2060),
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Park Town, Chennai',            '@14022', 13.0785,  80.2744),
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Velachery, Chennai',            '@14023', 12.9787,  80.2188),
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Manali, Chennai',               '@14024', 13.1639,  80.2576),
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Kathivakkam, Chennai',          '@14025', 13.2131,  80.2978),
((SELECT id FROM city_registry WHERE waqi_slug = 'chennai'), 'Perungudi, Chennai',            '@14026', 12.9625,  80.2434)
ON CONFLICT DO NOTHING;

-- ── Hyderabad ──────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'Bollaram Industrial, Hyderabad','@14142', 17.5502, 78.3852),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'ECIL Kapra, Hyderabad',         '@14143', 17.4710, 78.5595),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'ICRISAT Patancheru, Hyderabad', '@14144', 17.5309, 78.2641),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'IDA Pashamylaram, Hyderabad',   '@14145', 17.5360, 78.2508),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'IITH Kandi, Hyderabad',         '@14146', 17.5961, 77.9993),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'Nacharam, Hyderabad',           '@14147', 17.4111, 78.5434),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'Sanathnagar, Hyderabad',        '@14148', 17.4482, 78.4277),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'Zoo Park, Hyderabad',           '@14149', 17.3493, 78.4516),
((SELECT id FROM city_registry WHERE waqi_slug = 'hyderabad'), 'US Consulate, Hyderabad',       '@7590',  17.4239, 78.4738)
ON CONFLICT DO NOTHING;

-- ── Ahmedabad ──────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'ahmedabad'), 'AUDA, Ahmedabad',               '@14059', 23.0436, 72.5028),
((SELECT id FROM city_registry WHERE waqi_slug = 'ahmedabad'), 'Chandkheda, Ahmedabad',         '@14060', 23.1143, 72.5966),
((SELECT id FROM city_registry WHERE waqi_slug = 'ahmedabad'), 'Maninagar, Ahmedabad',          '@14061', 22.9939, 72.6060),
((SELECT id FROM city_registry WHERE waqi_slug = 'ahmedabad'), 'Naranpura, Ahmedabad',          '@14062', 23.0488, 72.5475),
((SELECT id FROM city_registry WHERE waqi_slug = 'ahmedabad'), 'Vatva, Ahmedabad',              '@14063', 22.9631, 72.6399)
ON CONFLICT DO NOTHING;

-- ── Pune ───────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'pune'), 'Katraj, Pune',                    '@14093', 18.4529, 73.8677),
((SELECT id FROM city_registry WHERE waqi_slug = 'pune'), 'Pimpri, Pune',                    '@14094', 18.6298, 73.8073),
((SELECT id FROM city_registry WHERE waqi_slug = 'pune'), 'Shivajinagar, Pune',              '@14095', 18.5308, 73.8475),
((SELECT id FROM city_registry WHERE waqi_slug = 'pune'), 'Hadapsar, Pune',                  '@14096', 18.5089, 73.9260),
((SELECT id FROM city_registry WHERE waqi_slug = 'pune'), 'Karve Nagar, Pune',               '@14097', 18.4910, 73.8189)
ON CONFLICT DO NOTHING;

-- ── Jaipur ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'jaipur'), 'Jhotwara, Jaipur',              '@14175', 26.9552, 75.7576),
((SELECT id FROM city_registry WHERE waqi_slug = 'jaipur'), 'Murlipura, Jaipur',             '@14176', 26.9773, 75.7715),
((SELECT id FROM city_registry WHERE waqi_slug = 'jaipur'), 'Vidhyadhar Nagar, Jaipur',      '@14177', 26.9615, 75.8032),
((SELECT id FROM city_registry WHERE waqi_slug = 'jaipur'), 'Shastri Nagar, Jaipur',         '@14178', 26.9357, 75.7875)
ON CONFLICT DO NOTHING;

-- ── Lucknow ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'lucknow'), 'Lalbagh, Lucknow',             '@14226', 26.8355, 80.9201),
((SELECT id FROM city_registry WHERE waqi_slug = 'lucknow'), 'Talkatora, Lucknow',           '@14227', 26.8573, 80.9120),
((SELECT id FROM city_registry WHERE waqi_slug = 'lucknow'), 'Gomtinagar, Lucknow',          '@14228', 26.8608, 81.0010),
((SELECT id FROM city_registry WHERE waqi_slug = 'lucknow'), 'Central School, Lucknow',      '@14229', 26.8728, 80.9760)
ON CONFLICT DO NOTHING;

-- ── Kanpur ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'kanpur'), 'Nehru Nagar, Kanpur',           '@14230', 26.4672, 80.3245),
((SELECT id FROM city_registry WHERE waqi_slug = 'kanpur'), 'Budhana Gate, Kanpur',          '@14231', 26.4416, 80.3532),
((SELECT id FROM city_registry WHERE waqi_slug = 'kanpur'), 'Kidwai Nagar, Kanpur',          '@14232', 26.4752, 80.3501)
ON CONFLICT DO NOTHING;

-- ── Nagpur ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'nagpur'), 'Civil Lines, Nagpur',           '@14351', 21.1556, 79.0726),
((SELECT id FROM city_registry WHERE waqi_slug = 'nagpur'), 'MPCB, Nagpur',                  '@14352', 21.1460, 79.0850),
((SELECT id FROM city_registry WHERE waqi_slug = 'nagpur'), 'Nari, Nagpur',                  '@14353', 21.0809, 79.1044)
ON CONFLICT DO NOTHING;

-- ── Patna ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'patna'), 'IGIMS, Patna',                   '@14276', 25.5975, 85.1383),
((SELECT id FROM city_registry WHERE waqi_slug = 'patna'), 'Murmuria Bus Stand, Patna',      '@14277', 25.5936, 85.1478),
((SELECT id FROM city_registry WHERE waqi_slug = 'patna'), 'Rajbanshi Nagar, Patna',         '@14278', 25.6178, 85.1234),
((SELECT id FROM city_registry WHERE waqi_slug = 'patna'), 'Sheikhpura, Patna',              '@14279', 25.6092, 85.1478)
ON CONFLICT DO NOTHING;

-- ── Agra ───────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'agra'), 'Sanjay Place, Agra',              '@14250', 27.1795, 78.0007),
((SELECT id FROM city_registry WHERE waqi_slug = 'agra'), 'Shaheen Road, Agra',              '@14251', 27.1877, 78.0166),
((SELECT id FROM city_registry WHERE waqi_slug = 'agra'), 'Nunhai, Agra',                    '@14252', 27.2246, 77.9815)
ON CONFLICT DO NOTHING;

-- ── Varanasi ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'varanasi'), 'Ardhali Bazar, Varanasi',     '@14283', 25.3529, 82.9812),
((SELECT id FROM city_registry WHERE waqi_slug = 'varanasi'), 'BHU, Varanasi',               '@14284', 25.2659, 82.9869),
((SELECT id FROM city_registry WHERE waqi_slug = 'varanasi'), 'Sigra, Varanasi',             '@14285', 25.3388, 83.0036)
ON CONFLICT DO NOTHING;

-- ── Amritsar ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'amritsar'), 'Guru Nanak Dev Univ, Amritsar','@14295', 31.6416, 74.8800),
((SELECT id FROM city_registry WHERE waqi_slug = 'amritsar'), 'Town Hall, Amritsar',          '@14296', 31.6218, 74.8766)
ON CONFLICT DO NOTHING;

-- ── Chandigarh ─────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'chandigarh'), 'Sector 22-A, Chandigarh',   '@14301', 30.7350, 76.7800),
((SELECT id FROM city_registry WHERE waqi_slug = 'chandigarh'), 'Sector 25, Chandigarh',     '@14302', 30.7281, 76.7769)
ON CONFLICT DO NOTHING;

-- ── Bhopal ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'bhopal'), 'T.T. Nagar, Bhopal',            '@14379', 23.2368, 77.4082),
((SELECT id FROM city_registry WHERE waqi_slug = 'bhopal'), 'Maharana Pratap Nagar, Bhopal', '@14380', 23.2471, 77.4220),
((SELECT id FROM city_registry WHERE waqi_slug = 'bhopal'), 'Piplani, Bhopal',               '@14381', 23.2668, 77.4573)
ON CONFLICT DO NOTHING;

-- ── Indore ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'indore'), 'Vijay Nagar, Indore',           '@14382', 22.7508, 75.8898),
((SELECT id FROM city_registry WHERE waqi_slug = 'indore'), 'Nehru Nagar, Indore',           '@14383', 22.7193, 75.8540)
ON CONFLICT DO NOTHING;

-- ── Surat ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'surat'), 'Lal Darwaja, Surat',             '@14064', 21.1958, 72.8304),
((SELECT id FROM city_registry WHERE waqi_slug = 'surat'), 'Bhagwat Para, Surat',            '@14065', 21.1822, 72.8259),
((SELECT id FROM city_registry WHERE waqi_slug = 'surat'), 'Sachin GIDC, Surat',             '@14066', 21.0877, 72.8829)
ON CONFLICT DO NOTHING;

-- ── Visakhapatnam ──────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'visakhapatnam'), 'Bheemunipatnam, Vizag',  '@14163', 17.8907, 83.4524),
((SELECT id FROM city_registry WHERE waqi_slug = 'visakhapatnam'), 'Hindustan Zinc, Vizag',  '@14164', 17.7210, 83.2786),
((SELECT id FROM city_registry WHERE waqi_slug = 'visakhapatnam'), 'GVMC Ward Office, Vizag','@14165', 17.7122, 83.2982),
((SELECT id FROM city_registry WHERE waqi_slug = 'visakhapatnam'), 'Neru Park, Vizag',       '@14166', 17.7332, 83.3180)
ON CONFLICT DO NOTHING;

-- ── Kochi ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'kochi'), 'Eloor, Kochi',                   '@14408', 10.0776, 76.3065),
((SELECT id FROM city_registry WHERE waqi_slug = 'kochi'), 'Vyttila Hub, Kochi',             '@14409', 9.9704,  76.3021)
ON CONFLICT DO NOTHING;

-- ── Bhubaneswar ────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'bhubaneswar'), 'BJB Nagar, Bhubaneswar',   '@14335', 20.2650, 85.8401),
((SELECT id FROM city_registry WHERE waqi_slug = 'bhubaneswar'), 'Rasulgarh, Bhubaneswar',   '@14336', 20.2980, 85.8493)
ON CONFLICT DO NOTHING;

-- ── Jodhpur ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'jodhpur'), 'Shastri Nagar, Jodhpur',       '@14186', 26.2957, 73.0320),
((SELECT id FROM city_registry WHERE waqi_slug = 'jodhpur'), 'Ratanada, Jodhpur',            '@14187', 26.2818, 73.0146)
ON CONFLICT DO NOTHING;

-- ── Coimbatore ─────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'coimbatore'), 'Saravanampatti, Coimbatore','@14030', 11.0727, 76.9996),
((SELECT id FROM city_registry WHERE waqi_slug = 'coimbatore'), 'Siddhapudur, Coimbatore',   '@14031', 11.0047, 76.9666)
ON CONFLICT DO NOTHING;

-- ── Guwahati ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'guwahati'), 'Pan Bazar, Guwahati',         '@14450', 26.1861, 91.7439),
((SELECT id FROM city_registry WHERE waqi_slug = 'guwahati'), 'Bamunimaidam, Guwahati',      '@14451', 26.1633, 91.7680)
ON CONFLICT DO NOTHING;

-- ── Raipur ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'raipur'), 'Civil Lines, Raipur',           '@14391', 21.2584, 81.6317),
((SELECT id FROM city_registry WHERE waqi_slug = 'raipur'), 'GE Road, Raipur',               '@14392', 21.2470, 81.6467)
ON CONFLICT DO NOTHING;

-- ── Ranchi ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'ranchi'), 'Dhurwa, Ranchi',                '@14396', 23.3001, 85.3183),
((SELECT id FROM city_registry WHERE waqi_slug = 'ranchi'), 'Booty More, Ranchi',            '@14397', 23.3699, 85.3279)
ON CONFLICT DO NOTHING;

-- ── Ghaziabad ──────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'ghaziabad'), 'Indirapuram, Ghaziabad',     '@12413', 28.6406, 77.3702),
((SELECT id FROM city_registry WHERE waqi_slug = 'ghaziabad'), 'Vasundhara, Ghaziabad',      '@12414', 28.6584, 77.3755),
((SELECT id FROM city_registry WHERE waqi_slug = 'ghaziabad'), 'Loni, Ghaziabad',            '@12415', 28.7478, 77.2870)
ON CONFLICT DO NOTHING;

-- ── Noida ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'noida'), 'Sector 1, Noida',                '@12401', 28.5893, 77.3143),
((SELECT id FROM city_registry WHERE waqi_slug = 'noida'), 'Sector 62, Noida',               '@12402', 28.6257, 77.3659),
((SELECT id FROM city_registry WHERE waqi_slug = 'noida'), 'Sector 125, Noida',              '@12403', 28.5450, 77.3267)
ON CONFLICT DO NOTHING;

-- ── Faridabad ──────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'faridabad'), 'Sector 11, Faridabad',       '@12420', 28.4218, 77.3113),
((SELECT id FROM city_registry WHERE waqi_slug = 'faridabad'), 'Sector 16 A, Faridabad',     '@12421', 28.4111, 77.3214)
ON CONFLICT DO NOTHING;

-- ── Gurugram ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'gurugram'), 'Gwal Pahari, Gurugram',       '@12430', 28.4302, 77.1485),
((SELECT id FROM city_registry WHERE waqi_slug = 'gurugram'), 'Sector 51, Gurugram',         '@12431', 28.4354, 77.0781),
((SELECT id FROM city_registry WHERE waqi_slug = 'gurugram'), 'Teri Gram, Gurugram',         '@12432', 28.4673, 76.9978)
ON CONFLICT DO NOTHING;

-- ── Meerut ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'meerut'), 'Ganganagar, Meerut',            '@14261', 28.9823, 77.7106),
((SELECT id FROM city_registry WHERE waqi_slug = 'meerut'), 'Pallavpuram, Meerut',           '@14262', 28.9667, 77.6978)
ON CONFLICT DO NOTHING;

-- ── Rajkot ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'rajkot'), 'Aji GIDC, Rajkot',              '@14070', 22.2938, 70.7917),
((SELECT id FROM city_registry WHERE waqi_slug = 'rajkot'), 'Race Course, Rajkot',           '@14071', 22.3010, 70.8026)
ON CONFLICT DO NOTHING;

-- ── Vadodara ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'vadodara'), 'Gorwa, Vadodara',             '@14067', 22.3312, 73.1575),
((SELECT id FROM city_registry WHERE waqi_slug = 'vadodara'), 'Manjalpur, Vadodara',         '@14068', 22.2748, 73.2038),
((SELECT id FROM city_registry WHERE waqi_slug = 'vadodara'), 'Chhani, Vadodara',            '@14069', 22.3570, 73.1843)
ON CONFLICT DO NOTHING;

-- ── Nashik ─────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'nashik'), 'College Road, Nashik',          '@14098', 20.0111, 73.7927),
((SELECT id FROM city_registry WHERE waqi_slug = 'nashik'), 'Satpur, Nashik',                '@14099', 20.0225, 73.7551)
ON CONFLICT DO NOTHING;

-- ── Aurangabad ─────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'aurangabad'), 'Cidco, Aurangabad',         '@14100', 19.9010, 75.3425),
((SELECT id FROM city_registry WHERE waqi_slug = 'aurangabad'), 'Waluj MIDC, Aurangabad',    '@14101', 19.8484, 75.2702)
ON CONFLICT DO NOTHING;

-- ── Dhanbad ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'dhanbad'), 'Saraidhela, Dhanbad',          '@14399', 23.7890, 86.4265),
((SELECT id FROM city_registry WHERE waqi_slug = 'dhanbad'), 'Jharia, Dhanbad',              '@14400', 23.7464, 86.4172)
ON CONFLICT DO NOTHING;

-- ── Allahabad (Prayagraj) ──────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'allahabad'), 'Civil Lines, Allahabad',     '@14286', 25.4606, 81.8370),
((SELECT id FROM city_registry WHERE waqi_slug = 'allahabad'), 'Kidwaipuram, Allahabad',     '@14287', 25.4297, 81.8591)
ON CONFLICT DO NOTHING;

-- ── Ludhiana ───────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'ludhiana'), 'Sahnewal, Ludhiana',          '@14298', 30.8473, 75.9258),
((SELECT id FROM city_registry WHERE waqi_slug = 'ludhiana'), 'Tajpur Road, Ludhiana',       '@14299', 30.9307, 75.8736)
ON CONFLICT DO NOTHING;

-- ── Tiruchirappalli ────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'tiruchirappalli'), 'Ariyamangalam, Trichy','@14032', 10.8551, 78.7483),
((SELECT id FROM city_registry WHERE waqi_slug = 'tiruchirappalli'), 'Integrals Coach, Trichy','@14033', 10.7664, 78.8043)
ON CONFLICT DO NOTHING;

-- ── Madurai ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'madurai'), 'Mattuthavani, Madurai',        '@14034', 9.9591,  78.1176),
((SELECT id FROM city_registry WHERE waqi_slug = 'madurai'), 'Kappalur, Madurai',            '@14035', 9.8849,  78.0460)
ON CONFLICT DO NOTHING;

-- ── Navi Mumbai ────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'navi-mumbai'), 'Nerul, Navi Mumbai',       '@14492', 19.0330, 73.0196),
((SELECT id FROM city_registry WHERE waqi_slug = 'navi-mumbai'), 'Airoli, Navi Mumbai',      '@14493', 19.1566, 72.9986)
ON CONFLICT DO NOTHING;

-- ── Thane ──────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'thane'), 'Wagle Estate, Thane',            '@14494', 19.2073, 72.9806),
((SELECT id FROM city_registry WHERE waqi_slug = 'thane'), 'Kalwa, Thane',                   '@14495', 19.1887, 73.0153)
ON CONFLICT DO NOTHING;

-- ── Manesar ────────────────────────────────────────────────────────────────
INSERT INTO city_stations (city_id, station_name, waqi_station_id, lat, lon) VALUES
((SELECT id FROM city_registry WHERE waqi_slug = 'manesar'), 'IMT Manesar, Gurugram',        '@12433', 28.3580, 76.9327)
ON CONFLICT DO NOTHING;
