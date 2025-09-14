from typing import List
import os
# CORS configuration
CORS_ORIGINS: List[str] = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",  # Default for Vite
    "http://localhost:4322",  # Astro dev server
    "http://localhost:4321",  # Astro dev server
    "https://thinkex.netlify.app",
    "https://thinkex.onrender.com",
    "https://uninveighing-eve-flinchingly.ngrok-free.app",  # Existing ngrok URL
]

CORS_ORIGIN_REGEX = r"https://.*--thinkex\.netlify\.app"  # For Netlify deploy previews

# Ably configuration
ABLY_API_KEY = os.getenv('ABLY_API_KEY')
