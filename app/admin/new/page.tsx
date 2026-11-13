"use client";

import { DragEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isVideoFile, safeMediaFileName } from "@/lib/media";
import DesignMediaPreview from "../DesignMediaPreview";

// One carousel item: an image or a video, in display order.
type DesignMedia = {
    id: string;
    file: File;
    url: string;
};

export default function NewProjectPage() {
    const supabase = createClient();

    const [name, setName] = useState("");
    const [skill, setSkill] = useState("");
    const [kind, setKind] = useState("");
    const [softwares, setSoftwares] = useState("");
    const [client, setClient] = useState("");
    const [clientUrl, setClientUrl] = useState("");
    const [projectDate, setProjectDate] = useState("");
    const [category, setCategory] = useState("video-edit");
    const [description, setDescription] = useState("");
    const [published, setPublished] = useState(false);

    const [previewVideoFile, setPreviewVideoFile] =
        useState<File | null>(null);

    const [designImages, setDesignImages] = useState<DesignMedia[]>([]);
    const [draggingImageIndex, setDraggingImageIndex] =
        useState<number | null>(null);

    const [draggingPreview, setDraggingPreview] = useState(false);
    const [draggingDesign, setDraggingDesign] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    function handlePreviewDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDraggingPreview(false);

        const file = e.dataTransfer.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("video/")) {
            setStatus("Please upload a video file.");
            return;
        }

        setPreviewVideoFile(file);
        setStatus("");
    }

    function addDesignImages(files: FileList | File[]) {
        const selectedFiles = Array.from(files);

        const validMedia = selectedFiles.filter(
            (file) =>
                file.type.startsWith("image/") || isVideoFile(file)
        );

        if (validMedia.length !== selectedFiles.length) {
            setStatus("Only image or video files are allowed.");
            return;
        }

        if (validMedia.length === 0) return;

        const newItems: DesignMedia[] = validMedia.map((file, index) => ({
            id: `new-${Date.now()}-${index}-${file.name}`,
            file,
            url: URL.createObjectURL(file),
        }));

        setDesignImages((current) => [...current, ...newItems]);
        setStatus("");
    }

    function handleDesignDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDraggingDesign(false);

        addDesignImages(e.dataTransfer.files);
    }

    function removeDesignImage(index: number) {
        setDesignImages((current) => {
            const item = current[index];

            if (item) {
                URL.revokeObjectURL(item.url);
            }

            return current.filter((_, imageIndex) => imageIndex !== index);
        });
    }

    function moveDesignImage(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;

        setDesignImages((current) => {
            const updated = [...current];
            const [movedImage] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, movedImage);
            return updated;
        });
    }

    function handleImageDragStart(index: number) {
        setDraggingImageIndex(index);
    }

    function handleImageDragEnd() {
        setDraggingImageIndex(null);
    }

    function handleImageDragOver(
        e: DragEvent<HTMLDivElement>,
        targetIndex: number
    ) {
        e.preventDefault();

        if (
            draggingImageIndex === null ||
            draggingImageIndex === targetIndex
        ) {
            return;
        }

        moveDesignImage(draggingImageIndex, targetIndex);
        setDraggingImageIndex(targetIndex);
    }

    async function uploadToR2(file: File, path: string) {
        const presignResponse = await fetch(
            "/api/admin/r2/presign",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    path,
                    contentType:
                        file.type || "application/octet-stream",
                }),
            }
        );

        const presignData = await presignResponse.json();

        if (!presignResponse.ok) {
            throw new Error(
                presignData.error ||
                "Failed to create R2 upload URL."
            );
        }

        const uploadResponse = await fetch(
            presignData.uploadUrl,
            {
                method: "PUT",
                headers: {
                    "Content-Type":
                        file.type ||
                        "application/octet-stream",
                },
                body: file,
            }
        );

        if (!uploadResponse.ok) {
            throw new Error(
                `Upload failed with status ${uploadResponse.status}.`
            );
        }

        return {
            url: presignData.publicUrl as string,
            path: presignData.path as string,
        };
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (category === "video-edit" && !previewVideoFile) {
            setStatus("Please upload the preview video.");
            return;
        }

        if (category === "design" && designImages.length === 0) {
            setStatus("Please upload at least one design image or video.");
            return;
        }

        try {
            setUploading(true);
            setStatus("Uploading...");

            const timestamp = Date.now();

            let previewUrl: string | null = null;
            let imageUrls: string[] = [];
            const storagePaths: string[] = [];

            /*
             * VIDEO EDIT
             */

            if (category === "video-edit") {
                // PREVIEW VIDEO — REQUIRED
                if (previewVideoFile) {
                    const safePreviewName =
                        previewVideoFile.name.replace(
                            /[^a-zA-Z0-9.-]/g,
                            "-"
                        );

                    const previewPath =
                        `previews/${timestamp}-${safePreviewName}`;

                    const uploaded = await uploadToR2(
                        previewVideoFile,
                        previewPath
                    );

                    previewUrl = uploaded.url;
                    storagePaths.push(uploaded.path);
                }
            }

            /*
             * DESIGN
             */

            if (category === "design") {
                for (
                    let index = 0;
                    index < designImages.length;
                    index++
                ) {
                    const media = designImages[index].file;

                    // Keeps the extension so videos are recognised later.
                    const safeImageName = safeMediaFileName(media);

                    const imagePath =
                        `designs/${timestamp}-${index + 1}-${safeImageName}`;

                    const uploaded = await uploadToR2(
                        media,
                        imagePath
                    );

                    imageUrls.push(uploaded.url);
                    storagePaths.push(uploaded.path);
                }

                // First carousel item acts as the project thumbnail
                previewUrl = imageUrls[0] || null;
            }

            /*
             * AUTOMATIC POSITION
             *
             * Each category has its own ordering:
             *
             * video-edit: 0, 1, 2, 3...
             * design:     0, 1, 2, 3...
             */
            const {
                data: lastProject,
                error: positionError,
            } = await supabase
                .from("projects")
                .select("position")
                .eq("category", category)
                .order("position", {
                    ascending: false,
                })
                .limit(1)
                .maybeSingle();

            if (positionError) {
                throw new Error(
                    `Could not determine project position: ${positionError.message}`
                );
            }

            const nextPosition =
                lastProject?.position != null
                    ? lastProject.position + 1
                    : 0;

            /*
             * CREATE PROJECT
             */

            const { error: projectError } =
                await supabase
                    .from("projects")
                    .insert({
                        name,
                        skill,
                        kind,
                        softwares,
                        client,
                        client_url: clientUrl || null,
                        project_date: projectDate || null,
                        category,

                        video_url: null,
                        thumbnail_url: previewUrl,

                        image_urls: imageUrls,
                        storage_paths: storagePaths,

                        position: nextPosition,
                        published,
                        description: description || null,
                    });

            if (projectError) {
                throw new Error(
                    `Project creation failed: ${projectError.message}`
                );
            }

            setStatus("Project created successfully.");

            setTimeout(() => {
                window.location.href = "/admin";
            }, 800);
        } catch (error) {
            console.error(error);

            setStatus(
                error instanceof Error
                    ? error.message
                    : "Something went wrong."
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <main className="min-h-screen bg-white px-6 py-8 text-black md:px-12">
            <header className="flex items-center justify-between border-b border-black pb-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        ADD PROJECT
                    </h1>

                    <p className="mt-1 text-sm">
                        Add a new project to your portfolio.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => (window.location.href = "/admin")}
                    className="border border-black px-5 py-3 text-sm font-medium"
                >
                    Back
                </button>
            </header>

            <form
                onSubmit={handleSubmit}
                className="mx-auto mt-10 max-w-5xl space-y-10"
            >
                {/* PROJECT INFO */}

                <section>
                    <h2 className="mb-5 text-2xl font-semibold">
                        Project Information
                    </h2>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Project Name
                            </label>

                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="Project name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Client
                            </label>

                            <input
                                value={client}
                                onChange={(e) => setClient(e.target.value)}
                                required
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="Client name"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Client URL (optional)
                            </label>

                            <input
                                value={clientUrl}
                                onChange={(e) => setClientUrl(e.target.value)}
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Skill
                            </label>

                            <input
                                value={skill}
                                onChange={(e) => setSkill(e.target.value)}
                                required
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="Video Editing / Graphic Design"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Kind
                            </label>

                            <input
                                value={kind}
                                onChange={(e) => setKind(e.target.value)}
                                required
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="Commercial / Poster / Branding"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Software
                            </label>

                            <input
                                value={softwares}
                                onChange={(e) =>
                                    setSoftwares(e.target.value)
                                }
                                required
                                className="w-full border border-black px-4 py-3 outline-none"
                                placeholder="Premiere Pro, Photoshop"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Project Date
                            </label>

                            <input
                                type="date"
                                value={projectDate}
                                onChange={(e) =>
                                    setProjectDate(e.target.value)
                                }
                                className="w-full border border-black px-4 py-3 outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                Category
                            </label>

                            <select
                                value={category}
                                onChange={(e) =>
                                    setCategory(e.target.value)
                                }
                                className="w-full border border-black bg-white px-4 py-3 outline-none"
                            >
                                <option value="video-edit">
                                    Video Edit
                                </option>

                                <option value="design">
                                    Design
                                </option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block text-sm font-medium">
                            Description
                        </label>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full resize-none border border-black px-4 py-3 outline-none"
                            placeholder="Project description..."
                        />
                    </div>
                </section>

                {/* VIDEO EDIT */}

                {category === "video-edit" && (
                    <section>
                        <h2 className="mb-2 text-2xl font-semibold">
                            Project Videos
                        </h2>

                        <p className="mb-6 text-sm">
                            Preview video is required.
                        </p>

                        <div className="grid gap-6">
                            {/* PREVIEW VIDEO */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    PREVIEW VIDEO
                                </label>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDraggingPreview(true);
                                    }}
                                    onDragLeave={() =>
                                        setDraggingPreview(false)
                                    }
                                    onDrop={handlePreviewDrop}
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                "preview-video-input"
                                            )
                                            ?.click()
                                    }
                                    className={`flex min-h-[240px] cursor-pointer flex-col items-center justify-center border border-dashed border-black p-6 text-center transition ${draggingPreview
                                        ? "bg-black text-white"
                                        : "bg-white"
                                        }`}
                                >
                                    <input
                                        id="preview-video-input"
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file =
                                                e.target.files?.[0];

                                            if (!file) return;

                                            if (
                                                !file.type.startsWith(
                                                    "video/"
                                                )
                                            ) {
                                                setStatus(
                                                    "Please upload a video file."
                                                );
                                                return;
                                            }

                                            setPreviewVideoFile(file);
                                            setStatus("");
                                        }}
                                    />

                                    {previewVideoFile ? (
                                        <>
                                            <p className="text-lg font-semibold">
                                                {previewVideoFile.name}
                                            </p>

                                            <p className="mt-2 text-sm">
                                                {(
                                                    previewVideoFile.size /
                                                    1024 /
                                                    1024
                                                ).toFixed(2)}{" "}
                                                MB
                                            </p>

                                            <p className="mt-4 text-xs underline">
                                                Click to replace
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-lg font-semibold">
                                                Drop preview video here
                                            </p>

                                            <p className="mt-2 text-sm">
                                                or click to browse
                                            </p>

                                            <p className="mt-4 text-xs">
                                                Lightweight autoplay preview
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* DESIGN */}

                {category === "design" && (
                    <section>
                        <h2 className="mb-2 text-2xl font-semibold">
                            Project Images &amp; Videos
                        </h2>

                        <p className="mb-6 text-sm">
                            Upload images and/or videos in any aspect
                            ratio (4:5, 1:1, 9:16, 16:9…) and drag them
                            to set their carousel order.
                        </p>

                        {/* UPLOAD AREA */}

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDraggingDesign(true);
                            }}
                            onDragLeave={() =>
                                setDraggingDesign(false)
                            }
                            onDrop={handleDesignDrop}
                            onClick={() =>
                                document
                                    .getElementById(
                                        "design-image-input"
                                    )
                                    ?.click()
                            }
                            className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center border border-dashed border-black p-6 text-center transition ${draggingDesign
                                ? "bg-black text-white"
                                : "bg-white"
                                }`}
                        >
                            <input
                                id="design-image-input"
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        addDesignImages(
                                            e.target.files
                                        );
                                    }

                                    e.target.value = "";
                                }}
                            />

                            <p className="text-lg font-semibold">
                                Drop design images or videos here
                            </p>

                            <p className="mt-2 text-sm">
                                or click to browse
                            </p>

                            <p className="mt-4 text-xs">
                                Mix images and videos in any order
                            </p>
                        </div>

                        {/* IMAGE PREVIEWS */}

                        {designImages.length > 0 && (
                            <div className="mt-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm font-semibold">
                                        {designImages.length}{" "}
                                        {designImages.length === 1
                                            ? "ITEM"
                                            : "ITEMS"}
                                    </p>

                                    <p className="text-xs">
                                        Drag to reorder
                                    </p>
                                </div>

                                <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {designImages.map(
                                        (image, index) => (
                                            <div
                                                key={image.id}
                                                draggable
                                                onDragStart={() =>
                                                    handleImageDragStart(
                                                        index
                                                    )
                                                }
                                                onDragEnd={
                                                    handleImageDragEnd
                                                }
                                                onDragOver={(e) =>
                                                    handleImageDragOver(
                                                        e,
                                                        index
                                                    )
                                                }
                                                className={`group cursor-grab border border-black bg-white transition ${draggingImageIndex ===
                                                    index
                                                    ? "opacity-40"
                                                    : "opacity-100"
                                                    }`}
                                            >
                                                <DesignMediaPreview
                                                    url={image.url}
                                                    isVideo={isVideoFile(
                                                        image.file
                                                    )}
                                                    alt={`Slide ${index + 1}`}
                                                >
                                                    <div className="absolute left-3 top-3 bg-black px-3 py-1 text-xs font-semibold text-white">
                                                        {index + 1}
                                                    </div>

                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                                                        <span className="bg-black px-3 py-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                                            DRAG TO MOVE
                                                        </span>
                                                    </div>
                                                </DesignMediaPreview>

                                                <div className="flex items-center justify-between gap-3 border-t border-black p-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold">
                                                            SLIDE{" "}
                                                            {index +
                                                                1}
                                                        </p>

                                                        <p className="truncate text-xs">
                                                            {image.file.name}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeDesignImage(
                                                                index
                                                            )
                                                        }
                                                        className="shrink-0 border border-black px-3 py-1 text-xs"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                "design-image-input"
                                            )
                                            ?.click()
                                    }
                                    className="mt-5 border border-black px-4 py-2 text-sm"
                                >
                                    + Add More Images / Videos
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* SETTINGS */}

                <section>
                    <h2 className="mb-5 text-2xl font-semibold">
                        Settings
                    </h2>

                    <label className="flex w-fit cursor-pointer items-center gap-3 border border-black px-4 py-3">
                        <input
                            type="checkbox"
                            checked={published}
                            onChange={(e) =>
                                setPublished(
                                    e.target.checked
                                )
                            }
                            className="h-4 w-4"
                        />

                        <span className="text-sm font-medium">
                            Publish immediately
                        </span>
                    </label>
                </section>

                {/* STATUS */}

                {status && (
                    <div className="border border-black p-4 text-sm">
                        {status}
                    </div>
                )}

                {/* SUBMIT */}

                <div className="flex gap-3 border-t border-black pt-6">
                    <button
                        type="submit"
                        disabled={uploading}
                        className="bg-black px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {uploading
                            ? "Uploading..."
                            : "Create Project"}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            (window.location.href = "/admin")
                        }
                        className="border border-black px-6 py-3 text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </main>
    );
}