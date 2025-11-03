"""JSON schema for memory tool commands."""

from typing import Dict, Any

SCHEMA: Dict[str, Any] = {
    "type": "object",
    "oneOf": [
        {
            "title": "view",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "path"],
            "properties": {
                "command": {"const": "view"},
                "path": {"type": "string"},
                "view_range": {
                    "type": "array",
                    "items": {
                        "type": "integer",
                        "minimum": 1,
                    },
                    "minItems": 2,
                    "maxItems": 2,
                },
            },
        },
        {
            "title": "create",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "path", "file_text"],
            "properties": {
                "command": {"const": "create"},
                "path": {"type": "string"},
                "file_text": {"type": "string"},
            },
        },
        {
            "title": "str_replace",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "path", "old_str", "new_str"],
            "properties": {
                "command": {"const": "str_replace"},
                "path": {"type": "string"},
                "old_str": {"type": "string"},
                "new_str": {"type": "string"},
            },
        },
        {
            "title": "insert",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "path", "insert_line", "insert_text"],
            "properties": {
                "command": {"const": "insert"},
                "path": {"type": "string"},
                "insert_line": {"type": "integer", "minimum": 1},
                "insert_text": {"type": "string"},
            },
        },
        {
            "title": "delete",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "path"],
            "properties": {
                "command": {"const": "delete"},
                "path": {"type": "string"},
            },
        },
        {
            "title": "rename",
            "type": "object",
            "additionalProperties": False,
            "required": ["command", "old_path", "new_path"],
            "properties": {
                "command": {"const": "rename"},
                "old_path": {"type": "string"},
                "new_path": {"type": "string"},
            },
        },
    ],
}


def create_tool_json_schema() -> Dict[str, Any]:
    """
    Create JSON schema for memory tool commands.

    Returns:
        JSON schema dictionary
    """
    return SCHEMA
