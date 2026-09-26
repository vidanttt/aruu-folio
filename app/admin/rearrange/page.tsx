"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = "video-edit" | "design";

type Project = {
    id: number;
    name: string;
    client: string;
    category: Category;
    published: boolean;
    thumbnail_url: string | null;
    image_urls: string[] | null;
    position: number;
};

type Dimensions = Record<number, { width: number; height: number }>;

type Placement = {
    left: number;
    top: number;
    width: number;
    height: number;
};

const DRAG_PLACEHOLDER_ID = -999999999;
const EDGE_SCROLL_ZONE = 110;
const EDGE_SCROLL_SPEED = 22;

function ratioFor(project: Project, dimensions: Dimensions) {
    const d = dimensions[project.id];
    return d?.width && d?.height ? d.width / d.height : 1;
}

function buildDesktopMasonry(
    projects: Project[],
    dimensions: Dimensions,
    containerWidth: number
): Record<number, Placement> {
    const placements: Record<number, Placement> = {};
    if (!containerWidth || !projects.length) return placements;

    const columns = 5;
    const columnWidth = containerWidth / columns;
    const skyline = Array.from({ length: columns }, () => 0);

    const remaining = projects.map((project, index) => ({ project, index }));

    while (remaining.length) {
        let best:
            | {
                remainingIndex: number;
                startColumn: number;
                top: number;
                width: number;
                height: number;
                score: [number, number, number, number];
            }
            | null = null;

        for (let candidateIndex = 0; candidateIndex < remaining.length; candidateIndex++) {
            const project = remaining[candidateIndex].project;
            const ratio = Math.max(0.01, ratioFor(project, dimensions));
            const span = ratio > 1 ? 2 : 1;
            const width = columnWidth * span;
            const height = width / ratio;

            for (let startColumn = 0; startColumn <= columns - span; startColumn++) {
                const top = Math.max(...skyline.slice(startColumn, startColumn + span));
                const next = [...skyline];
                const bottom = top + height;

                for (let c = startColumn; c < startColumn + span; c++) next[c] = bottom;

                const max = Math.max(...next);
                const min = Math.min(...next);
                const score: [number, number, number, number] = [
                    top,
                    max - min,
                    max,
                    remaining[candidateIndex].index,
                ];

                if (
                    !best ||
                    score[0] < best.score[0] ||
                    (score[0] === best.score[0] && score[1] < best.score[1]) ||
                    (score[0] === best.score[0] && score[1] === best.score[1] && score[2] < best.score[2]) ||
                    (score[0] === best.score[0] && score[1] === best.score[1] && score[2] === best.score[2] && score[3] < best.score[3])
                ) {
                    best = {
                        remainingIndex: candidateIndex,
                        startColumn,
                        top,
                        width,
                        height,
                        score,
                    };
                }
            }
        }

        if (!best) break;

        const chosen = remaining.splice(best.remainingIndex, 1)[0].project;
        placements[chosen.id] = {
            left: best.startColumn * columnWidth,
            top: best.top,
            width: best.width,
            height: best.height,
        };

        const span = Math.round(best.width / columnWidth);
        const bottom = best.top + best.height;
        for (let c = best.startColumn; c < best.startColumn + span; c++) {
            skyline[c] = bottom;
        }
    }

    return placements;
}

function buildDesktopDragMasonry(
    projects: Project[],
    dimensions: Dimensions,
    containerWidth: number
): Record<number, Placement> {
    const placements: Record<number, Placement> = {};
    if (!containerWidth || !projects.length) return placements;

    const columns = 5;
    const columnWidth = containerWidth / columns;
    const skyline = Array.from({ length: columns }, () => 0);

    // Unlike the normal editorial packer, drag mode honors the exact order
    // around the held item. This makes the held tile's own span authoritative:
    // a portrait can take a column where a landscape was, and the landscape
    // is then pushed to the next valid space instead of winning globally.
    for (const project of projects) {
        const ratio = Math.max(0.01, ratioFor(project, dimensions));
        const span = Math.min(columns, ratio > 1 ? 2 : 1);
        const width = columnWidth * span;
        const height = width / ratio;

        let bestStart = 0;
        let bestTop = Number.POSITIVE_INFINITY;
        let bestBalance = Number.POSITIVE_INFINITY;

        for (let start = 0; start <= columns - span; start++) {
            const top = Math.max(...skyline.slice(start, start + span));
            const next = [...skyline];
            const bottom = top + height;
            for (let c = start; c < start + span; c++) next[c] = bottom;
            const balance = Math.max(...next) - Math.min(...next);

            if (
                top < bestTop ||
                (top === bestTop && balance < bestBalance) ||
                (top === bestTop && balance === bestBalance && start < bestStart)
            ) {
                bestTop = top;
                bestStart = start;
                bestBalance = balance;
            }
        }

        placements[project.id] = {
            left: bestStart * columnWidth,
            top: bestTop,
            width,
            height,
        };

        const bottom = bestTop + height;
        for (let c = bestStart; c < bestStart + span; c++) {
            skyline[c] = bottom;
        }
    }

    return placements;
}

