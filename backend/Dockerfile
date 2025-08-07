# Backend Dockerfile for Python FastAPI
FROM python:3.11.13-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy setup.py and run setup
COPY setup.py .
RUN python setup.py

# Copy the rest of the application
COPY . .

# Create assets directory for file uploads
RUN mkdir -p assets/resumes

# Expose port 8000
EXPOSE 8000

# Run the application using run.py
CMD ["python", "run.py"]
