"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";

import MobileFooter from "../../components/MobileFooter";
import Footer from "../../components/Footer";

type Project = {
    id: number;
    name: string;
    skill: string;
    kind: string;
    softwares: string;
    client: string;
    client_url: string | null;
    project_date: string | null;
    category: string;
    image_urls: string[] | null;
    thumbnail_url: string | null;
    description: string | null;
    published: boolean;
};

type Props = {
    project: Project;
    images: string[];
    initialImageIndex: number;
    projectNumber: number;
    projectCount: number;
    previousProjectId: number | null;
    nextProjectId: number | null;
};

/* =========================================================
   EASY TYPOGRAPHY CONTROLS
   Change ONLY these values when adjusting the text.
   ========================================================= */

const LABEL_VALUE_GAP = -3;
const DESCRIPTION_GAP = -1;

const VALUE_STRETCH = 1.3;
const LABEL_STRETCH = 1.3;

const VALUE_SIZE = 24;
const VALUE_LINE_HEIGHT = 0.9;

const LABEL_SIZE = 12;

const NAME_SIZE = 43;
const NAME_LINE_HEIGHT = 0.82;
const NAME_STRETCH = 1.3;

const DESCRIPTION_SIZE = 18;
const DESCRIPTION_LINE_HEIGHT = 0.95;
const DESCRIPTION_STRETCH = 1.3;

/* ========================================================= */

function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date
        .toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
        })
        .toUpperCase();
}

