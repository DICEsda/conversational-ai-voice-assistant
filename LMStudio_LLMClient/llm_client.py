"""LLM client for LM Studio"""
import requests
from config import LM_STUDIO_URL, MODEL_NAME, SYSTEM_PROMPT, MAX_TOKENS, TEMPERATURE


class LLMClient:
    """Handles communication with LM Studio API"""
    
    def __init__(self):
        self.conversation = []
        self.first_call = True
    
    def query(self, text):
        """Send text to LM Studio and get response"""
        if self.first_call:
            text = f"{SYSTEM_PROMPT}\n\n{text}"
            self.first_call = False
        
        self.conversation.append({"role": "user", "content": text})
        
        try:
            response = requests.post(
                f"{LM_STUDIO_URL}/v1/chat/completions",
                json={
                    "model": MODEL_NAME,
                    "messages": self.conversation,
                    "temperature": TEMPERATURE,
                    "max_tokens": MAX_TOKENS,
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code != 200:
                return f"Error: HTTP {response.status_code}"
            
            reply = response.json()["choices"][0]["message"]["content"]
            self.conversation.append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            return f"Error: {e}"
    
    def clear_conversation(self):
        """Clear conversation history"""
        self.conversation = []
        self.first_call = True
