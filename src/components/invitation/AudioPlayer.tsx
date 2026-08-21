"use client";

// ============================================================================
// AUDIO - Reproductor de música de fondo (con autoplay intento + botón toggle).
// ============================================================================
import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  autoplay?: boolean;
}

export function AudioPlayer({ src, autoplay }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (autoplay) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [autoplay]);

  function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pausar música" : "Reproducir música"}
      className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-gold-300 text-ink shadow-soft flex items-center justify-center hover:bg-gold-400 transition"
    >
      {playing ? "❚❚" : "►"}
      <audio ref={ref} src={src} loop preload="none" />
    </button>
  );
}
