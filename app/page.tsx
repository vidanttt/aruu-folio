// import BustViewer from "./components/BustViewer";

export default function Home() {
  return (
    <main className="flex h-dvh min-h-[36rem] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[clamp(3.25rem,8vh,4.7rem)] shrink-0 items-center justify-center border-b border-foreground bg-background">
        <img
          src="/wordmark.svg"
          alt="ARUU for REAL"
          className="h-[29px] w-auto object-contain"
          style={{ filter: "brightness(0)" }}
        />
      </header>

      <section
        className="relative flex min-h-0 flex-1 max-md:flex-col"
        aria-label="Portfolio categories"
      >
        {/* Left panel — Video Edit */}
        <div className="group relative flex flex-1 items-center justify-center overflow-hidden">
          <img
            src="/video%20edits%20bg.png"
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover saturate-[0.5] transition-all duration-500 ease-in-out group-hover:scale-[1.13] group-hover:saturate-100"
          />

          <div className="relative z-10 flex items-center justify-center transition-transform duration-500 ease-in-out group-hover:scale-[0.96]">
            <img
              src="/video%20edits(1).svg"
              alt="Video Edits"
              className="h-[97px] w-auto object-contain"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-foreground max-md:inset-x-0 max-md:inset-y-auto max-md:top-1/2 max-md:left-0 max-md:h-px max-md:w-full max-md:translate-x-0 max-md:-translate-y-1/2" />

        {/* Right panel — Design */}
        <div className="group relative flex flex-1 items-center justify-center overflow-hidden">
          <img
            src="/design%20bg.png"
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover saturate-[0.5] transition-all duration-500 ease-in-out group-hover:scale-[1.13] group-hover:saturate-100"
          />

          <div className="relative z-10 flex items-center justify-center transition-transform duration-500 ease-in-out group-hover:scale-[0.96]">
            <img
              src="/aja_bhidle.svg"
              alt="Design"
              className="h-[97px] w-auto object-contain"
            />
          </div>
        </div>
      </section>

      <footer className="relative flex h-[clamp(2.25rem,5.5vh,3.25rem)] shrink-0 items-center justify-between border-t border-foreground bg-background px-7 max-md:px-3 font-['Degular'] text-[21px] font-semibold leading-none tracking-[-0.05em] text-black">
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
    </main>
  );
}