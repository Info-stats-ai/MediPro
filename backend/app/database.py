from typing import Any

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import Settings


async def connect_database(app: Any, settings: Settings) -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri, uuidRepresentation="standard")
    database = client[settings.mongodb_database]
    await database.command("ping")
    await database.documents.create_index([("owner_id", 1), ("created_at", -1)])
    await database.documents.create_index(
        [("title", "text"), ("text", "text")],
        name="document_search",
        default_language="english",
    )
    app.state.mongo_client = client
    app.state.db = database


async def close_database(app: Any) -> None:
    client = getattr(app.state, "mongo_client", None)
    if client:
        client.close()


def get_database(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db
