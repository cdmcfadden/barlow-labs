"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The F3 archive lives on this domain but is not a Barlow Labs page: PAX sign
 * in with their own workspace and should not be handed Barlow's product nav.
 * These two components swap the site chrome on /f3 routes.
 */
export function F3Header() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/f3")) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/f3/archive" className="flex shrink-0 items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">F3 Cascades</span>
          <span className="text-sm text-muted-foreground">Archive</span>
        </Link>
        <ul className="flex items-center gap-4 text-sm sm:gap-6">
          <li>
            <Link
              href="/f3/archive"
              className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              Channels
            </Link>
          </li>
          <li>
            <Link
              href="/f3/archive/search"
              className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              Search
            </Link>
          </li>
          <li>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </header>
  );
}

/** Hides the Barlow Labs chrome on F3 routes. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/f3")) return null;
  return <>{children}</>;
}
