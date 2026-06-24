from typing import TypedDict


class SpecState(TypedDict):
    context_text: str
    spec_title: str
    spec_markdown: str
    revision_section: str | None
    revision_feedback: str | None
    mode: str  # "generate" | "revise"
    formatted_context: str
