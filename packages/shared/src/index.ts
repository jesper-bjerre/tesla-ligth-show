/** Canonical show timeline — single source of truth for preview AND FSEQ export. */
export interface ShowTimeline {
  metadata: ShowMetadata;
  audio_metadata: AudioMetadata;
  /** Frame interval in milliseconds (20 ms recommended by Tesla). */
  frame_interval_ms: number;
  /** Number of channels per frame (48 or 200). */
  channel_count: number;
  /**
   * Array of frames. Each frame is an array of `channel_count` uint8 values (0–255).
   * Most Tesla channels are boolean: values > 0 are ON.
   */
  channel_values: number[][];
}

export interface ShowMetadata {
  job_id: string;
  original_filename: string;
  tempo_bpm: number;
  duration_s: number;
}

export interface AudioMetadata {
  sample_rate: 44100;
  channels: 1 | 2;
  format: "wav" | "mp3";
}

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface JobResponse {
  job_id: string;
  original_filename: string;
  basename: string;
  status: JobStatus;
  error?: string | null;
  audio_ext: "wav" | "mp3";
}

export type TeslaModel =
  | "model3-reflector"
  | "model3-projector"
  | "modely-reflector"
  | "modely-projector"
  | "models-reflector"
  | "models-projector"
  | "modelx"
  | "cybertruck";

export type StylePreset = "clean" | "energetic" | "cinematic" | "cybertruck";

export interface GenerateRequest {
  job_id: string;
  model: TeslaModel;
  style: StylePreset;
  audio_format?: "wav" | "mp3";
}

/** Per-model light anchor — maps a logical channel index to a 3D position. */
export interface LightAnchor {
  channel: number;
  label: string;
  position: [x: number, y: number, z: number];
  /** If true, channel is boolean only (no ramping). */
  boolean_only: boolean;
}
