import { places } from "@/content/places";
import { clamp01, smoothstep } from "./easing";
import { journeyConfig, type CityId, type CitySceneId, type JourneyConfig } from "./journey-config";
import { orbitalAltitude, smootherRange, smootherstep } from "./motion";

export type PhaseKind = "intro" | "earth-reveal" | "arrival" | "visit" | "departure" | "transfer" | "earth-visit" | "ending";
export type JourneyPhase = {
  id: string;
  kind: PhaseKind;
  cityId: CityId;
  cityIndex: number;
  nextCityIndex: number;
  sceneId: CitySceneId | null;
  nextSceneId: CitySceneId | null;
  weightH: number;
  startH: number;
  endH: number;
};

export function compileJourney(config: JourneyConfig) {
  const { stops } = config;
  if (!stops.length || new Set(stops.map(s => s.cityId)).size !== stops.length) throw new Error("Journey needs unique destinations");
  for (const [key, value] of Object.entries(config)) {
    if (key !== "stops" && (typeof value !== "number" || !Number.isFinite(value) || value <= 0)) throw new Error(`Invalid journey weight: ${key}`);
  }
  const phases: JourneyPhase[] = [];
  const anchors: Record<string, number> = {};
  let totalH = 0;
  function add(kind: PhaseKind, weightH: number, index: number) {
    const stop = stops[index], next = stops[Math.min(index + 1, stops.length - 1)];
    phases.push({
      id: `${stop.cityId}:${kind}`, kind, cityId: stop.cityId,
      cityIndex: places.findIndex(p => p.id === stop.cityId),
      nextCityIndex: places.findIndex(p => p.id === next.cityId),
      sceneId: stop.sceneId, nextSceneId: next.sceneId,
      weightH, startH: totalH, endH: totalH + weightH,
    });
    totalH += weightH;
  }
  add("intro", config.introH, 0);
  add("earth-reveal", config.revealH, 0);
  stops.forEach((stop, index) => {
    if (stop.sceneId) add("arrival", config.arrivalH, index);
    anchors[stop.cityId] = totalH;
    add(stop.sceneId ? "visit" : "earth-visit", config.visitH, index);
    if (index < stops.length - 1) {
      if (stop.sceneId) add("departure", config.departureH, index);
      add("transfer", config.transferH, index);
    }
  });
  add("ending", config.endingH, stops.length - 1);
  return { phases, anchors, totalH };
}

export const JOURNEY = compileJourney(journeyConfig);
export type JourneyTimeline = ReturnType<typeof compileJourney>;
export const stopProgress = (index: number) => JOURNEY.anchors[places[index].id] / JOURNEY.totalH;
export const INTRO_END = JOURNEY.phases[0].endH / JOURNEY.totalH;

export function sampleJourney(positionH: number, timeline = JOURNEY, reduced = false) {
  const position = Math.max(0, Math.min(timeline.totalH, positionH));
  const phase = timeline.phases.find(p => position < p.endH) ?? timeline.phases.at(-1)!;
  const t = clamp01((position - phase.startH) / phase.weightH);
  const { kind, cityIndex: from, nextCityIndex } = phase;
  const introT = kind === "intro" ? t : 1;
  const to = kind === "transfer" ? nextCityIndex : from;
  // Spread rotation across the flight instead of whipping round in its middle.
  const turn = kind === "transfer" ? smootherRange(0.12, 0.92, t) : 0;
  const active = turn < 0.5 ? from : to;
  const visible = smoothstep(0.7, 0.96, introT);
  const navigation = kind === "intro" ? 0 : kind === "earth-reveal" ? smoothstep(0, 0.5, t) : 1;
  const landing = kind === "intro" ? 0 : kind === "earth-reveal" ? smootherstep(t) : 1;
  let text = 1, blend = 0;
  let city: { id: CityId; sceneId: CitySceneId; arrivalT: number; visitT: number; departureT: number } | null = null;
  if (kind === "intro") text = 0;
  if (kind === "earth-reveal") text = phase.sceneId ? 0 : smoothstep(0.5, 1, t);
  if (kind === "transfer") {
    text = (phase.sceneId ? 0 : 1 - smoothstep(0, 0.22, t))
      + (phase.nextSceneId ? 0 : smoothstep(0.87, 1, t));
  }
  if (phase.sceneId && ["arrival", "visit", "departure", "ending"].includes(kind)) {
    city = {
      id: phase.cityId, sceneId: phase.sceneId,
      arrivalT: kind === "arrival" ? t : 1,
      visitT: kind === "visit" ? t : kind === "arrival" ? 0 : 1,
      departureT: kind === "departure" ? t : 0,
    };
    blend = kind === "arrival" ? clamp01((t - 0.2) / 0.52) : kind === "departure" ? 1 - clamp01(t / 0.72) : 1;
    text = kind === "arrival" ? smoothstep(0.84, 1, t) : kind === "departure" ? 1 - smoothstep(0, 0.22, t) : 1;
  }
  if (reduced) blend = Number(blend >= 0.5);
  return {
    phase, t, positionH: position, progress: position / timeline.totalH, introT, city, blend,
    mode: blend === 0 ? "earth" : blend === 1 ? "city" : "blend",
    earth: {
      from: reduced ? active : from, to: reduced ? active : to, turn: reduced ? 0 : turn, active,
      altitude: reduced || kind !== "transfer" ? 0 : orbitalAltitude(t),
      landing: reduced ? 1 : landing, visible,
      text: reduced ? Number(navigation > 0.5) : text, navigation,
    },
  };
}

export type JourneySample = ReturnType<typeof sampleJourney>;
export type TravelSegment = { from: number; to: number };

export function travelSegments(from: number, to: number, timeline = JOURNEY): TravelSegment[] {
  const low = Math.min(from, to), high = Math.max(from, to);
  const segments = timeline.phases
    .filter(p => !["visit", "earth-visit", "ending"].includes(p.kind))
    .map(p => ({ from: Math.max(low, p.startH / timeline.totalH), to: Math.min(high, p.endH / timeline.totalH) }))
    .filter(s => s.to - s.from > 1e-10);
  return to >= from ? segments : segments.reverse().map(s => ({ from: s.to, to: s.from }));
}
