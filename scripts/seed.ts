import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "../src/db";
import { departures, trips, type ItineraryDay } from "../src/db/schema";
import { addDays } from "../src/lib/pricing";

type Segment = { days: number; title: string; description: string; overnight: string };

/** Expands multi-day segments into a day-by-day itinerary. */
function itinerary(segments: Segment[]): ItineraryDay[] {
  const out: ItineraryDay[] = [];
  for (const s of segments) {
    for (let i = 0; i < s.days; i++) {
      out.push({
        day: out.length + 1,
        title: s.days > 1 ? `${s.title} (${i + 1}/${s.days})` : s.title,
        description: s.description,
        overnight: s.overnight,
      });
    }
  }
  return out;
}

const catalog = [
  {
    slug: "song-kul-weekend",
    title: "Song-Kul Lake Escape",
    region: "Naryn",
    summary: "Two days at a high-alpine lake, sleeping in a herder family's yurt camp.",
    description:
      "Drive up through the Kalmak-Ashuu pass to Song-Kul at 3,016 m, where shepherd families graze their herds all summer. Ride horses along the shore, share kymyz and fresh boorsok, and watch the Milky Way from your yurt door.",
    pricePerPersonUsd: 180,
    difficulty: "easy" as const,
    highlights: ["Lake at 3,016 m", "Horse ride with herders", "Yurt camp dinner", "Night sky"],
    itinerary: itinerary([
      { days: 1, title: "Bishkek → Song-Kul", description: "Scenic drive via Kochkor and the Kalmak-Ashuu pass. Afternoon ride along the shore.", overnight: "Song-Kul yurt camp" },
      { days: 1, title: "Song-Kul → Bishkek", description: "Sunrise over the lake, felt-making demo, return drive.", overnight: "—" },
    ]),
    capacity: 12,
  },
  {
    slug: "issyk-kul-circle",
    title: "Issyk-Kul Circle",
    region: "Issyk-Kul",
    summary: "A week around the 'warm lake' — red canyons, eagle hunters and alpine valleys.",
    description:
      "Loop around Issyk-Kul, the world's second-largest alpine lake. Walk Skazka's red fairy-tale canyon, meet a berkutchi eagle hunter in Bokonbaevo, hike the Jeti-Oguz valley and sleep in yurt camps along the south shore.",
    pricePerPersonUsd: 690,
    difficulty: "moderate" as const,
    highlights: ["Skazka canyon", "Eagle hunting demo", "Jeti-Oguz valley hike", "Karakol Dungan dinner"],
    itinerary: itinerary([
      { days: 1, title: "Bishkek → Bokonbaevo", description: "Burana tower on the way; eagle hunter demonstration at sunset.", overnight: "Bokonbaevo yurt camp" },
      { days: 1, title: "Skazka & Barskoon", description: "Walk the red canyon, waterfall hike in Barskoon gorge.", overnight: "Tamga yurt camp" },
      { days: 2, title: "Jeti-Oguz valley", description: "Day hikes in the valley of the Seven Bulls; picnic lunches with local families.", overnight: "Jeti-Oguz yurt camp" },
      { days: 1, title: "Karakol", description: "Dungan mosque, wooden cathedral and an Ashlyan-fu tasting.", overnight: "Karakol guesthouse yurt" },
      { days: 1, title: "North shore", description: "Cholpon-Ata petroglyphs and a swim in the lake.", overnight: "Cholpon-Ata yurt camp" },
      { days: 1, title: "Return to Bishkek", description: "Drive back through Boom gorge.", overnight: "—" },
    ]),
    capacity: 12,
  },
  {
    slug: "tian-shan-horse-trek",
    title: "Tian Shan Horse Trek",
    region: "Naryn & Issyk-Kul",
    summary: "Two weeks in the saddle across high passes, from Kochkor to Song-Kul and beyond.",
    description:
      "A classic multi-day horse trek with local wranglers. Cross passes above 3,500 m, camp beside glacial rivers and live the jailoo summer-pasture life. Suitable for riders with some experience and good fitness.",
    pricePerPersonUsd: 1590,
    difficulty: "challenging" as const,
    highlights: ["10 days of riding", "Passes above 3,500 m", "Jailoo life", "Tash Rabat caravanserai"],
    itinerary: itinerary([
      { days: 2, title: "Bishkek & Kochkor", description: "Meet the team, gear check, felt workshop in Kochkor.", overnight: "Kochkor guesthouse yurt" },
      { days: 4, title: "Ride to Song-Kul", description: "Ride over Jalgyz-Karagai pass to the lake.", overnight: "Herders' yurt camp" },
      { days: 4, title: "Song-Kul to At-Bashy", description: "Remote valleys and river crossings with wranglers.", overnight: "Mobile yurt camp" },
      { days: 2, title: "Tash Rabat", description: "15th-century Silk Road caravanserai; rest day.", overnight: "Tash Rabat yurt camp" },
      { days: 2, title: "Return via Naryn", description: "Drive back to Bishkek, farewell dinner.", overnight: "Bishkek hotel / —" },
    ]),
    capacity: 8,
  },
  {
    slug: "great-nomad-journey",
    title: "The Great Nomad Journey",
    region: "All of Kyrgyzstan",
    summary: "A full month across every region — lakes, deserts, the Pamir-Alay and the south.",
    description:
      "Our longest journey: 30 days crossing the whole country from Bishkek to Osh. Mix trekking, riding and slow days with nomad families; sleep in a different yurt camp almost every week and see Kyrgyzstan as few travelers do.",
    pricePerPersonUsd: 3400,
    difficulty: "moderate" as const,
    highlights: ["Song-Kul, Issyk-Kul & Sary-Chelek", "Lenin Peak base camp", "Osh bazaar", "Arslanbob walnut forest"],
    itinerary: itinerary([
      { days: 3, title: "Bishkek & Ala-Archa", description: "Arrival, city walk, acclimatisation hikes in Ala-Archa.", overnight: "Ala-Archa yurt camp" },
      { days: 7, title: "Issyk-Kul circle", description: "Canyons, eagle hunters, Jeti-Oguz and Karakol.", overnight: "South-shore yurt camps" },
      { days: 5, title: "Naryn & Song-Kul", description: "Riding with herders and the Tash Rabat caravanserai.", overnight: "Song-Kul yurt camp" },
      { days: 5, title: "Sary-Chelek & Arslanbob", description: "Biosphere reserve lakes and the world's largest walnut forest.", overnight: "Village homestay yurts" },
      { days: 6, title: "Alay valley & Lenin Peak", description: "Tulpar-Kul lake beneath the 7,134 m Lenin Peak.", overnight: "Tulpar-Kul yurt camp" },
      { days: 4, title: "Osh & departure", description: "Sulaiman-Too, the great bazaar, farewell feast.", overnight: "Osh hotel / —" },
    ]),
    capacity: 8,
  },
];

const path = process.env.DATABASE_PATH ?? "data/nomadtrip.db";
const db = createDb(path);
migrate(db, { migrationsFolder: "drizzle" });

if (db.select({ id: trips.id }).from(trips).limit(1).get()) {
  console.log(`Database at ${path} already has trips — skipping seed.`);
} else {
  const start = new Date().toISOString().slice(0, 10);
  db.transaction((tx) => {
    for (const { capacity, ...trip } of catalog) {
      const { id } = tx.insert(trips).values({ ...trip, durationDays: trip.itinerary.length }).returning().get();
      const starts = [14, 28, 42, 56, 84, 112].map((d) => addDays(start, d));
      tx.insert(departures).values(starts.map((startDate) => ({ tripId: id, startDate, capacity }))).run();
    }
  });
  console.log(`Seeded ${catalog.length} trips into ${path}.`);
}
