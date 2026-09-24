export const ST_LOUIS_ART = {
  archAspect: 6 / 7,
  desktop: {
    arch: "/images/cities/st-louis/arch-render.webp",
    clouds: "/images/cities/st-louis/cloud-bank.webp",
  },
  mobile: {
    arch: "/images/cities/st-louis/arch-render-mobile.webp",
    clouds: "/images/cities/st-louis/cloud-bank-mobile.webp",
  },
};

export function stLouisComposition(width: number, height: number) {
  const aspect = width / Math.max(height, 1), mobile = width < 700;
  return {
    arch: {
      x: mobile ? 0.5 : 0.7,
      y: mobile ? 0.25 : 0.44,
      height: Math.min(mobile ? 0.45 : 0.98, aspect * (mobile ? 0.88 : 0.57) / ST_LOUIS_ART.archAspect),
    },
    clouds: mobile ? [
      { x: 0.55, y: 0.38, width: 1.8 },
      { x: 0.5, y: 0.48, width: 2.05 },
      { x: 0.65, y: 0.56, width: 1.9 },
    ] : [
      { x: 0.72, y: 0.68, width: 1.45 },
      { x: 0.73, y: 0.88, width: 1.55 },
      { x: 0.48, y: 1.02, width: 1.45 },
    ],
  };
}
