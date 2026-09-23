"use client";

import {
  AnimatePresence,
  motion,
  animate as animateMotionValue,
  useMotionValue,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

import { createClient } from "@/lib/supabase/client";

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
  aspect_ratio: string;
  position: number;
  image_urls: string[] | null;
  thumbnail_url: string | null;
  description: string | null;
  published: boolean;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type ImageDimensionMap = Record<
  number,
  {
    width: number;
    height: number;
  }
>;

type AnimationPhase =
  | "closed"
  | "opening"
  | "open"
  | "closing";

const supabase = createClient();

/*
 * Opening grows the artwork, so it can take
 * its time. Closing is now a bit snappier —
 * and it's the one that has to keep chasing
 * a live target if the user scrolls mid-close,
 * so a shorter duration also reads better.
 */
const OPEN_DURATION = 0.75;
const CLOSE_DURATION = 0.5;

const EASE = [0.22, 1, 0.36, 1] as const;

/*
 * Plain ease-out cubic — used by the manual
 * per-frame close animation below, which
 * can't hand its easing off to Motion since
 * it recomputes the target every frame.
 */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/*
 * Site header height. Keep this in sync with
 * the shared SiteHeader clamp so the viewer
 * chrome starts on the same pixel as the
 * bottom of the static header.
 */
function getHeaderHeight() {
  if (typeof window === "undefined") {
    return 72;
  }

  return Math.min(
    Math.max(64, window.innerHeight * 0.1),
    89.6
  );
}

/*
 * ============================================================
 * DESIGN GRID
 * ============================================================
 *
 * 5 equal horizontal units.
 *
 * Every 2-column block is twice the width
 * of a 1-column block.
 *
 * Vertical sizes can vary independently.
 */

/*
 * ============================================================
 * NATURAL IMAGE -> GRID UNITS
 * ============================================================
 *
 * The gallery keeps a 5-column unit grid. One grid unit is
 * square, so:
 *
 *   1 x 1 = square artwork
 *   2 x 1 = landscape artwork
 *   1 x 2 = portrait artwork
 *
 * We only use the uploaded image dimensions to choose the
 * closest shape. The stored aspect_ratio field is ignored.
 */

// const GRID_COLUMNS = 5;

function getTileSpan(ratio: number) {
  // Keep the editorial rule: a landscape tile gets two
  // horizontal units, while square/portrait artwork gets one.
  return ratio > 1 ? 2 : 1;
}

function getImageRatio(
  dimensions: { width: number; height: number } | undefined
) {
  if (!dimensions?.width || !dimensions?.height) return 1;
  return dimensions.width / dimensions.height;
}

type ImageTilePlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function buildImageMasonry(
  projects: Project[],
  dimensions: ImageDimensionMap,
  containerWidth: number
): Record<number, ImageTilePlacement> {
  const placements: Record<number, ImageTilePlacement> = {};
  if (!containerWidth) return placements;

  const columnWidth = containerWidth / 5;
  const placed: Array<{
    columns: [number, number];
    bottom: number;
  }> = [];

  for (const project of projects) {
    const ratio = Math.max(
      0.01,
      getImageRatio(dimensions[project.id])
    );
    const columnSpan = getTileSpan(ratio);
    const width = columnWidth * columnSpan;
    const height = width / ratio;

    let bestColumn = 0;
    let bestTop = Number.POSITIVE_INFINITY;

    for (
      let startColumn = 0;
      startColumn <= 5 - columnSpan;
      startColumn += 1
    ) {
      let top = 0;

      for (const previous of placed) {
        const overlaps =
          startColumn < previous.columns[1] &&
          startColumn + columnSpan > previous.columns[0];

        if (overlaps) {
          top = Math.max(top, previous.bottom);
        }
      }

      if (
        top < bestTop ||
        (top === bestTop && startColumn < bestColumn)
      ) {
        bestTop = top;
        bestColumn = startColumn;
      }
    }

    placements[project.id] = {
      left: bestColumn * columnWidth,
      top: bestTop,
      width,
      height,
    };

    placed.push({
      columns: [
        bestColumn,
        bestColumn + columnSpan,
      ],
      bottom: bestTop + height,
    });
  }

  return placements;
}

function getProjectImages(project: Project) {
  if (
    project.image_urls &&
    Array.isArray(project.image_urls) &&
    project.image_urls.length > 0
  ) {
    return project.image_urls;
  }

  if (project.thumbnail_url) {
    return [project.thumbnail_url];
  }

  return [];
}

function fitImageIntoArea(
  naturalWidth: number,
  naturalHeight: number,
  area: Rect
): Rect {
  if (!naturalWidth || !naturalHeight) {
    return {
      left: area.left,
      top: area.top,
      width: area.width,
      height: area.height,
    };
  }

  const imageRatio =
    naturalWidth / naturalHeight;

  const areaRatio =
    area.width / area.height;

  let width: number;
  let height: number;

  if (imageRatio > areaRatio) {
    width = area.width;
    height = width / imageRatio;
  } else {
    height = area.height;
    width = height * imageRatio;
  }

  return {
    left:
      area.left +
      (area.width - width) / 2,

    top:
      area.top +
      (area.height - height) / 2,

    width,
    height,
  };
}

export default function DesignPage() {
  const [projects, setProjects] =
    useState<Project[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [imageDimensions, setImageDimensions] =
    useState<ImageDimensionMap>({});

  const [desktopGridWidth, setDesktopGridWidth] =
    useState(0);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  const [copied, setCopied] =
    useState(false);

  const copyTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  const initialDeepLinkHandled =
    useRef(false);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // A second click during a close is queued so only one artwork
  // ever exists in the flying layer. This prevents ghost frames.
  const pendingOpenRef = useRef<{
    project: Project;
    initialImageIndex: number;
  } | null>(null);

  const [animationPhase, setAnimationPhase] =
    useState<AnimationPhase>("closed");

  const [originRect, setOriginRect] =
    useState<Rect | null>(null);

  /*
   * ============================================================
   * LIVE TILE POSITION REFS
   * ============================================================
   *
   * Keyed by project id. Lets us re-measure a
   * tile's REAL on-screen position at close time
   * (not just whatever it was when the viewer
   * first opened), so the artwork always shrinks
   * back to where the tile actually is now —
   * even if the layout shifted while open.
   */

  const desktopTileRefs =
    useRef<Record<number, HTMLImageElement | null>>(
      {}
    );

  const mobileTileRefs =
    useRef<Record<number, HTMLImageElement | null>>(
      {}
    );

  function getLiveTileRect(
    projectId: number
  ): Rect | null {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia(
        "(min-width: 768px)"
      ).matches;

    const el = isDesktop
      ? desktopTileRefs.current[
      projectId
      ]
      : mobileTileRefs.current[
      projectId
      ];

    if (!el) return null;

    const rect =
      el.getBoundingClientRect();

    if (
      rect.width === 0 &&
      rect.height === 0
    ) {
      return null;
    }

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  /*
   * ============================================================
   * ARTWORK RECT — MOTION VALUES
   * ============================================================
   *
   * The artwork's box is driven directly through
   * Motion values instead of React state. That's
   * what lets the close animation retarget every
   * single frame (to follow scroll) and lets a new
   * click smoothly interrupt an in-flight animation
   * instead of snapping.
   */

  const artLeft = useMotionValue(0);
  const artTop = useMotionValue(0);
  const artWidth = useMotionValue(0);
  const artHeight = useMotionValue(0);

  function getArtworkRect(): Rect {
    return {
      left: artLeft.get(),
      top: artTop.get(),
      width: artWidth.get(),
      height: artHeight.get(),
    };
  }

  function setArtworkRectInstant(
    rect: Rect
  ) {
    artLeft.set(rect.left);
    artTop.set(rect.top);
    artWidth.set(rect.width);
    artHeight.set(rect.height);
  }

  function stopArtworkAnimation() {
    artLeft.stop();
    artTop.stop();
    artWidth.stop();
    artHeight.stop();
  }

  function animateArtworkRectTo(
    rect: Rect,
    duration: number
  ) {
    // Kill any previous active-artwork tween first so a new
    // transition always starts from its exact current position.
    stopArtworkAnimation();

    animateMotionValue(artLeft, rect.left, {
      duration,
      ease: EASE,
    });

    animateMotionValue(artTop, rect.top, {
      duration,
      ease: EASE,
    });

    animateMotionValue(
      artWidth,
      rect.width,
      { duration, ease: EASE }
    );

    animateMotionValue(
      artHeight,
      rect.height,
      { duration, ease: EASE }
    );
  }

  /*
   * ============================================================
   * CLOSE ANIMATION LOOP
   * ============================================================
   *
   * A hand-rolled rAF tween instead of a single
   * Motion `animate()` call, because the target
   * itself needs to keep moving: every frame we
   * re-measure the tile's live position (which
   * moves as the user scrolls) and ease toward
   * wherever it is RIGHT NOW. The result: the
   * artwork visibly follows the scroll on the way
   * down, and always lands exactly on the tile.
   */

  const closeFrameRef =
    useRef<number | null>(null);

  const animationPhaseRef =
    useRef<AnimationPhase>(
      animationPhase
    );

  useEffect(() => {
    animationPhaseRef.current =
      animationPhase;
  }, [animationPhase]);

  useEffect(() => {
    return () => {
      stopCloseAnimation();
      stopArtworkAnimation();
    };
  }, []);

  function stopCloseAnimation() {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(
        closeFrameRef.current
      );

      closeFrameRef.current = null;
    }
  }

  function getSafeCloseTarget(
    liveTarget: Rect
  ): Rect {
    return {
      ...liveTarget,
      top: Math.max(
        getHeaderHeight(),
        liveTarget.top
      ),
    };
  }

  function runCloseAnimation(
    projectId: number,
    startRect: Rect,
    durationMs: number,
    onDone: () => void
  ) {
    stopCloseAnimation();

    const startTime =
      performance.now();

    // Capture the tile position at the exact moment the close
    // starts. The animation follows the tile's subsequent
    // movement 1:1, instead of only following a fraction of
    // the scroll movement based on animation progress.
    const initialTarget = getSafeCloseTarget(
      getLiveTileRect(projectId) || startRect
    );

    function frame(now: number) {
      const elapsed =
        now - startTime;

      const t = Math.min(
        1,
        elapsed / durationMs
      );

      const eased =
        easeOutCubic(t);

      /*
       * Re-measured every frame —
       * this is the scroll-follow.
       *
       * The top is clamped below the site header
       * so scrolling during close can never make
       * the artwork pass over the header.
       */
      const liveTarget =
        getSafeCloseTarget(
          getLiveTileRect(
            projectId
          ) || initialTarget
        );

      /*
       * Animate toward the original target, then add the exact
       * movement of that target caused by scrolling. This is the
       * important part: once the page moves, the artwork moves by
       * the SAME amount instead of only a percentage of the scroll.
       */
      setArtworkRectInstant({
        left:
          startRect.left +
          (initialTarget.left -
            startRect.left) *
          eased +
          (liveTarget.left -
            initialTarget.left),

        top:
          startRect.top +
          (initialTarget.top -
            startRect.top) *
          eased +
          (liveTarget.top -
            initialTarget.top),

        width:
          startRect.width +
          (initialTarget.width -
            startRect.width) *
          eased +
          (liveTarget.width -
            initialTarget.width),

        height:
          startRect.height +
          (initialTarget.height -
            startRect.height) *
          eased +
          (liveTarget.height -
            initialTarget.height),
      });

      if (t < 1) {
        closeFrameRef.current =
          requestAnimationFrame(
            frame
          );
      } else {
        closeFrameRef.current = null;
        onDone();
      }
    }

    closeFrameRef.current =
      requestAnimationFrame(frame);
  }


  /*
   * ============================================================
   * LOAD PROJECTS
   * ============================================================
   */

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);

      const { data, error } =
        await supabase
          .from("projects")
          .select(
            "id, name, skill, kind, softwares, client, client_url, project_date, category, aspect_ratio, position, image_urls, thumbnail_url, description, published"
          )
          .eq("category", "design")
          .eq("published", true)
          .order("position", {
            ascending: true,
          });

      if (error) {
        console.error(
          "Failed to load design projects:",
          error
        );

        setProjects([]);
        setLoading(false);
        return;
      }

      setProjects(
        (data as Project[]) || []
      );

      setLoading(false);
    }

    loadProjects();
  }, []);

  /*
   * Read the real dimensions of each project's first artwork.
   * This is frontend-only for now — nothing is written back to
   * Supabase.
   */
  useEffect(() => {
    if (projects.length === 0) return;

    let cancelled = false;

    projects.forEach((project) => {
      const imageUrl = getProjectImages(project)[0];
      if (!imageUrl) return;

      const image = new Image();

      image.onload = () => {
        if (cancelled) return;

        setImageDimensions((current) => ({
          ...current,
          [project.id]: {
            width: image.naturalWidth,
            height: image.naturalHeight,
          },
        }));
      };

      image.src = imageUrl;
    });

    return () => {
      cancelled = true;
    };
  }, [projects]);

  /*
   * Automatically open project if ?project=<id> is in URL on initial load
   */
  useEffect(() => {
    function syncDesktopGridWidth() {
      if (window.innerWidth < 768) {
        setDesktopGridWidth(0);
        return;
      }

      setDesktopGridWidth(
        Math.min(window.innerWidth, 1920)
      );
    }

    syncDesktopGridWidth();
    window.addEventListener(
      "resize",
      syncDesktopGridWidth
    );

    return () => {
      window.removeEventListener(
        "resize",
        syncDesktopGridWidth
      );
    };
  }, []);

  useEffect(() => {
    if (initialDeepLinkHandled.current || projects.length === 0) return;
    initialDeepLinkHandled.current = true;

    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get("project");
    if (!projectIdParam) return;

    const targetProject = projects.find(
      (p) => String(p.id) === projectIdParam
    );
    if (!targetProject) return;

    const imgParam = params.get("img");
    const targetImgIndex = imgParam
      ? Math.max(0, parseInt(imgParam, 10) - 1)
      : 0;

    requestAnimationFrame(() => {
      const tileEl =
        desktopTileRefs.current[targetProject.id] ||
        mobileTileRefs.current[targetProject.id];
      openProject(targetProject, tileEl, targetImgIndex);
    });
  }, [projects]);

  /*
   * Handle browser back / forward buttons
   */
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const projectIdParam = params.get("project");

      if (!projectIdParam) {
        if (selectedProject && animationPhase !== "closing") {
          closeProject();
        }
      } else {
        const targetProject = projects.find(
          (p) => String(p.id) === projectIdParam
        );
        if (targetProject && selectedProject?.id !== targetProject.id) {
          const imgParam = params.get("img");
          const targetImgIndex = imgParam
            ? Math.max(0, parseInt(imgParam, 10) - 1)
            : 0;
          const tileEl =
            desktopTileRefs.current[targetProject.id] ||
            mobileTileRefs.current[targetProject.id];
          openProject(targetProject, tileEl, targetImgIndex);
        }
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [projects, selectedProject, animationPhase]);

  /*
   * ============================================================
   * CALCULATE FINAL ARTWORK POSITION
   * ============================================================
   */

  function calculateTargetRect(
    naturalWidth: number,
    naturalHeight: number
  ) {
    const viewportWidth =
      window.innerWidth;

    const viewportHeight =
      window.innerHeight;

    const headerHeight = getHeaderHeight();

    const panelWidth =
      viewportWidth < 768
        ? Math.min(
          viewportWidth * 0.82,
          420
        )
        : Math.min(
          Math.max(
            viewportWidth * 0.20,
            200
          ),
          380
        );

    const contentLeft = panelWidth;
    const contentTop = headerHeight;

    const contentWidth =
      viewportWidth - contentLeft;

    const contentHeight =
      viewportHeight - contentTop;

    const paddingX =
      viewportWidth < 768
        ? 20
        : 48;

    const paddingY =
      viewportWidth < 768
        ? 24
        : 40;

    const area: Rect = {
      left: contentLeft + paddingX,
      top: contentTop + paddingY,
      width: Math.max(
        1,
        contentWidth - paddingX * 2
      ),
      height: Math.max(
        1,
        contentHeight - paddingY * 2
      ),
    };

    return fitImageIntoArea(
      naturalWidth,
      naturalHeight,
      area
    );
  }

  /*
   * ============================================================
   * DEFAULT SOURCE RECT (FALLBACK)
   * ============================================================
   */

  function getDefaultSourceRect(): Rect {
    const vw =
      typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh =
      typeof window !== "undefined" ? window.innerHeight : 800;
    return {
      left: vw > 768 ? vw * 0.35 : 20,
      top: 100,
      width: vw > 768 ? vw * 0.55 : Math.max(100, vw - 40),
      height: vh * 0.75,
    };
  }

  /*
   * ============================================================
   * OPEN PROJECT
   * ============================================================
   */

  function beginOpenProject(
    project: Project,
    imageElement?: HTMLImageElement | null,
    initialImageIndex: number = 0
  ) {
    let sourceRect: Rect;

    if (imageElement) {
      const rect = imageElement.getBoundingClientRect();
      sourceRect = rect.width > 0 && rect.height > 0
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : getDefaultSourceRect();
    } else {
      const liveRect = getLiveTileRect(project.id);
      sourceRect = liveRect && liveRect.width > 0 && liveRect.height > 0
        ? liveRect
        : getDefaultSourceRect();
    }

    stopCloseAnimation();
    stopArtworkAnimation();
    setArtworkRectInstant(sourceRect);
    setOriginRect(sourceRect);
    setSelectedProject(project);

    const images = getProjectImages(project);
    const safeIndex = initialImageIndex >= 0 && initialImageIndex < images.length
      ? initialImageIndex
      : 0;
    setSelectedImageIndex(safeIndex);

    document.body.style.overflow = "hidden";
    setAnimationPhase("opening");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("project", String(project.id));
      if (safeIndex > 0) {
        url.searchParams.set("img", String(safeIndex + 1));
      } else {
        url.searchParams.delete("img");
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }

  function openProject(
    project: Project,
    imageElement?: HTMLImageElement | null,
    initialImageIndex: number = 0
  ) {
    const isTransitioning = animationPhaseRef.current !== "closed";
    const isDifferentProject = selectedProject && selectedProject.id !== project.id;

    // Never overlap two flying artworks. Finish the current one first,
    // then measure the newly requested tile and open from that exact rect.
    if (isTransitioning && isDifferentProject) {
      pendingOpenRef.current = { project, initialImageIndex };
      if (animationPhaseRef.current !== "closing") {
        closeProject();
      }
      return;
    }

    beginOpenProject(project, imageElement, initialImageIndex);
  }

  /*
   * ============================================================
   * CLOSE PROJECT
   * ============================================================
   */

  function closeProject() {
    if (
      !selectedProject ||
      animationPhase === "closing"
    ) {
      return;
    }

    setCopied(false);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      url.searchParams.delete("img");
      window.history.replaceState(null, "", url.pathname + (url.search ? url.search : ""));
    }

    const projectId =
      selectedProject.id;

    /*
     * Stop the opening tween FIRST, then read the MotionValues.
     * That freezes the artwork exactly where it is at the instant
     * the user clicks outside and makes that exact position the
     * first frame of the close animation.
     */
    stopArtworkAnimation();

    const startRect =
      getArtworkRect();

    setAnimationPhase("closing");

    /*
     * Unlock interaction immediately, so the
     * grid can scroll WHILE the artwork is
     * still animating back to it.
     */
    document.body.style.overflow = "";

    runCloseAnimation(
      projectId,
      startRect,
      CLOSE_DURATION * 1000,
      () => {
        const pendingOpen = pendingOpenRef.current;
        pendingOpenRef.current = null;

        setSelectedProject(null);
        setSelectedImageIndex(0);
        setOriginRect(null);
        setAnimationPhase("closed");

        if (pendingOpen) {
          requestAnimationFrame(() => {
            const tileEl =
              desktopTileRefs.current[pendingOpen.project.id] ||
              mobileTileRefs.current[pendingOpen.project.id];
            beginOpenProject(
              pendingOpen.project,
              tileEl,
              pendingOpen.initialImageIndex
            );
          });
        }
      }
    );
  }

  /*
   * ============================================================
   * IMAGE NAVIGATION
   * ============================================================
   */

  function showPreviousImage() {
    if (!selectedProject) return;

    const images =
      getProjectImages(
        selectedProject
      );

    if (images.length <= 1) return;

    const nextIndex =
      selectedImageIndex === 0
        ? images.length - 1
        : selectedImageIndex - 1;

    setSelectedImageIndex(nextIndex);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextIndex > 0) {
        url.searchParams.set("img", String(nextIndex + 1));
      } else {
        url.searchParams.delete("img");
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }

  function showNextImage() {
    if (!selectedProject) return;

    const images =
      getProjectImages(
        selectedProject
      );

    if (images.length <= 1) return;

    const nextIndex =
      selectedImageIndex === images.length - 1
        ? 0
        : selectedImageIndex + 1;

    setSelectedImageIndex(nextIndex);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextIndex > 0) {
        url.searchParams.set("img", String(nextIndex + 1));
      } else {
        url.searchParams.delete("img");
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }

  /*
   * ============================================================
   * CALCULATE TARGET ARTWORK POSITION
   * ============================================================
   */

  useLayoutEffect(() => {
    if (
      !selectedProject ||
      !originRect
    ) {
      return;
    }

    const project =
      selectedProject;

    const images =
      getProjectImages(project);

    const imageUrl =
      images[selectedImageIndex];

    if (!imageUrl) return;

    let cancelled = false;

    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      const nextRect =
        calculateTargetRect(
          image.naturalWidth,
          image.naturalHeight
        );

      animateArtworkRectTo(
        nextRect,
        OPEN_DURATION
      );

      setAnimationPhase(
        (current) =>
          current === "opening"
            ? "open"
            : current
      );
    };

    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [
    selectedProject,
    selectedImageIndex,
    originRect,
  ]);

  /*
   * ============================================================
   * RECALCULATE ON RESIZE
   * ============================================================
   */

  useEffect(() => {
    if (
      !selectedProject ||
      !originRect
    ) {
      return;
    }

    /*
     * Capture non-null values.
     */
    const project =
      selectedProject;

    const imageIndex =
      selectedImageIndex;

    function handleResize() {
      /*
       * Don't fight the close loop — it's
       * already setting the rect every frame.
       */
      if (
        animationPhaseRef.current ===
        "closing"
      ) {
        return;
      }

      const images =
        getProjectImages(project);

      const imageUrl =
        images[imageIndex];

      if (!imageUrl) return;

      const image = new Image();

      image.onload = () => {
        const nextRect =
          calculateTargetRect(
            image.naturalWidth,
            image.naturalHeight
          );

        animateArtworkRectTo(
          nextRect,
          0.3
        );
      };

      image.src = imageUrl;
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [
    selectedProject,
    selectedImageIndex,
    originRect,
  ]);

  /*
   * ============================================================
   * KEYBOARD CONTROLS
   * ============================================================
   */

  useEffect(() => {
    if (!selectedProject) return;

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeProject();
        return;
      }

      if (
        event.key === "ArrowLeft" ||
        event.code === "ArrowLeft"
      ) {
        event.preventDefault();
        showPreviousImage();
        return;
      }

      if (
        event.key === "ArrowRight" ||
        event.code === "ArrowRight"
      ) {
        event.preventDefault();
        showNextImage();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    selectedProject,
    selectedImageIndex,
    animationPhase,
  ]);

  /*
   * ============================================================
   * VIEWER STATE
   * ============================================================
   */

  const selectedImages =
    selectedProject
      ? getProjectImages(
        selectedProject
      )
      : [];

  const isViewerMounted =
    selectedProject !== null &&
    originRect !== null &&
    animationPhase !== "closed";

  /*
   * ============================================================
   * BACKGROUND GRID ANIMATION
   * ============================================================
   *
   * OPENING:
   * sharp -> blur
   *
   * OPEN:
   * blurred
   *
   * CLOSING:
   * blur -> sharp IMMEDIATELY
   *
   * CLOSED:
   * sharp
   */

  const gridAnimation =
    animationPhase === "opening" ||
      animationPhase === "open"
      ? {
        scale: 1.04,
        x: 200,
        filter: "blur(12px)",
      }
      : {
        scale: 1,
        x: 0,
        filter: "blur(0px)",
      };

  /*
   * ============================================================
   * PHASE-BASED TRANSITION DURATION
   * ============================================================
   *
   * Closing is snappier than opening, so every
   * chrome element (grid blur, click-layer,
   * sidebar) that reacts to animationPhase uses
   * this instead of a single fixed duration.
   */

  const chromeDuration =
    animationPhase === "closing"
      ? CLOSE_DURATION
      : OPEN_DURATION;

  return (
    <main className="relative min-h-screen w-full bg-white text-black">
      {/* ========================================================
          DESIGN GRID
      ======================================================== */}

      <motion.div
        animate={gridAnimation}
        transition={{
          duration:
            chromeDuration,
          ease: EASE,
        }}
        style={{
          transformOrigin:
            "center center",
        }}
      >
        {/* ======================================================
            DESKTOP GRID
        ====================================================== */}

        {(() => {
          const orderedProjects = projects
            .slice()
            .sort((a, b) => a.position - b.position);

          const placements = buildImageMasonry(
            orderedProjects,
            imageDimensions,
            desktopGridWidth
          );

          const gridHeight = orderedProjects.reduce(
            (max, project) => {
              const placement = placements[project.id];
              return Math.max(
                max,
                placement
                  ? placement.top + placement.height
                  : 0
              );
            },
            0
          );

          return (
            <div className="hidden w-full md:block">
              <div
                className="relative mx-auto box-border w-full"
                style={{
                  maxWidth: "1920px",
                  height: gridHeight,
                }}
              >
                {orderedProjects.map((project) => {
                  const image =
                    getProjectImages(project)[0] || null;
                  const placement =
                    placements[project.id];

                  if (!image || !placement) return null;

                  const isSelectedTile =
                    selectedProject?.id === project.id &&
                    animationPhase !== "closed";

                  return (
                    <div
                      key={project.id}
                      className="absolute box-border overflow-hidden border border-black bg-white"
                      style={{
                        left: placement.left,
                        top: placement.top,
                        width: placement.width,
                        height: placement.height,
                      }}
                    >
                      <button
                        type="button"
                        className="group absolute inset-0 block h-full w-full overflow-hidden bg-white"
                        onClick={(event) => {
                          const img =
                            event.currentTarget.querySelector("img");
                          if (!img) return;
                          openProject(project, img);
                        }}
                      >
                        <motion.img
                          src={image}
                          alt={project.name}
                          ref={(el) => {
                            desktopTileRefs.current[project.id] = el;
                          }}
                          animate={{
                            opacity: isSelectedTile ? 0 : 1,
                          }}
                          transition={{ duration: 0 }}
                          className="h-full w-full object-contain transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                          draggable={false}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ======================================================
            MOBILE GRID
        ====================================================== */}

        <div className="block w-full md:hidden">
          <div className="grid w-full gap-0">
            {projects.map((project) => {
              const image =
                getProjectImages(project)[0] || null;

              if (!image) return null;

              const dimensions =
                imageDimensions[project.id];

              const isSelectedTile =
                selectedProject?.id === project.id &&
                animationPhase !== "closed";

              return (
                <div
                  key={project.id}
                  className="relative box-border w-full overflow-hidden border border-black bg-white"
                  style={{
                    aspectRatio: dimensions
                      ? `${dimensions.width} / ${dimensions.height}`
                      : "1 / 1",
                  }}
                >
                  <button
                    type="button"
                    className="group absolute inset-0 h-full w-full overflow-hidden bg-white"
                    onClick={(event) => {
                      const img =
                        event.currentTarget.querySelector("img");
                      if (!img) return;
                      openProject(project, img);
                    }}
                  >
                    <motion.img
                      src={image}
                      alt={project.name}
                      ref={(el) => {
                        mobileTileRefs.current[project.id] = el;
                      }}
                      animate={{
                        opacity: isSelectedTile ? 0 : 1,
                      }}
                      transition={{ duration: 0 }}
                      className="h-full w-full object-contain transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                      draggable={false}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          PROJECT VIEWER
      ======================================================== */}

      <AnimatePresence>
        {isViewerMounted &&
          selectedProject &&
          originRect && (
            <>
              {/* ==================================================
                  TRANSPARENT CLICK-OUTSIDE LAYER
              ================================================== */}

              <motion.div
                key="viewer-click-layer"
                className="fixed inset-0 z-[60]"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity:
                    animationPhase ===
                      "closing"
                      ? 0
                      : 1,
                }}
                transition={{
                  duration:
                    chromeDuration,
                  ease: EASE,
                }}
                style={{
                  pointerEvents:
                    animationPhase ===
                      "closing"
                      ? "none"
                      : "auto",
                }}
                onMouseDown={(
                  event: MouseEvent<HTMLDivElement>
                ) => {
                  if (
                    event.target ===
                    event.currentTarget
                  ) {
                    closeProject();
                  }
                }}
              />

              {/* ==================================================
                  SIDEBAR

                  Sits directly below the static site
                  header and to the left.

                  Its own control row (close / share /
                  prev / next) lives INSIDE it, as the
                  first bordered section — it is not a
                  separate fixed header and never
                  overlaps the static site header.
              ================================================== */}

              <motion.aside
                className="fixed bottom-0 left-0 top-[clamp(4rem,10vh,5.6rem)] z-[100] w-[20vw] min-w-[200px] max-w-[380px] overflow-hidden border-r border-black bg-white"
                initial={{
                  x: "-100%",
                }}
                animate={{
                  x:
                    animationPhase ===
                      "closing"
                      ? "-100%"
                      : "0%",
                }}
                transition={{
                  duration:
                    chromeDuration,
                  ease: EASE,
                }}
                style={{
                  pointerEvents:
                    animationPhase ===
                      "closing"
                      ? "none"
                      : "auto",
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

                  <div className="flex h-[52px] shrink-0 border-b border-black">
                    <button
                      type="button"
                      onClick={closeProject}
                      aria-label="Close"
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
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
                        const shareUrl = `${window.location.origin}/design?project=${selectedProject.id}${selectedImageIndex > 0 ? `&img=${selectedImageIndex + 1}` : ""
                          }`;

                        const shareData = {
                          title: selectedProject.name,
                          text: selectedProject.name,
                          url: shareUrl,
                        };

                        const isMobile =
                          typeof window !== "undefined" &&
                          window.matchMedia("(max-width: 768px)").matches;

                        let shared = false;
                        if (isMobile && typeof navigator !== "undefined" && navigator.share) {
                          try {
                            await navigator.share(shareData);
                            shared = true;
                          } catch {
                            // User dismissed or share failed
                          }
                        }

                        if (!shared && typeof navigator !== "undefined" && navigator.clipboard) {
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
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
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

                    <div className="flex flex-1 items-center px-4 overflow-hidden">
                      {copied && (
                        <span className="font-['Degular'] text-[11px] font-semibold uppercase tracking-[0.08em] text-black/60 truncate transition-opacity duration-200">
                          Link copied
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={
                        showPreviousImage
                      }
                      aria-label="Previous image"
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={
                        showNextImage
                      }
                      aria-label="Next image"
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50"
                    >
                      ›
                    </button>
                  </div>

                  {/* =================================================
                      NAME
                  ================================================= */}

                  <div className="border-b border-black px-6 py-6">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      NAME
                    </div>

                    <div className="mt-3 max-w-full font-['Degular'] text-[clamp(34px,4vw,56px)] font-semibold leading-[0.85] tracking-[-0.03em]">
                      {
                        selectedProject.name
                      }
                    </div>
                  </div>

                  {/* =================================================
                      SKILL
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      SKILL
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {
                        selectedProject.skill ||
                        "—"
                      }
                    </div>
                  </div>

                  {/* =================================================
                      KIND
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      KIND
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {
                        selectedProject.kind ||
                        "—"
                      }
                    </div>
                  </div>

                  {/* =================================================
                      SOFTWARE(S) USED
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      SOFTWARE(S) USED
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {
                        selectedProject.softwares ||
                        "—"
                      }
                    </div>
                  </div>

                  {/* =================================================
                      FOR WHOM
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      FOR WHOM
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {selectedProject.client ? (
                        selectedProject.client_url ? (
                          <a
                            href={selectedProject.client_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:opacity-75 transition-opacity duration-200"
                          >
                            {selectedProject.client}
                          </a>
                        ) : (
                          selectedProject.client
                        )
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      WHEN
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      WHEN
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {selectedProject.project_date
                        ? new Date(
                          selectedProject.project_date
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "long",
                            year:
                              "numeric",
                          }
                        )
                        : "—"}
                    </div>
                  </div>

                  {/* =================================================
                      DESCRIPTION
                  ================================================= */}

                  <div className="px-6 pt-5">
                    {selectedProject.description && (
                      <p className="max-w-full font-['Degular'] text-[clamp(13px,1.15vw,16px)] font-medium leading-[1.4] tracking-[-0.01em]">
                        {
                          selectedProject.description
                        }
                      </p>
                    )}
                  </div>

                  {/* =================================================
                      IMAGE COUNTER
                  ================================================= */}

                  {selectedImages.length >
                    1 && (
                      <div className="mt-auto flex items-center justify-between border-t border-black px-6 py-4 font-['Degular'] text-[18px] font-semibold">
                        <button
                          type="button"
                          onClick={
                            showPreviousImage
                          }
                          className="transition-opacity hover:opacity-40"
                        >
                          ←
                        </button>

                        <span>
                          {String(
                            selectedImageIndex +
                            1
                          ).padStart(
                            2,
                            "0"
                          )}{" "}
                          /{" "}
                          {String(
                            selectedImages.length
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={
                            showNextImage
                          }
                          className="transition-opacity hover:opacity-40"
                        >
                          →
                        </button>
                      </div>
                    )}
                </div>
              </motion.aside>

              {/* ==================================================
                  ARTWORK

                  SOURCE TILE -> LARGE ARTWORK
                  LARGE ARTWORK -> SOURCE TILE
              ================================================== */}

              <motion.div
                className="fixed z-[80] overflow-hidden"
                style={{
                  left: artLeft,
                  top: artTop,
                  width: artWidth,
                  height: artHeight,
                  pointerEvents:
                    animationPhase ===
                      "closing"
                      ? "none"
                      : "auto",
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                {selectedImages[selectedImageIndex] && (
                  <motion.img
                    src={selectedImages[selectedImageIndex]}
                    alt={selectedProject.name}
                    className="absolute inset-0 h-full w-full select-none object-contain"
                    draggable={false}
                  />
                )}
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* ========================================================
          LOADING
      ======================================================== */}

      {loading && (
        <div className="fixed bottom-6 left-6 z-10 font-['Degular'] text-sm font-semibold">
          Loading...
        </div>
      )}
    </main>
  );
}
