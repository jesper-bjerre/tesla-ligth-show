"use client";

import { useState } from "react";

interface Props {
  onExport: (audioFormat: "wav" | "mp3") => void;
  loading: boolean;
}

export default function ExportPanel({ onExport, loading }: Props) {
  const [format, setFormat] = useState<"wav" | "mp3">("wav");

  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-2">
        {(["wav", "mp3"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              format === f
                ? "bg-zinc-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        onClick={() => onExport(format)}
        disabled={loading}
        className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm font-semibold transition-colors"
      >
        {loading ? "Exporting…" : "Download ZIP"}
      </button>
      <span className="text-xs text-zinc-500">
        {format === "wav" ? "WAV recommended (44.1 kHz, best sync)" : "MP3 (smaller file)"}
      </span>
    </div>
  );
}
