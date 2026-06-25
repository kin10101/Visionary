from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Spec, SpecVersion, UploadedFile
from schemas import (
    SpecCreate, SpecUpdate, SpecResponse, SpecListResponse,
    ReviseRequest, ContentUpdateRequest, GenerateRequest,
)
from graph.workflow import run_generate_stream, run_revise_stream

router = APIRouter()


@router.get("", response_model=list[SpecListResponse])
async def list_specs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Spec).order_by(Spec.updated_at.desc()))
    return result.scalars().all()


@router.post("", response_model=SpecResponse)
async def create_spec(data: SpecCreate, db: AsyncSession = Depends(get_db)):
    spec = Spec(title=data.title, status=data.status)
    db.add(spec)
    await db.commit()
    await db.refresh(spec)
    return SpecResponse(
        id=spec.id, title=spec.title, status=spec.status,
        current_version=spec.current_version,
        created_at=spec.created_at, updated_at=spec.updated_at,
    )


@router.get("/{spec_id}", response_model=SpecResponse)
async def get_spec(spec_id: str, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    content = None
    if spec.current_version > 0:
        result = await db.execute(
            select(SpecVersion)
            .where(SpecVersion.spec_id == spec_id, SpecVersion.version_number == spec.current_version)
        )
        version = result.scalar_one_or_none()
        if version:
            content = version.content_markdown
    return SpecResponse(
        id=spec.id, title=spec.title, status=spec.status,
        current_version=spec.current_version,
        created_at=spec.created_at, updated_at=spec.updated_at,
        content_markdown=content,
    )


@router.put("/{spec_id}", response_model=SpecResponse)
async def update_spec(spec_id: str, data: SpecUpdate, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    if data.title is not None:
        spec.title = data.title
    if data.status is not None:
        spec.status = data.status
    await db.commit()
    await db.refresh(spec)
    return SpecResponse(
        id=spec.id, title=spec.title, status=spec.status,
        current_version=spec.current_version,
        created_at=spec.created_at, updated_at=spec.updated_at,
    )


@router.delete("/{spec_id}")
async def delete_spec(spec_id: str, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    await db.delete(spec)
    await db.commit()
    return {"ok": True}


@router.put("/{spec_id}/content", response_model=dict)
async def manual_edit(spec_id: str, data: ContentUpdateRequest, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    new_version_num = spec.current_version + 1
    version = SpecVersion(
        spec_id=spec_id,
        version_number=new_version_num,
        content_markdown=data.content_markdown,
        change_description=data.change_description,
    )
    db.add(version)
    spec.current_version = new_version_num
    await db.commit()
    return {"version_number": new_version_num}


@router.post("/{spec_id}/generate")
async def generate_spec(spec_id: str, data: GenerateRequest = None, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.spec_id == spec_id)
    )
    files = result.scalars().all()
    context_text = "\n\n---\n\n".join(f.parsed_text for f in files if f.parsed_text)
    if data and data.additional_context:
        context_text += f"\n\n---\n\nAdditional instructions:\n{data.additional_context}"
    if not context_text.strip():
        raise HTTPException(400, "No context uploaded. Upload files first.")

    async def event_stream():
        import json
        full_content = ""
        async for token in run_generate_stream(spec.title, context_text):
            full_content += token
            yield f"data: {json.dumps(token)}\n\n"
        async with async_session_factory() as session:
            s = await session.get(Spec, spec_id)
            new_version_num = s.current_version + 1
            version = SpecVersion(
                spec_id=spec_id,
                version_number=new_version_num,
                content_markdown=full_content,
                change_description="AI generation",
            )
            session.add(version)
            s.current_version = new_version_num
            await session.commit()
        yield f"event: done\ndata: {new_version_num}\n\n"

    from database import async_session as async_session_factory
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/{spec_id}/revise")
async def revise_spec(spec_id: str, data: ReviseRequest, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    result = await db.execute(
        select(SpecVersion)
        .where(SpecVersion.spec_id == spec_id, SpecVersion.version_number == spec.current_version)
    )
    current_version = result.scalar_one_or_none()
    if not current_version:
        raise HTTPException(400, "No existing spec to revise. Generate first.")

    current_markdown = current_version.content_markdown

    async def event_stream():
        import json
        revised_section_content = ""
        async for token in run_revise_stream(
            current_markdown, data.section, data.feedback
        ):
            revised_section_content += token
            yield f"data: {json.dumps(token)}\n\n"
        # Splice revised section back into the full spec
        from graph.nodes import _replace_section
        full_content = _replace_section(current_markdown, data.section, revised_section_content)
        async with async_session_factory() as session:
            s = await session.get(Spec, spec_id)
            new_version_num = s.current_version + 1
            version = SpecVersion(
                spec_id=spec_id,
                version_number=new_version_num,
                content_markdown=full_content,
                change_description=f"Revised: {data.section}",
            )
            session.add(version)
            s.current_version = new_version_num
            await session.commit()
        yield f"event: done\ndata: {new_version_num}\n\n"

    from database import async_session as async_session_factory
    return StreamingResponse(event_stream(), media_type="text/event-stream")
