import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


class Spec(Base):
    __tablename__ = "specs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")
    current_version: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    versions: Mapped[list["SpecVersion"]] = relationship(back_populates="spec", cascade="all, delete-orphan")
    files: Mapped[list["UploadedFile"]] = relationship(back_populates="spec", cascade="all, delete-orphan")


class SpecVersion(Base):
    __tablename__ = "spec_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    spec_id: Mapped[str] = mapped_column(String, ForeignKey("specs.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    change_description: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    spec: Mapped["Spec"] = relationship(back_populates="versions")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    spec_id: Mapped[str] = mapped_column(String, ForeignKey("specs.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False)
    parsed_text: Mapped[str] = mapped_column(Text, default="")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    spec: Mapped["Spec"] = relationship(back_populates="files")
