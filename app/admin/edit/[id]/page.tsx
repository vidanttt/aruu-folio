"use client";

import { DragEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DesignImage = {
    id: string;
    url: string;
    file?: File;
    isNew?: boolean;
};

type ProjectForm = {
    name: string;
    skill: string;
    kind: string;
    softwares: string;
    client: string;
    project_date: string;
    category: string;
    aspect_ratio: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    published: boolean;
    position: string;
};

export default function EditProjectPage() {
    const supabase = createClient();
    const router = useRouter();
    const params = useParams();

    const id = params.id as string;

    const [form, setForm] = useState<ProjectForm>({
        name: "",
        skill: "",
        kind: "",
        softwares: "",
        client: "",
        project_date: "",
        category: "video-edit",
        aspect_ratio: "",
        description: "",
        video_url: "",
        thumbnail_url: "",
        published: false,
        position: "0",
    });

    const [designImages, setDesignImages] = useState<DesignImage[]>([]);
    const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);
    const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(
        null
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProject() {
            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            const imageUrls: string[] = Array.isArray(data.image_urls)
                ? data.image_urls
                : [];

            setForm({
                name: data.name || "",
                skill: data.skill || "",
                kind: data.kind || "",
                softwares: data.softwares || "",
                client: data.client || "",
                project_date: data.project_date || "",
                category: data.category || "video-edit",
                aspect_ratio: data.aspect_ratio || "",
                description: data.description || "",
                video_url: data.video_url || "",
                thumbnail_url: data.thumbnail_url || "",
                published: data.published || false,
                position: String(data.position ?? 0),
            });

            setOriginalImageUrls(imageUrls);

            setDesignImages(
                imageUrls.map((url, index) => ({
                    id: `existing-${index}-${url}`,
                    url,
                    isNew: false,
                }))
            );

            setLoading(false);
        }

        loadProject();
    }, [id]);

    function updateField(
        field: keyof ProjectForm,
        value: string | boolean
    ) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function addDesignImages(files: FileList | File[]) {
        const selectedFiles = Array.from(files);

        const validImages = selectedFiles.filter((file) =>
            file.type.startsWith("image/")
        );

        if (validImages.length !== selectedFiles.length) {
            setError("Only image files are allowed.");
            return;
        }

        if (validImages.length === 0) return;

        const newImages: DesignImage[] = validImages.map((file, index) => ({
            id: `new-${Date.now()}-${index}-${file.name}`,
            url: URL.createObjectURL(file),
            file,
            isNew: true,
        }));

        setDesignImages((current) => [...current, ...newImages]);
        setError("");
    }

    function removeDesignImage(index: number) {
        setDesignImages((current) => {
            const image = current[index];

            if (image?.isNew) {
                URL.revokeObjectURL(image.url);
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

    function extractStoragePath(url: string) {
        const marker = "/storage/v1/object/public/aruu/";

        const index = url.indexOf(marker);

        if (index === -1) {
            return null;
        }

        return decodeURIComponent(
            url.slice(index + marker.length)
        );
    }

    async function uploadDesignImage(
        file: File,
        index: number
    ) {
        const safeImageName = file.name.replace(
            /[^a-zA-Z0-9.-]/g,
            "-"
        );

        const imagePath =
            `designs/${Date.now()}-${index + 1}-${safeImageName}`;

        const { error: uploadError } = await supabase.storage
            .from("aruu")
            .upload(imagePath, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            throw new Error(
                `Image upload failed: ${uploadError.message}`
            );
        }

        const { data } = supabase.storage
            .from("aruu")
            .getPublicUrl(imagePath);

        return data.publicUrl;
    }

    async function handleSubmit(
        e: React.FormEvent<HTMLFormElement>
    ) {
        e.preventDefault();

        setSaving(true);
        setError("");

        try {
            let finalImageUrls: string[] = [];

            /*
             * DESIGN IMAGES
             *
             * Preserve the exact current order.
             * Existing images keep their URLs.
             * New images get uploaded in their current order.
             */

            if (form.category === "design") {
                for (let index = 0; index < designImages.length; index++) {
                    const image = designImages[index];

                    if (image.file) {
                        const uploadedUrl =
                            await uploadDesignImage(
                                image.file,
                                index
                            );

                        finalImageUrls.push(uploadedUrl);
                    } else {
                        finalImageUrls.push(image.url);
                    }
                }
            }

            const firstImage =
                finalImageUrls[0] || null;

            const { error: updateError } = await supabase
                .from("projects")
                .update({
                    name: form.name,
                    skill: form.skill,
                    kind: form.kind,
                    softwares: form.softwares,
                    client: form.client,
                    project_date: form.project_date || null,
                    category: form.category,
                    aspect_ratio: form.aspect_ratio,
                    description: form.description || null,
                    video_url: form.video_url || null,

                    thumbnail_url:
                        form.category === "design"
                            ? firstImage
                            : form.thumbnail_url || null,

                    image_urls:
                        form.category === "design"
                            ? finalImageUrls
                            : [],

                    position:
                        Number(form.position) || 0,

                    published: form.published,
                })
                .eq("id", id);

            if (updateError) {
                throw new Error(
                    `Project update failed: ${updateError.message}`
                );
            }

            /*
             * DELETE REMOVED DESIGN IMAGES
             *
             * Only delete files that existed before editing
             * and are no longer part of the project.
             */

            if (form.category === "design") {
                const removedUrls =
                    originalImageUrls.filter(
                        (url) =>
                            !finalImageUrls.includes(url)
                    );

                const removedPaths = removedUrls
                    .map(extractStoragePath)
                    .filter(
                        (path): path is string =>
                            Boolean(path)
                    );

                if (removedPaths.length > 0) {
                    const { error: removeError } =
                        await supabase.storage
                            .from("aruu")
                            .remove(removedPaths);

                    if (removeError) {
                        console.error(
                            "Storage cleanup error:",
                            removeError
                        );
                    }
                }
            }

            router.push("/admin");
            router.refresh();
        } catch (error) {
            console.error(error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong."
            );

            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-white p-8 text-black">
                Loading project...
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white px-6 py-8 text-black md:px-12">
            <div className="mx-auto max-w-5xl">
                {/* HEADER */}

                <div className="mb-10 flex items-center justify-between border-b border-black pb-6">
                    <div>
                        <h1 className="text-4xl font-bold">
                            EDIT PROJECT
                        </h1>

                        <p className="mt-1 text-sm">
                            Update project information
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => router.push("/admin")}
                        className="border border-black px-4 py-2 text-sm"
                    >
                        Back
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-10"
                >
                    {/* PROJECT INFORMATION */}

                    <section>
                        <h2 className="mb-5 text-2xl font-semibold">
                            Project Information
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* NAME */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Project Name
                                </label>

                                <input
                                    value={form.name}
                                    onChange={(e) =>
                                        updateField(
                                            "name",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                    required
                                />
                            </div>

                            {/* CLIENT */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Client
                                </label>

                                <input
                                    value={form.client}
                                    onChange={(e) =>
                                        updateField(
                                            "client",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                    required
                                />
                            </div>

                            {/* SKILL */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Skill
                                </label>

                                <input
                                    value={form.skill}
                                    onChange={(e) =>
                                        updateField(
                                            "skill",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                    required
                                />
                            </div>

                            {/* KIND */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Kind
                                </label>

                                <input
                                    value={form.kind}
                                    onChange={(e) =>
                                        updateField(
                                            "kind",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                    required
                                />
                            </div>

                            {/* SOFTWARE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Software(s)
                                </label>

                                <input
                                    value={form.softwares}
                                    onChange={(e) =>
                                        updateField(
                                            "softwares",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                    required
                                />
                            </div>

                            {/* DATE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Date
                                </label>

                                <input
                                    type="date"
                                    value={form.project_date}
                                    onChange={(e) =>
                                        updateField(
                                            "project_date",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                />
                            </div>

                            {/* CATEGORY */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Category
                                </label>

                                <select
                                    value={form.category}
                                    onChange={(e) => {
                                        const nextCategory =
                                            e.target.value;

                                        updateField(
                                            "category",
                                            nextCategory
                                        );

                                        updateField(
                                            "aspect_ratio",
                                            nextCategory ===
                                                "design"
                                                ? "2:3"
                                                : "16:9"
                                        );
                                    }}
                                    className="w-full border border-black bg-white p-3 outline-none"
                                >
                                    <option value="video-edit">
                                        Video Edit
                                    </option>

                                    <option value="design">
                                        Design
                                    </option>
                                </select>
                            </div>

                            {/* ASPECT RATIO */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Aspect Ratio
                                </label>

                                <select
                                    value={form.aspect_ratio}
                                    onChange={(e) =>
                                        updateField(
                                            "aspect_ratio",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black bg-white p-3 outline-none"
                                    required
                                >
                                    {form.category ===
                                        "video-edit" ? (
                                        <>
                                            <option value="3:4">
                                                3:4
                                            </option>

                                            <option value="16:9">
                                                16:9
                                            </option>

                                            <option value="4:3">
                                                4:3
                                            </option>

                                            <option value="9:16">
                                                9:16
                                            </option>

                                            <option value="1:1">
                                                1:1
                                            </option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="2:3">
                                                2:3
                                            </option>

                                            <option value="4:3">
                                                4:3
                                            </option>

                                            <option value="16:9">
                                                16:9
                                            </option>

                                            <option value="8:3">
                                                8:3
                                            </option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* POSITION */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Grid Position
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.position}
                                    onChange={(e) =>
                                        updateField(
                                            "position",
                                            e.target.value
                                        )
                                    }
                                    className="w-full border border-black p-3 outline-none"
                                />

                                <p className="mt-2 text-xs">
                                    Controls where this project appears
                                    in the portfolio grid.
                                </p>
                            </div>
                        </div>

                        {/* DESCRIPTION */}

                        <div className="mt-6">
                            <label className="mb-2 block text-sm font-medium">
                                Description
                            </label>

                            <textarea
                                value={form.description}
                                onChange={(e) =>
                                    updateField(
                                        "description",
                                        e.target.value
                                    )
                                }
                                rows={5}
                                className="w-full resize-none border border-black p-3 outline-none"
                            />
                        </div>
                    </section>

                    {/* DESIGN */}

                    {form.category === "design" && (
                        <section>
                            <div className="mb-5 flex items-end justify-between">
                                <div>
                                    <h2 className="text-2xl font-semibold">
                                        Project Images
                                    </h2>

                                    <p className="mt-1 text-sm">
                                        Drag images to change their order.
                                    </p>
                                </div>

                                <p className="text-sm">
                                    {designImages.length}{" "}
                                    {designImages.length === 1
                                        ? "image"
                                        : "images"}
                                </p>
                            </div>

                            {/* IMAGE GRID */}

                            {designImages.length > 0 && (
                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                                                <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                                                    <img
                                                        src={image.url}
                                                        alt={`Slide ${index + 1
                                                            }`}
                                                        className="h-full w-full object-cover"
                                                    />

                                                    <div className="absolute left-3 top-3 bg-black px-3 py-1 text-xs font-semibold text-white">
                                                        {index + 1}
                                                    </div>

                                                    {image.isNew && (
                                                        <div className="absolute right-3 top-3 bg-white px-3 py-1 text-xs font-semibold text-black">
                                                            NEW
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                                                        <span className="bg-black px-3 py-2 text-xs text-white opacity-0 transition group-hover:opacity-100">
                                                            DRAG TO MOVE
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 border-t border-black p-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold">
                                                            SLIDE{" "}
                                                            {index + 1}
                                                        </p>

                                                        <p className="truncate text-xs">
                                                            {image.file?.name ||
                                                                image.url
                                                                    .split(
                                                                        "/"
                                                                    )
                                                                    .pop()}
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
                            )}

                            {/* ADD IMAGES */}

                            <div className="mt-5">
                                <input
                                    id="edit-design-image-input"
                                    type="file"
                                    accept="image/*"
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

                                <button
                                    type="button"
                                    onClick={() =>
                                        document
                                            .getElementById(
                                                "edit-design-image-input"
                                            )
                                            ?.click()
                                    }
                                    className="border border-black px-4 py-2 text-sm"
                                >
                                    + Add More Images
                                </button>
                            </div>
                        </section>
                    )}

                    {/* VIDEO EDIT */}

                    {form.category === "video-edit" && (
                        <section>
                            <h2 className="mb-5 text-2xl font-semibold">
                                Video Information
                            </h2>

                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Video URL
                                    </label>

                                    <input
                                        value={form.video_url}
                                        onChange={(e) =>
                                            updateField(
                                                "video_url",
                                                e.target.value
                                            )
                                        }
                                        className="w-full border border-black p-3 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium">
                                        Thumbnail URL
                                    </label>

                                    <input
                                        value={form.thumbnail_url}
                                        onChange={(e) =>
                                            updateField(
                                                "thumbnail_url",
                                                e.target.value
                                            )
                                        }
                                        className="w-full border border-black p-3 outline-none"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* PUBLISHED */}

                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={form.published}
                            onChange={(e) =>
                                updateField(
                                    "published",
                                    e.target.checked
                                )
                            }
                            className="h-5 w-5"
                        />

                        <span className="text-sm font-medium">
                            Published
                        </span>
                    </label>

                    {/* ERROR */}

                    {error && (
                        <p className="border border-red-600 p-3 text-red-600">
                            {error}
                        </p>
                    )}

                    {/* SAVE */}

                    <div className="flex gap-3 border-t border-black pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-black px-6 py-4 font-medium text-white disabled:opacity-50"
                        >
                            {saving
                                ? "Saving..."
                                : "Save Changes"}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                router.push("/admin")
                            }
                            className="border border-black px-6 py-4 font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}