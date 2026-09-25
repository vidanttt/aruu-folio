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

        window.history.replaceState(null, "", url.pathname + url.search);
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
                window.setTimeout(() => setCopied(false), 2000);
            } catch {
                // Ignore clipboard failures.
            }
        }
    }

    return (
        <main className="min-h-screen w-full bg-white text-black md:hidden">
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
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8.5L6.5 12L13 4" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 9V1" stroke="black" strokeWidth="1" />
                            <path d="M3.5 4L6.5 1L9.5 4" stroke="black" strokeWidth="1" />
                            <path d="M1 7V11.5H12V7" stroke="black" strokeWidth="1" />
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
                    className="flex h-full w-14 shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[28px] leading-none transition-opacity hover:opacity-50"
                >
                    ‹
                </button>

                <button
                    type="button"
                    onClick={() => openProject(nextProjectId)}
                    aria-label="Next project"
                    className="flex h-full w-14 shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[28px] leading-none transition-opacity hover:opacity-50"
                >
                    ›
                </button>
            </div>

            <section
                className="relative w-full overflow-hidden bg-white"
                style={imageHeight ? { height: imageHeight } : undefined}
            >
                <AnimatePresence initial={false} custom={slideDirection} mode="sync">
                    <motion.img
                        key={image}
                        src={image}
                        alt={project.name}
                        custom={slideDirection}
                        initial={{ x: `${slideDirection * 100}%` }}
                        animate={{ x: 0 }}
                        exit={{ x: `${slideDirection * -100}%` }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        onLoad={(event) => {
                            const img = event.currentTarget;
                            setImageHeight((window.innerWidth / img.naturalWidth) * img.naturalHeight);
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
                            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center font-['Degular'] text-[32px] leading-none text-black transition-opacity hover:opacity-50"
                        >
                            ‹
                        </button>

                        <button
                            type="button"
                            onClick={nextImage}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center font-['Degular'] text-[32px] leading-none text-black transition-opacity hover:opacity-50"
                        >
                            ›
                        </button>
                    </>
                )}
            </section>

            <section className="w-full bg-white">
                <div className="border-t border-black px-5 py-5 text-center">
                    <h1 className="font-['Degular'] text-[43px] font-semibold uppercase leading-[0.82] tracking-[-0.045em]">
                        {project.name}
                    </h1>
                </div>

                <InfoRow label="SKILL" value={project.skill} />
                <InfoRow label="KIND" value={project.kind} />
                <InfoRow label="SOFTWARE(S) USED" value={project.softwares} />

                <div className="border-t border-black px-5 py-5 text-center">
                    <p className="font-['Degular'] text-[12px] font-semibold uppercase leading-none tracking-[0.02em]">
                        FOR WHOM
                    </p>
                    {project.client_url ? (
                        <a
                            href={project.client_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block font-['Degular'] text-[24px] font-semibold uppercase leading-[0.9] tracking-[-0.025em] underline decoration-[1px] underline-offset-2"
                        >
                            {project.client || "PERSONAL PROJECT"}
                        </a>
                    ) : (
                        <p className="mt-1 font-['Degular'] text-[24px] font-semibold uppercase leading-[0.9] tracking-[-0.025em]">
                            {project.client || "PERSONAL PROJECT"}
                        </p>
                    )}
                </div>

                <InfoRow label="WHEN" value={formatDate(project.project_date)} />

                {project.description && (
                    <div className="border-t border-black px-5 py-5 text-center">
                        <p className="font-['Degular'] text-[12px] font-semibold uppercase leading-none tracking-[0.02em]">
                            DESCRIPTION
                        </p>
                        <p className="mt-2 font-['Degular'] text-[18px] font-semibold leading-[0.95] tracking-[-0.02em]">
                            {project.description}
                        </p>
                    </div>
                )}
            </section>

            {/* Desktop footer */}
            <div className="max-md:hidden">
                <Footer />
            </div>

            {/* Mobile footer — appears after scrolling */}
            <div className="md:hidden">
                <MobileFooter />
            </div>
        </main>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    const formattedValue = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return (
        <div className="border-t border-black px-5 py-5 text-center">
            <p className="font-['Degular'] text-[12px] font-semibold uppercase leading-none tracking-[0.02em]">
                {label}
            </p>
            <p className="mt-1 font-['Degular'] text-[24px] font-semibold uppercase leading-[0.9] tracking-[-0.025em]">
                {formattedValue.length > 0
                    ? formattedValue.map((item, index) => (
                        <span key={`${item}-${index}`} className="block">
                            {item}
                        </span>
                    ))
                    : "—"}
            </p>
        </div>
    );
}
