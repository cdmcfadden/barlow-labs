import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barlow Labs | Innovation, Data, Technology",
  description: "Pioneering the future through innovation, data, and cutting-edge technology",
  icons: { icon: "/favicon.jpeg" },
  openGraph: {
    title: "Barlow Labs",
    description: "Pioneering the future through innovation, data, and cutting-edge technology",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@barlowlabs",
    title: "Barlow Labs",
    description: "Pioneering the future through innovation, data, and cutting-edge technology",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="inline-block h-8 w-8 rounded-md bg-gradient-to-br from-primary to-accent" aria-hidden />
              <span className="text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
                Barlow Labs
              </span>
            </Link>
            <ul className="flex items-center gap-6 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/story" className="text-muted-foreground hover:text-foreground transition-colors">
                  Our Story
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t border-border/60 mt-24">
          <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Barlow Labs. Seattle, WA.</p>
            <p>Pioneering the future through innovation, data, and cutting-edge technology.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
