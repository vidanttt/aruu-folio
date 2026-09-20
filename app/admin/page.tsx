"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Project = {
    id: number;
    name: string;
    client: string;
    category: string;
    published: boolean;
};

type Category = "video-edit" | "design";

const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB

export default function AdminPage() {
    const supabase = createClient();

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedCategory, setSelectedCategory] =
        useState<Category>("video-edit");

    const [loading, setLoading] = useState(true);

    const [storageUsed, setStorageUsed] = useState(0);
    const [storageLoading, setStorageLoading] = useState(true);

    function formatStorage(bytes: number) {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        }

        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    async function loadProjects() {
        setLoading(true);

        const { data, error } = await supabase
            .from("projects")
            .select(
                "id, name, client, category, published"
            )
            .eq("category", selectedCategory)
            .order("position", { ascending: true });

        if (!error) {
            setProjects(data || []);
        } else {
            console.error("Project loading error:", error);
        }

        setLoading(false);
    }

    async function loadStorageUsage() {
        setStorageLoading(true);

        const { data, error } = await supabase.rpc(
            "get_aruu_storage_usage"
        );

        if (!error) {
            setStorageUsed(Number(data) || 0);
        } else {
            console.error(
                "Storage usage error:",
                error
            );
        }

        setStorageLoading(false);
    }

    async function togglePublished(
        id: number,
        currentStatus: boolean
    ) {
        const { error } = await supabase
            .from("projects")
            .update({
                published: !currentStatus,
            })
            .eq("id", id);

        if (error) {
            console.error(
                "Publish update error:",
                error
            );
            return;
        }

        await loadProjects();
    }

    async function deleteProject(id: number) {
        const confirmed = confirm(
            "Are you sure you want to delete this project?"
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", id);

        if (error) {
            console.error(
                "Delete project error:",
                error
            );
            return;
        }

        await loadProjects();
        await loadStorageUsage();
    }

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    useEffect(() => {
        loadProjects();
    }, [selectedCategory]);

    useEffect(() => {
        loadStorageUsage();
    }, []);

    const storagePercentage = Math.min(
        (storageUsed / STORAGE_LIMIT) * 100,
        100
    );

    const storageRemaining = Math.max(
        STORAGE_LIMIT - storageUsed,
        0
    );

    return (
        <main className="min-h-screen bg-white px-6 py-8 text-black md:px-12">
            {/* HEADER */}

            <header className="flex flex-col gap-6 border-b border-black pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        ARUU ADMIN
                    </h1>

                    <p className="mt-1 text-sm">
                        Project Manager
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() =>
                        (window.location.href =
                            "/admin/new")
                        }
                        className="bg-black px-5 py-3 text-sm font-medium text-white"
                    >
                        + Add Project
                    </button>

                    <button
                        onClick={logout}
                        className="border border-black px-5 py-3 text-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* STORAGE */}

            <section className="mt-8 border border-black p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            STORAGE
                        </h2>

                        <p className="mt-1 text-sm">
                            aruu bucket
                        </p>
                    </div>

                    {!storageLoading && (
                        <p className="text-sm font-medium">
                            {formatStorage(storageUsed)}{" "}
                            / 1 GB
                        </p>
                    )}
                </div>

                <div className="mt-4 h-2 w-full bg-neutral-200">
                    <div
                        className="h-full bg-black transition-all duration-500"
                        style={{
                            width: `${storagePercentage}%`,
                        }}
                    />
                </div>

                {!storageLoading ? (
                    <div className="mt-2 flex justify-between text-xs">
                        <span>
                            {formatStorage(storageUsed)}{" "}
                            used
                        </span>

                        <span>
                            {formatStorage(
                                storageRemaining
                            )}{" "}
                            remaining
                        </span>
                    </div>
                ) : (
                    <p className="mt-2 text-xs">
                        Calculating storage...
                    </p>
                )}
            </section>

            {/* CATEGORY SWITCHER */}

            <section className="mt-10">
                <div className="grid grid-cols-2 border border-black">
                    <button
                        onClick={() =>
                            setSelectedCategory(
                                "video-edit"
                            )
                        }
                        className={`py-4 text-sm font-semibold transition ${selectedCategory ===
                                "video-edit"
                                ? "bg-black text-white"
                                : "bg-white text-black hover:bg-neutral-100"
                            }`}
                    >
                        VIDEO EDITS
                    </button>

                    <button
                        onClick={() =>
                            setSelectedCategory(
                                "design"
                            )
                        }
                        className={`border-l border-black py-4 text-sm font-semibold transition ${selectedCategory ===
                                "design"
                                ? "bg-black text-white"
                                : "bg-white text-black hover:bg-neutral-100"
                            }`}
                    >
                        DESIGN
                    </button>
                </div>
            </section>

            {/* PROJECTS */}

            <section className="mt-8">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">
                        {selectedCategory ===
                            "video-edit"
                            ? "Video Edits"
                            : "Design"}
                    </h2>

                    <span className="text-sm">
                        {projects.length} project
                        {projects.length !== 1
                            ? "s"
                            : ""}
                    </span>
                </div>

                {loading ? (
                    <p>Loading projects...</p>
                ) : projects.length === 0 ? (
                    <div className="border border-black p-10 text-center">
                        <p className="mb-4">
                            No{" "}
                            {selectedCategory ===
                                "video-edit"
                                ? "video edits"
                                : "design projects"}{" "}
                            yet.
                        </p>

                        <button
                            onClick={() =>
                            (window.location.href =
                                "/admin/new")
                            }
                            className="bg-black px-5 py-3 text-white"
                        >
                            Add your first project
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-black border-y border-black">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold">
                                        {project.name}
                                    </h3>

                                    <p className="mt-1 text-sm">
                                        {project.client}{" "}
                                        ·{" "}
                                        {project.category}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() =>
                                            togglePublished(
                                                project.id,
                                                project.published
                                            )
                                        }
                                        className={`border border-black px-4 py-2 text-sm ${project.published
                                                ? "bg-black text-white"
                                                : "bg-white text-black"
                                            }`}
                                    >
                                        {project.published
                                            ? "Published"
                                            : "Unpublished"}
                                    </button>

                                    <button
                                        onClick={() =>
                                            (window.location.href = `/admin/edit/${project.id}`)
                                        }
                                        className="border border-black px-4 py-2 text-sm"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() =>
                                            deleteProject(
                                                project.id
                                            )
                                        }
                                        className="bg-black px-4 py-2 text-sm text-white"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}