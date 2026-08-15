"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PRODUCTS = [
  { href: "/yoova", label: "yoova" },
  { href: "/mothersd", label: "mothersd.ai" },
  { href: "/spkeasy", label: "Speak Easy" },
];

export default function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <li ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1 whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
      >
        Products
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {PRODUCTS.map((p) => (
            <li key={p.href} role="none">
              <Link
                role="menuitem"
                href={p.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
