import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "NomadTrip — Yurt journeys across Kyrgyzstan", template: "%s · NomadTrip" },
  description: "Book 2-day to 1-month trips across Kyrgyzstan with nights in traditional yurt camps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Nomad<span className="text-accent">Trip</span>
            </Link>
            <Link href="/#trips" className="text-sm text-muted hover:text-foreground">
              All trips
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          NomadTrip · Yurt journeys across Kyrgyzstan
        </footer>
      </body>
    </html>
  );
}
