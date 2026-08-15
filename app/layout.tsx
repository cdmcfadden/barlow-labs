import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import ProductsMenu from "./ProductsMenu";
import LockIcon from "./LockIcon";
import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
});

export const metadata: Metadata = {
  title: "Barlow Labs | Innovation, Data, Technology",
  description: "Pioneering the future through innovation, data, and cutting-edge technology",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
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
    <html lang="en" className={comfortaa.variable}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
              <span className="inline-flex items-center justify-center rounded-md bg-white px-1.5 py-1 shadow-sm">
                <Image
                  src="/logo.png"
                  alt="Barlow Labs logo"
                  width={320}
                  height={205}
                  priority
                  className="h-6 w-auto"
                />
              </span>
              <span className="hidden text-lg font-semibold tracking-tight group-hover:text-accent transition-colors md:inline">
                Barlow Labs
              </span>
            </Link>
            <ul className="flex items-center gap-4 text-sm sm:gap-6">
              <li>
                <Link href="/" className="whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/members"
                  className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
                  title="Members only — sign in with Slack"
                >
                  <LockIcon />
                  Bootstrappers
                </Link>
              </li>
              <li>
                <Link href="/story" className="whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors">
                  Our Story
                </Link>
              </li>
              <ProductsMenu />
            </ul>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t border-border/60 mt-24">
          <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} Barlow Labs. Seattle, WA.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