function buildMobileMasonry(
    projects: Project[],
    dimensions: Dimensions,
    containerWidth: number
): Record<number, Placement> {
    const placements: Record<number, Placement> = {};
    if (!containerWidth) return placements;

    const columnWidth = containerWidth / 2;
    let cursorY = 0;

    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const ratio = Math.max(0.01, ratioFor(project, dimensions));
        const portrait = ratio < 0.82;
        const next = projects[i + 1];
        const nextRatio = next ? Math.max(0.01, ratioFor(next, dimensions)) : 1;
        const nextPortrait = Boolean(next) && nextRatio < 0.82;

        if (portrait && nextPortrait) {
            const firstHeight = columnWidth / ratio;
            const secondHeight = columnWidth / nextRatio;
            const rowHeight = Math.max(firstHeight, secondHeight);

            placements[project.id] = {
                left: 0,
                top: cursorY,
                width: columnWidth,
                height: firstHeight,
            };
            placements[next!.id] = {
                left: columnWidth,
                top: cursorY,
                width: columnWidth,
                height: secondHeight,
            };

            cursorY += rowHeight;
            i++;
            continue;
        }

        const width = containerWidth;
        const height = width / ratio;
        placements[project.id] = { left: 0, top: cursorY, width, height };
        cursorY += height;
    }

    return placements;
}

function mediaFor(project: Project) {
    if (Array.isArray(project.image_urls) && project.image_urls.length) {
        return project.image_urls[0];
    }
    return project.thumbnail_url;
}

