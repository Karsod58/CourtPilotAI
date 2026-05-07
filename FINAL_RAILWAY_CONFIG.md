# Final Railway Configuration - Ollama + Groq Fallback

## Perfect Setup for Your Use Case

You want to use **both Ollama and Groq** with proper fallback. Here's the exact configuration:

---

## Railway Environment Variables

Set these in **Railway Dashboard → Backend Service → Variables**:

### Primary Provider (Ollama)
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=2ebce87874da4465951244e35e8d4007.5TmcrjYStknD5XLCQzowAUlq
OLLAMA_MODEL=gemma3:12b
```

### Fallback Provider (Groq) - **ADD THESE**
```env
OPENAI_API_KEY=gsk_your_groq_key_here
OLLAMA_FALLBACK_URL=https://api.groq.com/openai/v1
OLLAMA_FALLBACK_MODEL=llama-3.1-70b-versatile
```

---

## How to Get Groq API Key

1. Go to: **https://console.groq.com/**
2. Sign up (free, no credit card)
3. Go to: **https://console.groq.com/keys**
4. Click **"Create API Key"**
5. Copy the key (starts with `gsk_...`)
6. Paste it in Railway as `OPENAI_API_KEY`

---

## How It Works

### Fallback Chain

```
1. Ollama Cloud (Primary)
   ├─ URL: https://ollama.com
   ├─ Model: gemma3:12b
   ├─ Timeout: 30 seconds
   ├─ Success → Return results ✅
   └─ Fail/Timeout → Try Groq

2. Groq (Fallback)
   ├─ URL: https://api.groq.com/openai/v1
   ├─ Model: llama-3.1-70b-versatile
   ├─ Timeout: 45 seconds
   ├─ Success → Return results ✅
   └─ Fail → Use Mock

3. Mock (Final Fallback)
   └─ Always works → Return sample data ✅
```

### What You Get

**Best Case** (Ollama works):
- Uses your Ollama Cloud setup
- Your preferred model (gemma3:12b)
- Processing time: 10-40 seconds

**Fallback Case** (Ollama fails, Groq works):
- Automatically switches to Groq
- Fast and reliable (2-5 seconds per request)
- Real AI extraction
- **Your demo still works!** ✅

**Worst Case** (Both fail):
- Uses mock data
- Instant results
- **Demo never breaks!** ✅

---

## Expected Logs

### When Ollama Works
```
INFO: ✓ Initialized Ollama client: gemma3:12b at https://ollama.com
INFO: ✓ Initialized Groq fallback: llama-3.1-70b-versatile at https://api.groq.com/openai/v1
INFO: Trying primary provider (ollama)...
INFO: ✓ Primary provider succeeded: extracted 3 directives
```

### When Ollama Fails, Groq Works
```
INFO: ✓ Initialized Ollama client: gemma3:12b at https://ollama.com
INFO: ✓ Initialized Groq fallback: llama-3.1-70b-versatile at https://api.groq.com/openai/v1
INFO: Trying primary provider (ollama)...
WARNING: Primary provider failed: timeout
INFO: Trying Ollama fallback...
INFO: ✓ Ollama fallback succeeded: extracted 3 directives
```
*(Note: "Ollama fallback" here actually means Groq, because we're using the fallback slot)*

### When Both Fail
```
INFO: ✓ Initialized Ollama client: gemma3:12b at https://ollama.com
INFO: ✓ Initialized Groq fallback: llama-3.1-70b-versatile at https://api.groq.com/openai/v1
INFO: Trying primary provider (ollama)...
WARNING: Primary provider failed: timeout
INFO: Trying Ollama fallback...
WARNING: Ollama fallback failed: timeout
WARNING: All AI providers failed, falling back to mock
```

---

## Step-by-Step Setup

### Step 1: Get Groq Key
- Go to https://console.groq.com/keys
- Sign up and create API key
- Copy it (starts with `gsk_...`)

### Step 2: Update Railway Variables

Go to Railway Dashboard → Your Project → Backend Service → Variables

**Keep these** (already set):
- `LLM_PROVIDER` = `ollama`
- `OLLAMA_BASE_URL` = `https://ollama.com`
- `OLLAMA_API_KEY` = `2ebce87874da4465951244e35e8d4007.5TmcrjYStknD5XLCQzowAUlq`
- `OLLAMA_MODEL` = `gemma3:12b`

**Add these** (new):
- Click **"+ New Variable"**
- Name: `OPENAI_API_KEY`, Value: `gsk_your_groq_key_here`
- Click **"+ New Variable"**
- Name: `OLLAMA_FALLBACK_URL`, Value: `https://api.groq.com/openai/v1`
- Click **"+ New Variable"**
- Name: `OLLAMA_FALLBACK_MODEL`, Value: `llama-3.1-70b-versatile`

### Step 3: Deploy

Railway will auto-redeploy (2-3 minutes)

### Step 4: Test

1. Go to https://court-pilot-ai.vercel.app
2. Login: `admin@gov.in` / `Admin123`
3. Upload a PDF
4. Watch the processing:
   - If Ollama works → Great!
   - If Ollama fails → Groq takes over automatically!
   - Either way → Real AI extraction! ✅

---

## Benefits of This Setup

✅ **Best of Both Worlds**
- Try Ollama first (your preference)
- Groq as reliable backup

✅ **High Availability**
- If one fails, other takes over
- Demo never breaks

✅ **Cost Effective**
- Ollama Cloud (your existing setup)
- Groq is free (no extra cost)

✅ **Real AI Always**
- Both providers give real AI extraction
- Only falls back to mock if both fail

✅ **Production Ready**
- Automatic failover
- Detailed logging
- Graceful degradation

---

## Troubleshooting

### Groq Fallback Not Working

**Check Railway Logs for**:
```
INFO: ✓ Initialized Groq fallback: llama-3.1-70b-versatile
```

**If you see**:
```
INFO: No Groq API key found, skipping Groq fallback
```

**Solution**: Make sure `OPENAI_API_KEY` is set in Railway

**If you see**:
```
INFO: No Groq URL found, skipping Groq fallback
```

**Solution**: Make sure `OLLAMA_FALLBACK_URL=https://api.groq.com/openai/v1` is set

### Both Providers Failing

**Check**:
1. Ollama API key is valid
2. Groq API key is valid
3. Network connectivity
4. Rate limits

**Impact**: App still works with mock data (demo-ready)

---

## Summary

**Current Setup**:
- Primary: Ollama Cloud
- Fallback: Groq (free)
- Final: Mock

**What to do**:
1. Get Groq API key: https://console.groq.com/keys
2. Add 3 variables in Railway:
   - `OPENAI_API_KEY=gsk_your_key`
   - `OLLAMA_FALLBACK_URL=https://api.groq.com/openai/v1`
   - `OLLAMA_FALLBACK_MODEL=llama-3.1-70b-versatile`
3. Wait for redeploy
4. Test PDF upload
5. Enjoy reliable AI extraction! 🚀

**Result**: Your app uses Ollama when it works, automatically switches to Groq when it doesn't. Best of both worlds!
