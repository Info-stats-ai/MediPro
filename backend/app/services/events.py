import asyncio
from collections import defaultdict
from typing import Any


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)

    async def publish(self, document_id: str, event: dict[str, Any]) -> None:
        for queue in tuple(self._subscribers[document_id]):
            await queue.put(event)

    def subscribe(self, document_id: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=20)
        self._subscribers[document_id].add(queue)
        return queue

    def unsubscribe(self, document_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers[document_id].discard(queue)
        if not self._subscribers[document_id]:
            self._subscribers.pop(document_id, None)
