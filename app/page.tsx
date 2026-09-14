// import BustViewer from "./components/BustViewer";

export default function Home() {
  return (
    <main className="flex h-dvh min-h-[36rem] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[clamp(3.25rem,8vh,4.7rem)] shrink-0 items-center justify-center border-b border-foreground bg-background">
        <img
          src="/wordmark.png"
          alt="ARUU for REAL"
          className="h-[clamp(1.7rem,3.2vw,2.65rem)] w-auto object-contain"
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
              src="/video_edits.png"
              alt="Video Edits"
              className="h-[120px] w-auto object-contain"
            />
          </div>
        </div>

        {/* Vertical divider */}
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
              src="/design.png"
              alt="Design"
              className="h-[120px] w-auto object-contain"
            />
          </div>
        </div>
      </section>

      <footer className="relative flex h-[clamp(2.25rem,5.5vh,3.25rem)] shrink-0 items-center justify-between border-t border-foreground bg-background px-6 max-md:px-3">
        <img
          src="/footer/wrk@aruu.fr.png"
          alt="wrk@aruu.fr"
          className="h-[clamp(0.8rem,1.3vw,1.1rem)] w-auto object-contain"
        />

        <img
          src="/footer/@aruuforeal.png"
          alt="@aruuforeal"
          className="absolute left-1/2 h-[clamp(0.8rem,1.3vw,1.1rem)] w-auto -translate-x-1/2 object-contain"
        />

        <img
          src="/footer/+91 600 608 7997.png"
          alt="+91 600 608 7997"
          className="h-[clamp(0.8rem,1.3vw,1.1rem)] w-auto object-contain"
        />
      </footer>
    </main>
  );
}