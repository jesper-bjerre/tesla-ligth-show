"""
Rule-based timeline generator.

Beats/onsets drive flashes and accent pulses.
Low-band energy drives strong front/rear groups.
High-band energy drives sharp details.
Sustained sections use ramps instead of hard flashes.

Output shape: ShowTimeline (see packages/shared/schema.py)
"""
from pathlib import Path
from typing import Any

import librosa
import numpy as np

from app.services.job_store import get_job, update_job, job_dir, JobStatus

FRAME_INTERVAL_MS = 20
CHANNEL_COUNT = 48  # Tesla light-only channel set (cross-vehicle safe)


def generate_timeline(job_id: str, master_wav: Path) -> None:
    job = get_job(job_id)
    if job is None:
        return

    try:
        y, sr = librosa.load(str(master_wav), sr=44100, mono=False)
        if y.ndim > 1:
            y_mono = librosa.to_mono(y)
        else:
            y_mono = y

        tempo, beat_frames = librosa.beat.beat_track(y=y_mono, sr=sr)
        # librosa 0.10+ / NumPy 2.x: tempo may be a 1-D array; extract scalar safely
        tempo_bpm: float = float(np.asarray(tempo).flat[0])
        onset_env = librosa.onset.onset_strength(y=y_mono, sr=sr)
        onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)

        duration_s = librosa.get_duration(y=y_mono, sr=sr)
        n_frames = int(duration_s * 1000 / FRAME_INTERVAL_MS) + 1

        # Mel spectrogram for band energy
        mel = librosa.feature.melspectrogram(y=y_mono, sr=sr, n_mels=128)
        mel_db = librosa.power_to_db(mel, ref=np.max)

        hop_length = 512
        frame_times = np.arange(n_frames) * (FRAME_INTERVAL_MS / 1000.0)

        low_energy = _band_energy(mel_db, sr, hop_length, fmin=20, fmax=250, n_frames=n_frames, duration_s=duration_s)
        high_energy = _band_energy(mel_db, sr, hop_length, fmin=2000, fmax=8000, n_frames=n_frames, duration_s=duration_s)

        beat_set = set(_frames_to_show_frames(beat_frames, sr, hop_length))
        onset_set = set(_frames_to_show_frames(onset_frames, sr, hop_length))

        style = job.style_preset
        channel_values: list[list[int]] = []
        for fi in range(n_frames):
            frame = _generate_frame(fi, beat_set, onset_set, low_energy[fi], high_energy[fi], style)
            channel_values.append(frame)

        timeline: dict[str, Any] = {
            "metadata": {
                "job_id": job_id,
                "original_filename": job.original_filename,
                "tempo_bpm": tempo_bpm,
                "duration_s": duration_s,
                "tesla_model": job.tesla_model,
                "style_preset": job.style_preset,
            },
            "audio_metadata": {
                "sample_rate": 44100,
                "channels": 2,
                "format": "wav",
            },
            "frame_interval_ms": FRAME_INTERVAL_MS,
            "channel_count": CHANNEL_COUNT,
            "channel_values": channel_values,
        }

        job = get_job(job_id)
        if job:
            job.timeline = timeline
            job.status = JobStatus.COMPLETED
            update_job(job)

    except Exception as exc:
        job = get_job(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error = str(exc)
            update_job(job)


def _band_energy(
    mel_db: np.ndarray,
    sr: int,
    hop_length: int,
    fmin: float,
    fmax: float,
    n_frames: int,
    duration_s: float,
) -> np.ndarray:
    """Return per-show-frame normalized band energy in [0, 1]."""
    freqs = librosa.mel_frequencies(n_mels=mel_db.shape[0], fmin=0, fmax=sr / 2)
    band_mask = (freqs >= fmin) & (freqs <= fmax)
    band_mel = mel_db[band_mask, :]
    energy = band_mel.mean(axis=0)

    # Resample to n_frames
    mel_times = librosa.times_like(energy, sr=sr, hop_length=hop_length)
    show_times = np.linspace(0, duration_s, n_frames)
    resampled = np.interp(show_times, mel_times, energy)

    # Normalize 0→1
    mn, mx = resampled.min(), resampled.max()
    if mx > mn:
        resampled = (resampled - mn) / (mx - mn)
    else:
        resampled = np.zeros_like(resampled)
    return resampled


def _frames_to_show_frames(librosa_frames: np.ndarray, sr: int, hop_length: int) -> list[int]:
    times = librosa.frames_to_time(librosa_frames, sr=sr, hop_length=hop_length)
    return [int(t * 1000 / FRAME_INTERVAL_MS) for t in times]


def _generate_frame(
    fi: int,
    beat_set: set[int],
    onset_set: set[int],
    low_energy: float,
    high_energy: float,
    style: str = "energetic",
) -> list[int]:
    """
    Cross-vehicle safe lights-only frame for 48 channels.

    Channel layout (cross-vehicle safe subset, all boolean unless noted):
    0-3:   Front turn signals (L outer, L inner, R inner, R outer)
    4-7:   Front position / DRLs
    8-11:  Front fog lights
    12-15: Front main beams (boolean only on most models)
    16-19: Rear turn signals
    20-23: Rear position / brake lights
    24-27: Rear fog lights (non-NA + NA Model X only)
    28-31: Reverse lights
    32-35: Side marker lights (NA only — use sparingly)
    36-39: Cabin dome lights
    40-43: Underbody / ambient (future)
    44-47: Reserved
    """
    frame = [0] * CHANNEL_COUNT

    is_beat = fi in beat_set
    is_onset = fi in onset_set

    if style == "clean":
        # Beats only — no onset flashes, gentle ramps
        low_val = int(low_energy * 200)
        if is_beat:
            for ch in range(4, 8):
                frame[ch] = 255
            for ch in range(20, 24):
                frame[ch] = 255
        # Ambient fill from low energy
        for ch in range(4, 8):
            frame[ch] = max(frame[ch], low_val)

    elif style == "cinematic":
        # Smooth energy ramps, subtle beat accents
        low_val = int(low_energy * 180)
        high_val = int(high_energy * 120)
        for ch in range(4, 8):
            frame[ch] = low_val
        for ch in range(20, 24):
            frame[ch] = low_val
        for ch in range(8, 12):
            frame[ch] = high_val
        if is_beat:
            for ch in range(4, 8):
                frame[ch] = min(255, frame[ch] + 75)

    elif style == "cybertruck":
        # Aggressive: all channels blast on every beat and onset
        low_val = 255 if low_energy > 0.4 else 0
        high_val = 255 if high_energy > 0.5 else 0
        if is_beat or is_onset:
            for ch in range(CHANNEL_COUNT):
                frame[ch] = 255
        else:
            for ch in range(0, 16):
                frame[ch] = low_val
            for ch in range(16, 32):
                frame[ch] = high_val

    else:  # energetic (default)
        low_val = 255 if low_energy > 0.6 else (128 if low_energy > 0.3 else 0)
        high_val = 255 if high_energy > 0.7 else 0
        if is_beat:
            for ch in range(4, 8):
                frame[ch] = 255
            for ch in range(20, 24):
                frame[ch] = 255
        if is_onset:
            frame[0] = 255
            frame[3] = 255
            frame[16] = 255
            frame[19] = 255
        if low_val > 0:
            for ch in range(4, 8):
                frame[ch] = max(frame[ch], low_val)
        if high_val > 0:
            for ch in range(8, 12):
                frame[ch] = high_val

    return frame
