import Link from "next/link";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col min-h-full justify-between">
      <section
        className="relative flex min-h-0 flex-1 max-md:flex-col h-full"
        aria-label="Portfolio categories"
      >
        {/* Left panel — Video Edit */}
        <Link href="/video-edits" className="group relative flex flex-1 items-center justify-center overflow-hidden">
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
        </Link>

        {/* Divider */}
        <div className="absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-foreground max-md:inset-x-0 max-md:inset-y-auto max-md:top-1/2 max-md:left-0 max-md:h-px max-md:w-full max-md:translate-x-0 max-md:-translate-y-1/2 pointer-events-none" />

        {/* Right panel — Design */}
        <Link href="/design" className="group relative flex flex-1 items-center justify-center overflow-hidden">
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
        </Link>
      </section>

      <Footer />
    </div>
  );
}