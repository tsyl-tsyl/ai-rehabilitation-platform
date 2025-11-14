from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from typing import Optional
import jwt
import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

# 数据库配置  database-1.c12mwksy0ewr.me-central-1.rds.amazonaws.com,1433
DATABASE_CONFIG = {
    'server': os.getenv('DB_SERVER', ''),
    'database': os.getenv('DB_NAME', ''),
    'username': os.getenv('DB_USERNAME', ''),
    'password': os.getenv('DB_PASSWORD', ''),
    'driver': os.getenv('DB_DRIVER', '')
}

# JWT配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_db_connection():
    conn_str = f"""
        DRIVER={DATABASE_CONFIG['driver']};
        SERVER={DATABASE_CONFIG['server']};
        DATABASE={DATABASE_CONFIG['database']};
        UID={DATABASE_CONFIG['username']};
        PWD={DATABASE_CONFIG['password']};
    """
    return pyodbc.connect(conn_str)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录"
        )
    except jwt.InvalidTokenError:
        raise credentials_exception
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT UserID, Username, FullName, Email, Role, IsActive 
            FROM Users WHERE Username = ?
        """, username)
        user = cursor.fetchone()
        if user is None:
            raise credentials_exception
        return {
            "user_id": user.UserID,
            "username": user.Username,
            "full_name": user.FullName,
            "email": user.Email,
            "role": user.Role
        }
    finally:
        cursor.close()
        conn.close()