"use client";

import { useEffect, useRef } from "react";
import type { ShowTimeline } from "@tesla-light-show/shared";

interface Props {
  audioUrl: string;
  timeline: ShowTimeline;
  playbackRef?: React.MutableRefObject<number>;
}

export default function WaveformTimeline({ audioUrl, playbackRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<import("wavesurfer.js").default | null>(null);

  useEffect(() => {
    // `cancelled` prevents the async import from creating a second instance
    // when React StrictMode fires the effect twice in development.
    let cancelled = false;

    (async () => {
      const WaveSurfer = (await import("wavesurfer.js")).default;
      if (cancelled || !containerRef.current) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#3b82f6",
        progressColor: "#1d4ed8",
        height: 80,
        barWidth: 2,
        barGap: 1,
        url: audioUrl,
      });

      if (playbackRef) {
        ws.on("timeupdate", (t: number) => {
          playbackRef.current = t;
        });
      }

      wsRef.current = ws;
    })();

    return () => {
      cancelled = true;
      wsRef.current?.destroy();
      wsRef.current = null;
    };
  }, [audioUrl]); // playbackRef is a stable ref — intentionally omitted

  function togglePlay() {
    wsRef.current?.playPause();
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full rounded overflow-hidden" />
      <button
        onClick={togglePlay}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
      >
        Play / Pause
      </button>
    </div>
  );
}
