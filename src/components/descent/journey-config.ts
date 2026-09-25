import { places } from "@/content/places";

export type CityId = typeof places[number]["id"];
export type CitySceneId = "st-louis-sky" | "granada-sky";
export type JourneyConfig = {
  introH: number;
  revealH: number;
  observeH: number;
  arrivalH: number;
  visitH: number;
  departureH: number;
  transferH: number;
  endingH: number;
  stops: readonly { cityId: CityId; sceneId: CitySceneId | null }[];
};

export const journeyConfig: JourneyConfig = {
  introH: 4.25,
  revealH: 1.19,
  observeH: 0.6,
  arrivalH: 1.8,
  visitH: 0.4,
  departureH: 1.2,
  transferH: 2.32,
  endingH: 0.28,
  stops: places.map(place => ({ cityId: place.id, sceneId: place.id === "st-louis" ? "st-louis-sky" : place.id === "granada" ? "granada-sky" : null })),
};
