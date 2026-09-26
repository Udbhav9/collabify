from fastapi import APIRouter, Depends, HTTPException
import os
import google.generativeai as genai
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Generation Engine"])

# Initialize Gemini API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class PromptInput(BaseModel):
    title: str
    course: str

@router.post("/generate-description")
def generate_project_description(prompt: PromptInput):
    """Generates an academic project description and task suggestions."""
    if not GEMINI_API_KEY:
        # Fallback template if API key is not configured
        return {
            "description": f"A comprehensive {prompt.course} project focused on building {prompt.title}. Includes microservices architecture, automated database schemas, and unit testing workflows."
        }

    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(
            f"Write a concise, high-level technical description for an academic student project titled '{prompt.title}' for the course '{prompt.course}'. Keep it under 100 words."
        )
        return {"description": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))