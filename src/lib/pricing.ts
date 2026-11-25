export const PRIVATE_YURT_USD_PER_NIGHT = 30;
export const YURT_SLEEPS = 4;

export function quote(args: {
  pricePerPersonUsd: number;
  durationDays: number;
  travelerCount: number;
  yurtArrangement: "shared" | "private";
}) {
  const base = args.pricePerPersonUsd * args.travelerCount;
  const nights = args.durationDays - 1;
  const yurts = Math.ceil(args.travelerCount / YURT_SLEEPS);
  const yurtSupplement = args.yurtArrangement === "private" ? yurts * nights * PRIVATE_YURT_USD_PER_NIGHT : 0;
  return { base, yurtSupplement, nights, yurts, total: base + yurtSupplement };
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
