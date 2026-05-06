"""
Application configuration management
"""
from pydantic_settings import BaseSettings
from typing import List
import os
from urllib.parse import quote_plus


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "CourtPilot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database - MySQL
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "courtpilot"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    USE_SQLITE: bool = True  # Default to SQLite for easy setup
    
    # Database - PostgreSQL (for production/Render)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "courtpilot"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    
    # Direct DATABASE_URL override (for Render/Railway)
    DATABASE_URL_OVERRIDE: str = ""
    
    @property
    def DATABASE_URL(self) -> str:
        # If DATABASE_URL is provided directly (from Render/Railway), use it
        if self.DATABASE_URL_OVERRIDE:
            url = self.DATABASE_URL_OVERRIDE
            
            # Convert postgres:// to postgresql+asyncpg://
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            
            # Convert mysql:// to mysql+aiomysql://
            elif url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+aiomysql://", 1)
            
            return url
            
        if self.USE_SQLITE:
            return "sqlite+aiosqlite:///./courtpilot.db"
            
        # Check if PostgreSQL credentials are provided
        if self.POSTGRES_PASSWORD:
            encoded_password = quote_plus(self.POSTGRES_PASSWORD)
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{encoded_password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            
        # Fallback to MySQL
        encoded_password = quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+aiomysql://{self.MYSQL_USER}:{encoded_password}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
    
    # Database - MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "courtpilot"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # AI/LLM Configuration
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "https://ollama.com"
    OLLAMA_API_KEY: str = ""
    OLLAMA_MODEL: str = "llama3.1:8b"
    LLM_PROVIDER: str = "ollama"  # openai, anthropic, or ollama
    LLM_MODEL: str = "llama3.1:8b"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Vector Store
    VECTOR_STORE_TYPE: str = "faiss"
    VECTOR_STORE_PATH: str = "./data/vector_store"
    
    # OCR Configuration
    TESSERACT_PATH: str = "/usr/bin/tesseract"
    OCR_LANGUAGE: str = "eng+hin"
    
    # Document Storage
    DOCUMENT_STORAGE_PATH: str = "./data/documents"
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB
    
    # Security
    SECRET_KEY: str = "your_secret_key_here_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Can be comma-separated string or list
    CORS_ORIGINS_STR: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from comma-separated string or return default list"""
        if self.CORS_ORIGINS_STR:
            # Split by comma and strip whitespace
            origins = [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",")]
            return [origin for origin in origins if origin]  # Remove empty strings
        return ["http://localhost:3000", "http://localhost:5173"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/courtpilot.log"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # AI Processing
    CONFIDENCE_THRESHOLD: float = 0.7
    LOW_CONFIDENCE_THRESHOLD: float = 0.5
    BATCH_SIZE: int = 10
    
    # Alert Configuration
    ALERT_EMAIL_ENABLED: bool = False
    ALERT_SMS_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    
    # Department Mapping
    DEPARTMENT_MAPPING_FILE: str = "./data/department_mapping.json"
    
    # Legal Intelligence
    SIMILAR_CASE_THRESHOLD: float = 0.8
    APPEAL_RECOMMENDATION_THRESHOLD: float = 0.6
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Create necessary directories
os.makedirs(settings.DOCUMENT_STORAGE_PATH, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)
os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
