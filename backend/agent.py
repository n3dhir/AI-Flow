import os
import sqlite3
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
import certifi

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.sqlite import SqliteSaver

from utils import systemPrompt, resolveModel
from tools import tools

Path("checkpoints").mkdir(exist_ok=True)


def build_agent(model_name: str | None = None, temperature: float = 0.0):
    model_name = model_name or resolveModel()

    if os.environ.get("GOOGLE_API_KEY", "").strip():
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=os.environ["GOOGLE_API_KEY"],
            max_retries=1,
        )
    else:
        llm = ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=os.environ.get("OPENAI_API_KEY"),
            base_url=os.environ.get("OPENAI_API_BASE_URL"),
            max_retries=1,
            timeout=45,
        )

    llm_with_tools = llm.bind_tools(tools)

    def chat_node(state: MessagesState):
        messages = [SystemMessage(content=systemPrompt)] + state["messages"]
        response = llm_with_tools.invoke(messages)

        return {
            "messages": [response]
        }

    tool_node = ToolNode(tools)
    
    workflow = StateGraph(MessagesState)

    workflow.add_node("chat_node", chat_node)
    workflow.add_node("tool_node", tool_node)

    workflow.add_edge(START, "chat_node")
    workflow.add_conditional_edges(
        "chat_node",
        tools_condition,
        {"tools": "tool_node", "__end__": END}
    )
    workflow.add_edge("tool_node", "chat_node")

    conn = sqlite3.connect(
        "checkpoints/agent_checkpoint.db",
        check_same_thread=False
        )
    saver = SqliteSaver(conn)


    return workflow.compile(checkpointer=saver)

@lru_cache(maxsize=8)
def get_agent(model_name: str | None = None):
    return build_agent(model_name)


workflow = get_agent()


if __name__ == "__main__":
    config = {"configurable": {"thread_id": "demo"}}
    result = workflow.invoke(
        {"messages": [HumanMessage(content="what are the ai news this week ?")]},
        config
    )
    print(result["messages"][-1].content)