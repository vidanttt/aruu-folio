import Link from "next/link";

export default function Footer({
  className = "",
  borderTop = true,
}: {
  className?: string;
  borderTop?: boolean;
}) {
  return (
    <footer
      className={`relative z-50 flex h-[clamp(2.25rem,5.5vh,3.25rem)] shrink-0 items-center justify-between ${
        borderTop ? "border-t border-foreground" : ""
      } bg-background px-7 max-md:px-3 font-['Degular'] text-[21px] font-semibold leading-none tracking-[-0.05em] text-black ${className}`}
    >
      <a
        href="https://mail.google.com/mail/?view=cm&fs=1&to=wrk@aruu.fr"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform duration-200 ease-out hover:scale-[1.02]"
        style={{
          transform: "scaleX(1.35)",
          transformOrigin: "left center",
        }}
      >
        wrk@aruu.fr
      </a>

      <a
        href="https://www.instagram.com/aruuforeal/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-1/2 inline-block transition-transform duration-200 ease-out hover:scale-[1.02]"
        style={{
          transform: "translateX(-50%) scaleX(1.35)",
          transformOrigin: "center center",
        }}
      >
        @aruuforeal
      </a>

      <a
        href="tel:+916006087997"
        className="inline-block transition-transform duration-200 ease-out hover:scale-[1.02]"
        style={{
          transform: "scaleX(1.35)",
          transformOrigin: "right center",
        }}
      >
        +91 600 608 7997
      </a>
    </footer>
  );
}
