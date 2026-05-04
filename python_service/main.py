from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PixelCraft AI Model Service")

# 启用 CORS 跨域支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有域名跨域，本地开发更方便
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法，包含 OPTIONS
    allow_headers=["*"],
)

class ProviderConfigRequest(BaseModel):
    provider_id: str
    api_key: str
    base_url: str

def categorize_model(model_name: str) -> str:
    name_lower = model_name.lower()
    
    # 视频模型关键字
    video_keywords = ['sora', 'video', 'runway', 'seedance', 'kling', 'pika', 'hunyuan-video', 'happyhorse', 'wan']
    if any(k in name_lower for k in video_keywords):
        return 'video'
        
    # 图像模型关键字
    image_keywords = ['dall-e', 'dalle', 'mj', 'midjourney', 'sd', 'diffusion', 'image', 'vision', 'flux', 'cogview', 'imagen']
    if any(k in name_lower for k in image_keywords):
        return 'image'
        
    # 语音模型关键字
    audio_keywords = ['tts', 'whisper', 'audio', 'voice', 'speech']
    if any(k in name_lower for k in audio_keywords):
        return 'audio'
        
    # 默认归类为文本模型
    return 'text'

@app.post("/api/models/fetch")
def fetch_models(config: ProviderConfigRequest):
    serializable_models = []
    provider_id = config.provider_id
    api_key = config.api_key
    base_url = config.base_url
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key is required")

    try:
        if provider_id.lower() == "gemini":
            logger.info(f"[{provider_id}] Fetching models via REST API")
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                models_data = res.json().get("models", [])
                for m in models_data:
                    if "generateContent" in m.get("supportedGenerationMethods", []):
                        m_name = m.get("name", "").replace("models/", "")
                        serializable_models.append({
                            "id": m_name,
                            "model_name": m_name,
                            "provider_id": provider_id,
                            "category": categorize_model(m_name)
                        })
            else:
                logger.warning(f"Gemini fetch failed: {res.status_code}")
                raise HTTPException(status_code=400, detail="Failed to fetch Gemini models")
        else:
            # Standard OpenAI compatible /v1/models
            url = f"{base_url.rstrip('/')}/v1/models"
            
            # Volcengine requires /models instead of /v1/models if base_url already ends with /v3 or similar
            if "volces.com" in base_url or "dashscope" in base_url:
                # Avoid appending /v1 if base_url already contains api version
                url = f"{base_url.rstrip('/')}/models"
                
            headers = {
                "Authorization": f"Bearer {api_key}"
            }
            logger.info(f"[{provider_id}] Fetching models from {url}")
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code == 200:
                models_data = res.json().get("data", [])
                
                # If data is empty, maybe the provider returns a list directly or under a different key
                if not models_data and isinstance(res.json(), list):
                    models_data = res.json()
                    
                for m in models_data:
                    # Model ID can be 'id' or 'name' depending on provider
                    m_id = m.get("id") or m.get("name")
                    if m_id:
                        serializable_models.append({
                            "id": m_id,
                            "model_name": m_id,
                            "provider_id": provider_id,
                            "category": categorize_model(m_id)
                        })
            else:
                logger.warning(f"OpenAI compatible fetch failed: {res.status_code} {res.text}")
                raise HTTPException(status_code=400, detail=f"Failed to fetch models: {res.status_code} {res.text}")
                
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"models": serializable_models}

@app.post("/api/models/test-connectivity")
def test_connectivity(config: ProviderConfigRequest):
    api_key = config.api_key
    base_url = config.base_url
    provider_id = config.provider_id
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key is required")
        
    try:
        if provider_id.lower() == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                return {"status": "success", "message": "Connection successful"}
            else:
                raise HTTPException(status_code=400, detail=f"Connection failed: {res.status_code}")
        else:
            # Standard OpenAI compatible /v1/models
            url = f"{base_url.rstrip('/')}/v1/models"
            if "volces.com" in base_url or "dashscope" in base_url:
                url = f"{base_url.rstrip('/')}/models"
                
            headers = {"Authorization": f"Bearer {api_key}"}
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                return {"status": "success", "message": "Connection successful"}
            else:
                raise HTTPException(status_code=400, detail=f"Connection failed: {res.status_code} {res.text}")
    except Exception as e:
        logger.error(f"Connectivity test failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
