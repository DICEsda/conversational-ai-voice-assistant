"""LLM client for LM Studio"""
import requests
import json
from typing import Iterator, Optional
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
    
    def query_stream(self, text, temperature: Optional[float] = None, max_tokens: Optional[int] = None) -> Iterator[str]:
        """
        Send text to LM Studio and stream response tokens
        
        Args:
            text: User input text
            temperature: Override default temperature
            max_tokens: Override default max tokens
            
        Yields:
            str: Individual tokens from the LLM response
        """
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
                    "temperature": temperature or TEMPERATURE,
                    "max_tokens": max_tokens or MAX_TOKENS,
                    "stream": True
                },
                timeout=30,
                stream=True
            )
            
            if response.status_code != 200:
                yield f"Error: HTTP {response.status_code}"
                return
            
            full_response = ""
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]  # Remove 'data: ' prefix
                        
                        if data_str.strip() == '[DONE]':
                            break
                        
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                delta = data['choices'][0].get('delta', {})
                                content = delta.get('content', '')
                                if content:
                                    full_response += content
                                    yield content
                        except json.JSONDecodeError:
                            continue
            
            # Add complete response to conversation
            if full_response:
                self.conversation.append({"role": "assistant", "content": full_response})
                
        except Exception as e:
            yield f"Error: {e}"
    
    def clear_conversation(self):
        """Clear conversation history"""
        self.conversation = []
        self.first_call = True
