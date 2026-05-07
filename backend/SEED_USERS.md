# Seed Demo Users for Production

This guide explains how to add demo users to your production database on Railway.

## Demo Users

The following demo users will be created:

| Name | Email | Password | Role | Employee ID |
|------|-------|----------|------|-------------|
| Admin User | admin@courtpilot.com | admin123 | Admin | ADMIN001 |
| Legal Officer | legal@courtpilot.com | legal123 | Legal Officer | LEGAL001 |
| Compliance Manager | compliance@courtpilot.com | compliance123 | Manager | COMP001 |

⚠️ **IMPORTANT**: Change these passwords after first login!

---

## Method 1: Run on Railway (Recommended)

### Step 1: Open Railway Dashboard
1. Go to your Railway project
2. Click on your **CourtPilotAI** service
3. Click on the **Settings** tab

### Step 2: Run One-Off Command
1. Scroll down to **One-Off Commands**
2. Enter this command:
   ```bash
   python seed_production.py
   ```
3. Click **Run**
4. Wait for the command to complete
5. Check the logs to see the created users

---

## Method 2: Run Locally (Connects to Production DB)

### Prerequisites
- Python 3.11+
- Production database credentials

### Step 1: Set Environment Variables
Create a `.env.production` file or export these variables:

```bash
DATABASE_URL_OVERRIDE=mysql://root:password@mysql.railway.internal:3306/railway
```

### Step 2: Run the Script

**Create admin user only:**
```bash
cd backend
python create_admin_user.py
```

**Create all demo users:**
```bash
cd backend
python create_admin_user.py --all
```

**Or use the production seed script:**
```bash
cd backend
python seed_production.py
```

---

## Method 3: Using Railway CLI

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Link to Your Project
```bash
cd backend
railway link
```

### Step 4: Run the Seed Script
```bash
railway run python seed_production.py
```

---

## Verify Users Were Created

### Option 1: Check via API
Visit: https://courtpilotai-production.up.railway.app/docs

Try logging in with:
- Email: `admin@courtpilot.com`
- Password: `admin123`

### Option 2: Check Database Directly
1. Go to Railway Dashboard
2. Click on your **MySQL** service
3. Click on **Data** tab
4. Run query:
   ```sql
   SELECT id, name, email, role, employee_id FROM users;
   ```

---

## Troubleshooting

### Error: "Admin user already exists"
This means the user is already in the database. You can:
- Use a different email
- Delete the existing user first
- Skip this step

### Error: "No DATABASE_URL found"
Make sure your environment variables are set correctly in Railway:
- `DATABASE_URL_OVERRIDE` or `DATABASE_URL`

### Error: "Can't connect to MySQL server"
Check that:
- MySQL service is running on Railway
- `MYSQL_HOST` is set to `mysql.railway.internal`
- Database credentials are correct

---

## Security Notes

⚠️ **These are DEMO credentials for testing only!**

For production use:
1. Use strong, unique passwords
2. Implement password hashing (bcrypt)
3. Enable two-factor authentication
4. Regularly rotate credentials
5. Use environment variables for sensitive data

---

## Next Steps

After creating demo users:
1. ✅ Test login at https://court-pilot-ai.vercel.app
2. ✅ Upload a sample judgment PDF
3. ✅ Test the verification workflow
4. ✅ Create action plans
5. ✅ Test the chat assistant

---

## Support

If you encounter any issues:
1. Check Railway deployment logs
2. Verify database connection
3. Ensure all environment variables are set
4. Check the API documentation at `/docs`
