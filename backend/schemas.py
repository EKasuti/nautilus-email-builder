from pydantic import BaseModel, EmailStr
from typing import Any, Optional


class Block(BaseModel):
    id: str
    type: str
    content: str
    color: Optional[str] = None
    fontSize: Optional[int] = None
    align: Optional[str] = "center"
    url: Optional[str] = None
    src: Optional[str] = None
    alt: Optional[str] = None


class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    blocks: list[Block]
    template: Optional[str] = None
    send_mode: str = "now"


class SendEmailResponse(BaseModel):
    success: bool
    id: Optional[str] = None
    message: str
