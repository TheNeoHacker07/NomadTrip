// Child process for bookings.race.test.ts: books N seats on a departure in a file database and prints the result as JSON.
import { createDb } from "@/db";
import { createBooking } from "../bookings";

const [path, departureId, seats, index] = process.argv.slice(2);
const db = createDb(path);
const traveler = (n: number) => ({
  fullName: `Racer ${index} ${n}`,
  dateOfBirth: "1990-04-02",
  nationality: "German",
  diet: "none" as const,
  allergies: null,
  ridingExperience: "none" as const,
});
const result = createBooking(
  db,
  {
    departureId: Number(departureId),
    contactName: `Racer ${index}`,
    email: `racer${index}@example.com`,
    phone: "+49 170 1234567",
    messenger: "email",
    country: "Germany",
    travelers: Array.from({ length: Number(seats) }, (_, n) => traveler(n)),
    yurtArrangement: "shared",
    fitnessLevel: "low",
    interests: [],
    medicalNotes: null,
    occasion: null,
    specialRequests: null,
    referralSource: null,
    arrivalAirport: "FRU",
    needsAirportPickup: false,
    arrivalFlight: null,
    emergencyName: "Max Test",
    emergencyPhone: "+49 170 7654321",
    consent: true,
  },
  "2020-01-01",
);
console.log(JSON.stringify(result));
