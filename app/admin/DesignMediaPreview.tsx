"use client";

import { useState, type ReactNode } from "react";
import { formatAspectRatio } from "@/lib/media";

type Props = {
    url: string;
    isVideo: boolean;
    alt: string;
    children?: ReactNode;
};

/*
 * Admin preview for one design carousel item.
 *
 * The box takes the media's REAL aspect ratio (4:5, 1:1, 9:16, 16:9…)
 * instead of forcing a crop, so what you see here matches how the item
 * is laid out on the public Design page. Defaults to 4:5 while loading.
 */
export default function DesignMediaPreview({
    url,
    isVideo,
    alt,
    children,
}: Props) {
    const [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    const ratioLabel = dimensions
        ? formatAspectRatio(dimensions.width, dimensions.height)
        : "";

    return (
        <div
            className="relative overflow-hidden bg-neutral-100"
            style={{
                aspectRatio: dimensions
                    ? `${dimensions.width} / ${dimensions.height}`
                    : "4 / 5",
            }}
        >
            {isVideo ? (
                <video
                    src={url}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    draggable={false}
                    onLoadedMetadata={(event) => {
                        const video = event.currentTarget;
                        if (!video.videoWidth || !video.videoHeight) return;
                        setDimensions({
                            width: video.videoWidth,
                            height: video.videoHeight,
                        });
                    }}
                    className="pointer-events-none h-full w-full object-contain"
                />
            ) : (
                <img
                    src={url}
                    alt={alt}
                    draggable={false}
                    onLoad={(event) => {
                        const image = event.currentTarget;
                        if (!image.naturalWidth || !image.naturalHeight) return;
                        setDimensions({
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                        });
                    }}
                    className="h-full w-full object-contain"
                />
            )}

            {(isVideo || dimensions) && (
                <div className="pointer-events-none absolute bottom-3 left-3 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-black">
                    {[
                        isVideo ? "Video" : null,
                        ratioLabel || null,
                        dimensions
                            ? `${dimensions.width}×${dimensions.height}`
                            : null,
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </div>
            )}

            {children}
        </div>
    );
}
