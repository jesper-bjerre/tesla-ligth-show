"use client";

import type { StylePreset } from "@tesla-light-show/shared";

const STYLES: { value: StylePreset; label: string; description: string }[] = [
  { value: "clean", label: "Clean / Minimal", description: "Subtle pulses, calm transitions" },
  { value: "energetic", label: "Energetic / Pop", description: "Hard flashes on beat" },
  { value: "cinematic", label: "Cinematic / Ramp", description: "Long sweeps, dramatic builds" },
  { value: "cybertruck", label: "Cybertruck Emphasis", description: "Full brightness across the truck" },
];

interface Props {
  value: StylePreset;
  onChange: (v: StylePreset) => void;
}

export default function StyleSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {STYLES.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            value === s.value
              ? "bg-purple-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          <span className="font-medium">{s.label}</span>
          <span className="block text-xs opacity-70">{s.description}</span>
        </button>
      ))}
    </div>
  );
}
