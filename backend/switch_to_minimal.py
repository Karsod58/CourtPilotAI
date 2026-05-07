"""
Switch to minimal LLM service for Railway deployment
This script backs up the current LLM service and replaces it with the minimal version
"""
import shutil
from pathlib import Path

# Paths
current_llm = Path("app/services/ai/llm_service.py")
minimal_llm = Path("app/services/ai/llm_service_minimal.py")
backup_llm = Path("app/services/ai/llm_service_full.py")

# Backup current version
if current_llm.exists():
    print(f"Backing up {current_llm} to {backup_llm}")
    shutil.copy(current_llm, backup_llm)

# Replace with minimal version
if minimal_llm.exists():
    print(f"Replacing {current_llm} with {minimal_llm}")
    shutil.copy(minimal_llm, current_llm)
    print("✓ Switched to minimal LLM service")
    print("\nThis version:")
    print("  - Uses OpenAI client directly (no LangChain)")
    print("  - Saves ~100MB of memory")
    print("  - Works with Groq API")
    print("  - Has automatic fallback to mock")
else:
    print(f"Error: {minimal_llm} not found")

print("\nTo restore full version:")
print("  cp app/services/ai/llm_service_full.py app/services/ai/llm_service.py")
