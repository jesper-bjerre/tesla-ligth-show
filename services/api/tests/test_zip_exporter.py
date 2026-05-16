"""
Unit tests for ZIP exporter structure.
"""
import io
import zipfile
from unittest.mock import patch, MagicMock

import pytest

from app.services.zip_exporter import build_zip
from app.services.job_store import Job, JobStatus


def _make_job() -> Job:
    return Job(
        job_id="test-123",
        original_filename="my-song.wav",
        basename="my-song",
        status=JobStatus.COMPLETED,
        timeline={
            "channel_count": 48,
            "frame_interval_ms": 20,
            "channel_values": [[0] * 48 for _ in range(10)],
        },
    )


def test_zip_structure():
    job = _make_job()
    fake_wav = b"RIFF" + b"\x00" * 40  # minimal fake WAV bytes

    with patch("app.services.zip_exporter.job_dir") as mock_dir:
        mock_path = MagicMock()
        mock_path.__truediv__ = lambda self, other: mock_path
        mock_path.exists.return_value = True
        mock_path.read_bytes.return_value = fake_wav
        mock_dir.return_value = mock_path

        zip_bytes = build_zip(job, audio_format="wav")

    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    names = zf.namelist()

    assert "README.md" in names
    assert "LightShow/my-song.fseq" in names
    assert "LightShow/my-song.wav" in names


def test_basename_matches_exactly():
    job = _make_job()
    fake_wav = b"RIFF" + b"\x00" * 40

    with patch("app.services.zip_exporter.job_dir") as mock_dir:
        mock_path = MagicMock()
        mock_path.__truediv__ = lambda self, other: mock_path
        mock_path.exists.return_value = True
        mock_path.read_bytes.return_value = fake_wav
        mock_dir.return_value = mock_path

        zip_bytes = build_zip(job, audio_format="wav")

    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    names = set(zf.namelist())
    # Both LightShow files must share the same basename
    fseq_name = next(n for n in names if n.endswith(".fseq"))
    audio_name = next(n for n in names if n.endswith(".wav"))
    assert fseq_name.replace(".fseq", "") == audio_name.replace(".wav", "")


def test_readme_contains_basename():
    job = _make_job()
    fake_wav = b"RIFF" + b"\x00" * 40

    with patch("app.services.zip_exporter.job_dir") as mock_dir:
        mock_path = MagicMock()
        mock_path.__truediv__ = lambda self, other: mock_path
        mock_path.exists.return_value = True
        mock_path.read_bytes.return_value = fake_wav
        mock_dir.return_value = mock_path

        zip_bytes = build_zip(job, audio_format="wav")

    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    readme = zf.read("README.md").decode()
    assert "my-song" in readme
    assert "LightShow" in readme


def test_invalid_audio_format_raises():
    job = _make_job()
    with pytest.raises(ValueError):
        build_zip(job, audio_format="ogg")  # type: ignore
