from pathlib import Path
import base64


async def parse_file(file_path: Path, file_type: str, raw_content: bytes) -> str:
    if file_type == "pdf":
        return _parse_pdf(file_path)
    elif file_type == "docx":
        return _parse_docx(file_path)
    elif file_type == "image":
        return _describe_image(raw_content, file_path.suffix)
    elif file_type == "markdown" or file_type == "txt":
        return raw_content.decode("utf-8", errors="replace")
    return raw_content.decode("utf-8", errors="replace")


def _parse_pdf(file_path: Path) -> str:
    import pdfplumber
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n\n".join(text_parts)


def _parse_docx(file_path: Path) -> str:
    from docx import Document
    doc = Document(file_path)
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _describe_image(raw_content: bytes, suffix: str) -> str:
    b64 = base64.b64encode(raw_content).decode()
    mime = "image/png" if suffix.lower() in (".png",) else "image/jpeg"
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage

    llm = ChatOpenAI(model="gpt-4o", max_tokens=1000)
    msg = HumanMessage(content=[
        {"type": "text", "text": "Describe this image in detail. Extract any text, diagrams, workflows, or UI mockups visible. Be thorough."},
        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
    ])
    response = llm.invoke([msg])
    return f"[Image description: {suffix}]\n{response.content}"
