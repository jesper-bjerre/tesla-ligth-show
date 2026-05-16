"use client";

import { useCallback, useRef, useState } from "react";

const ALLOWED_EXTENSIONS = ["mp3", "wav"];
const MAX_SIZE_MB = 100;

interface Props {
  onFileSelected: (file: File) => void;
}

export default function AudioUploader({ onFileSelected }: Props) {
  const [dragging, setDragging] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) return "Only MP3 and WAV files are supported.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB} MB.`;
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setSelectedName(file.name);
    onFileSelected(file);
  }

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-950/20"
            : "border-zinc-700 hover:border-zinc-500"
        }`}
      >
        <p className="text-zinc-300 text-sm">
          Drag and drop an MP3 or WAV file here, or{" "}
          <span className="text-blue-400 underline">click to browse</span>
        </p>
        {selectedName && (
          <p className="mt-2 text-xs text-zinc-500">Selected: {selectedName}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {fileError && (
        <p className="text-red-400 text-xs">{fileError}</p>
      )}
    </div>
  );
}
