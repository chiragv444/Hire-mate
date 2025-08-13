#!/usr/bin/env python3
"""
HireMate Backend Startup Script
"""

import uvicorn
import os
import sys
import signal
import argparse

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def signal_handler(signum, frame):
    """Handle termination signals gracefully"""
    print("\n🛑 Shutting down HireMate Backend...")
    sys.exit(0)

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='HireMate Backend API')
    parser.add_argument('--reload', action='store_true', help='Enable auto-reload (development mode)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, help='Port to bind to (default: 8000)')
    args = parser.parse_args()
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🚀 Starting HireMate Backend API...")
    print(f"🌐 Server: http://{args.host}:{args.port}")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    
    if args.reload:
        print("🔄 Auto-reload enabled (development mode)")
        print("⚠️  Note: Use Ctrl+C to stop the server")
    else:
        print("⚡ Production mode (no auto-reload)")
        print("💡 Use --reload flag for development mode")
    
    try:
        uvicorn.run(
            "app.main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1) 