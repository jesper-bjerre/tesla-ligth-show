import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_upload_invalid_extension():
    response = client.post(
        "/api/uploads/audio",
        files={"file": ("song.ogg", b"fake-data", "audio/ogg")},
    )
    assert response.status_code == 400


def test_upload_valid_wav(tmp_path):
    # Minimal valid WAV (44 bytes header + silence)
    import wave, struct, io
    buf = io.BytesIO()
    with wave.open(buf, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(44100)
        wf.writeframes(b"\x00" * 44100)  # 0.5 s silence
    wav_bytes = buf.getvalue()

    from unittest.mock import patch
    with patch("app.services.audio_normalizer.normalize_audio"):
        response = client.post(
            "/api/uploads/audio",
            files={"file": ("test.wav", wav_bytes, "audio/wav")},
        )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data


def test_youtube_import_disabled_by_default():
    response = client.post(
        "/api/imports/youtube",
        json={"url": "https://www.youtube.com/watch?v=VCWEHOQGQb8", "rights_confirmed": True},
    )
    assert response.status_code == 403


def test_job_not_found():
    response = client.get("/api/jobs/nonexistent-id")
    assert response.status_code == 404
