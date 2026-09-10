from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/aiflow"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    refresh_token_expire_days: int = 7

    # API Keys
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:1.7b"
    ollama_think: bool = False
    google_api_key: str = ""
    google_model: str = "gemini-3.1-flash-lite"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    mistral_api_key: str = ""
    mistral_model: str = "mistral-medium-latest"
    tavily_api_key: str = ""

    # LangSmith (optional)
    langsmith_tracing: bool = False
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "AI_Flow"

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # PostHog reverse proxy upstream hosts (US region)
    posthog_ingestion_host: str = "https://us.i.posthog.com"
    posthog_assets_host: str = "https://us-assets.i.posthog.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
