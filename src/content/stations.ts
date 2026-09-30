import { places } from "./places";

/** The journey's stops, in order: the Earth first, then each city. */
export const STATIONS = [
  { id: "earth", label: "Earth", detail: "Where it starts" },
  ...places.map(place => ({ id: place.id as string, label: place.city as string, detail: place.period as string })),
];

/** Fired on window by the journey whenever it settles on, or leaves for, another station. */
export const JOURNEY_STOP_EVENT = "journey:stop";
