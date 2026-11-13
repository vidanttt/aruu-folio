/*
 * Shared helpers for design carousel media.
 *
 * Design projects store their carousel as an ordered list of URLs in
 * `image_urls`. Each entry can be an image OR a video — the type is
 * detected from the file extension, so no database change is needed
 * and every existing image-only project keeps working unchanged.
 */

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v", "ogv", "ogg"];

const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
    "video/ogg": "ogv",
};

export function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;

    // Ignore query strings / hashes, e.g. blob or signed URLs.
    const clean = url.split(/[?#]/)[0].toLowerCase();
    const extension = clean.split(".").pop() || "";

    return VIDEO_EXTENSIONS.includes(extension);
}

export function isVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
}

/*
 * Makes an upload-safe file name. Videos are guaranteed to end in a
 * known video extension so they are recognised as videos when the
 * stored URL is read back on the site.
 */
export function safeMediaFileName(file: File): string {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");

    if (isVideoFile(file) && !isVideoUrl(safeName)) {
        const extension = VIDEO_MIME_EXTENSIONS[file.type] || "mp4";
        return `${safeName}.${extension}`;
    }

    return safeName;
}

export type MediaDimensions = {
    width: number;
    height: number;
};

/*
 * Reads the natural width / height of an image or a video.
 * Resolves with 0 x 0 if the media can't be loaded, which callers
 * already treat as "unknown, use a neutral fallback".
 */
export function loadMediaDimensions(url: string): Promise<MediaDimensions> {
    return new Promise((resolve) => {
        if (isVideoUrl(url)) {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;
            video.onloadedmetadata = () => {
                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight,
                });
                video.removeAttribute("src");
                video.load();
            };
            video.onerror = () => resolve({ width: 0, height: 0 });
            video.src = url;
            return;
        }

        const image = new Image();
        image.onload = () =>
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        image.onerror = () => resolve({ width: 0, height: 0 });
        image.src = url;
    });
}

/*
 * Human-friendly aspect ratio label, e.g. 1080x1350 -> "4:5".
 */
export function formatAspectRatio(width: number, height: number): string {
    if (!width || !height) return "";

    const ratio = width / height;
    const common: [string, number][] = [
        ["1:1", 1],
        ["4:5", 4 / 5],
        ["3:4", 3 / 4],
        ["2:3", 2 / 3],
        ["9:16", 9 / 16],
        ["5:4", 5 / 4],
        ["4:3", 4 / 3],
        ["3:2", 3 / 2],
        ["16:9", 16 / 9],
    ];

    for (const [label, value] of common) {
        if (Math.abs(ratio - value) < 0.01) return label;
    }

    return ratio.toFixed(2);
}
