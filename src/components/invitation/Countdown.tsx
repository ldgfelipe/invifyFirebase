"use client";

// ============================================================================
// COUNTDOWN - Cuenta regresiva hasta la fecha del evento.
// ============================================================================
import { useEffect, useState } from "react";

interface Props {
  targetDate: string;
  label?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diff(target: number): Remaining {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function Countdown({ targetDate, label }: Props) {
  const target = new Date(targetDate).getTime();
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setRemaining(diff(target));
    const id = setInterval(() => setRemaining(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!remaining) return null;

  const items = [
    { v: remaining.days, l: "Días" },
    { v: remaining.hours, l: "Horas" },
    { v: remaining.minutes, l: "Min" },
    { v: remaining.seconds, l: "Seg" },
  ];

  return (
    <section className="py-16 px-6 text-center">
      {label && <h2 className="section-title">{label}</h2>}
      <div className="flex justify-center gap-4 md:gap-8 mt-6">
        {items.map((it) => (
          <div key={it.l} className="flex flex-col items-center">
            <span className="font-serif text-4xl md:text-6xl text-gold-500 tabular-nums">
              {String(it.v).padStart(2, "0")}
            </span>
            <span className="text-xs uppercase tracking-widest text-ink/60 mt-2">
              {it.l}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
