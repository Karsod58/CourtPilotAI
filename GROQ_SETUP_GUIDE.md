# Setup Groq AI (FREE & FAST) 🚀

## Why Groq?

- ✅ **100% FREE** - No credit card required
- ✅ **Very Fast** - Faster than OpenAI
- ✅ **High Quality** - Uses Llama 3.1 70B model
- ✅ **Easy Setup** - 5 minutes
- ✅ **Good for Production** - Reliable and scalable

## Step-by-Step Setup

### Step 1: Get Groq API Key (2 minutes)

1. Go to: **https://console.groq.com/**
2. Click **"Sign Up"** or **"Login"**
3. Sign up with Google/GitHub (easiest) or email
4. After login, go to: **https://console.groq.com/keys**
5. Click **"Create API Key"**
6. Give it a name (e.g., "CourtPilot")
7. **Copy the API key** (starts with `gsk_...`)

### Step 2: Configure Railway (3 minutes)

1. Go to your Railway dashboard
2. Click on your **backend service**
3. Go to **Variables** tab
4. Add/Update these variables:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=gsk_your_actual_groq_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-70b-versatile
```

**Important Notes:**
- Yes, set `LLM_PROVIDER=openai` (Groq uses OpenAI-compatible API)
- Replace `gsk_your_actual_groq_key_here` with your actual Groq key
- The `OPENAI_BASE_URL` tells it to use Groq instead of OpenAI

### Step 3: Wait for Redeploy

- Railway will automatically redeploy (2-3 minutes)
- Watch the logs for: "Initialized OpenAI LLM"

### Step 4: Test It!

1. Go to: https://court-pilot-ai.vercel.app
2. Login: `admin@gov.in` / `Admin123`
3. Upload a PDF
4. **AI processing will complete in 10-30 seconds with REAL AI!** 🎉

---

## Groq Models Available (All Free!)

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| `llama-3.1-70b-versatile` | Fast | Excellent | **Recommended** - Best balance |
| `llama-3.1-8b-instant` | Very Fast | Good | Quick responses |
| `mixtral-8x7b-32768` | Fast | Very Good | Long documents |
| `llama3-70b-8192` | Fast | Excellent | General purpose |

**Recommendation**: Use `llama-3.1-70b-versatile` (default in config above)

---

## Rate Limits (Free Tier)

- **30 requests per minute**
- **14,400 requests per day**
- **6,000 tokens per minute**

This is **more than enough** for:
- Demo purposes
- Testing
- Small to medium production use

---

## What You'll Get

With Groq, your CourtPilot will have:

### 1. Real Directive Extraction
- Analyzes actual PDF content
- Extracts real court orders and directives
- Identifies deadlines, responsibilities, actions

### 2. Intelligent Department Assignment
- Understands context of each directive
- Assigns to appropriate government department
- Provides confidence scores

### 3. Smart Summaries
- Generates case summaries
- Highlights key points
- Identifies critical deadlines

### 4. Natural Q&A
- Answer questions about judgments
- Context-aware responses
- Legal document understanding

---

## Example: What Real AI Extraction Looks Like

**Mock Data (what you have now):**
```
"The respondent shall pay compensation of Rs. 50,000 within 30 days"
```

**Real AI Extraction (with Groq):**
```
From your actual PDF:
"The State Government is hereby directed to constitute a Special 
Investigation Team within 15 days from today to investigate the 
allegations of corruption in the procurement process and submit 
a detailed report to this Court within 90 days..."

Extracted:
- Directive: Constitute SIT
- Deadline: 15 days
- Responsible: State Government
- Action: Investigate corruption allegations
- Follow-up: Report in 90 days
```

**This is the real value of your app!**

---

## Troubleshooting

### "Invalid API Key" Error
- Double-check you copied the full key (starts with `gsk_`)
- Make sure no extra spaces
- Regenerate key if needed

### "Rate Limit Exceeded"
- Free tier: 30 requests/minute
- Wait a minute and try again
- For production, contact Groq for higher limits

### Processing Still Slow
- Groq is fast (2-5 seconds per request)
- Total time depends on PDF size
- Large PDFs (50+ pages) may take 20-30 seconds

### Still Getting Mock Data
- Check Railway logs: Should see "Initialized OpenAI LLM"
- Verify `LLM_PROVIDER=openai` (not `mock`)
- Verify `OPENAI_BASE_URL=https://api.groq.com/openai/v1`

---

## Cost Comparison

| Provider | Cost | Speed | Quality |
|----------|------|-------|---------|
| **Groq** | **FREE** ✅ | ⚡⚡⚡ Very Fast | ⭐⭐⭐⭐ Excellent |
| OpenAI GPT-3.5 | $0.002/request | ⚡⚡ Fast | ⭐⭐⭐⭐ Excellent |
| OpenAI GPT-4 | $0.01/request | ⚡ Medium | ⭐⭐⭐⭐⭐ Best |
| Anthropic | $0.008/request | ⚡⚡ Fast | ⭐⭐⭐⭐⭐ Best |
| Mock | FREE | ⚡⚡⚡ Instant | ⭐ Fake Data |

**Winner: Groq** - Free, fast, and real AI!

---

## For Production

Groq free tier is suitable for:
- ✅ Demos and presentations
- ✅ Testing and development
- ✅ Small deployments (< 1000 requests/day)
- ✅ MVP and early stage

If you need more:
- Contact Groq for enterprise pricing
- Or switch to OpenAI later (just change env vars)

---

## Quick Reference

### Railway Environment Variables

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=gsk_your_groq_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-70b-versatile
```

### Get Groq Key
https://console.groq.com/keys

### Groq Documentation
https://console.groq.com/docs

---

## Summary

1. **Sign up at Groq** (free, no credit card): https://console.groq.com/
2. **Get API key**: https://console.groq.com/keys
3. **Set in Railway**:
   - `LLM_PROVIDER=openai`
   - `OPENAI_API_KEY=gsk_your_key`
   - `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
   - `LLM_MODEL=llama-3.1-70b-versatile`
4. **Redeploy and test**
5. **Enjoy real AI extraction!** 🎉

**No credit card. No cost. Real AI. Fast results.**

Perfect for your CourtPilot demo! 🚀
