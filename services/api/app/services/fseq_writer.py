"""
Tesla-compatible FSEQ V2 Uncompressed writer.

Format reference: Tesla validator + Tesla light-show project (official source of truth).

FSEQ V2 header (minimum 24 bytes):
  Offset  Size  Description
  0       4     Magic "PSEQ"
  4       2     Channel data offset (little-endian uint16)
  6       1     Minor version (0)
  7       1     Major version (2)
  8       2     Header size (= channel data offset, little-endian uint16)
  10      4     Channel count per frame (little-endian uint32)
  14      4     Frame count (little-endian uint32)
  18      1     Step time in ms (uint8, must be >= 15; we use 20)
  19      1     Flags (0)
  20      1     Compression type (0 = uncompressed)
  21      1     Compression block count (0)
  22      1     Sparse range count (0)
  23      1     Reserved (0)

After the header (offset 24): optional variable-length blocks (none in our case).
Channel data starts at offset = header_size.

Tesla requires exactly 48 or 200 channels.
"""
import struct
from typing import Any

MAGIC = b"PSEQ"
MAJOR_VERSION = 2
MINOR_VERSION = 0
STEP_TIME_MS = 20
COMPRESSION_UNCOMPRESSED = 0
HEADER_SIZE = 32  # 32-byte aligned header (≥ 24)


def build_fseq(timeline: dict[str, Any]) -> bytes:
    """Convert a ShowTimeline dict to a Tesla-compatible FSEQ V2 Uncompressed binary."""
    frames: list[list[int]] = timeline["channel_values"]
    channel_count: int = timeline["channel_count"]
    frame_count = len(frames)

    if channel_count not in (48, 200):
        raise ValueError(f"Tesla requires 48 or 200 channels, got {channel_count}.")
    if frame_count == 0:
        raise ValueError("Timeline must have at least one frame.")

    header = _build_header(channel_count=channel_count, frame_count=frame_count)
    body = _build_body(frames=frames, channel_count=channel_count)
    return header + body


def _build_header(channel_count: int, frame_count: int) -> bytes:
    buf = bytearray(HEADER_SIZE)
    # Magic
    buf[0:4] = MAGIC
    # Channel data offset (little-endian uint16)
    struct.pack_into("<H", buf, 4, HEADER_SIZE)
    # Minor version
    buf[6] = MINOR_VERSION
    # Major version
    buf[7] = MAJOR_VERSION
    # Header size (little-endian uint16)
    struct.pack_into("<H", buf, 8, HEADER_SIZE)
    # Channel count per frame (uint32)
    struct.pack_into("<I", buf, 10, channel_count)
    # Frame count (uint32)
    struct.pack_into("<I", buf, 14, frame_count)
    # Step time ms
    buf[18] = STEP_TIME_MS
    # Flags
    buf[19] = 0
    # Compression type = 0 (uncompressed)
    buf[20] = COMPRESSION_UNCOMPRESSED
    # Compression block count
    buf[21] = 0
    # Sparse range count
    buf[22] = 0
    # Reserved
    buf[23] = 0
    # Bytes 24-31: zeroed (padding to HEADER_SIZE)
    return bytes(buf)


def _build_body(frames: list[list[int]], channel_count: int) -> bytes:
    rows = []
    for frame in frames:
        row = frame[:channel_count]
        # Pad if frame has fewer channels than expected
        row += [0] * (channel_count - len(row))
        rows.append(bytes(row))
    return b"".join(rows)
