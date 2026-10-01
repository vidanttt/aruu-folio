import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";

type Project = {
  id: number;
  name: string;
  skill: string;
  kind: string;
  softwares: string;
  client: string;
  client_url: string | null;
  project_date: string | null;
  description: string | null;
};

type WindowsSidebarProps = {
  animationPhase: "closed" | "opening" | "open" | "closing";
  chromeDuration: number;
  EASE: readonly [number, number, number, number];
  closeProject: () => void;
  selectedProject: Project;
  navigateProject: (direction: 1 | -1) => void;
  projectsLength: number;
  category: "design" | "video-edits";

  // Design specific
  selectedImageIndex?: number;
  selectedImagesLength?: number;
  showPreviousImage?: () => void;
  showNextImage?: () => void;
};

export default function WindowsSidebar({
  animationPhase,
  chromeDuration,
  EASE,
  closeProject,
  selectedProject,
  navigateProject,
  projectsLength,
  category,
  selectedImageIndex = 0,
  selectedImagesLength = 0,
  showPreviousImage,
  showNextImage,
}: WindowsSidebarProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.aside
      className="fixed bottom-0 left-0 top-[clamp(4rem,10vh,5.6rem)] z-[100] w-[20vw] min-w-[200px] max-w-[380px] max-md:w-[50vw] max-md:min-w-0 max-md:max-w-none overflow-hidden border-r border-black bg-white"
      initial={{
        x: "-100%",
      }}
      animate={{
        x: animationPhase === "closing" ? "-100%" : "0%",
      }}
      transition={{
        duration: chromeDuration,
        ease: EASE,
      }}
      style={{
        pointerEvents: animationPhase === "closing" ? "none" : "auto",
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="flex h-full w-full flex-col">

        {/* =================================================
            CONTROL ROW
            X | SHARE |      | LEFT | RIGHT
        ================================================= */}

        <div className="flex h-[52px] shrink-0 border-b border-black max-md:h-[48px]">

          <button
            type="button"
            onClick={closeProject}
            aria-label="Close"
            className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50 max-md:w-12"
          >
            <span className="relative block h-[18px] w-[18px]">
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[19px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-black" />
              <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[19px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-black" />
            </span>
          </button>

          <button
            type="button"
            aria-label="Share"
            title={copied ? "Copied link!" : "Share link"}
            onClick={async () => {
              const shareUrl =
                category === "design"
                  ? `${window.location.origin}/design?project=${selectedProject.id}${selectedImageIndex > 0
                    ? `&img=${selectedImageIndex + 1}`
                    : ""
                  }`
                  : `${window.location.origin}/video-edits?project=${selectedProject.id}`;

              const shareData = {
                title: selectedProject.name,
                text: selectedProject.name,
                url: shareUrl,
              };

              const isMobile =
                typeof window !== "undefined" &&
                window.matchMedia("(max-width: 768px)").matches;

              let shared = false;

              if (
                isMobile &&
                typeof navigator !== "undefined" &&
                navigator.share
              ) {
                try {
                  await navigator.share(shareData);
                  shared = true;
                } catch {
                  // User dismissed or share failed
                }
              }

              if (
                !shared &&
                typeof navigator !== "undefined" &&
                navigator.clipboard
              ) {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);

                  if (copyTimeoutRef.current) {
                    clearTimeout(copyTimeoutRef.current);
                  }

                  copyTimeoutRef.current = setTimeout(() => {
                    setCopied(false);
                  }, 2000);
                } catch (err) {
                  console.error("Failed to copy link:", err);
                }
              }
            }}
            className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50 max-md:w-12"
          >
            {copied ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 8.5L6.5 12L13 4"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 13 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6.5 9V1" stroke="black" strokeWidth="1" />
                <path
                  d="M3.5 4L6.5 1L9.5 4"
                  stroke="black"
                  strokeWidth="1"
                />
                <path
                  d="M1 7V11.5H12V7"
                  stroke="black"
                  strokeWidth="1"
                />
              </svg>
            )}
          </button>

          <div className="flex flex-1 items-center px-4 overflow-hidden">
            {copied && (
              <span className="font-['Degular'] text-[11px] font-semibold uppercase tracking-[0.08em] text-black/60 truncate transition-opacity duration-200">
                Link copied
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigateProject(-1)}
            aria-label="Previous project"
            disabled={projectsLength < 2 || animationPhase === "closing"}
            className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30 max-md:w-12"
          >
            <img
              src="/arrow-left.png"
              alt="Previous project"
              className="h-[18px] w-[18px] object-contain select-none pointer-events-none"
            />
          </button>

          <button
            type="button"
            onClick={() => navigateProject(1)}
            aria-label="Next project"
            disabled={projectsLength < 2 || animationPhase === "closing"}
            className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30 max-md:w-12"
          >
            <img
              src="/arrow.png"
              alt="Next project"
              className="h-[18px] w-[18px] object-contain select-none pointer-events-none"
            />
          </button>
        </div>

        {/* =================================================
            NAME
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[24px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            NAME
          </div>

          <div className="relative left-[-2px] mt-[-4px] m-0 max-w-full p-0 font-['Degular'] font-semibold text-[48px] leading-[33px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[38px] max-md:leading-[33px] max-md:tracking-[-1.9px] max-md:scale-x-[1.1]">
            {selectedProject.name
              ? selectedProject.name.split(",").map((name, index) => (
                <span key={index} className="block m-0 p-0">
                  {name.trim()}
                </span>
              ))
              : "—"}
          </div>
        </div>

        {/* =================================================
            SKILL
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[20px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            SKILL
          </div>

          <div className="relative left-[-1px] mt-[-3.5px] m-0 p-0 font-['Degular'] font-semibold text-[24px] leading-[21px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[24px] max-md:leading-[22px] max-md:tracking-[-1.2px]">
            {selectedProject.skill
              ? selectedProject.skill.split(",").map((skill, index) => (
                <span key={index} className="block m-0 p-0">
                  {skill.trim()}
                </span>
              ))
              : "—"}
          </div>
        </div>

        {/* =================================================
            KIND
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[20px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            KIND
          </div>

          <div className="relative left-[-1px] mt-[-3.5px] m-0 p-0 font-['Degular'] font-semibold text-[24px] leading-[21px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[24px] max-md:leading-[22px] max-md:tracking-[-1.2px]">
            {selectedProject.kind
              ? selectedProject.kind.split(",").map((kind, index) => (
                <span key={index} className="block m-0 p-0">
                  {kind.trim()}
                </span>
              ))
              : "—"}
          </div>
        </div>

        {/* =================================================
            SOFTWARE(S) USED
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[20px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            SOFTWARE(S) USED
          </div>

          <div className="relative left-[-1px] mt-[-3.5px] m-0 p-0 font-['Degular'] font-semibold text-[24px] leading-[21px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[24px] max-md:leading-[22px] max-md:tracking-[-1.2px]">
            {selectedProject.softwares
              ? selectedProject.softwares.split(",").map((software, index) => (
                <span key={index} className="block m-0 p-0">
                  {software.trim()}
                </span>
              ))
              : "—"}
          </div>
        </div>

        {/* =================================================
            FOR WHOM
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[20px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            FOR WHOM
          </div>

          <div className="relative left-[-1px] mt-[-3.5px] m-0 p-0 font-['Degular'] font-semibold text-[24px] leading-[21px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[24px] max-md:leading-[22px] max-md:tracking-[-1.2px]">
            {selectedProject.client ? (
              selectedProject.client_url ? (
                selectedProject.client.split(",").map((client, index) => (
                  <a
                    key={index}
                    href={selectedProject.client_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block m-0 p-0 transition-opacity duration-200 hover:underline hover:opacity-75"
                  >
                    {client.trim()}
                  </a>
                ))
              ) : (
                selectedProject.client.split(",").map((client, index) => (
                  <span key={index} className="block m-0 p-0">
                    {client.trim()}
                  </span>
                ))
              )
            ) : (
              "—"
            )}
          </div>
        </div>

        {/* =================================================
            WHEN
        ================================================= */}

        <div className="border-b border-black px-[24px] py-[20px] max-md:px-[16px] max-md:py-[16px]">
          <div className="font-['Degular'] font-regular text-[12px] leading-[12px] tracking-[-0.6px] scale-x-[1.3] origin-left">
            WHEN
          </div>

          <div className="relative left-[-1px] mt-[-3.5px] m-0 p-0 font-['Degular'] font-semibold text-[24px] leading-[21px] tracking-[-1.8px] transform scale-x-[1.3] origin-left max-md:text-[24px] max-md:leading-[22px] max-md:tracking-[-1.2px]">
            {selectedProject.project_date
              ? new Date(selectedProject.project_date)
                .toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
                .toUpperCase()
              : "—"}
          </div>
        </div>

        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <div className="px-[24px] pt-[20px] max-md:px-[16px] max-md:pt-[16px]">
          {selectedProject.description && (
            <p className="m-0 max-w-full p-0 font-['Degular'] font-semibold text-[15px] leading-[21px] tracking-[-0.75px] scale-x-[1.3] origin-left">
              {selectedProject.description}
            </p>
          )}
        </div>

        {/* =================================================
            IMAGE COUNTER (Design Specific)
        ================================================= */}

        {category === "design" &&
          selectedImagesLength > 1 &&
          showPreviousImage &&
          showNextImage && (
            <div className="mt-auto flex items-center justify-between border-t border-black px-6 py-4 font-['Degular'] text-[18px] font-semibold max-md:px-4 max-md:py-3 max-md:text-[19px]">
              <button
                type="button"
                onClick={showPreviousImage}
                aria-label="Previous image"
                className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-40"
              >
                <img
                  src="/arrow-left.png"
                  alt="Previous image"
                  className="h-[15px] w-[15px] object-contain select-none pointer-events-none"
                />
              </button>

              <span>
                {String(selectedImageIndex + 1).padStart(2, "0")} /{" "}
                {String(selectedImagesLength).padStart(2, "0")}
              </span>

              <button
                type="button"
                onClick={showNextImage}
                aria-label="Next image"
                className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-40"
              >
                <img
                  src="/arrow.png"
                  alt="Next image"
                  className="h-[15px] w-[15px] object-contain select-none pointer-events-none"
                />
              </button>
            </div>
          )}
      </div>
    </motion.aside>
  );
}