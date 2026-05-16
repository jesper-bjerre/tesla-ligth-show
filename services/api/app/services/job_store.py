import enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel

JOBS: dict[str, "Job"] = {}
JOBS_DIR = Path("/tmp/tesla-light-show-jobs")


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(BaseModel):
    job_id: str
    original_filename: str
    basename: str = ""
    status: JobStatus = JobStatus.QUEUED
    error: str | None = None
    timeline: dict[str, Any] | None = None
    audio_ext: str = "wav"
    tesla_model: str = "model3-reflector"
    style_preset: str = "energetic"

    model_config = {"use_enum_values": True}


def create_job(job_id: str, original_filename: str, tesla_model: str = "model3-reflector", style_preset: str = "energetic") -> Job:
    stem = Path(original_filename).stem
    job = Job(job_id=job_id, original_filename=original_filename, basename=stem, tesla_model=tesla_model, style_preset=style_preset)
    JOBS[job_id] = job
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return job


def get_job(job_id: str) -> Job | None:
    return JOBS.get(job_id)


def update_job(job: Job) -> None:
    JOBS[job.job_id] = job


def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id
