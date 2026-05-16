import os
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

ENABLE_YOUTUBE_IMPORT = os.getenv("ENABLE_YOUTUBE_IMPORT", "false").lower() == "true"


class YouTubeImportRequest(BaseModel):
    url: str
    rights_confirmed: bool


def _is_youtube_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.netloc in {"www.youtube.com", "youtube.com", "youtu.be"}


@router.post("/youtube")
async def import_youtube(body: YouTubeImportRequest) -> JSONResponse:
    if not ENABLE_YOUTUBE_IMPORT:
        raise HTTPException(status_code=403, detail="YouTube import is not enabled on this server.")

    if not body.rights_confirmed:
        raise HTTPException(
            status_code=400,
            detail="You must confirm that you have the rights to import and use this audio.",
        )

    if not _is_youtube_url(body.url):
        raise HTTPException(status_code=400, detail="URL must be a YouTube URL (youtube.com or youtu.be).")

    # TODO: enqueue yt-dlp job
    raise HTTPException(status_code=501, detail="YouTube import worker not yet implemented.")
