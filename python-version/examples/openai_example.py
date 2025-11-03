"""
Example using neu-memory with OpenAI SDK and filesystem storage.

Requirements:
    pip install openai python-dotenv

Environment variables:
    OPENAI_API_KEY: Your OpenAI API key
    OPENAI_BASE_URL: (Optional) Custom base URL
    MODEL: (Optional) Model name (default: gpt-4o-mini)
"""

import asyncio
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# Add parent directory to path for local development
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from neu_memory import create_memory_tool
from neu_memory_storage_filesystem import FileSystemStorage


async def main():
    """Run OpenAI example with filesystem storage."""
    load_dotenv()

    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY is required to run this example")

    # Initialize storage and memory tool
    storage = await FileSystemStorage.init("./memory")
    memory_kit = create_memory_tool(storage)

    # Initialize OpenAI client
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL"),
    )

    # Setup messages and tools
    messages = [
        {"role": "system", "content": memory_kit.system_prompt},
        {
            "role": "user",
            "content": "Draft a feature roadmap and keep meeting notes along the way.",
        },
    ]

    tools = [
        {
            "type": "function",
            "function": {
                "name": memory_kit.name,
                "description": memory_kit.tool_description,
                "parameters": memory_kit.tool_json_schema,
            },
        }
    ]

    model = os.getenv("MODEL", "gpt-4o-mini")

    # Tool calling loop
    while True:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
        )

        message = response.choices[0].message
        messages.append(message.model_dump())

        if message.content:
            print("Assistant:", message.content)
            break

        # Execute tool calls
        if message.tool_calls:
            for tool_call in message.tool_calls:
                if tool_call.type == "function" and tool_call.function.name == memory_kit.name:
                    args = json.loads(tool_call.function.arguments)
                    print(f"Tool call ({tool_call.id}):", args)

                    result = await memory_kit.execute(args)

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result),
                    })

    print("\nMemories persisted under ./memory")


if __name__ == "__main__":
    asyncio.run(main())
