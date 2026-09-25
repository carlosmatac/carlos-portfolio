/**
 * Granada as a study at the window: a student programming while the sun rises and sets outside.
 * Pure helpers shared by the scene and its tests. Scene units are metres; the student faces −z.
 */
export type Vec3 = [number, number, number];

/** One full day outside the window: sunrise, a slow arc, sunset, and a short night with the moon. */
export const DAY_SECONDS = 60;
const DAYLIGHT_SHARE = 0.72;
/** The clock starts just after sunrise, so a visitor lands in warm light. */
const DAY_OFFSET = 0.06;
/** Where the sun and moon travel: a vertical plane behind the rooftops, centred on the window as seen from the room. */
export const SKY = { z: -7.2, horizon: 0.95, height: 1.75, rise: -3.6, set: 1.1 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type Daylight = { phase: number; elevation: number; daylight: number; warmth: number; night: number; sun: Vec3; moon: Vec3; moonlight: number };
/** Reduced motion holds a still golden hour. */
export function studyDaylight(seconds: number, reduced = false): Daylight {
  const phase = reduced ? 0.09 : (((seconds / DAY_SECONDS + DAY_OFFSET) % 1) + 1) % 1;
  const day = phase / DAYLIGHT_SHARE, night = (phase - DAYLIGHT_SHARE) / (1 - DAYLIGHT_SHARE);
  const elevation = phase < DAYLIGHT_SHARE ? Math.sin(Math.PI * day) : -0.3 * Math.sin(Math.PI * night);
  const daylight = smooth(-0.08, 0.32, elevation);
  const warmth = daylight * (1 - smooth(0.2, 0.62, elevation));
  const moonArc = phase < DAYLIGHT_SHARE ? 0 : Math.sin(Math.PI * night);
  return {
    phase, elevation, daylight, warmth, night: 1 - daylight,
    sun: [lerp(SKY.rise, SKY.set, clamp01(day)), SKY.horizon + elevation * SKY.height, SKY.z],
    moon: [lerp(SKY.rise + 0.6, SKY.set - 0.4, clamp01(night)), SKY.horizon - 0.4 + moonArc * 1.9, SKY.z - 0.2],
    moonlight: smooth(0.15, 0.4, moonArc),
  };
}

/** The student's loop: typing, a pause to look out of the window, a stretch, and back to the code. */
export const LOOP_SECONDS = 18;
const KEYBOARD: Vec3 = [-0.3, 0.8, -1.93];
export const DESK = { top: 0.76, front: -1.75, back: -2.5, left: -1.3, right: 1.3 };

export type StudentPose = {
  /** 1 while the hands are on the keyboard. */
  typing: number; look: number; stretch: number;
  chest: Vec3; head: Vec3; pitch: number; yaw: number;
  shoulders: [Vec3, Vec3]; elbows: [Vec3, Vec3]; hands: [Vec3, Vec3];
};
export function studentPose(seconds: number, sunX = 0, reduced = false): StudentPose {
  const t = reduced ? 2 : ((seconds % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  const look = smooth(8, 9.2, t) * (1 - smooth(14.2, 15.4, t));
  const stretch = smooth(11.4, 12.4, t) * (1 - smooth(13.3, 14.3, t));
  const typing = 1 - look;
  const lean = look * 0.09;
  const chest: Vec3 = [-0.3, 1.02 - lean * 0.2, -1.45 + lean];
  const neck: Vec3 = [chest[0], chest[1] + 0.13, chest[2] - 0.02 + lean * 0.2];
  const shoulders: [Vec3, Vec3] = [[chest[0] - 0.18, chest[1], chest[2]], [chest[0] + 0.18, chest[1], chest[2]]];
  // Alternating key presses: short, uneven taps rather than a single sine.
  const tap = (phase: number) => reduced ? 0 : typing * Math.max(0, Math.sin(seconds * 17 + phase)) * Math.max(0, Math.sin(seconds * 5.3 + phase * 2)) * 0.02;
  const type: [Vec3, Vec3] = [[KEYBOARD[0] - 0.1, KEYBOARD[1] + tap(0), KEYBOARD[2]], [KEYBOARD[0] + 0.1, KEYBOARD[1] + tap(1.7), KEYBOARD[2] + 0.01]];
  const rest: [Vec3, Vec3] = [[-0.46, DESK.top + 0.03, DESK.front - 0.08], [-0.12, DESK.top + 0.03, DESK.front - 0.06]];
  // Hands clasped behind the head.
  const up: [Vec3, Vec3] = [[chest[0] - 0.06, chest[1] + 0.3, chest[2] + 0.1], [chest[0] + 0.06, chest[1] + 0.3, chest[2] + 0.1]];
  const hands = [0, 1].map(i => mix3(mix3(type[i], rest[i], look), up[i], stretch)) as [Vec3, Vec3];
  const elbows = [0, 1].map(i => {
    const side = i ? 1 : -1, s = shoulders[i];
    const typingElbow: Vec3 = [s[0] + side * 0.05, 0.82, -1.58];
    const raised: Vec3 = [s[0] + side * 0.2, chest[1] + 0.26, chest[2] + 0.12];
    // Elbows swing outward on the way up instead of passing through the shoulder.
    const swing = 4 * stretch * (1 - stretch);
    const elbow = mix3(mix3(typingElbow, [s[0] + side * 0.06, 0.84, -1.56 + lean], look), raised, stretch);
    return [elbow[0] + side * 0.1 * swing, elbow[1] - 0.05 * swing, elbow[2]] as Vec3;
  }) as [Vec3, Vec3];
  const nod = reduced ? 0 : Math.sin(seconds * 0.9) * 0.025 * typing;
  return {
    typing, look, stretch, chest, shoulders, elbows, hands,
    head: [neck[0], neck[1] + 0.12, neck[2]],
    pitch: lerp(-0.16 + nod, 0.3, look) - stretch * 0.12,
    yaw: look * Math.max(-0.35, Math.min(0.35, -(sunX + 0.3) * 0.12)),
  };
}

/** Lines of code on the monitor: indent, width and colour, typed one after another and scrolled upward. */
export const CODE_ROWS = 11;
export const CODE_COLOURS: Vec3[] = [[0.62, 0.64, 1.0], [0.3, 0.72, 0.85], [1.0, 0.64, 0.34], [0.36, 0.36, 0.55]];
export function codeLine(index: number) {
  const h = (n: number) => { const x = Math.sin((index + 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const blank = h(0) < 0.12;
  const indent = Math.floor(h(1) * 4) % 4 === 3 ? 1 : Math.floor(h(1) * 3);
  return { indent: blank ? 0 : indent, width: blank ? 0 : 0.18 + h(2) * 0.62, colour: Math.floor(h(3) * CODE_COLOURS.length) };
}
/** Rows visible at a given amount of typing (in lines); the last row is still being typed. */
export function codeRows(typed: number) {
  const last = Math.floor(typed), progress = typed - last;
  return Array.from({ length: CODE_ROWS }, (_, row) => {
    const index = last - (CODE_ROWS - 1) + row, line = codeLine(index);
    return { row, ...line, width: row === CODE_ROWS - 1 ? line.width * progress : line.width };
  });
}

export type StudyView = { fov: number; position: Vec3; target: Vec3; centre: [number, number] };
/** Desktop keeps the left third for the story; portrait lifts the study above it. */
export function studyView(width: number, height: number): StudyView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) {
    // Narrow screens are limited by width: back away until the window and the student fit side to side.
    const d = Math.max(4.9, 2.5 / aspect);
    return { fov: 46, position: [-0.2 + 0.52 * d, 1.3 + 0.1 * d, -2.0 + 0.85 * d], target: [-0.2, 1.3, -2.0], centre: [0.5, 0.27] };
  }
  // Three-quarters from behind the right shoulder: the profile, the typing hands, the screen and the window.
  return { fov: 34, position: [1.85, 1.78, 1.85], target: [-0.25, 1.42, -2.05], centre: [0.58, 0.5] };
}
export function studyCamera(view: StudyView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 0.25 + excursion * 1.2, py + sway[1] * 0.12 + excursion * 1.6, pz + excursion * 3.5] as Vec3,
    target: [tx + sway[0] * 0.05, ty + excursion * 0.4, tz] as Vec3,
  };
}
/** Halftone line spacing in CSS pixels; arrival starts coarse and resolves. */
export function studyCell(width: number, excursion: number) {
  return (width < 700 ? 5 : 6) * (1 + 6 * excursion * excursion);
}
