# Setup Real AI Processing for CourtPilot

## Why Real AI Matters

You're absolutely right - the core value of CourtPilot is:
- **AI-powered directive extraction** from court judgments
- **Intelligent department assignment** based on context
- **Smart decision-making** and recommendations
- **Natural language Q&A** about legal documents

Mock data defeats the purpose. Here's how to set up real AI:

---

## Option 1: OpenAI API (Recommended) ⭐

### Why OpenAI?
- ✅ **Fast**: 2-5 seconds per request
- ✅ **Reliable**: 99.9% uptime
- ✅ **High Quality**: GPT-4 or GPT-3.5-turbo
- ✅ **Easy Setup**: Just add API key
- ✅ **Cost Effective**: ~$0.002-0.01 per request

### Cost Estimate
For a demo/testing:
- 100 PDF uploads = ~$1-5
- 1000 PDF uploads = ~$10-50
- Depends on PDF size and model choice

### Setup Steps

#### 1. Get OpenAI API Key

1. Go to: https://platform.openai.com/signup
2. Create an account (or login)
3. Go to: https://platform.openai.com/api-keys
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-...`)
6. Add $5-10 credit to your account: https://platform.openai.com/account/billing

#### 2. Set Environment Variables in Railway

Go to Railway Dashboard → Backend Service → Variables:

```env
# Change from mock to OpenAI
LLM_PROVIDER=openai

# Add your OpenAI key
OPENAI_API_KEY=sk-your-actual-key-here

# Choose model (gpt-3.5-turbo is faster and cheaper)
LLM_MODEL=gpt-3.5-turbo

# For embeddings (semantic search)
EMBEDDING_MODEL=text-embedding-3-small
```

#### 3. Redeploy

Railway will auto-redeploy. Processing will now use real AI!

### Model Comparison

| Model | Speed | Quality | Cost per 1K tokens |
|-------|-------|---------|-------------------|
| gpt-3.5-turbo | ⚡⚡⚡ Fast (2-3s) | Good | $0.0005 |
| gpt-4o-mini | ⚡⚡ Medium (3-5s) | Better | $0.00015 |
| gpt-4o | ⚡ Slower (5-10s) | Best | $0.0025 |

**Recommendation**: Start with `gpt-3.5-turbo` for speed and cost.

---

## Option 2: Groq API (Free & Fast) 🚀

Groq offers **free API access** with very fast inference!

### Setup Steps

1. Go to: https://console.groq.com/
2. Sign up for free account
3. Get API key from: https://console.groq.com/keys
4. In Railway, set:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=gsk_your_groq_key_here
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   LLM_MODEL=llama-3.1-70b-versatile
   ```

### Groq Models (All Free!)

- `llama-3.1-70b-versatile` - Best quality
- `llama-3.1-8b-instant` - Fastest
- `mixtral-8x7b-32768` - Good balance

**Pros**: Free, very fast
**Cons**: Rate limits (30 requests/minute on free tier)

---

## Option 3: Self-Hosted Ollama (Free but Complex)

Run your own AI models on a server.

### Requirements
- Server with GPU (NVIDIA recommended)
- 16GB+ RAM
- 50GB+ storage

### Setup Steps

1. **Deploy Ollama Server**
   ```bash
   # On your server
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve
   ollama pull llama3.1:8b
   ```

2. **Expose Ollama API**
   - Use ngrok, cloudflare tunnel, or public IP
   - Example: `http://your-server-ip:11434`

3. **Configure Railway**
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://your-server-ip:11434
   OLLAMA_MODEL=llama3.1:8b
   ```

**Pros**: Free, private, full control
**Cons**: Requires infrastructure, slower than cloud APIs

---

## Option 4: Anthropic Claude (Premium)

High-quality AI from Anthropic.

### Setup Steps

1. Go to: https://console.anthropic.com/
2. Get API key
3. In Railway:
   ```env
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   LLM_MODEL=claude-3-5-sonnet-20241022
   ```

**Pros**: Excellent quality, good for legal text
**Cons**: More expensive than OpenAI

---

## Recommended Setup for Demo/Production

### For Demo (Next 1-2 weeks)
**Use Groq (Free)**
- Fast and free
- Good quality
- Easy setup
- No credit card needed

### For Production (Long-term)
**Use OpenAI GPT-3.5-turbo**
- Reliable and fast
- Proven at scale
- Reasonable cost
- Good support

---

## Quick Start: Groq (Free & Fast)

**Do this now for instant real AI:**

1. Go to: https://console.groq.com/keys
2. Sign up and get API key
3. In Railway Variables, set:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=gsk_your_groq_key_here
   OPENAI_BASE_URL=https://api.groq.com/openai/v1
   LLM_MODEL=llama-3.1-70b-versatile
   ```
4. Redeploy
5. Test PDF upload - should work with real AI! 🎉

---

## Testing Real AI

After setup, upload a PDF and you should see:
- **Real directive extraction** from actual judgment text
- **Context-aware department assignment**
- **Intelligent summaries** of the case
- **Accurate Q&A** responses

The processing will take 10-30 seconds (depending on PDF size) but will be **real AI analysis**, not mock data.

---

## Fallback Strategy

The code I wrote has automatic fallback:
1. **Try real AI** (OpenAI/Groq/Anthropic) with 30s timeout
2. **If timeout or error**: Fall back to mock data
3. **User still gets results** even if AI fails

This ensures the demo never breaks, but uses real AI when available.

---

## Cost Management

### OpenAI Cost Controls

1. Set usage limits: https://platform.openai.com/account/limits
2. Set up billing alerts
3. Monitor usage: https://platform.openai.com/usage

### Groq Rate Limits

Free tier: 30 requests/minute
- Enough for demo
- Upgrade for production if needed

---

## My Recommendation

**For your demo RIGHT NOW:**

1. **Use Groq** (free, fast, real AI)
   - Sign up: https://console.groq.com/
   - Get key, set in Railway
   - Done in 5 minutes!

2. **For production later:**
   - Switch to OpenAI GPT-3.5-turbo
   - More reliable for production scale
   - Budget ~$50-100/month for moderate usage

---

## Questions?

- **"Is Groq really free?"** - Yes, with rate limits
- **"How much will OpenAI cost?"** - ~$0.01 per PDF for GPT-3.5-turbo
- **"Can I switch providers later?"** - Yes, just change env vars
- **"What if AI fails?"** - Automatic fallback to mock ensures demo works

---

## Next Steps

1. Choose a provider (I recommend Groq for demo)
2. Get API key
3. Set environment variables in Railway
4. Test with real PDF
5. See real AI extraction! 🚀
