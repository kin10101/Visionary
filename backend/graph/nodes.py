from graph.state import SpecState
from graph.prompts import GENERATE_SYSTEM, GENERATE_USER, REVISE_SYSTEM, REVISE_USER
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


llm = ChatOpenAI(model="gpt-4o", temperature=0.3, streaming=True)


def parse_context(state: SpecState) -> dict:
    context = state["context_text"].strip()
    formatted = f"Title: {state['spec_title']}\n\nContext:\n{context}"
    return {"formatted_context": formatted}


async def generate_spec(state: SpecState) -> dict:
    messages = [
        SystemMessage(content=GENERATE_SYSTEM),
        HumanMessage(content=GENERATE_USER.format(
            title=state["spec_title"],
            context=state["context_text"],
        )),
    ]
    response = await llm.ainvoke(messages)
    return {"spec_markdown": response.content}


async def revise_section(state: SpecState) -> dict:
    messages = [
        SystemMessage(content=REVISE_SYSTEM),
        HumanMessage(content=REVISE_USER.format(
            section=state["revision_section"],
            section_content=_extract_section_content(state["spec_markdown"], state["revision_section"]),
            feedback=state["revision_feedback"],
        )),
    ]
    response = await llm.ainvoke(messages)
    revised_content = response.content
    updated_spec = _replace_section(state["spec_markdown"], state["revision_section"], revised_content)
    return {"spec_markdown": updated_spec}


def _extract_section_content(markdown: str, section_title: str) -> str:
    lines = markdown.split('\n')
    in_section = False
    content_lines = []
    for line in lines:
        if line.strip().startswith('## '):
            if in_section:
                break
            if line.strip().lstrip('# ').strip() == section_title:
                in_section = True
                continue
        elif in_section:
            content_lines.append(line)
    return '\n'.join(content_lines).strip()


def _replace_section(markdown: str, section_title: str, new_content: str) -> str:
    lines = markdown.split('\n')
    result = []
    in_section = False
    replaced = False
    for line in lines:
        if line.strip().startswith('## '):
            if in_section:
                in_section = False
                replaced = True
            if line.strip().lstrip('# ').strip() == section_title:
                result.append(line)
                result.append(new_content)
                result.append('')
                in_section = True
                continue
        if not in_section:
            result.append(line)
    return '\n'.join(result)
