import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.audio_normalizer import normalize_audio
from app.services.job_store import create_job, JobStatus

ALLOWED_TYPES = {"audio/mpeg", "audio/wav", "audio/wave", "audio/x-wav"}
ALLOWED_EXTENSIONS = {".mp3", ".wav"}
MAX_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

VALID_MODELS = {"model3-reflector", "model3-projector", "models-reflector", "models-projector", "modelx", "cybertruck"}
VALID_STYLES = {"clean", "energetic", "cinematic", "cybertruck"}

router = APIRouter()


@router.post("/audio")
async def upload_audio(
    file: UploadFile = File(...),
    model: str = Form(default="model3-reflector"),
    style: str = Form(default="energetic"),
) -> JSONResponse:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only MP3 and WAV files are accepted.")

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 100 MB limit.")

    if model not in VALID_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid model. Choose from: {', '.join(sorted(VALID_MODELS))}")
    if style not in VALID_STYLES:
        raise HTTPException(status_code=400, detail=f"Invalid style. Choose from: {', '.join(sorted(VALID_STYLES))}")

    job_id = str(uuid.uuid4())
    job = create_job(job_id, original_filename=file.filename or "audio", tesla_model=model, style_preset=style)

    # Normalize to 44.1 kHz WAV master in background
    normalize_audio(job_id=job_id, audio_bytes=content, source_ext=ext)

    return JSONResponse({"job_id": job_id, "status": job.status})
