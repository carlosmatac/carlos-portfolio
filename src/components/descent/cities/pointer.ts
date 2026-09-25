/** Mouse or pen position over the viewport, in normalized device coordinates. Touch is ignored. */
export function trackPointer() {
  const state = { x: 0, y: 0, seen: -Infinity, inside: false };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    state.x = event.clientX / Math.max(1, window.innerWidth) * 2 - 1;
    state.y = 1 - event.clientY / Math.max(1, window.innerHeight) * 2;
    state.seen = performance.now() / 1000; state.inside = true;
  };
  const onLeave = (event: PointerEvent) => { if (!event.relatedTarget) state.inside = false; };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onLeave);
  return {
    state,
    /** True while the cursor has moved over the page within the last `seconds`. */
    hovering: (now: number, seconds = 8) => state.inside && now - state.seen < seconds,
    dispose() {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    },
  };
}
