from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.services.job_store import get_job, JobStatus
from app.services.fseq_writer import build_fseq
from app.services.zip_exporter import build_zip

router = APIRouter()


@router.get("/{job_id}")
def get_job_status(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JSONResponse(job.model_dump())


@router.get("/{job_id}/timeline")
def get_timeline(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=409, detail=f"Job is not completed (status: {job.status}).")
    if job.timeline is None:
        raise HTTPException(status_code=404, detail="Timeline not yet generated.")
    return JSONResponse(job.timeline)


@router.get("/{job_id}/export")
def export_zip(job_id: str) -> StreamingResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.status != JobStatus.COMPLETED or job.timeline is None:
        raise HTTPException(status_code=409, detail="Job not ready for export.")

    zip_bytes = build_zip(job)
    basename = job.basename
    return StreamingResponse(
        iter([zip_bytes]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{basename}-lightshow.zip"'},
    )
