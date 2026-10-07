"use client";

import { useEffect, useRef, useState } from "react";

/** The drum of every flap, in the order it turns. */
export const FLAP_ALPHABET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.+-?";
const TICK_MS = 38;

/** Fits text to the board: upper case, padded to its width, characters the drum lacks left blank. */
export function flapCells(value: string, width: number) {
  return [...value.toUpperCase().padEnd(width).slice(0, width)].map(char => FLAP_ALPHABET.includes(char) ? char : " ");
}

/** Advances each cell one flap towards its target; returns null once every cell has arrived. */
export function turnFlaps(current: string[], target: string[], tick: number, lag: number[]) {
  if (current.every((char, i) => char === target[i])) return null;
  return current.map((char, i) => char === target[i] || tick < lag[i] ? char : FLAP_ALPHABET[(FLAP_ALPHABET.indexOf(char) + 1) % FLAP_ALPHABET.length]);
}

/**
 * A row of split-flap cells, like a station's departures board: each cell turns through the alphabet until it
 * reaches its letter, so changing `value` makes the whole word clatter into place.
 */
export default function SplitFlap({ value, width, delay = 0, label = value }: { value: string; width: number; delay?: number; label?: string }) {
  const target = flapCells(value, width).join("");
  const cells = useRef(flapCells("", width));
  const [shown, setShown] = useState(cells.current.join(""));

  useEffect(() => {
    const goal = [...target];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cells.current = goal;
      setShown(target);
      return;
    }
    // Neighbouring cells start a beat apart, with a little chance, like real mechanics.
    const lag = goal.map((_, i) => i + Math.floor(Math.random() * 4));
    let tick = 0, timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        const next = turnFlaps(cells.current, goal, tick++, lag);
        if (!next) return window.clearInterval(timer);
        cells.current = next;
        setShown(next.join(""));
      }, TICK_MS);
    }, delay);
    return () => { window.clearTimeout(start); window.clearInterval(timer); };
  }, [target, delay]);

  return (
    <span className="flap-text">
      <span className="sr-only">{label}</span>
      {[...shown].map((char, i) => (
        <span className="flap" key={i} aria-hidden="true"><span key={char}>{char}</span></span>
      ))}
    </span>
  );
}
