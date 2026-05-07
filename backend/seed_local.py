"""
Seed production database from local machine
Uses public Railway proxy URL
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

# Import models
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.models.user import User
from app.core.database import Base


async def seed_database():
    """Seed the production database with demo users"""
    
    # REPLACE THIS WITH YOUR RAILWAY PUBLIC MYSQL URL
    # Get it from: Railway Dashboard → MySQL → Connect → Public URL
    # Format: mysql://root:password@trolley.proxy.rlwy.net:PORT/railway
    
    database_url = input("Enter your Railway MySQL public URL: ").strip()
    
    if not database_url:
        print("❌ No database URL provided")
        return
    
    # Convert mysql:// to mysql+aiomysql://
    if database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+aiomysql://", 1)
    
    print(f"\n🔗 Connecting to database...")
    print(f"   URL: {database_url.split('@')[0]}@****\n")
    
    # Create engine
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    # Demo users to create
    demo_users = [
        {
            "name": "Admin User",
            "email": "admin@courtpilot.com",
            "password": "Admin123",
            "department": "Administration",
            "role": "Admin",
            "employee_id": "ADMIN001"
        },
        {
            "name": "Legal Officer",
            "email": "legal@courtpilot.com",
            "password": "Legal123",
            "department": "Legal Department",
            "role": "Legal Officer",
            "employee_id": "LEGAL001"
        },
        {
            "name": "Compliance Manager",
            "email": "compliance@courtpilot.com",
            "password": "Compliance123",
            "department": "Compliance",
            "role": "Manager",
            "employee_id": "COMP001"
        }
    ]
    
    async with AsyncSessionLocal() as session:
        try:
            # Ensure tables exist
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            print("✅ Database connection successful")
            print("✅ Tables verified\n")
            
            created_count = 0
            skipped_count = 0
            
            for user_data in demo_users:
                # Check if user already exists
                result = await session.execute(
                    select(User).where(User.email == user_data["email"])
                )
                existing_user = result.scalar_one_or_none()
                
                if existing_user:
                    print(f"⏭️  Skipped: {user_data['email']} (already exists)")
                    skipped_count += 1
                    continue
                
                # Create user
                new_user = User(
                    name=user_data["name"],
                    email=user_data["email"],
                    password=user_data["password"],
                    department=user_data["department"],
                    role=user_data["role"],
                    employee_id=user_data["employee_id"],
                    avatar=None
                )
                
                session.add(new_user)
                print(f"✅ Created: {user_data['name']} ({user_data['email']})")
                created_count += 1
            
            await session.commit()
            
            print(f"\n{'='*60}")
            print(f"📊 Summary:")
            print(f"   ✅ Created: {created_count} users")
            print(f"   ⏭️  Skipped: {skipped_count} users")
            print(f"{'='*60}")
            
            if created_count > 0:
                print(f"\n🎉 Demo users are ready!")
                print(f"\n📝 Login Credentials:")
                print(f"{'='*60}")
                for user_data in demo_users:
                    print(f"   Email: {user_data['email']}")
                    print(f"   Password: {user_data['password']}")
                    print(f"   Role: {user_data['role']}")
                    print(f"   {'-'*58}")
                print(f"\n⚠️  IMPORTANT: Change passwords after first login!")
                print(f"\n🌐 Login at: https://court-pilot-ai.vercel.app")
            
        except Exception as e:
            print(f"\n❌ Error seeding database: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    print("="*60)
    print("🌱 CourtPilot - Seed Production Database")
    print("="*60)
    print("\nThis script will create demo users in your Railway database.")
    print("\nYou need the PUBLIC MySQL URL from Railway:")
    print("  1. Go to Railway Dashboard → MySQL service")
    print("  2. Click 'Connect' tab")
    print("  3. Copy the MySQL Connection URL")
    print("  4. It should look like:")
    print("     mysql://root:password@trolley.proxy.rlwy.net:PORT/railway")
    print("\n" + "="*60 + "\n")
    
    asyncio.run(seed_database())
    
    print("\n" + "="*60)
    print("✅ Seeding complete!")
    print("="*60)
