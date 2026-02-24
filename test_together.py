"""
Test script for Together AI: sends a simple 'Hello' prompt to Llama-3.
Loads TOGETHER_API_KEY from .env. Install deps: pip install -r requirements.txt
"""

import os

from dotenv import load_dotenv
from together import Together

# Load environment variables from .env
load_dotenv()

api_key = os.getenv("TOGETHER_API_KEY")
if not api_key or api_key == "your_key_here":
    raise ValueError(
        "TOGETHER_API_KEY not set or still placeholder. "
        "Add your key to the .env file."
    )

client = Together(api_key=api_key)

# Llama 3 models now use 'chat.completions' rather than 'completions'
response = client.chat.completions.create(
    model="meta-llama/Llama-3.3-70B-Instruct-Turbo",  # Latest stable Llama 3 variant
    messages=[
        {"role": "system", "content": "You are a helpful job search assistant."},
        {"role": "user", "content": "Hello! Say hi and tell me you are ready to help with ApplyTracker."}
    ],
    max_tokens=64,
)

# Printing the response for Chat format is slightly different
print(response.choices[0].message.content)
