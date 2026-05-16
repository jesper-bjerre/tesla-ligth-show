"use client";

import type { JobStatus } from "@tesla-light-show/shared";

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued…",
  processing: "Processing audio…",
  completed: "Ready",
  failed: "Failed",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  queued: "bg-zinc-600",
  processing: "bg-blue-600 animate-pulse",
  completed: "bg-green-600",
  failed: "bg-red-600",
};

interface Props {
  status: JobStatus;
  error?: string | null;
}

export default function JobProgressBar({ status, error }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
      <span className="text-sm text-zinc-300">{STATUS_LABELS[status]}</span>
      {error && status === "failed" && (
        <span className="text-xs text-red-400 ml-2">{error}</span>
      )}
    </div>
  );
}