export default function MobileDesignProject({
    project,
    images,
    initialImageIndex,
    projectNumber,
    projectCount,
    previousProjectId,
    nextProjectId,
}: Props) {
    const router = useRouter();

    const [imageIndex, setImageIndex] = useState(initialImageIndex);
    const [copied, setCopied] = useState(false);
    const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
    const [imageHeight, setImageHeight] = useState<number | null>(null);

    const image = images[imageIndex] ?? images[0];
    const hasMultipleImages = images.length > 1;

    useEffect(() => {
        document.body.style.overflow = "";
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (imageIndex > 0) {
            url.searchParams.set("img", String(imageIndex + 1));
        } else {
            url.searchParams.delete("img");
        }

        window.history.replaceState(
            null,
            "",
            url.pathname + url.search
        );
    }, [imageIndex]);

    function previousImage() {
        if (!hasMultipleImages) return;

        setSlideDirection(-1);

        setImageIndex((current) =>
            current === 0 ? images.length - 1 : current - 1
        );
    }

    function nextImage() {
        if (!hasMultipleImages) return;

        setSlideDirection(1);

        setImageIndex((current) =>
            current === images.length - 1 ? 0 : current + 1
        );
    }

    function openProject(projectId: number | null) {
        if (!projectId) return;

        const currentImage =
            imageIndex > 0 ? `?img=${imageIndex + 1}` : "";

        router.push(`/design/${projectId}${currentImage}`);
    }

    async function shareProject() {
        const shareUrl =
            `${window.location.origin}/design/${project.id}` +
            (imageIndex > 0 ? `?img=${imageIndex + 1}` : "");

        const shareData = {
            title: project.name,
            text: project.name,
            url: shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // User dismissed native share.
            }
        }

        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);

                setCopied(true);

                window.setTimeout(() => {
                    setCopied(false);
                }, 2000);
            } catch {
                // Ignore clipboard failures.
            }
        }
    }

    return (
        <main className="min-h-screen w-full bg-white text-black md:hidden">

            {/* =====================================================
                MOBILE HEADER
                ===================================================== */}

            <div className="flex h-[60px] w-full shrink-0 border-b border-black bg-white">

                <button
                    type="button"
                    onClick={() => router.push("/design")}
                    aria-label="Close"
                    className="flex h-full w-14 shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
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
                    onClick={shareProject}
                    className="flex h-full w-14 shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
                >
                    {copied ? (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
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
                        >
                            <path
                                d="M6.5 9V1"
                                stroke="black"
                                strokeWidth="1"
                            />
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

                <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-3">
                    <span className="font-['Degular'] text-[11px] font-semibold uppercase leading-none tracking-[0.04em]">
                        {projectNumber} OF {projectCount}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => openProject(previousProjectId)}
                    aria-label="Previous project"
                    className="flex h-full w-14 shrink-0 items-center justify-center border-l border-black transition-opacity hover:opacity-50"
                >
                    <img
                        src="/arrow-left.png"
                        alt="Previous project"
                        className="h-[18px] w-[18px] object-contain select-none pointer-events-none"
                    />
                </button>

                <button
                    type="button"
                    onClick={() => openProject(nextProjectId)}
                    aria-label="Next project"
                    className="flex h-full w-14 shrink-0 items-center justify-center border-l border-black transition-opacity hover:opacity-50"
                >
                    <img
                        src="/arrow.png"
                        alt="Next project"
                        className="h-[18px] w-[18px] object-contain select-none pointer-events-none"
                    />
                </button>

            </div>

            {/* =====================================================
                PREVIEW
                ===================================================== */}

            <section
                className="relative w-full overflow-hidden bg-white"
                style={imageHeight ? { height: imageHeight } : undefined}
            >
                <AnimatePresence
                    initial={false}
                    custom={slideDirection}
                    mode="sync"
                >
                    <motion.img
                        key={image}
                        src={image}
                        alt={project.name}
                        custom={slideDirection}
                        initial={{
                            x: `${slideDirection * 100}%`,
                        }}
                        animate={{ x: 0 }}
                        exit={{
                            x: `${slideDirection * -100}%`,
                        }}
                        transition={{
                            duration: 0.32,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        onLoad={(event) => {
                            const img = event.currentTarget;

                            setImageHeight(
                                (window.innerWidth / img.naturalWidth) *
                                img.naturalHeight
                            );
                        }}
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                    />
                </AnimatePresence>

                {hasMultipleImages && (
                    <>
                        <button
                            type="button"
                            onClick={previousImage}
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-black bg-white/90 transition-opacity hover:opacity-50"
                        >
                            <img
                                src="/arrow-left.png"
                                alt="Previous image"
                                className="h-4 w-4 object-contain select-none pointer-events-none"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={nextImage}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-black bg-white/90 transition-opacity hover:opacity-50"
                        >
                            <img
                                src="/arrow.png"
                                alt="Next image"
                                className="h-4 w-4 object-contain select-none pointer-events-none"
                            />
                        </button>
                    </>
                )}
            </section>

            {/* =====================================================
                PROJECT INFO
                ===================================================== */}

            <section className="w-full bg-white">

                {/* NAME */}
                <div className="border-t border-black px-5 py-5 text-center">

                    <h1
                        className="font-['Degular'] font-semibold uppercase tracking-[-0.045em] scale-x-[1.3] origin-center"
                        style={{
                            fontSize: `${NAME_SIZE}px`,
                            lineHeight: NAME_LINE_HEIGHT,
                        }}
                    >
                        {project.name
                            ? project.name.split(",").map((name, index) => (
                                <span key={index} className="block">
                                    {name.trim()}
                                </span>
                            ))
                            : "—"}
                    </h1>
                </div>

                {/* SKILL */}
                <InfoRow
                    label="SKILL"
                    value={project.skill}
                />

                {/* KIND */}
                <InfoRow
                    label="KIND"
                    value={project.kind}
                />

                {/* SOFTWARE */}
                <InfoRow
                    label="SOFTWARE(S) USED"
                    value={project.softwares}
                />

                {/* FOR WHOM */}
                <div className="border-t border-black px-5 py-5 text-center">

                    <p
                        className="font-['Degular'] font-semibold uppercase tracking-[0.02em] scale-x-[1.3] origin-center"
                        style={{
                            fontSize: `${LABEL_SIZE}px`,
                            lineHeight: "12px",
                        }}
                    >
                        FOR WHOM
                    </p>

                    {project.client_url ? (
                        <a
                            href={project.client_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-[-3px] block font-['Degular'] font-semibold uppercase tracking-[-0.025em] scale-x-[1.3] origin-center underline decoration-[1px] underline-offset-2"
                            style={{
                                fontSize: `${VALUE_SIZE}px`,
                                lineHeight: VALUE_LINE_HEIGHT,
                            }}
                        >
                            {project.client || "PERSONAL PROJECT"}
                        </a>
                    ) : (
                        <p
                            className="mt-[-3px] font-['Degular'] font-semibold uppercase tracking-[-0.025em] scale-x-[1.3] origin-center"
                            style={{
                                fontSize: `${VALUE_SIZE}px`,
                                lineHeight: VALUE_LINE_HEIGHT,
                            }}
                        >
                            {project.client || "PERSONAL PROJECT"}
                        </p>
                    )}

                </div>

                {/* WHEN */}
                <InfoRow
                    label="WHEN"
                    value={formatDate(project.project_date)}
                />

                {/* DESCRIPTION */}
                {project.description && (
                    <div className="border-t border-black px-5 py-5 text-center">

                        <p
                            className="font-['Degular'] font-semibold uppercase tracking-[0.02em] scale-x-[1.3] origin-center"
                            style={{
                                fontSize: `${LABEL_SIZE}px`,
                                lineHeight: "12px",
                            }}
                        >
                            DESCRIPTION
                        </p>

                        <p
                            className="font-['Degular'] font-semibold tracking-[-0.02em] scale-x-[1.3] origin-center"
                            style={{
                                marginTop: `${DESCRIPTION_GAP}px`,
                                fontSize: `${DESCRIPTION_SIZE}px`,
                                lineHeight: DESCRIPTION_LINE_HEIGHT,
                            }}
                        >
                            {project.description}
                        </p>

                    </div>
                )}

            </section>

            {/* =====================================================
                FOOTERS
                ===================================================== */}

            <div className="max-md:hidden">
                <Footer />
            </div>

            <div className="md:hidden">
                <MobileFooter />
            </div>

        </main>
    );
}

/* =========================================================
   INFO ROW
   Skill / Kind / Software / When
   ========================================================= */

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    const formattedValue = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return (
        <div className="border-t border-black px-5 py-5 text-center">

            {/* LABEL */}
            <p
                className="font-['Degular'] font-semibold uppercase tracking-[0.02em] scale-x-[1.3] origin-center"
                style={{
                    fontSize: `${LABEL_SIZE}px`,
                    lineHeight: "12px",
                }}
            >
                {label}
            </p>

            {/* VALUE */}
            <p
                className="font-['Degular'] font-semibold uppercase tracking-[-0.025em] scale-x-[1.3] origin-center"
                style={{
                    marginTop: `${LABEL_VALUE_GAP}px`,
                    fontSize: `${VALUE_SIZE}px`,
                    lineHeight: VALUE_LINE_HEIGHT,
                }}
            >
                {formattedValue.length > 0
                    ? formattedValue.map((item, index) => (
                        <span
                            key={`${item}-${index}`}
                            className="block"
                        >
                            {item}
                        </span>
                    ))
                    : "—"}
            </p>

        </div>
    );
}