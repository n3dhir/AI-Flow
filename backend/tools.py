import ast
import math
import operator
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from langchain_tavily import TavilySearch

from database import save_memory, search_memory
from rag import retrieve_from_rag

load_dotenv()


def get_thread_id(config: RunnableConfig) -> str:
    configurable = (config or {}).get("configurable") or {}
    return configurable.get("thread_id", "default")


web_search = TavilySearch(
    max_results=5,
    topic="general",
    search_depth="advanced"
)

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

_ALLOWED_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

_FUNCTIONS = {
    "sqrt": math.sqrt,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "exp": math.exp,
    "floor": math.floor,
    "ceil": math.ceil,
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
}

_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
    "inf": math.inf,
}


def _eval_node(node) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value

    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        left = _eval_node(node.left)
        right = _eval_node(node.right)

        if isinstance(node.op, ast.Pow):
            if abs(right) > 10000:
                raise ValueError("Exponent too large.")

        return _ALLOWED_BINOPS[type(node.op)](left, right)

    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_eval_node(node.operand))

    if (
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id in _FUNCTIONS
        and not node.keywords
    ):
        args = [_eval_node(arg) for arg in node.args]
        return _FUNCTIONS[node.func.id](*args)

    if isinstance(node, ast.Name) and node.id in _CONSTANTS:
        return _CONSTANTS[node.id]

    raise ValueError("Unsupported expression.")


@tool
def calculator(expression: str) -> str:
    """
    Useful for precise math calculations.
    Input should be a valid math expression.
    Supports +, -, *, /, //, %, **, parentheses, constants (pi, e, tau),
    and functions: sqrt, log, log10, log2, sin, cos, tan, exp, floor, ceil, abs, round, min, max, sum.
    Example: 2 + 2, sqrt(16), 10 * 5, round(pi, 2)
    """

    try:
        tree = ast.parse(expression, mode="eval")
        result = _eval_node(tree.body)
        return str(result)

    except Exception as e:
        return f"Calculation error: {str(e)}"


@tool
def get_weather(location: str) -> str:
    """
    Get the current weather for a city or location.
    Use this whenever the user asks about current weather conditions.
    """

    try:
        geo_response = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": location,
                "count": 1,
                "language": "en",
                "format": "json"
            },
            timeout=10
        )
        geo_response.raise_for_status()
        results = geo_response.json().get("results")

        if not results:
            return f"Could not find location '{location}'."

        place = results[0]
        name = place.get("name", location)
        country = place.get("country", "")

        wx_response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
            },
            timeout=10
        )
        wx_response.raise_for_status()
        current = wx_response.json().get("current")

        if not current:
            return f"Weather data is currently unavailable for {name}."

        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Light rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Light snow",
            73: "Moderate snow",
            75: "Heavy snow",
            77: "Snow grains",
            80: "Light rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Light snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with light hail",
            99: "Thunderstorm with heavy hail"
        }

        description = weather_codes.get(current.get("weather_code"), "Unknown conditions")

        return (
            f"Weather in {name}{', ' + country if country else ''}: "
            f"{current.get('temperature_2m')}C "
            f"(feels like {current.get('apparent_temperature')}C), "
            f"{description}, "
            f"humidity {current.get('relative_humidity_2m')}%, "
            f"wind {current.get('wind_speed_10m')} km/h."
        )

    except Exception as e:
        return f"Weather lookup failed: {str(e)}"


@tool
def current_time(timezone: str = "UTC") -> str:
    """
    Get the current date and time for a specific timezone.
    Use this whenever the user asks about the current time, today's date, or "now".
    Timezone must be an IANA name. Examples: "UTC", "Africa/Tunis", "America/New_York", "Asia/Tokyo".
    """

    try:
        now = datetime.now(ZoneInfo(timezone))
        return now.strftime("%A, %d %B %Y — %H:%M:%S (%Z, UTC%z)")
    except Exception:
        return f"Unknown timezone '{timezone}'. Use an IANA name like 'Africa/Tunis' or 'UTC'."


@tool
def search_uploaded_documents(query: str, config: RunnableConfig) -> str:
    """
    Search uploaded documents for relevant information.
    Use this when the user asks about uploaded PDFs, DOCX, TXT, notes, files, or documents.
    """

    return retrieve_from_rag(
        query=query,
        thread_id=get_thread_id(config)
    )


@tool
def remember_this(memory: str, config: RunnableConfig) -> str:
    """
    Save an important user preference or fact into long-term memory.
    Use this when the user asks you to remember something.
    """

    return save_memory(
        thread_id=get_thread_id(config),
        memory=memory
    )


@tool
def recall_memory(query: str, config: RunnableConfig) -> str:
    """
    Recall saved long-term memories about the user or this conversation.
    """

    return search_memory(
        thread_id=get_thread_id(config),
        query=query
    )


tools = [
    calculator,
    current_time,
    get_weather,
    search_uploaded_documents,
    remember_this,
    recall_memory,
    web_search
]
