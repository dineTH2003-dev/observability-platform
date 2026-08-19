FROM python:3.10-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create artifacts directory for ML model storage
RUN mkdir -p /app/artifacts

CMD ["python", "-m", "app.jobs.run_worker", "--interval-seconds", "60", "--minutes", "60"]
