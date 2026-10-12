"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const preferenceKey = "gym-scan-sounds";
function soundEnabled() {
  try {
    return localStorage.getItem(preferenceKey) !== "off";
  } catch {
    return true;
  }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("scan-sound-preference", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("scan-sound-preference", notify);
  };
}

export function useScanSounds() {
  const enabled = useSyncExternalStore(subscribe, soundEnabled, () => true);
  const context = useRef<AudioContext | null>(null);
  const notes = useRef(new Set<OscillatorNode>());

  function stopSounds() {
    for (const note of notes.current) {
      try {
        note.stop();
      } catch {
        /* Already ended. */
      }
    }
    notes.current.clear();
  }

  useEffect(() => {
    const activeNotes = notes.current;
    return () => {
      for (const note of activeNotes) {
        try {
          note.stop();
        } catch {
          /* Already ended. */
        }
      }
      activeNotes.clear();
      const audio = context.current;
      context.current = null;
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    };
  }, []);

  // Call during a camera-start or manual-submit gesture, before the API request.
  function prepare() {
    if (!soundEnabled()) return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended")
        void context.current.resume().catch(() => {});
    } catch {
      /* Audio support must never block check-in. */
    }
  }

  function play(approved: boolean) {
    const audio = context.current;
    if (!soundEnabled() || !audio || audio.state !== "running") return;
    stopSounds();
    try {
      const frequencies = approved ? [660, 880] : [260, 196];
      frequencies.forEach((frequency, index) => {
        const note = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * 0.17;
        note.type = approved ? "sine" : "triangle";
        note.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
        note.connect(gain);
        gain.connect(audio.destination);
        notes.current.add(note);
        note.onended = () => {
          note.disconnect();
          gain.disconnect();
          notes.current.delete(note);
        };
        note.start(start);
        note.stop(start + 0.2);
      });
    } catch {
      stopSounds();
    }
  }

  function toggle() {
    const next = !enabled;
    try {
      localStorage.setItem(preferenceKey, next ? "on" : "off");
    } catch {
      return;
    }
    window.dispatchEvent(new Event("scan-sound-preference"));
    if (next) prepare();
    else stopSounds();
  }

  return { enabled, toggle, prepare, play };
}
