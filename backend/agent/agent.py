import os
from functools import lru_cache
from pathlib import Path

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.postgres import PostgresSaver

from config import settings
from agent.tools import tools
from agent.utils import systemPrompt


def build_model():
    """Build LLM model, using Google as primary and Groq as fallback."""
    try:
        if settings.google_api_key:
            llm = ChatGoogleGenerativeAI(
                model=settings.google_model,
                temperature=0.0,
                google_api_key=settings.google_api_key,
                max_retries=1,
            )
            # Test with a simple call
            llm.invoke([HumanMessage(content="test")])
            return llm, "google"
    except Exception as e:
        print(f"Google model failed, falling back to Groq: {e}")

    if settings.groq_api_key:
        llm = ChatGroq(
            model=settings.groq_model,
            temperature=0.0,
            api_key=settings.groq_api_key,
            max_retries=1,
        )
        return llm, "groq"

    raise RuntimeError("No valid LLM provider configured")

_pool = None


def get_saver():
    global _pool
    if _pool is None:
        from psycopg_pool import ConnectionPool
        _pool = ConnectionPool(settings.database_url, max_size=20, kwargs={"autocommit": True, "prepare_threshold": 0})
        saver = PostgresSaver(_pool)
        saver.setup()
        return saver
    return PostgresSaver(_pool)


def build_agent(model_name: str | None = None, temperature: float = 0.0):
    llm, provider = build_model()
    llm_with_tools = llm.bind_tools(tools)

    def chat_node(state: MessagesState):
        messages = [SystemMessage(content=systemPrompt)] + state["messages"]
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    workflow = StateGraph(MessagesState)
    workflow.add_node("chat_node", chat_node)
    workflow.add_node("tool_node", tool_node)
    workflow.add_edge(START, "chat_node")
    workflow.add_conditional_edges(
        "chat_node",
        tools_condition,
        {"tools": "tool_node", "__end__": END},
    )
    workflow.add_edge("tool_node", "chat_node")

    saver = get_saver()

    return workflow.compile(checkpointer=saver)


@lru_cache(maxsize=8)
def get_agent(model_name: str | None = None):
    return build_agent(model_name)
