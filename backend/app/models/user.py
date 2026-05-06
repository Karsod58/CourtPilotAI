"""
User model for authentication and user management
"""
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """User model for storing user information"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  # Store hashed password in production
    department = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    avatar = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"

