"""
Create MySQL database for CourtPilot
"""
import pymysql
from app.core.config import settings

try:
    # Connect to MySQL server (without database)
    connection = pymysql.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD
    )
    
    cursor = connection.cursor()
    
    # Create database if it doesn't exist
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    print(f"✅ Database '{settings.MYSQL_DB}' created/verified successfully!")
    
    # Show databases
    cursor.execute("SHOW DATABASES")
    databases = cursor.fetchall()
    print("\n📊 Available databases:")
    for db in databases:
        print(f"  - {db[0]}")
    
    cursor.close()
    connection.close()
    
    print(f"\n✅ MySQL is ready!")
    print(f"   Host: {settings.MYSQL_HOST}:{settings.MYSQL_PORT}")
    print(f"   Database: {settings.MYSQL_DB}")
    print(f"   User: {settings.MYSQL_USER}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure MySQL service is running")
    print("2. Check your credentials in .env file")
    print("3. Verify MySQL port (default: 3306)")
