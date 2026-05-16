"""
Normalize uploaded audio to a canonical 44.1 kHz stereo WAV master using FFmpeg.
The normalized file is stored at: <job_dir>/<job_id>/master.wav
"""
import subprocess
import tempfile
from pathlib import Path

from app.services.job_store import get_job, update_job, job_dir, JobStatus


def normalize_audio(job_id: str, audio_bytes: bytes, source_ext: str) -> None:
    job = get_job(job_id)
    if job is None:
        return

    job.status = JobStatus.PROCESSING
    update_job(job)

    out_dir = job_dir(job_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    master_path = out_dir / "master.wav"

    try:
        with tempfile.NamedTemporaryFile(suffix=source_ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = Path(tmp.name)

        _run_ffmpeg(tmp_path, master_path)
        tmp_path.unlink(missing_ok=True)

        # Trigger timeline generation in-process (sync for now; replace with worker later)
        from app.services.timeline_generator import generate_timeline

        generate_timeline(job_id=job_id, master_wav=master_path)

    except Exception as exc:
        job = get_job(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error = str(exc)
            update_job(job)


def _run_ffmpeg(src: Path, dst: Path) -> None:
    """Convert src to stereo 44.1 kHz 16-bit PCM WAV."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(src),
        "-ar", "44100",
        "-ac", "2",
        "-sample_fmt", "s16",
        str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")
