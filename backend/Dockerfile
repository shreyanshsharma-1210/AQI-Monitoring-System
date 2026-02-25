FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for psycopg2 and others
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Command is overridden in docker-compose.yml depending on the service
CMD ["python", "pathway_pipeline/aqi_pipeline.py"]
