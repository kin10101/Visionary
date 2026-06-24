from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Spec, SpecVersion
from schemas import VersionResponse

router = APIRouter()


@router.get("/{spec_id}/versions", response_model=list[VersionResponse])
async def list_versions(spec_id: str, db: AsyncSession = Depends(get_db)):
    spec = await db.get(Spec, spec_id)
    if not spec:
        raise HTTPException(404, "Spec not found")
    result = await db.execute(
        select(SpecVersion)
        .where(SpecVersion.spec_id == spec_id)
        .order_by(SpecVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        VersionResponse(
            id=v.id, version_number=v.version_number,
            change_description=v.change_description, created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/{spec_id}/versions/{version_number}", response_model=VersionResponse)
async def get_version(spec_id: str, version_number: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SpecVersion)
        .where(SpecVersion.spec_id == spec_id, SpecVersion.version_number == version_number)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    return VersionResponse(
        id=version.id, version_number=version.version_number,
        change_description=version.change_description,
        created_at=version.created_at,
        content_markdown=version.content_markdown,
    )
