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
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <img
            src="/video%20edits%20bg.png"
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover saturate-100 transition-[filter] duration-500 ease-in-out hover:saturate-[0.7]"
          />

          <div className="relative z-10 flex items-center justify-center">
            <img
              src="/video%20edits(1).svg"
              alt="Video Edits"
              className="h-[97px] w-auto object-contain"
            // style={{ filter: "brightness(0)" }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-foreground max-md:inset-x-0 max-md:inset-y-auto max-md:top-1/2 max-md:left-0 max-md:h-px max-md:w-full max-md:translate-x-0 max-md:-translate-y-1/2" />

        {/* Right panel — Design */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <img
            src="/aja_bhidle.png"
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover saturate-100 transition-[filter] duration-500 ease-in-out hover:saturate-[0.7]"
          />

          <div className="relative z-10 flex items-center justify-center">
            <img
              src="/aja_bhidle.svg"
              alt="Design"
              className="h-[97px] w-auto object-contain"
            // style={{ filter: "brightness(0)" }}
            />
          </div>
        </div>
      </section>

      <footer className="relative flex h-[clamp(2.25rem,5.5vh,3.25rem)] shrink-0 items-center justify-between border-t border-foreground bg-background px-7 max-md:px-3 font-['Degular'] text-[21px] font-semibold leading-none tracking-[-0.05em] text-black">
        <span
          className="inline-block"
          style={{
            transform: "scaleX(1.35)",
            transformOrigin: "left center",
          }}
        >
          wrk@aruu.fr
        </span>

        <span
          className="absolute left-1/2 inline-block"
          style={{
            transform: "translateX(-50%) scaleX(1.35)",
            transformOrigin: "center center",
          }}
        >
          @aruuforeal
        </span>

        <span
          className="inline-block"
          style={{
            transform: "scaleX(1.35)",
            transformOrigin: "right center",
          }}
        >
          +91 600 608 7997
        </span>
      </footer>
    </main>
  );
}