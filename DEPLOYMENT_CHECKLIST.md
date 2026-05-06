# 🚀 Deployment Checklist

## Pre-Deployment Verification

### ✅ Local Testing
- [ ] Backend runs successfully (`cd backend && uvicorn app.main:app --reload`)
- [ ] Frontend runs successfully (`cd frontend && npm run dev`)
- [ ] Database connection works
- [ ] All API endpoints respond correctly
- [ ] File uploads work
- [ ] Search functionality works
- [ ] Chat assistant works
- [ ] PDF downloads work

### ✅ Code Quality
- [ ] No console errors in browser
- [ ] No Python errors in backend logs
- [ ] All environment variables documented
- [ ] Sensitive data not in code
- [ ] .gitignore properly configured
- [ ] No unnecessary files in repository

---

## Backend Deployment (Render)

### 1. Prepare Repository
- [x] Code pushed to GitHub
- [x] `backend/` folder contains all backend code
- [x] `backend/Procfile` exists
- [x] `backend/render.yaml` exists
- [x] `backend/requirements.txt` is up to date

### 2. Render Setup
- [ ] Create new Web Service on Render
- [ ] Connect to GitHub repository
- [ ] Set root directory to `backend`
- [ ] Render will auto-detect Python and use Procfile

### 3. Environment Variables (Render Dashboard)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AI Services
OLLAMA_BASE_URL=http://your-ollama-server:11434
OLLAMA_MODEL=gemma3:12b

# Or use OpenAI/Anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
SECRET_KEY=your-super-secret-key-here

# CORS (add your frontend URL)
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### 4. Database Setup
- [ ] Create PostgreSQL database on Render
- [ ] Copy DATABASE_URL to environment variables
- [ ] Run migrations (if using Alembic)
- [ ] Verify database connection

### 5. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Check logs for errors
- [ ] Test API at `https://your-app.onrender.com/docs`

### 6. Post-Deployment
- [ ] Test `/health` endpoint
- [ ] Test `/docs` (Swagger UI)
- [ ] Upload a test judgment
- [ ] Verify AI processing works
- [ ] Check database has data

---

## Frontend Deployment (Vercel)

### 1. Prepare Repository
- [x] Code pushed to GitHub
- [x] `frontend/` folder contains all frontend code
- [x] `frontend/vercel.json` exists
- [x] `frontend/package.json` is up to date

### 2. Vercel Setup
- [ ] Import project from GitHub
- [ ] Set root directory to `frontend`
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### 3. Environment Variables (Vercel Dashboard)
```env
VITE_API_URL=https://your-backend.onrender.com/api/v1
```

### 4. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Check deployment logs
- [ ] Visit deployed URL

### 5. Post-Deployment
- [ ] Test homepage loads
- [ ] Test navigation works
- [ ] Test API connection (check Network tab)
- [ ] Upload a test judgment
- [ ] Test search functionality
- [ ] Test chat assistant
- [ ] Test all major features

---

## Backend Endpoint to Implement

### ⚠️ Missing Endpoint: PDF Download

You need to add this endpoint to `backend/app/api/v1/judgments.py`:

