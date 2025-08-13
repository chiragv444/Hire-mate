#!/usr/bin/env python3
"""
HireMate Backend Startup Script (Production Mode)
No auto-reload, clean shutdown
"""

import uvicorn
import os
import sys
import signal

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def signal_handler(signum, frame):
    """Handle termination signals gracefully"""
    print("\n🛑 Shutting down HireMate Backend...")
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🚀 Starting HireMate Backend API (Production Mode)...")
    print("🌐 Server: http://0.0.0.0:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    print("⚡ No auto-reload - clean shutdown guaranteed")
    print("💡 Use Ctrl+C to stop the server")
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=False,  # No reload mode
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
