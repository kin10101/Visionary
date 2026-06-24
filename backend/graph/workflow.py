from typing import AsyncGenerator
from langgraph.graph import StateGraph, START, END
from graph.state import SpecState
from graph.nodes import parse_context, generate_spec, revise_section
from graph.prompts import GENERATE_SYSTEM, GENERATE_USER, REVISE_SYSTEM, REVISE_USER
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


def _route_by_mode(state: SpecState) -> str:
    if state.get("mode") == "revise":
        return "revise_section"
    return "parse_context"


builder = StateGraph(SpecState)
builder.add_node("parse_context", parse_context)
builder.add_node("generate_spec", generate_spec)
builder.add_node("revise_section", revise_section)

builder.add_conditional_edges(START, _route_by_mode)
builder.add_edge("parse_context", "generate_spec")
builder.add_edge("generate_spec", END)
builder.add_edge("revise_section", END)

graph = builder.compile()


async def run_generate_stream(title: str, context_text: str) -> AsyncGenerator[str, None]:
    """Stream tokens for spec generation directly from LLM (bypassing graph for streaming)."""
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3, streaming=True)
    messages = [
        SystemMessage(content=GENERATE_SYSTEM),
        HumanMessage(content=GENERATE_USER.format(title=title, context=context_text)),
    ]
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content


async def run_revise_stream(
    current_spec: str, section: str, feedback: str
) -> AsyncGenerator[str, None]:
    """Stream tokens for section revision. Yields only the new section content."""
    from graph.nodes import _extract_section_content
    section_content = _extract_section_content(current_spec, section)

    llm = ChatOpenAI(model="gpt-4o", temperature=0.3, streaming=True)
    messages = [
        SystemMessage(content=REVISE_SYSTEM),
        HumanMessage(content=REVISE_USER.format(
            section=section,
            section_content=section_content,
            feedback=feedback,
        )),
    ]
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
