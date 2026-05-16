"""
Unit tests for the FSEQ writer.
Validates Tesla V2 Uncompressed header structure.
"""
import struct

import pytest

from app.services.fseq_writer import build_fseq, HEADER_SIZE, STEP_TIME_MS


def _make_timeline(n_frames: int = 10, channel_count: int = 48) -> dict:
    return {
        "channel_count": channel_count,
        "frame_interval_ms": 20,
        "channel_values": [[0] * channel_count for _ in range(n_frames)],
    }


def test_magic_bytes():
    fseq = build_fseq(_make_timeline())
    assert fseq[:4] == b"PSEQ"


def test_major_version():
    fseq = build_fseq(_make_timeline())
    assert fseq[7] == 2


def test_header_size_field():
    fseq = build_fseq(_make_timeline())
    header_size_field = struct.unpack_from("<H", fseq, 8)[0]
    assert header_size_field == HEADER_SIZE


def test_channel_count_field():
    fseq = build_fseq(_make_timeline(channel_count=48))
    channel_count = struct.unpack_from("<I", fseq, 10)[0]
    assert channel_count == 48


def test_frame_count_field():
    fseq = build_fseq(_make_timeline(n_frames=25))
    frame_count = struct.unpack_from("<I", fseq, 14)[0]
    assert frame_count == 25


def test_step_time():
    fseq = build_fseq(_make_timeline())
    assert fseq[18] == STEP_TIME_MS
    assert fseq[18] >= 15


def test_compression_type_uncompressed():
    fseq = build_fseq(_make_timeline())
    assert fseq[20] == 0


def test_total_length():
    n_frames = 10
    channel_count = 48
    fseq = build_fseq(_make_timeline(n_frames=n_frames, channel_count=channel_count))
    assert len(fseq) == HEADER_SIZE + n_frames * channel_count


def test_channel_data_correct():
    frames = [[i % 256] * 48 for i in range(5)]
    timeline = {"channel_count": 48, "frame_interval_ms": 20, "channel_values": frames}
    fseq = build_fseq(timeline)
    body = fseq[HEADER_SIZE:]
    for i, frame in enumerate(frames):
        offset = i * 48
        assert list(body[offset : offset + 48]) == frame


def test_invalid_channel_count_raises():
    with pytest.raises(ValueError, match="48 or 200"):
        build_fseq(_make_timeline(channel_count=100))


def test_empty_frames_raises():
    with pytest.raises(ValueError, match="at least one frame"):
        build_fseq({"channel_count": 48, "frame_interval_ms": 20, "channel_values": []})


def test_200_channels_accepted():
    fseq = build_fseq(_make_timeline(channel_count=200))
    channel_count = struct.unpack_from("<I", fseq, 10)[0]
    assert channel_count == 200
