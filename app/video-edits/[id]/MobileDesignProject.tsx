"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MobileFooter from "../../components/MobileFooter";

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
    thumbnail_url: string | null;
    description: string | null;
    published: boolean;
};

type Props = {
    project: Project;
    thumbnail: string;
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

/* =========================================================
   EASY TYPOGRAPHY CONTROLS
   Change these values when you want to adjust the text.
   ========================================================= */

const LABEL_VALUE_GAP = -3;
const DESCRIPTION_GAP = -1;

const VALUE_SIZE = 24;
const VALUE_LINE_HEIGHT = 0.9;
const VALUE_STRETCH = 1.3;

const LABEL_SIZE = 12;
const LABEL_LINE_HEIGHT = "12px";
const LABEL_STRETCH = 1.3;

const NAME_SIZE = 43;
const NAME_LINE_HEIGHT = 0.82;
const NAME_STRETCH = 1.3;

const DESCRIPTION_SIZE = 18;
const DESCRIPTION_LINE_HEIGHT = 0.95;
const DESCRIPTION_STRETCH = 1.3;

/* ========================================================= */

export default function MobileVideoEditProject({
    project,
    thumbnail,
    projectNumber,
    projectCount,
    previousProjectId,
    nextProjectId,
}: Props) {
    const router = useRouter();

    const [copied, setCopied] = useState(false);
    const [videoHeight, setVideoHeight] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);

    function togglePlay() {
        const video = videoRef.current;

        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    }

    function toggleMute() {
        const video = videoRef.current;

        if (!video) return;

        video.muted = !video.muted;
        setIsMuted(video.muted);
    }

    useEffect(() => {
        document.body.style.overflow = "";
    }, []);

    function openProject(projectId: number | null) {
        if (!projectId) return;

        router.push(`/video-edits/${projectId}`);
    }

    async function shareProject() {
        const shareUrl =
            `${window.location.origin}/video-edits/${project.id}`;

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
                // User dismissed share.
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

                {/* CLOSE */}
                <button
                    type="button"
                    onClick={() => router.push("/video-edits")}
                    aria-label="Close"
                    className="flex h-full w-14 shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
                >
                    <span className="relative block h-[18px] w-[18px]">
                        <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[19px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-black" />
                        <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[19px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-black" />
                    </span>
                </button>

                {/* SHARE */}
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

                {/* PROJECT NUMBER */}
                <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-3">
                    <span className="font-['Degular'] text-[11px] font-semibold uppercase leading-none tracking-[0.04em]">
                        {projectNumber} OF {projectCount}
                    </span>
                </div>

                {/* PREVIOUS */}
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

                {/* NEXT */}
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
                VIDEO
                ===================================================== */}

            <section
                className="relative w-full overflow-hidden bg-black"
                style={
                    videoHeight
                        ? { height: videoHeight }
                        : { aspectRatio: "16/9" }
                }
            >
                <video
                    ref={videoRef}
                    key={thumbnail}
                    src={thumbnail}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onClick={togglePlay}
                    onLoadedMetadata={(event) => {
                        const video = event.currentTarget;

                        if (video.videoWidth && video.videoHeight) {
                            setVideoHeight(
                                (window.innerWidth / video.videoWidth) *
                                video.videoHeight
                            );
                        }
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer object-contain"
                />

                {/* CONTROLS */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">

                    {/* MUTE */}
                    <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute" : "Mute"}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:opacity-70"
                    >
                        {isMuted ? (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                        )}
                    </button>

                    {/* PLAY / PAUSE */}
                    <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-opacity hover:opacity-70"
                    >
                        {isPlaying ? (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <rect
                                    x="6"
                                    y="4"
                                    width="4"
                                    height="16"
                                    rx="1"
                                />
                                <rect
                                    x="14"
                                    y="4"
                                    width="4"
                                    height="16"
                                    rx="1"
                                />
                            </svg>
                        ) : (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        )}
                    </button>

                </div>
            </section>

            {/* =====================================================
                PROJECT INFO
                ===================================================== */}

            <section className="w-full bg-white">

                {/* NAME */}
                <div className="border-t border-black px-5 py-5 text-center">

                    <h1
                        className="font-['Degular'] font-semibold uppercase tracking-[-0.045em] origin-center"
                        style={{
                            fontSize: `${NAME_SIZE}px`,
                            lineHeight: NAME_LINE_HEIGHT,
                            transform: `scaleX(${NAME_STRETCH})`,
                        }}
                    >
                        {project.name}
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
                        className="font-['Degular'] font-semibold uppercase tracking-[0.02em] origin-center"
                        style={{
                            fontSize: `${LABEL_SIZE}px`,
                            lineHeight: LABEL_LINE_HEIGHT,
                            transform: `scaleX(${LABEL_STRETCH})`,
                        }}
                    >
                        FOR WHOM
                    </p>

                    {project.client_url ? (
                        <a
                            href={project.client_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block font-['Degular'] font-semibold uppercase tracking-[-0.025em] underline decoration-[1px] underline-offset-2 origin-center"
                            style={{
                                marginTop: `${LABEL_VALUE_GAP}px`,
                                fontSize: `${VALUE_SIZE}px`,
                                lineHeight: VALUE_LINE_HEIGHT,
                                transform: `scaleX(${VALUE_STRETCH})`,
                            }}
                        >
                            {project.client || "PERSONAL PROJECT"}
                        </a>
                    ) : (
                        <p
                            className="font-['Degular'] font-semibold uppercase tracking-[-0.025em] origin-center"
                            style={{
                                marginTop: `${LABEL_VALUE_GAP}px`,
                                fontSize: `${VALUE_SIZE}px`,
                                lineHeight: VALUE_LINE_HEIGHT,
                                transform: `scaleX(${VALUE_STRETCH})`,
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
                            className="font-['Degular'] font-semibold uppercase tracking-[0.02em] origin-center"
                            style={{
                                fontSize: `${LABEL_SIZE}px`,
                                lineHeight: LABEL_LINE_HEIGHT,
                                transform: `scaleX(${LABEL_STRETCH})`,
                            }}
                        >
                            DESCRIPTION
                        </p>

                        <p
                            className="font-['Degular'] font-semibold tracking-[-0.02em] origin-center"
                            style={{
                                marginTop: `${DESCRIPTION_GAP}px`,
                                fontSize: `${DESCRIPTION_SIZE}px`,
                                lineHeight: DESCRIPTION_LINE_HEIGHT,
                                transform: `scaleX(${DESCRIPTION_STRETCH})`,
                            }}
                        >
                            {project.description}
                        </p>

                    </div>
                )}

            </section>

            {/* MOBILE FOOTER */}
            <div className="w-full border-t border-black">
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
                className="font-['Degular'] font-semibold uppercase tracking-[0.02em] origin-center"
                style={{
                    fontSize: `${LABEL_SIZE}px`,
                    lineHeight: LABEL_LINE_HEIGHT,
                    transform: `scaleX(${LABEL_STRETCH})`,
                }}
            >
                {label}
            </p>

            {/* VALUE */}
            <p
                className="font-['Degular'] font-semibold uppercase tracking-[-0.025em] origin-center"
                style={{
                    marginTop: `${LABEL_VALUE_GAP}px`,
                    fontSize: `${VALUE_SIZE}px`,
                    lineHeight: VALUE_LINE_HEIGHT,
                    transform: `scaleX(${VALUE_STRETCH})`,
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