from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # FastAPI Settings
    app_name: str = "HireMate Backend API"
    version: str = "1.0.0"
    debug: bool = True
    
    # Firebase Settings
    firebase_project_id: str = "hire-mate"
    firebase_private_key_id: Optional[str] = None
    firebase_private_key: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_client_id: Optional[str] = None
    firebase_auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    firebase_token_uri: str = "https://oauth2.googleapis.com/token"
    firebase_auth_provider_x509_cert_url: str = "https://www.googleapis.com/oauth2/v1/certs"
    firebase_client_x509_cert_url: Optional[str] = None
    
    # File Upload Settings
    upload_dir: str = "resumes"  # Firebase Storage folder
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list = [".pdf", ".docx", ".doc"]
    
    # NLP Settings
    spacy_model: str = "en_core_web_sm"
    
    # CORS Settings
    allowed_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings() 