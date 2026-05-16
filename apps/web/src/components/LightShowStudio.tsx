"use client";

import { useState, useRef } from "react";
import AudioUploader from "./AudioUploader";
import ModelSelector from "./ModelSelector";
import StyleSelector from "./StyleSelector";
import WaveformTimeline from "./WaveformTimeline";
import PreviewCanvas from "./PreviewCanvas";
import ExportPanel from "./ExportPanel";
import JobProgressBar from "./JobProgressBar";
import type { TeslaModel, StylePreset, JobResponse, ShowTimeline } from "@tesla-light-show/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LightShowStudio() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobResponse | null>(null);
  const [timeline, setTimeline] = useState<ShowTimeline | null>(null);
  const [model, setModel] = useState<TeslaModel>("model3-reflector");
  const [style, setStyle] = useState<StylePreset>("energetic");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const playbackRef = useRef(0);

  function handleFileSelected(file: File) {
    setPendingFile(file);
    setError(null);
    setTimeline(null);
    setJobId(null);
    setJobStatus(null);
    setAudioUrl(URL.createObjectURL(file));
  }

  async function handleGenerate() {
    if (!pendingFile) return;
    setError(null);
    setTimeline(null);
    setJobId(null);
    setJobStatus(null);
    setGenerating(true);

    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("model", model);
    formData.append("style", style);

    try {
      const res = await fetch(`${API_BASE}/api/uploads/audio`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Upload failed (${res.status})`);
      }
      const data: JobResponse = await res.json();
      setJobId(data.job_id);
      setJobStatus(data);
      pollJob(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the API server. Make sure the Python backend is running on port 8000.");
    } finally {
      setGenerating(false);
    }
  }

  function pollJob(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${id}`);
        if (!res.ok) return;
        const data: JobResponse = await res.json();
        setJobStatus(data);

        if (data.status === "completed") {
          clearInterval(interval);
          const tlRes = await fetch(`${API_BASE}/api/jobs/${id}/timeline`);
          if (tlRes.ok) {
            const tl: ShowTimeline = await tlRes.json();
            setTimeline(tl);
          }
        } else if (data.status === "failed") {
          clearInterval(interval);
          setError(data.error ?? "Processing failed.");
        }
      } catch {
        // network error — keep polling
      }
    }, 1500);
  }

  async function handleExport(audioFormat: "wav" | "mp3" = "wav") {
    if (!jobId) return;
    setExporting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/jobs/${jobId}/export?audio_format=${audioFormat}`
      );
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lightshow-${jobId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight">Tesla Light Show</span>
        <span className="text-zinc-500 text-sm">Custom show generator</span>
      </header>

      <main className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
        {/* Upload */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            1. Import audio
          </h2>
          <AudioUploader onFileSelected={handleFileSelected} />
          {pendingFile && (
            <p className="mt-3 text-zinc-400 text-sm">
              Selected: <span className="text-white font-medium">{pendingFile.name}</span>
            </p>
          )}
        </section>

        {/* Job progress */}
        {jobStatus && (
          <JobProgressBar status={jobStatus.status} error={error} />
        )}

        {/* Config + Generate */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              2. Select model
            </h2>
            <ModelSelector value={model} onChange={setModel} />
          </div>
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              3. Style
            </h2>
            <StyleSelector value={style} onChange={setStyle} />
          </div>
        </section>

        {/* Generate button */}
        <section>
          <button
            onClick={handleGenerate}
            disabled={!pendingFile || generating || (!!jobStatus && jobStatus.status === "processing")}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {generating
              ? "Uploading…"
              : jobStatus?.status === "processing"
              ? "Processing…"
              : "Generate Light Show"}
          </button>
        </section>

        {/* Preview */}
        {timeline && audioUrl && (
          <section className="bg-zinc-900 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              4. Preview
            </h2>
            <PreviewCanvas timeline={timeline} model={model} playbackRef={playbackRef} />
            <WaveformTimeline audioUrl={audioUrl} timeline={timeline} playbackRef={playbackRef} />
          </section>
        )}

        {/* Export */}
        {timeline && (
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              5. Export
            </h2>
            <ExportPanel onExport={handleExport} loading={exporting} />
          </section>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
