"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from loguru import logger

from app.core.database import get_db
from app.models.user import User


router = APIRouter(tags=["Authentication"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user: dict
    token: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    department: str
    role: str
    employeeId: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint - validates credentials and returns user data
    """
    try:
        # Query user by email
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Validate password (in production, use hashed passwords)
        if user.password != request.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Return user data (excluding password)
        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "employeeId": user.employee_id,
            "avatar": user.avatar
        }
        
        logger.info(f"User logged in: {user.email}")
        
        return {
            "user": user_data,
            "token": "mock-jwt-token-" + str(user.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/register")
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register new user
    """
    try:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == request.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Check if employee ID already exists
        result = await db.execute(
            select(User).where(User.employee_id == request.employeeId)
        )
        existing_employee = result.scalar_one_or_none()
        
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this employee ID already exists"
            )
        
        # Create new user
        new_user = User(
            name=request.name,
            email=request.email,
            password=request.password,  # In production, hash this!
            department=request.department,
            role=request.role,
            employee_id=request.employeeId,
            avatar=None
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"New user registered: {new_user.email}")
        
        return {
            "message": "User registered successfully",
            "user_id": new_user.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration"
        )

