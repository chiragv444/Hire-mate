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
    
    # Download spaCy model
    if not run_command("python -m spacy download en_core_web_sm", "Downloading spaCy model"):
        print("❌ Failed to download spaCy model")
        sys.exit(1)
    
    # Download NLTK data
    if not run_command("python -c \"import nltk; nltk.download('punkt'); nltk.download('stopwords')\"", "Downloading NLTK data"):
        print("❌ Failed to download NLTK data")
        sys.exit(1)
    
    # Create upload directory
    upload_dir = "assets/resumes"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        print(f"✅ Created upload directory: {upload_dir}")
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Set up Firebase service account key (service-account-key.json)")
    print("2. Run the backend: python run.py")
    print("3. Access API docs: http://localhost:8000/docs")
    print("\n🔧 Configuration:")
    print("- Backend will run on: http://localhost:8000")
    print("- API prefix: /api/v1")
    print("- Upload directory: assets/resumes")

if __name__ == "__main__":
    main() 