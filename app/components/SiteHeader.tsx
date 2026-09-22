"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pageLogos: Record<string, { src: string; alt: string }> = {
  "/design": {
    src: "/aja_bhidle.svg",
    alt: "Aja Bhidle",
  },
  "/video-edits": {
    src: "/video%20edits(1).svg",
    alt: "Video Edits",
  },
};

export default function SiteHeader() {
  const pathname = usePathname();
  const pageLogo = pageLogos[pathname];
  const hasPageLogo = Boolean(pageLogo);

  return (
    <header className="relative flex h-[clamp(4rem,10vh,5.6rem)] shrink-0 items-center justify-center border-b border-foreground bg-background z-50">
      <Link
        href="/"
        className={
          hasPageLogo
            ? "absolute left-4 sm:left-6"
            : undefined
        }
      >
        <img
          src="/wordmark.svg"
          alt="ARUU for REAL"
          className="h-[34px] w-auto object-contain transition-opacity hover:opacity-80"
          style={{ filter: "brightness(0)" }}
        />
      </Link>

      {pageLogo ? (
        <img
          src={pageLogo.src}
          alt={pageLogo.alt}
          className="absolute right-4 h-[50px] w-auto object-contain sm:right-6"
          style={{ filter: "brightness(0)" }}
        />
      ) : null}
    </header>
  );
}