```python
from fastapi.responses import FileResponse
import os

@router.get("/{judgment_id}/download")
async def download_judgment(
    judgment_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download judgment PDF file"""
    try:
        # Get judgment
        result = await db.execute(
            select(Judgment).where(Judgment.id == judgment_id)
        )
        judgment = result.scalar_one_or_none()
        
        if not judgment:
            raise HTTPException(status_code=404, detail="Judgment not found")
        
        # Get file path
        file_path = judgment.document_path
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        # Return file
        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename=f"{judgment.case_id.replace('/', '_')}.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading judgment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Domain Setup (Optional)

### Backend Custom Domain
1. Go to Render dashboard
2. Settings → Custom Domains
3. Add your domain (e.g., `api.courtpilot.com`)
4. Update DNS records as instructed
5. Wait for SSL certificate

### Frontend Custom Domain
1. Go to Vercel dashboard
2. Settings → Domains
3. Add your domain (e.g., `courtpilot.com`)
4. Update DNS records as instructed
5. Wait for SSL certificate

### Update Environment Variables
After adding custom domains:
- Update `VITE_API_URL` in Vercel to use custom backend domain
- Update `ALLOWED_ORIGINS` in Render to include custom frontend domain

---

## Monitoring & Maintenance

### Backend Monitoring
- [ ] Set up Render alerts for downtime
- [ ] Monitor logs regularly
- [ ] Check database size
- [ ] Monitor API response times
- [ ] Set up error tracking (Sentry)

### Frontend Monitoring
- [ ] Set up Vercel analytics
- [ ] Monitor build times
- [ ] Check for console errors
- [ ] Monitor page load times
- [ ] Set up error tracking

### Database Maintenance
- [ ] Regular backups
- [ ] Monitor disk usage
- [ ] Optimize slow queries
- [ ] Clean up old data periodically

---

## Troubleshooting

### Backend Issues

**Build Fails:**
- Check `requirements.txt` has all dependencies
- Verify Python version in `runtime.txt`
- Check Render build logs

**Database Connection Fails:**
- Verify `DATABASE_URL` is correct
- Check database is running
- Verify network access

**AI Features Don't Work:**
- Check Ollama/OpenAI API keys
- Verify API endpoints are accessible
- Check logs for AI service errors

### Frontend Issues

**Build Fails:**
- Check `package.json` dependencies
- Verify Node version
- Check Vercel build logs

**API Calls Fail:**
- Verify `VITE_API_URL` is correct
- Check CORS settings on backend
- Check Network tab in browser

**Features Don't Work:**
- Check browser console for errors
- Verify API endpoints exist
- Check authentication if required

---

## Security Checklist

### Backend Security
- [ ] Use strong `SECRET_KEY`
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Validate all inputs
- [ ] Use parameterized queries
- [ ] Rate limit API endpoints
- [ ] Keep dependencies updated

### Frontend Security
- [ ] No API keys in frontend code
- [ ] Use environment variables
- [ ] Enable CSP headers
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated

### Database Security
- [ ] Use strong passwords
- [ ] Enable SSL connections
- [ ] Regular backups
- [ ] Limit access by IP
- [ ] Monitor for suspicious activity

---

## Performance Optimization

### Backend
- [ ] Enable response caching
- [ ] Optimize database queries
- [ ] Use connection pooling
- [ ] Compress responses
- [ ] Monitor memory usage

### Frontend
- [ ] Enable code splitting
- [ ] Optimize images
- [ ] Use lazy loading
- [ ] Enable browser caching
- [ ] Minimize bundle size

---

## Post-Deployment Testing

### Functional Testing
- [ ] Upload judgment → Process → Verify → Action Plan
- [ ] Search for judgments
- [ ] Download PDF
- [ ] Chat with AI about judgment
- [ ] View lifecycle tracking
- [ ] Check deadlines page
- [ ] View analytics dashboard

### Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] File upload works for large PDFs
- [ ] Search returns results quickly
- [ ] Chat responses are fast

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Testing
- [ ] Responsive design works
- [ ] Touch interactions work
- [ ] Mobile navigation works

---

## Rollback Plan

If deployment fails:

### Backend Rollback
1. Go to Render dashboard
2. Deployments → Previous deployment
3. Click "Redeploy"

### Frontend Rollback
1. Go to Vercel dashboard
2. Deployments → Previous deployment
3. Click "Promote to Production"

### Database Rollback
1. Restore from backup
2. Run down migrations if needed

---

## Success Criteria

✅ Deployment is successful when:
- [ ] Backend is accessible at production URL
- [ ] Frontend is accessible at production URL
- [ ] All API endpoints work
- [ ] Database is connected and working
- [ ] File uploads work
- [ ] AI features work
- [ ] Search works
- [ ] Chat works
- [ ] No console errors
- [ ] No backend errors in logs
- [ ] Performance is acceptable
- [ ] All major features tested

---

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Check logs regularly
   - Monitor error rates
   - Watch performance metrics

2. **User Testing**
   - Have team test all features
   - Collect feedback
   - Fix any issues found

3. **Documentation**
   - Update README with production URLs
   - Document any deployment-specific configs
   - Create user guide

4. **Backup Strategy**
   - Set up automated backups
   - Test restore process
   - Document backup procedures

5. **Continuous Improvement**
   - Monitor user feedback
   - Track feature usage
   - Plan Phase 2 features

---

## Support Contacts

- **Render Support**: https://render.com/docs
- **Vercel Support**: https://vercel.com/docs
- **GitHub Issues**: [Your repo]/issues

---

**Good luck with your deployment! 🚀**
