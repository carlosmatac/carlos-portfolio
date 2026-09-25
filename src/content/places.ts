/** City centres, rather than the locations of individual schools or offices. */
export const places = [
  {
    id: "st-louis", city: "St. Louis", country: "United States", coordinates: "38.63° N · 90.20° W",
    latitude: 38.627, longitude: -90.199, period: "2017 — 2018", chapter: "A new perspective",
    title: "High school, a little further from home.",
    description: "An exchange year at Northwest High School in St. Louis, Missouri.",
    detail: "Northwest High School", type: "Education",
  },
  {
    id: "granada", city: "Granada", country: "Spain", coordinates: "37.18° N · 3.60° W",
    latitude: 37.1773, longitude: -3.5986, period: "Graduated 2025", chapter: "Building the foundations",
    title: "Where engineering met business.",
    description: "Computer Engineering and Business Administration at Universidad de Granada.",
    detail: "Universidad de Granada", type: "Education",
  },
  {
    id: "brno", city: "Brno", country: "Czech Republic", coordinates: "49.20° N · 16.61° E",
    latitude: 49.1951, longitude: 16.6068, period: "2022 — 2023", chapter: "Another way of seeing",
    title: "A year of changing perspectives.",
    description: "An Erasmus exchange in Brno. A new city, a different culture, and another chapter in my education.",
    detail: "Erasmus programme", type: "Education",
  },
  {
    id: "munich", city: "Munich", country: "Germany", coordinates: "48.14° N · 11.58° E",
    latitude: 48.1351, longitude: 11.582, period: "2024 — Feb 2026", chapter: "From learning to building",
    title: "The first lines of a new chapter.",
    description: "From my first software engineering internship to a Software Engineer role at HAT.tec.",
    detail: "HAT.tec", type: "Work",
  },
  {
    id: "madrid", city: "Madrid", country: "Spain", coordinates: "40.42° N · 3.70° W",
    latitude: 40.4168, longitude: -3.7038, period: "2026 — Present", chapter: "Here, for now",
    title: "Still curious. Still building.",
    description: "Based in Madrid. Data Architect at Nfq and co-founder of Aksum, an internal knowledge platform.",
    detail: "Nfq · Aksum", type: "Now",
  },
] as const;
