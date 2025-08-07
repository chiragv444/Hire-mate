# HireMate Deployment Guide

## 🚀 Quick Answers to Your Questions

### 1. **Environment Variables Issue - FIXED ✅**
The `.env` file wasn't being used during Docker build because Vite needs environment variables at **build time**, not runtime. I've fixed this by:
- Adding `ARG` declarations in the Dockerfile
- Passing build arguments in docker-compose.yml
- Setting environment variables during the build process

### 2. **Docker Compose Detached Mode**
To run Docker without blocking your terminal (for server deployment):

```bash
# Development (foreground, shows logs)
docker compose up --build

# Production/Server (background, terminates terminal)
docker compose up --build -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### 3. **What nginx.conf Does**
The `nginx.conf` file configures the Nginx web server that serves your React frontend:
- **Serves static files** (HTML, CSS, JS) built by Vite
- **Handles client-side routing** (React Router) with `try_files`
- **Optimizes performance** with gzip compression and caching
- **Adds security headers** to protect against common attacks
- **Runs on port 4000** as specified

## 🌐 Domain Binding Setup

### For Custom Domains (hiremate.me → frontend, api.hiremate.me → backend)

I've created two additional files for production deployment:

#### 1. **Production Docker Compose** (`docker-compose.production.yml`)
- Adds Nginx reverse proxy container
- Binds domains to appropriate services
- Exposes only port 80/443 (not individual service ports)

#### 2. **Production Nginx Config** (`nginx-production.conf`)
- Routes `hiremate.me` → frontend container
- Routes `api.hiremate.me` → backend container
- Includes SSL/HTTPS configuration (commented out)

### Production Deployment Steps:

1. **Set up DNS records:**
   ```
   A    hiremate.me      → YOUR_SERVER_IP
   A    api.hiremate.me  → YOUR_SERVER_IP
   ```

2. **Deploy with production config:**
   ```bash
   # Use production docker-compose
   docker compose -f docker-compose.production.yml up --build -d
   ```

3. **Access your app:**
   - Frontend: `http://hiremate.me`
   - Backend API: `http://api.hiremate.me`
   - API Docs: `http://api.hiremate.me/docs`

## 🔒 SSL/HTTPS Setup (Optional)

To enable HTTPS:

1. **Get SSL certificates** (Let's Encrypt, Cloudflare, etc.)
2. **Place certificates in ssl/ directory:**
   ```
   ssl/
   ├── certs/
   │   ├── hiremate.me.crt
   │   └── api.hiremate.me.crt
   └── private/
       ├── hiremate.me.key
       └── api.hiremate.me.key
   ```
3. **Uncomment SSL sections** in `nginx-production.conf`
4. **Uncomment SSL volume mounts** in `docker-compose.production.yml`

## 📋 Deployment Commands Summary

### Development (Local)
```bash
# Standard development setup
docker compose up --build

# Background development
docker compose up --build -d
```

### Production (Server)
```bash
# Production with custom domains
docker compose -f docker-compose.production.yml up --build -d

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f

# Stop
docker compose -f docker-compose.production.yml down
```

## 🛠️ Environment Variables

Make sure your `.env` file contains all Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 🔧 Troubleshooting

### Firebase Not Initializing
- Ensure `.env` file exists in project root
- Check that all Firebase environment variables are set
- Rebuild containers: `docker compose build --no-cache`

### Domain Not Working
- Verify DNS records point to your server IP
- Check nginx logs: `docker compose logs nginx`
- Ensure ports 80/443 are open on your server

### Container Not Starting
- Check logs: `docker compose logs [service-name]`
- Verify all required files exist (service-account-key.json, .env)
- Check Docker daemon is running
