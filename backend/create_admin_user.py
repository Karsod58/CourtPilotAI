"""
Create admin user for production database
Run this script to add a demo admin user to the production database
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.models.user import User
from app.core.config import settings
import sys


async def create_admin_user():
    """Create admin user in the database"""
    
    # Use the production database URL
    database_url = settings.DATABASE_URL
    print(f"Connecting to database...")
    print(f"Database URL: {database_url.split('@')[0]}@****")  # Hide credentials
    
    # Create engine
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if admin user already exists
            result = await session.execute(
                select(User).where(User.email == "admin@courtpilot.com")
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print("❌ Admin user already exists!")
                print(f"   Email: {existing_user.email}")
                print(f"   Name: {existing_user.name}")
                print(f"   Employee ID: {existing_user.employee_id}")
                return
            
            # Create admin user
            admin_user = User(
                name="Admin User",
                email="admin@courtpilot.com",
                password="Admin123",  # In production, this should be hashed!
                department="Administration",
                role="Admin",
                employee_id="ADMIN001",
                avatar=None
            )
            
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            
            print("✅ Admin user created successfully!")
            print(f"   Email: {admin_user.email}")
            print(f"   Password: Admin123")
            print(f"   Name: {admin_user.name}")
            print(f"   Department: {admin_user.department}")
            print(f"   Role: {admin_user.role}")
            print(f"   Employee ID: {admin_user.employee_id}")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
            
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            await session.rollback()
            sys.exit(1)
        finally:
            await engine.dispose()


async def create_demo_users():
    """Create multiple demo users for testing"""
    
    database_url = settings.DATABASE_URL
    print(f"Connecting to database...")
    
    engine = create_async_engine(database_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
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
        },
        {
            "name": "Department Head",
            "email": "head@courtpilot.com",
            "password": "Head123",
            "department": "Operations",
            "role": "Department Head",
            "employee_id": "HEAD001"
        }
    ]
    
    async with AsyncSessionLocal() as session:
        try:
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
                print(f"✅ Created: {user_data['email']} (Password: {user_data['password']})")
                created_count += 1
            
            await session.commit()
            
            print(f"\n📊 Summary:")
            print(f"   Created: {created_count} users")
            print(f"   Skipped: {skipped_count} users")
            print(f"\n⚠️  IMPORTANT: Change all passwords after first login!")
            
        except Exception as e:
            print(f"❌ Error creating demo users: {e}")
            await session.rollback()
            sys.exit(1)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        print("Creating all demo users...\n")
        asyncio.run(create_demo_users())
    else:
        print("Creating admin user...\n")
        print("Tip: Use --all flag to create multiple demo users\n")
        asyncio.run(create_admin_user())
