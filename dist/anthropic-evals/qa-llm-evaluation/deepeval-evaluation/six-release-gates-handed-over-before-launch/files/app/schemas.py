from typing import List, Literal

from pydantic import BaseModel, Field


class SummaryPoint(BaseModel):
    text: str = Field(max_length=200)
    source_id: str


class SummaryResponse(BaseModel):
    conversation_id: str
    sentiment: Literal["positive", "neutral", "negative"]
    points: List[SummaryPoint]
    resolved: bool
