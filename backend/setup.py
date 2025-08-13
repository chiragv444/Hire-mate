#!/usr/bin/env python3
"""
HireMate Backend Setup Script
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def main():
    print("🚀 Setting up HireMate Backend...")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Note: Files will be uploaded to Firebase Storage instead of local directory
    print("✅ Firebase Storage will be used for file uploads")
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Set up Firebase service account key (service-account-key.json)")
    print("2. Set up OpenAI API key in environment variables")
    print("3. Run the backend: python run.py")
    print("4. Access API docs: http://localhost:8000/docs")
    print("\n🔧 Configuration:")
    print("- Backend will run on: http://localhost:8000")
    print("- API prefix: /api/v1")
    print("- File storage: Firebase Storage")
    print("- AI processing: OpenAI + LangChain")

if __name__ == "__main__":
    main() 