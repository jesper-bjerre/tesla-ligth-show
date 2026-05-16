"use client";

import type { TeslaModel } from "@tesla-light-show/shared";

const MODELS: { value: TeslaModel; label: string }[] = [
  { value: "model3-reflector", label: "Model 3/Y — Reflector" },
  { value: "model3-projector", label: "Model 3/Y — Projector" },
  { value: "models-reflector", label: "Model S — Reflector" },
  { value: "models-projector", label: "Model S — Projector" },
  { value: "modelx", label: "Model X" },
  { value: "cybertruck", label: "Cybertruck" },
];

interface Props {
  value: TeslaModel;
  onChange: (v: TeslaModel) => void;
}

export default function ModelSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {MODELS.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            value === m.value
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
