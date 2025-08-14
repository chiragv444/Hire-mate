# Backend Dockerfile for Python FastAPI
FROM python:3.11.13-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies including Chrome/Chromium
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    gnupg \
    gpg \
    unzip \
    xvfb \
    # Chrome dependencies
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    # Additional dependencies for ML/AI packages
    libblas3 \
    liblapack3 \
    libhdf5-dev \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver
RUN wget -q "https://chromedriver.storage.googleapis.com/LATEST_RELEASE" -O /tmp/chromedriver_version \
    && CHROMEDRIVER_VERSION=$(cat /tmp/chromedriver_version) \
    && echo "Installing ChromeDriver version: $CHROMEDRIVER_VERSION" \
    && wget -q "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip" -O /tmp/chromedriver.zip \
    && unzip /tmp/chromedriver.zip -d /usr/local/bin/ \
    && rm /tmp/chromedriver.zip /tmp/chromedriver_version \
    && chmod +x /usr/local/bin/chromedriver

# Set Chrome and ChromeDriver environment variables
ENV CHROME_BIN=/usr/bin/google-chrome-stable
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
ENV DISPLAY=:99

# Build arguments for environment variables
ARG OPENAI_API_KEY

# Set OpenAI API key (can be overridden at runtime)
ENV OPENAI_API_KEY=$OPENAI_API_KEY

# Verify Chrome and ChromeDriver installation
RUN google-chrome-stable --version && \
    chromedriver --version && \
    echo "Chrome and ChromeDriver installed successfully"

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy setup.py and run setup
COPY setup.py .
RUN python setup.py

# Copy the rest of the application
COPY . .

# Test the setup to ensure everything is working
RUN python test_docker_setup.py

# Note: Files will be uploaded to Firebase Storage instead of local directory

# Expose port 8000
EXPOSE 8000

# Run the application using run.py
CMD ["python", "run.py"]
