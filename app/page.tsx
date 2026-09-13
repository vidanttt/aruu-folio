import BustViewer from "./components/BustViewer";

export default function Home() {
  return (
    <main className="h-dvh min-h-[36rem] overflow-hidden bg-background text-foreground">
      <header className="flex h-[clamp(3.25rem,8vh,4.7rem)] items-center justify-center border-b border-foreground">
        <h1 className="font-display text-[clamp(1.7rem,3.2vw,2.65rem)] leading-none font-normal">
          VIDAANT <span className="font-serif italic">for</span> REAL
        </h1>
      </header>

      <section
        className="grid h-[calc(100%-clamp(3.25rem,8vh,4.7rem))] grid-cols-[49%_51%] max-md:grid-cols-[22%_78%]"
        aria-label="3D artwork"
      >
        <div
          aria-hidden="true"
          className="border-r border-foreground"
        />

        <div className="relative min-w-0 cursor-grab overflow-hidden active:cursor-grabbing">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center">
            <span className="font-sans text-[clamp(4.5rem,10vw,9rem)] leading-none font-black tracking-normal text-foreground mix-blend-difference">
              3D
            </span>
          </div>

          <BustViewer />

          <p className="pointer-events-none absolute right-4 bottom-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Drag to rotate
          </p>
        </div>
      </section>
    </main>
  );
}