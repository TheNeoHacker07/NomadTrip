import Database from "better-sqlite3";

// The database itself is recreated by e2e/reset-db.ts as the first step of the webServer command (the server must
// not hold a connection to a file that gets deleted). Here we only prove the run starts from the pristine seed.
export default function globalSetup() {
  const db = new Database("data/e2e.db", { readonly: true });
  const { trips } = db.prepare("select count(*) as trips from trips").get() as { trips: number };
  const { bookings } = db.prepare("select count(*) as bookings from bookings").get() as { bookings: number };
  db.close();
  if (trips === 0 || bookings !== 0) throw new Error(`e2e database is not pristine: ${trips} trips, ${bookings} bookings`);
}
