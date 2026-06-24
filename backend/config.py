from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    openai_api_key: str
    langsmith_tracing: bool = True
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_api_key: str = ""
    langsmith_project: str = "visionary"

    database_url: str = "sqlite+aiosqlite:///data/visionary.db"
    upload_dir: str = "uploads"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


BASE_DIR = Path(__file__).resolve().parent
settings = Settings()
