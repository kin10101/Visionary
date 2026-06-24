from pydantic import BaseModel
from datetime import datetime


class SpecCreate(BaseModel):
    title: str
    status: str = "draft"


class SpecUpdate(BaseModel):
    title: str | None = None
    status: str | None = None


class SpecResponse(BaseModel):
    id: str
    title: str
    status: str
    current_version: int
    created_at: datetime
    updated_at: datetime
    content_markdown: str | None = None


class SpecListResponse(BaseModel):
    id: str
    title: str
    status: str
    current_version: int
    updated_at: datetime


class VersionResponse(BaseModel):
    id: str
    version_number: int
    change_description: str
    created_at: datetime
    content_markdown: str | None = None


class FileResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    uploaded_at: datetime


class ReviseRequest(BaseModel):
    section: str
    feedback: str


class ContentUpdateRequest(BaseModel):
    content_markdown: str
    change_description: str = "Manual edit"


class GenerateRequest(BaseModel):
    additional_context: str = ""