export default function RearrangePage() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const category: Category = searchParams.get("category") === "design" ? "design" : "video-edit";

    const [projects, setProjects] = useState<Project[]>([]);
    const [dimensions, setDimensions] = useState<Dimensions>({});
    const [desktopWidth, setDesktopWidth] = useState(0);
    const [mobileWidth, setMobileWidth] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [draggingId, setDraggingId] = useState<number | null>(null);
    const [hasArranged, setHasArranged] = useState(false);
    const [insertIndex, setInsertIndex] = useState(0);
    const [pointer, setPointer] = useState({ x: 0, y: 0 });
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const scrollFrame = useRef<number | null>(null);
    const pointerYRef = useRef(0);
    const dragRef = useRef<{ id: number; insertIndex: number } | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError("");
            const { data, error } = await supabase
                .from("projects")
                .select("id, name, client, category, published, thumbnail_url, image_urls, position")
                .eq("category", category)
                .order("position", { ascending: true });

            if (error) {
                setError(error.message);
                setProjects([]);
            } else {
                setProjects(
                    (data ?? []).map((p) => ({
                        ...p,
                        image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
                    }))
                );
                // The saved DB order is already the arranged order.
                // Reopening must render that exact same packing immediately.
                setHasArranged(true);
            }
            setLoading(false);
        }
        load();
    }, [category]);

    useEffect(() => {
        const measure = () => {
            const width = window.innerWidth;
            setDesktopWidth(Math.min(width, 1920));
            setMobileWidth(width);
        };
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, []);

    const draggedProject = draggingId == null ? null : projects.find((p) => p.id === draggingId) ?? null;

    /*
     * THIS is the important part:
     * while dragging, the dragged project remains inside the masonry flow
     * at insertIndex. It is invisible in the flow, but its exact dimensions
     * are still occupied. Therefore the other pieces dynamically make a
     * hole exactly the size of the piece being carried.
     */
    const flowProjects = useMemo(() => {
        if (!draggedProject) return projects;

        const rest = projects.filter((p) => p.id !== draggedProject.id);
        const index = Math.max(0, Math.min(insertIndex, rest.length));
        const result = [...rest];
        result.splice(index, 0, draggedProject);
        return result;
    }, [projects, draggedProject, insertIndex]);

    const desktopPlacements = useMemo(
        () => draggingId == null && !hasArranged
            ? buildDesktopMasonry(flowProjects, dimensions, desktopWidth)
            : buildDesktopDragMasonry(flowProjects, dimensions, desktopWidth),
        [flowProjects, dimensions, desktopWidth, draggingId, hasArranged]
    );

    const mobilePlacements = useMemo(
        () => buildMobileMasonry(flowProjects, dimensions, mobileWidth),
        [flowProjects, dimensions, mobileWidth]
    );

    const desktopHeight = useMemo(
        () => flowProjects.reduce((max, p) => {
            const x = desktopPlacements[p.id];
            return Math.max(max, x ? x.top + x.height : 0);
        }, 0),
        [flowProjects, desktopPlacements]
    );

    const mobileHeight = useMemo(
        () => flowProjects.reduce((max, p) => {
            const x = mobilePlacements[p.id];
            return Math.max(max, x ? x.top + x.height : 0);
        }, 0),
        [flowProjects, mobilePlacements]
    );

    function gridElement() {
        return document.querySelector<HTMLElement>(
            window.innerWidth >= 768 ? "[data-rearrange-grid-desktop]" : "[data-rearrange-grid-mobile]"
        );
    }

    function updateInsertion(clientX: number, clientY: number) {
        const meta = dragRef.current;
        if (!meta) return;

        const grid = gridElement();
        if (!grid) return;

        const rect = grid.getBoundingClientRect();
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        const isDesktop = window.innerWidth >= 768;
        const width = isDesktop ? desktopWidth : mobileWidth;
        const build = isDesktop ? buildDesktopDragMasonry : buildMobileMasonry;
        const rest = projects.filter((p) => p.id !== meta.id);
        const dragged = projects.find((p) => p.id === meta.id);

        if (!dragged || !rest.length || !width) {
            meta.insertIndex = 0;
            setInsertIndex(0);
            setDragOverId(null);
            return;
        }

        let bestIndex = meta.insertIndex;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let index = 0; index <= rest.length; index++) {
            const candidate = [...rest];
            candidate.splice(index, 0, dragged);
            const candidatePlacements = build(candidate, dimensions, width);
            const placement = candidatePlacements[dragged.id];
            if (!placement) continue;

            // Compare the complete held footprint with this candidate,
            // not just the cursor or the candidate center. This is what lets
            // a portrait, square, or landscape replace any differently sized
            // tile when the held rectangle is actually over that space.
            const heldLeft = localX - dragOffsetRef.current.x;
            const heldTop = localY - dragOffsetRef.current.y;
            const overlapWidth = Math.max(
                0,
                Math.min(heldLeft + placement.width, placement.left + placement.width) -
                Math.max(heldLeft, placement.left)
            );
            const overlapHeight = Math.max(
                0,
                Math.min(heldTop + placement.height, placement.top + placement.height) -
                Math.max(heldTop, placement.top)
            );
            const overlapArea = overlapWidth * overlapHeight;
            const heldArea = Math.max(1, placement.width * placement.height);
            const overlapRatio = overlapArea / heldArea;
            const heldCenterX = heldLeft + placement.width / 2;
            const heldCenterY = heldTop + placement.height / 2;
            const candidateCenterX = placement.left + placement.width / 2;
            const candidateCenterY = placement.top + placement.height / 2;
            const centerDistance = Math.hypot(
                heldCenterX - candidateCenterX,
                heldCenterY - candidateCenterY
            );
            // Overlap dominates; distance only breaks near-equal overlaps.
            const score = (1 - overlapRatio) * 10000 + centerDistance;

            if (score < bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        }

        if (bestIndex !== meta.insertIndex) {
            meta.insertIndex = bestIndex;
            setInsertIndex(bestIndex);
        }

        // Highlight the tile nearest the held footprint, while the actual
        // reorder is driven by the candidate layout above.
        const basePlacements = build(rest, dimensions, width);
        let nearestId: number | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const project of rest) {
            const placement = basePlacements[project.id];
            if (!placement) continue;
            const cx = placement.left + placement.width / 2;
            const cy = placement.top + placement.height / 2;
            const distance = Math.hypot(localX - cx, localY - cy);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestId = project.id;
            }
        }
        setDragOverId(nearestId);
    }

    function autoScroll(clientY: number) {
        pointerYRef.current = clientY;

        if (scrollFrame.current != null) return;

        const tick = () => {
            scrollFrame.current = null;
            if (!dragRef.current) return;

            const y = pointerYRef.current;
            const height = window.innerHeight;
            let delta = 0;

            if (y < EDGE_SCROLL_ZONE) {
                const strength = (EDGE_SCROLL_ZONE - y) / EDGE_SCROLL_ZONE;
                delta = -Math.max(2, strength * EDGE_SCROLL_SPEED);
            } else if (y > height - EDGE_SCROLL_ZONE) {
                const strength = (y - (height - EDGE_SCROLL_ZONE)) / EDGE_SCROLL_ZONE;
                delta = Math.max(2, strength * EDGE_SCROLL_SPEED);
            }

            if (delta !== 0) {
                window.scrollBy(0, delta);
                scrollFrame.current = window.requestAnimationFrame(tick);
            }
        };

        scrollFrame.current = window.requestAnimationFrame(tick);
    }

    function startDrag(event: PointerEvent<HTMLDivElement>, id: number) {
        if (saving) return;
        event.preventDefault();

        const index = projects.findIndex((p) => p.id === id);
        const activePlacements = window.innerWidth >= 768
            ? desktopPlacements
            : mobilePlacements;
        const activePlacement = activePlacements[id];
        if (activePlacement) {
            const grid = gridElement();
            const rect = grid?.getBoundingClientRect();
            if (rect) {
                dragOffsetRef.current = {
                    x: event.clientX - rect.left - activePlacement.left,
                    y: event.clientY - rect.top - activePlacement.top,
                };
            }
        }
        dragRef.current = { id, insertIndex: index };
        setDraggingId(id);
        setInsertIndex(index);
        setPointer({ x: event.clientX, y: event.clientY });
        setDragOverId(null);

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch { }
    }

    useEffect(() => {
        if (draggingId == null) return;

        const move = (event: globalThis.PointerEvent) => {
            setPointer({ x: event.clientX, y: event.clientY });
            pointerYRef.current = event.clientY;
            updateInsertion(event.clientX, event.clientY);
            autoScroll(event.clientY);
        };

        const finish = () => {
            const meta = dragRef.current;
            if (meta) {
                const dragged = projects.find((p) => p.id === meta.id);
                if (dragged) {
                    const rest = projects.filter((p) => p.id !== meta.id);
                    const next = [...rest];
                    next.splice(Math.max(0, Math.min(meta.insertIndex, next.length)), 0, dragged);
                    setProjects(next);
                }
            }
            setHasArranged(true);
            dragRef.current = null;
            dragOffsetRef.current = { x: 0, y: 0 };
            setDraggingId(null);
            setDragOverId(null);
        };

        window.addEventListener("pointermove", move, { passive: true });
        window.addEventListener("pointerup", finish, { once: true });
        window.addEventListener("pointercancel", finish, { once: true });

        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", finish);
            window.removeEventListener("pointercancel", finish);
            if (scrollFrame.current != null) {
                window.cancelAnimationFrame(scrollFrame.current);
                scrollFrame.current = null;
            }
        };
    }, [draggingId, projects, desktopPlacements, mobilePlacements]);

    async function saveLayout() {
        if (!projects.length) return;
        setSaving(true);
        setError("");

        try {
            for (let i = 0; i < projects.length; i++) {
                const { error } = await supabase
                    .from("projects")
                    .update({ position: i })
                    .eq("id", projects[i].id);
                if (error) throw new Error(`Could not save ${projects[i].name}: ${error.message}`);
            }
            router.push("/admin");
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save layout.");
            setSaving(false);
        }
    }

    const title = category === "design" ? "REARRANGE DESIGN" : "REARRANGE VIDEO EDITS";

    function renderTile(project: Project, placement: Placement, index: number, mobile = false) {
        const isDragged = project.id === draggingId;
        const isOver = dragOverId === project.id && !isDragged;
        const media = mediaFor(project);

        return (
            <div
                key={project.id}
                onPointerDown={(event) => startDrag(event, project.id)}
                className={`absolute overflow-hidden border border-black bg-neutral-100 transition-[left,top,width,height,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDragged ? "pointer-events-none opacity-0" : "opacity-100"
                    } ${isOver ? "ring-4 ring-black ring-inset" : ""}`}
                style={{
                    left: placement.left,
                    top: placement.top,
                    width: placement.width,
                    height: placement.height,
                    boxSizing: "border-box",
                    cursor: isDragged ? "grabbing" : "grab",
                    touchAction: "none",
                }}
            >
                {media ? (
                    category === "video-edit" ? (
                        <video
                            src={media}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            draggable={false}
                            onLoadedMetadata={(event) => {
                                const v = event.currentTarget;
                                if (!v.videoWidth || !v.videoHeight) return;
                                setDimensions((current) => ({
                                    ...current,
                                    [project.id]: { width: v.videoWidth, height: v.videoHeight },
                                }));
                            }}
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <img
                            src={media}
                            alt={project.name}
                            draggable={false}
                            onLoad={(event) => {
                                const image = event.currentTarget;
                                if (!image.naturalWidth || !image.naturalHeight) return;
                                setDimensions((current) => ({
                                    ...current,
                                    [project.id]: { width: image.naturalWidth, height: image.naturalHeight },
                                }));
                            }}
                            className="h-full w-full object-contain scale-[1.006]"
                        />
                    )
                ) : null}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-white">
                    <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className={`${mobile ? "text-xs" : "text-sm"} truncate font-semibold`}>{project.name}</p>
                            <p className="truncate text-[10px] uppercase tracking-[0.12em] opacity-80">{project.client}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold">{index + 1}</span>
                    </div>
                </div>

                {!project.published && (
                    <div className="pointer-events-none absolute left-2 top-2 bg-white px-2 py-1 text-[8px] font-bold tracking-[0.1em] text-black">
                        UNPUBLISHED
                    </div>
                )}

                {isOver && (
                    <div className="pointer-events-none absolute inset-0 bg-white/10" />
                )}
            </div>
        );
    }

    const floatingPlacement = draggedProject
        ? (windowSafeWidth() >= 768 ? desktopPlacements[draggedProject.id] : mobilePlacements[draggedProject.id])
        : null;

    function windowSafeWidth() {
        return typeof window === "undefined" ? 1920 : window.innerWidth;
    }

    return (
        <main className="min-h-screen bg-white text-black">
            <header className="sticky top-0 z-50 border-b border-black bg-white">
                <div className="mx-auto flex max-w-[1920px] flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.18em]">ARUU ADMIN / LAYOUT</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                        <p className="mt-1 max-w-xl text-xs md:text-sm">
                            Pick up a project. Its exact space stays reserved while the other projects dynamically make room and keep the packed result after you release it. Nothing is saved until you save.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => router.push("/admin")} disabled={saving} className="border border-black px-4 py-3 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-50 md:px-5">CANCEL</button>
                        <button type="button" onClick={saveLayout} disabled={saving || !projects.length} className="bg-black px-4 py-3 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 md:px-5">{saving ? "SAVING..." : "SAVE LAYOUT"}</button>
                    </div>
                </div>
            </header>

            {error && <div className="mx-auto max-w-[1920px] px-5 pt-5 md:px-8"><div className="border border-red-600 p-3 text-sm text-red-600">{error}</div></div>}

            {loading ? (
                <div className="p-8 text-sm">Loading layout...</div>
            ) : !projects.length ? (
                <div className="p-8 text-sm">No projects in this category.</div>
            ) : (
                <>
                    <div data-rearrange-grid-desktop className="mx-auto hidden w-full max-w-[1920px] md:block">
                        <div className="relative w-full" style={{ height: desktopHeight }}>
                            {flowProjects.map((project, index) => {
                                const placement = desktopPlacements[project.id];
                                if (!placement || project.id === draggingId) return null;
                                return renderTile(project, placement, index);
                            })}
                        </div>
                    </div>

                    <div data-rearrange-grid-mobile className="relative w-full md:hidden">
                        <div className="relative w-full" style={{ height: mobileHeight }}>
                            {flowProjects.map((project, index) => {
                                const placement = mobilePlacements[project.id];
                                if (!placement || project.id === draggingId) return null;
                                return renderTile(project, placement, index, true);
                            })}
                        </div>
                    </div>

                    {draggedProject && floatingPlacement && (
                        <div
                            className="pointer-events-none fixed z-[100] overflow-hidden border-2 border-black bg-white shadow-2xl"
                            style={{
                                left: pointer.x - dragOffsetRef.current.x,
                                top: pointer.y - dragOffsetRef.current.y,
                                width: floatingPlacement.width,
                                height: floatingPlacement.height,
                                transform: "scale(1.015)",
                            }}
                        >
                            {mediaFor(draggedProject) ? (
                                category === "video-edit" ? (
                                    <video src={mediaFor(draggedProject)!} muted loop playsInline preload="metadata" className="h-full w-full object-contain" />
                                ) : (
                                    <img src={mediaFor(draggedProject)!} alt={draggedProject.name} className="h-full w-full object-contain" />
                                )
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-white">
                                <p className="text-sm font-semibold">{draggedProject.name}</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
