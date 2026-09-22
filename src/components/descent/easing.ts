export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
