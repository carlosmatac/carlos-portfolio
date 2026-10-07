/** City centres, rather than the locations of individual schools or offices. */
export const places = [
  {
    id: "st-louis", city: "St. Louis", country: "United States", region: "Missouri", code: "STL", accent: "#9fb8ec",
    coordinates: "38.63° N · 90.20° W", latitude: 38.627, longitude: -90.199,
    period: "2017 — 2018", chapter: "A new perspective", type: "Education", note: "Sophomore year",
    title: "Fifteen, an ocean away, and suddenly one more son in the family.",
    story: [
      "I did my sophomore year (4º ESO back home) at Northwest High School, when I was fifteen.",
      "I lived with the Wohldmanns, an incredible family who took me in as one of their own. We are still in touch to this day. I owe them a lot.",
    ],
    facts: [{ label: "Age", value: "15" }, { label: "Grade", value: "Sophomore" }, { label: "Host family", value: "The Wohldmanns" }],
    description: "My sophomore year at Northwest High School, at fifteen, living with the Wohldmanns: a host family that is still family.",
  },
  {
    id: "granada", city: "Granada", country: "Spain", region: "Andalusia", code: "GRX", accent: "#e5d3ae",
    coordinates: "37.18° N · 3.60° W", latitude: 37.1773, longitude: -3.5986,
    period: "2018 — 2025", chapter: "Building the foundations", type: "Education", note: "Double degree",
    title: "Back home, and more hours at my desk than a clock.",
    story: [
      "I came back to finish bachillerato, then took on the double degree in Computer Engineering and Business Administration, sitting at the desk in my bedroom for more hours than a clock.",
      "Along the way I met incredible, like-minded people. Today they are my group of friends.",
    ],
    facts: [{ label: "Degree", value: "CS + Business" }, { label: "Office", value: "My bedroom desk" }, { label: "Best result", value: "My friends" }],
    description: "Bachillerato, then the double degree in Computer Engineering and Business Administration at Universidad de Granada.",
  },
  {
    id: "brno", city: "Brno", country: "Czech Republic", region: "South Moravia", code: "BRQ", accent: "#f0a985",
    coordinates: "49.20° N · 16.61° E", latitude: 49.1951, longitude: 16.6068,
    period: "2022 — 2023", chapter: "Another way of seeing", type: "Erasmus", note: "Erasmus year",
    title: "A year of experiences. (We studied too, I promise.)",
    story: [
      "I travelled all over Europe and spent more hours on FlixBus than sleeping.",
      "Along the way I discovered Munich and fell in love with it. A friend and I made a promise: next summer, we would do whatever it took to land software engineering internships there.",
    ],
    facts: [{ label: "Programme", value: "Erasmus+" }, { label: "Transport", value: "Mostly FlixBus" }, { label: "Promise", value: "Munich, next summer" }],
    description: "An Erasmus year of travelling across Europe, and the promise of a summer in Munich.",
  },
  {
    id: "munich", city: "Munich", country: "Germany", region: "Bavaria", code: "MUC", accent: "#efc96b",
    coordinates: "48.14° N · 11.58° E", latitude: 48.1351, longitude: 11.582,
    period: "2024 — Feb 2026", chapter: "From learning to building", type: "Work", note: "HAT.tec",
    title: "Came for a summer. Stayed for a year and a half.",
    story: [
      "My first job, my first startup. It all began with a road trip, driving from Granada to Munich.",
      "I arrived for a summer internship at HAT.tec and stayed for more than a year and a half as a Software Engineer, building software for a military mission system.",
    ],
    facts: [{ label: "Company", value: "HAT.tec" }, { label: "Arrived by", value: "Car, from Granada" }, { label: "Built", value: "Mission software" }],
    description: "My first job and my first startup: from a summer internship to a Software Engineer role at HAT.tec.",
  },
  {
    id: "madrid", city: "Madrid", country: "Spain", region: "Community of Madrid", code: "MAD", accent: "#b1a3f7",
    coordinates: "40.42° N · 3.70° W", latitude: 40.4168, longitude: -3.7038,
    period: "Feb 2026 — Now", chapter: "Here, for now", type: "Work", note: "Nfq",
    title: "Where data meets software, and I get to take the best of both.",
    story: [
      "In February 2026 I joined Nfq as a Data Engineer. I wanted Madrid to be my next stop: a very interesting ecosystem is taking shape here and I didn't want to miss it.",
      "I also wanted to learn the world of data. Working between data and software lets me take the best of each.",
    ],
    facts: [{ label: "Role", value: "Data Engineer" }, { label: "Company", value: "Nfq" }, { label: "Side quest", value: "Co-founder, Aksum" }],
    description: "Data Engineer at Nfq since February 2026, between the worlds of data and software.",
  },
] as const;

export type Place = typeof places[number];
