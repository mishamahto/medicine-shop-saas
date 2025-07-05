from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import bcrypt
import jwt
import os
import logging
from typing import Optional
from datetime import datetime, timedelta
import asyncpg

from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Pydantic models
class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    role: str = "staff"

class UserSetup(BaseModel):
    username: str
    email: str
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: str
    user: dict

def create_jwt_token(data: dict) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.post("/login", response_model=LoginResponse)
async def login(user_data: UserLogin, conn: asyncpg.Connection = Depends(get_db)):
    """User login endpoint"""
    try:
        # Find user by username or email
        user = await conn.fetchrow(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            user_data.username
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not bcrypt.checkpw(user_data.password.encode('utf-8'), user['password'].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create JWT token
        token_data = {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
        token = create_jwt_token(token_data)
        
        return LoginResponse(
            success=True,
            message="Login successful",
            token=token,
            user={
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/setup", response_model=LoginResponse)
async def setup_admin(user_data: UserSetup, conn: asyncpg.Connection = Depends(get_db)):
    """Setup first admin user"""
    try:
        # Check if any users exist
        user_count = await conn.fetchval('SELECT COUNT(*) FROM users')
        
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Setup already completed. Use registration instead."
            )
        
        # Hash password
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert admin user
        user = await conn.fetchrow('''
            INSERT INTO users (username, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role
        ''', user_data.username, user_data.email, hashed_password, 'admin')
        
        # Create JWT token
        token_data = {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
        token = create_jwt_token(token_data)
        
        return LoginResponse(
            success=True,
            message="Admin user created successfully",
            token=token,
            user={
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Setup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/register", response_model=LoginResponse)
async def register(user_data: UserRegister, conn: asyncpg.Connection = Depends(get_db)):
    """Register new user"""
    try:
        # Check if user already exists
        existing_user = await conn.fetchrow(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            user_data.username, user_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        # Hash password
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert new user
        user = await conn.fetchrow('''
            INSERT INTO users (username, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role
        ''', user_data.username, user_data.email, hashed_password, user_data.role)
        
        # Create JWT token
        token_data = {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
        token = create_jwt_token(token_data)
        
        return LoginResponse(
            success=True,
            message="User created successfully",
            token=token,
            user={
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/me", response_model=dict)
async def get_current_user(
    token_data: dict = Depends(verify_token),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Get current user information"""
    try:
        user = await conn.fetchrow(
            'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
            token_data['id']
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role'],
                "created_at": user['created_at']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/change-password")
async def change_password(
    password_data: ChangePassword,
    token_data: dict = Depends(verify_token),
    conn: asyncpg.Connection = Depends(get_db)
):
    """Change user password"""
    try:
        # Get current user password
        user = await conn.fetchrow(
            'SELECT password FROM users WHERE id = $1',
            token_data['id']
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not bcrypt.checkpw(password_data.current_password.encode('utf-8'), user['password'].encode('utf-8')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_hashed_password = bcrypt.hashpw(password_data.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        await conn.execute(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            new_hashed_password, token_data['id']
        )
        
        return {
            "success": True,
            "message": "Password updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 