"use client";

import { useEffect, useState } from "react";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
  highlightWords?: string[];
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
  highlightWords = [],
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const serializedText = JSON.stringify(Array.isArray(text) ? text : [text]);

  useEffect(() => {
    const phrases: string[] = JSON.parse(serializedText);
    const words = phrases.filter(Boolean);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let index = 0;
    let length = 0;
    let deleting = false;

    function tick() {
      const word = words[index];
      if (!word) return;
      length += deleting ? -1 : 1;
      setDisplayText(word.slice(0, length));
      let wait = deleting ? deleteSpeed : speed;
      if (!deleting && length === word.length) {
        if (!loop) return;
        deleting = true;
        wait = delay;
      } else if (deleting && length === 0) {
        deleting = false;
        index = (index + 1) % words.length;
        wait = speed;
      }
      timer = setTimeout(tick, Math.max(16, wait));
    }

    function start() {
      clearTimeout(timer);
      index = 0;
      length = 0;
      deleting = false;
      setDisplayText(preference.matches ? (words[0] ?? "") : "");
      if (!preference.matches && words.length) {
        timer = setTimeout(tick, Math.max(16, speed));
      }
    }

    start();
    preference.addEventListener("change", start);
    return () => {
      clearTimeout(timer);
      preference.removeEventListener("change", start);
    };
  }, [serializedText, speed, deleteSpeed, delay, loop]);

  return (
    <span className={className}>
      <span className="typewriter-accessible">
        {(Array.isArray(text) ? text : [text]).filter(Boolean).join(" ")}
      </span>
      <span aria-hidden="true">
        {displayText.split(/(\s+)/).map((word, index) =>
          highlightWords.includes(word) ? (
            <mark className="sentry-keyword" key={index}>
              {word}
            </mark>
          ) : (
            <span key={index}>{word}</span>
          ),
        )}
        <span className="typewriter-cursor">{cursor}</span>
      </span>
    </span>
  );
}
