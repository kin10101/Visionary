from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Spec, UploadedFile
from schemas import FileResponse
from services.file_parser import parse_file
from pathlib import Path
from datetime import datetime, timezone
import uuid

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/{spec_id}/files", response_model=list[FileResponse])
async def upload_files(
    spec_id: str,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")

    responses = []
    for file in files:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "txt"
        file_type = _classify_type(ext)
        file_id = str(uuid.uuid4())
        save_path = UPLOAD_DIR / f"{file_id}.{ext}"

        content = await file.read()
        save_path.write_bytes(content)

        parsed_text = await parse_file(save_path, file_type, content)

        now = datetime.now(timezone.utc)
        uploaded = UploadedFile(
            id=file_id,
            spec_id=spec_id,
            filename=file.filename,
            file_path=str(save_path),
            file_type=file_type,
            parsed_text=parsed_text,
            uploaded_at=now,
        )
        db.add(uploaded)
        responses.append(FileResponse(
            id=file_id, filename=file.filename,
            file_type=file_type, uploaded_at=now,
        ))

    await db.commit()
    return responses


@router.get("/{spec_id}/files", response_model=list[FileResponse])
async def list_files(spec_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.spec_id == spec_id)
    )
    return [
        FileResponse(id=f.id, filename=f.filename, file_type=f.file_type, uploaded_at=f.uploaded_at)
        for f in result.scalars().all()
    ]


@router.delete("/{spec_id}/files/{file_id}")
async def delete_file(spec_id: str, file_id: str, db: AsyncSession = Depends(get_db)):
    uploaded = await db.get(UploadedFile, file_id)
    if not uploaded or uploaded.spec_id != spec_id:
        raise HTTPException(404, "File not found")
    file_path = Path(uploaded.file_path)
    if file_path.exists():
        file_path.unlink()
    await db.delete(uploaded)
    await db.commit()
    return {"ok": True}


def _classify_type(ext: str) -> str:
    if ext == "pdf":
        return "pdf"
    elif ext in ("doc", "docx"):
        return "docx"
    elif ext in ("png", "jpg", "jpeg", "gif", "webp"):
        return "image"
    elif ext == "md":
        return "markdown"
    else:
        return "txt"
