"use client";

import { useEffect, useRef } from "react";

type Point = { hx: number; hy: number; x: number; y: number };

/**
 * Fondo reactivo al cursor: una retícula de puntos que se apartan del puntero
 * dentro de un radio y vuelven amortiguados a su sitio. Los puntos dentro del
 * radio se encienden en el color de acento.
 *
 * Sin puntero (carga, móvil sin tocar) el foco recorre una órbita lenta, así
 * que el fondo nunca se queda quieto. Con `prefers-reduced-motion` se pinta un
 * único fotograma estático y no se registra ningún listener.
 */
export default function BackgroundField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "217 255 0";
    const restColor = "rgba(237, 237, 232, 0.13)";

    let points: Point[] = [];
    let width = 0;
    let height = 0;
    let step = 30;
    let radius = 170;
    let push = 44;

    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const compact = width < 768;
      step = compact ? 26 : 30;
      radius = compact ? 120 : 170;
      push = compact ? 30 : 44;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      points = [];
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          points.push({ hx: x, hy: y, x, y });
        }
      }
    };

    const draw = (px: number, py: number, settle: boolean) => {
      ctx.clearRect(0, 0, width, height);
      for (const p of points) {
        const dx = p.hx - px;
        const dy = p.hy - py;
        const d = Math.hypot(dx, dy) || 1;
        let f = d < radius ? 1 - d / radius : 0;
        f = f * f * (3 - 2 * f); // smoothstep

        const tx = p.hx + (dx / d) * f * push;
        const ty = p.hy + (dy / d) * f * push;
        if (settle) {
          p.x = tx;
          p.y = ty;
        } else {
          p.x += (tx - p.x) * 0.11;
          p.y += (ty - p.y) * 0.11;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + f * 1.5, 0, Math.PI * 2);
        ctx.fillStyle =
          f > 0.015 ? `rgba(${accent.split(" ").join(", ")}, ${0.12 + f * 0.8})` : restColor;
        ctx.fill();
      }
    };

    build();

    if (reduced) {
      // Un solo fotograma, sin animación ni seguimiento del cursor.
      draw(-9999, -9999, true);
      const onResizeStatic = () => {
        build();
        draw(-9999, -9999, true);
      };
      window.addEventListener("resize", onResizeStatic);
      return () => window.removeEventListener("resize", onResizeStatic);
    }

    let pointerX = -9999;
    let pointerY = -9999;
    let time = 0;
    let frame = 0;

    const onMouseMove = (e: MouseEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        pointerX = touch.clientX;
        pointerY = touch.clientY;
      }
    };
    const onLeave = () => {
      pointerX = -9999;
      pointerY = -9999;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", build);

    const tick = () => {
      time += 0.006;

      let px = pointerX;
      let py = pointerY;
      if (px < -5000) {
        px = width * (0.5 + Math.sin(time) * 0.3);
        py = height * (0.48 + Math.cos(time * 0.78) * 0.26);
      }

      // El campo se apaga al salir del hero para no competir con el texto.
      const fade = Math.min(1, window.scrollY / Math.max(1, height));
      canvas.style.opacity = String(1 - fade * 0.45);

      draw(px, py, false);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", build);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
