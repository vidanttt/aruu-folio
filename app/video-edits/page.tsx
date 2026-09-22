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

import Footer from "../components/Footer";
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

type AnimationPhase =
  | "closed"
  | "opening"
  | "open"
  | "closing";

const supabase = createClient();

const OPEN_DURATION = 0.75;
const CLOSE_DURATION = 0.5;

const EASE = [0.22, 1, 0.36, 1] as const;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

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
 * VIDEO GRID
 * ============================================================
 */

const tiles = [
  {
    position: 0,
    col: "1 / 2",
    row: "1 / 49",
  },
  {
    position: 1,
    col: "2 / 4",
    row: "1 / 42",
  },
  {
    position: 2,
    col: "4 / 6",
    row: "1 / 55",
  },
  {
    position: 3,
    col: "1 / 2",
    row: "49 / 113",
  },
  {
    position: 4,
    col: "2 / 3",
    row: "42 / 90",
  },
  {
    position: 5,
    col: "3 / 4",
    row: "42 / 90",
  },
  {
    position: 6,
    col: "4 / 6",
    row: "55 / 96",
  },
];

const mobileRatios = [
  "3/4",
  "16/9",
  "4/3",
  "9/16",
  "3/4",
  "3/4",
  "16/9",
];

function parseAspectRatio(value: string | null | undefined) {
  if (!value) return 16 / 9;

  // Supabase entries may be stored as 9:16, 9/16, 9 x 16,
  // or as a decimal ratio. Normalize all of them before layout.
  const normalized = value.trim().toLowerCase().replace(/[x:]/g, "/");
  const parts = normalized.split("/").map((part) => Number(part.trim()));

  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    return parts[0] / parts[1];
  }

  const decimal = Number(normalized);
  return decimal > 0 ? decimal : 16 / 9;
}

function getDynamicDesktopPlacement(
  project: Project,
  viewportWidth: number
) {
  const ratio = parseAspectRatio(project.aspect_ratio);
  const isPortrait = ratio < 1;
  const columnSpan = isPortrait ? 1 : 2;
  const gridWidth = Math.min(viewportWidth || 1920, 1920);
  const columnWidth = gridWidth / 5;
  const rowUnit = gridWidth / 180;
  const mediaWidth = columnWidth * columnSpan;
  const mediaHeight = mediaWidth / ratio;
  const rowSpan = Math.max(
    1,
    Math.ceil((mediaHeight + 1) / (rowUnit + 1))
  );

  return {
    gridColumn: `span ${columnSpan}`,
    gridRow: `span ${rowSpan}`,
  };
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function VideoEditsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [copied, setCopied] = useState(false);

  const copyTimeoutRef =
    useRef<NodeJS.Timeout | null>(null);

  const initialDeepLinkHandled =
    useRef(false);

  /*
   * ============================================================
   * PENDING OPEN
   * ============================================================
   */

  const pendingOpenRef = useRef<{
    project: Project;
  } | null>(null);

  const [animationPhase, setAnimationPhase] =
    useState<AnimationPhase>("closed");

  const [originRect, setOriginRect] =
    useState<Rect | null>(null);

  /*
   * ============================================================
   * LIVE TILE REFS
   * ============================================================
   */

  const desktopTileRefs =
    useRef<Record<number, HTMLVideoElement | null>>(
      {}
    );

  const mobileTileRefs =
    useRef<Record<number, HTMLVideoElement | null>>(
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
      ? desktopTileRefs.current[projectId]
      : mobileTileRefs.current[projectId];

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
   * ARTWORK MOTION VALUES
   * ============================================================
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
    stopArtworkAnimation();

    animateMotionValue(
      artLeft,
      rect.left,
      {
        duration,
        ease: EASE,
      }
    );

    animateMotionValue(
      artTop,
      rect.top,
      {
        duration,
        ease: EASE,
      }
    );

    animateMotionValue(
      artWidth,
      rect.width,
      {
        duration,
        ease: EASE,
      }
    );

    animateMotionValue(
      artHeight,
      rect.height,
      {
        duration,
        ease: EASE,
      }
    );
  }

  /*
   * ============================================================
   * CLOSE ANIMATION
   *
   * IMPORTANT:
   * The target rectangle keeps the REAL VIDEO aspect ratio.
   * This prevents the flying video from stretching when it
   * returns into a grid tile with a different aspect ratio.
   * ============================================================
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

  function stopCloseAnimation() {
    if (closeFrameRef.current !== null) {
      cancelAnimationFrame(
        closeFrameRef.current
      );

      closeFrameRef.current = null;
    }
  }

  function getLiveCloseTarget(
    projectId: number,
    fallback: Rect
  ): Rect {
    // The final frame must be the exact same rectangle as the source tile.
    // This prevents a one-frame snap when the tile becomes visible again.
    return getLiveTileRect(projectId) || fallback;
  }

  function runCloseAnimation(
    projectId: number,
    startRect: Rect,
    durationMs: number,
    onDone: () => void
  ) {
    stopCloseAnimation();

    const startTime = performance.now();
    const initialTarget = getLiveCloseTarget(projectId, startRect);

    function frame(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);

      // Re-measure every frame so scrolling is followed without losing
      // the smooth easing. The final frame is the exact tile rectangle.
      const liveTarget = getLiveCloseTarget(projectId, initialTarget);

      setArtworkRectInstant({
        left:
          startRect.left +
          (initialTarget.left - startRect.left) * eased +
          (liveTarget.left - initialTarget.left),
        top:
          startRect.top +
          (initialTarget.top - startRect.top) * eased +
          (liveTarget.top - initialTarget.top),
        width:
          startRect.width +
          (initialTarget.width - startRect.width) * eased +
          (liveTarget.width - initialTarget.width),
        height:
          startRect.height +
          (initialTarget.height - startRect.height) * eased +
          (liveTarget.height - initialTarget.height),
      });

      if (t < 1) {
        closeFrameRef.current = requestAnimationFrame(frame);
      } else {
        closeFrameRef.current = null;
        // Guarantee zero-pixel disagreement between the last flying frame
        // and the tile that is revealed by onDone().
        setArtworkRectInstant(getLiveCloseTarget(projectId, liveTarget));
        onDone();
      }
    }

    closeFrameRef.current = requestAnimationFrame(frame);
  }

  /*
   * ============================================================
   * CLEANUP
   * ============================================================
   */

  useEffect(() => {
    return () => {
      stopCloseAnimation();
      stopArtworkAnimation();

      if (copyTimeoutRef.current) {
        clearTimeout(
          copyTimeoutRef.current
        );
      }

      document.body.style.overflow =
        "";
    };
  }, []);

  /*
   * ============================================================
   * LOAD PROJECTS
   * ============================================================
   */

  useEffect(() => {
    function syncViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);

    return () => {
      window.removeEventListener("resize", syncViewportWidth);
    };
  }, []);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);

      const { data, error } =
        await supabase
          .from("projects")
          .select(
            "id, name, skill, kind, softwares, client, client_url, project_date, category, aspect_ratio, position, thumbnail_url, description, published"
          )
          .eq(
            "category",
            "video-edit"
          )
          .eq(
            "published",
            true
          )
          .order("position", {
            ascending: true,
          });

      if (error) {
        console.error(
          "Failed to load video projects:",
          error
        );

        setProjects([]);
      } else {
        setProjects(
          (data as Project[]) ||
          []
        );
      }

      setLoading(false);
    }

    loadProjects();
  }, []);

  /*
   * ============================================================
   * GET PROJECT
   * ============================================================
   */

  function getProject(
    position: number
  ) {
    return projects.find(
      (project) =>
        project.position ===
        position
    );
  }

  /*
   * ============================================================
   * DEEP LINK
   * ============================================================
   */

  useEffect(() => {
    if (
      initialDeepLinkHandled.current ||
      projects.length === 0
    ) {
      return;
    }

    initialDeepLinkHandled.current =
      true;

    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const projectIdParam =
      params.get("project");

    if (!projectIdParam) {
      return;
    }

    const targetProject =
      projects.find(
        (project) =>
          String(project.id) ===
          projectIdParam
      );

    if (!targetProject) {
      return;
    }

    requestAnimationFrame(
      () => {
        const tileEl =
          desktopTileRefs.current[
          targetProject.id
          ] ||
          mobileTileRefs.current[
          targetProject.id
          ];

        openProject(
          targetProject,
          tileEl
        );
      }
    );
  }, [projects]);

  /*
   * ============================================================
   * BROWSER BACK / FORWARD
   * ============================================================
   */

  useEffect(() => {
    function handlePopState() {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const projectIdParam =
        params.get("project");

      if (!projectIdParam) {
        if (
          selectedProject &&
          animationPhase !==
          "closing"
        ) {
          closeProject();
        }

        return;
      }

      const targetProject =
        projects.find(
          (project) =>
            String(project.id) ===
            projectIdParam
        );

      if (
        targetProject &&
        selectedProject?.id !==
        targetProject.id
      ) {
        const tileEl =
          desktopTileRefs.current[
          targetProject.id
          ] ||
          mobileTileRefs.current[
          targetProject.id
          ];

        openProject(
          targetProject,
          tileEl
        );
      }
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [
    projects,
    selectedProject,
    animationPhase,
  ]);

  /*
   * ============================================================
   * TARGET VIDEO POSITION
   * ============================================================
   */

  function calculateTargetRect(
    naturalWidth: number,
    naturalHeight: number
  ): Rect {
    const viewportWidth =
      window.innerWidth;

    const viewportHeight =
      window.innerHeight;

    const headerHeight =
      getHeaderHeight();

    const panelWidth =
      viewportWidth < 768
        ? Math.min(
          viewportWidth * 0.82,
          420
        )
        : Math.min(
          Math.max(
            viewportWidth * 0.2,
            200
          ),
          380
        );

    const contentLeft =
      panelWidth;

    const contentTop =
      headerHeight;

    const contentWidth =
      viewportWidth -
      contentLeft;

    const contentHeight =
      viewportHeight -
      contentTop;

    const paddingX =
      viewportWidth < 768
        ? 20
        : 48;

    const paddingY =
      viewportWidth < 768
        ? 24
        : 40;

    const area: Rect = {
      left:
        contentLeft + paddingX,

      top:
        contentTop + paddingY,

      width: Math.max(
        1,
        contentWidth -
        paddingX * 2
      ),

      height: Math.max(
        1,
        contentHeight -
        paddingY * 2
      ),
    };

    const videoRatio =
      naturalWidth &&
        naturalHeight
        ? naturalWidth /
        naturalHeight
        : 16 / 9;

    const areaRatio =
      area.width /
      area.height;

    let width: number;
    let height: number;

    if (
      videoRatio > areaRatio
    ) {
      width = area.width;
      height =
        width / videoRatio;
    } else {
      height = area.height;
      width =
        height * videoRatio;
    }

    return {
      left:
        area.left +
        (area.width - width) /
        2,

      top:
        area.top +
        (area.height - height) /
        2,

      width,
      height,
    };
  }

  /*
   * ============================================================
   * DEFAULT SOURCE RECT
   * ============================================================
   */

  function getDefaultSourceRect(): Rect {
    const vw =
      typeof window !==
        "undefined"
        ? window.innerWidth
        : 1200;

    const vh =
      typeof window !==
        "undefined"
        ? window.innerHeight
        : 800;

    return {
      left:
        vw > 768
          ? vw * 0.35
          : 20,

      top: 100,

      width:
        vw > 768
          ? vw * 0.55
          : Math.max(
            100,
            vw - 40
          ),

      height:
        vh * 0.75,
    };
  }

  /*
   * ============================================================
   * OPEN PROJECT
   * ============================================================
   */

  function openProject(
    project: Project,
    videoElement?: HTMLVideoElement | null
  ) {
    if (!project.thumbnail_url) {
      return;
    }

    const isTransitioning =
      animationPhaseRef.current !==
      "closed";

    const isDifferentProject =
      selectedProject &&
      selectedProject.id !==
      project.id;

    if (
      isTransitioning &&
      isDifferentProject
    ) {
      pendingOpenRef.current = {
        project,
      };

      if (
        animationPhaseRef.current !==
        "closing"
      ) {
        closeProject();
      }

      return;
    }

    let sourceRect: Rect;

    if (videoElement) {
      const rect =
        videoElement.getBoundingClientRect();

      sourceRect =
        rect.width > 0 &&
          rect.height > 0
          ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
          : getDefaultSourceRect();
    } else {
      const liveRect =
        getLiveTileRect(
          project.id
        );

      sourceRect =
        liveRect &&
          liveRect.width > 0 &&
          liveRect.height > 0
          ? liveRect
          : getDefaultSourceRect();
    }

    stopCloseAnimation();
    stopArtworkAnimation();

    setArtworkRectInstant(
      sourceRect
    );

    setOriginRect(
      sourceRect
    );

    setSelectedProject(
      project
    );

    document.body.style.overflow =
      "hidden";

    setCopied(false);

    setAnimationPhase(
      "opening"
    );

    if (
      typeof window !==
      "undefined"
    ) {
      const url = new URL(
        window.location.href
      );

      url.searchParams.set(
        "project",
        String(project.id)
      );

      window.history.replaceState(
        null,
        "",
        url.pathname +
        url.search
      );
    }
  }

  /*
   * ============================================================
   * PROJECT NAVIGATION
   * ============================================================
   */

  function navigateProject(direction: -1 | 1) {
    if (
      !selectedProject ||
      projects.length < 2 ||
      animationPhase === "closing"
    ) {
      return;
    }

    const currentIndex = projects.findIndex(
      (project) => project.id === selectedProject.id
    );

    if (currentIndex < 0) return;

    const nextIndex =
      (currentIndex + direction + projects.length) % projects.length;
    const nextProject = projects[nextIndex];

    if (!nextProject?.thumbnail_url) return;

    // Keep the existing flying rectangle and retarget it to the next
    // video's metadata. This updates the sidebar immediately without
    // closing and reopening a second artwork layer.
    stopArtworkAnimation();
    setCopied(false);
    setSelectedProject(nextProject);
    setAnimationPhase("opening");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("project", String(nextProject.id));
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }

  /*
   * ============================================================
   * CLOSE PROJECT
   * ============================================================
   */

  function closeProject() {
    if (
      !selectedProject ||
      animationPhase ===
      "closing"
    ) {
      return;
    }

    setCopied(false);

    if (
      copyTimeoutRef.current
    ) {
      clearTimeout(
        copyTimeoutRef.current
      );
    }

    if (
      typeof window !==
      "undefined"
    ) {
      const url = new URL(
        window.location.href
      );

      url.searchParams.delete(
        "project"
      );

      window.history.replaceState(
        null,
        "",
        url.pathname +
        (url.search
          ? url.search
          : "")
      );
    }

    const projectId =
      selectedProject.id;

    stopArtworkAnimation();

    const startRect =
      getArtworkRect();

    setAnimationPhase(
      "closing"
    );

    document.body.style.overflow =
      "";

    runCloseAnimation(
      projectId,
      startRect,
      CLOSE_DURATION * 1000,
      () => {
        const pendingOpen =
          pendingOpenRef.current;

        pendingOpenRef.current =
          null;

        setSelectedProject(
          null
        );

        setOriginRect(
          null
        );

        setAnimationPhase(
          "closed"
        );

        if (pendingOpen) {
          requestAnimationFrame(
            () => {
              const tileEl =
                desktopTileRefs.current[
                pendingOpen.project
                  .id
                ] ||
                mobileTileRefs.current[
                pendingOpen.project
                  .id
                ];

              openProject(
                pendingOpen.project,
                tileEl
              );
            }
          );
        }
      }
    );
  }

  /*
   * ============================================================
   * OPENING / FINAL VIDEO RECT
   * ============================================================
   */

  useLayoutEffect(() => {
    if (
      !selectedProject ||
      !originRect ||
      !selectedProject.thumbnail_url
    ) {
      return;
    }

    const videoUrl =
      selectedProject.thumbnail_url;

    let cancelled = false;

    const video =
      document.createElement(
        "video"
      );

    video.preload =
      "metadata";

    video.onloadedmetadata =
      () => {
        if (cancelled) return;

        const nextRect =
          calculateTargetRect(
            video.videoWidth ||
            1920,
            video.videoHeight ||
            1080
          );

        animateArtworkRectTo(
          nextRect,
          OPEN_DURATION
        );

        setAnimationPhase(
          (current) =>
            current ===
              "opening"
              ? "open"
              : current
        );
      };

    video.src = videoUrl;

    return () => {
      cancelled = true;
      video.src = "";
    };
  }, [
    selectedProject,
    originRect,
  ]);

  /*
   * ============================================================
   * RESIZE
   * ============================================================
   */

  useEffect(() => {
    if (
      !selectedProject ||
      !originRect ||
      !selectedProject.thumbnail_url
    ) {
      return;
    }

    const project =
      selectedProject;

    function handleResize() {
      if (
        animationPhaseRef.current ===
        "closing"
      ) {
        return;
      }

      if (!project.thumbnail_url) {
        return;
      }

      const video =
        document.createElement(
          "video"
        );

      video.preload =
        "metadata";

      video.onloadedmetadata =
        () => {
          animateArtworkRectTo(
            calculateTargetRect(
              video.videoWidth ||
              1920,
              video.videoHeight ||
              1080
            ),
            0.3
          );
        };

      video.src =
        project.thumbnail_url;
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
    originRect,
  ]);

  /*
   * ============================================================
   * KEYBOARD
   * ============================================================
   */

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        closeProject();
        return;
      }

      if (event.key === "ArrowLeft") {
        navigateProject(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        navigateProject(1);
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
    animationPhase,
  ]);

  /*
   * ============================================================
   * VIEWER STATE
   * ============================================================
   */

  const isViewerMounted =
    selectedProject !== null &&
    originRect !== null &&
    animationPhase !==
    "closed";

  /*
   * ============================================================
   * GRID ANIMATION
   * ============================================================
   */

  const gridAnimation =
    animationPhase ===
      "opening" ||
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

  const chromeDuration =
    animationPhase ===
      "closing"
      ? CLOSE_DURATION
      : OPEN_DURATION;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex min-h-full flex-col justify-between bg-background text-foreground">
      <div className="w-full flex-1">
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

          <div
            className="mx-auto hidden w-full max-w-[1920px] md:grid"
            style={{
              gridTemplateColumns:
                "repeat(5, 1fr)",
              gridAutoRows:
                "calc(min(100vw, 1920px) / 180)",
              gap: "1px",
              backgroundColor:
                "var(--background)",
            }}
          >
            {tiles.map(
              (tile) => {
                const project =
                  getProject(
                    tile.position
                  );

                const isSelected =
                  selectedProject?.id ===
                  project?.id &&
                  animationPhase !==
                  "closed";

                return (
                  <div
                    key={
                      tile.position
                    }
                    className="relative overflow-hidden bg-background"
                    style={{
                      gridColumn:
                        tile.col,
                      gridRow:
                        tile.row,
                    }}
                  >
                    {project?.thumbnail_url && (
                      <button
                        type="button"
                        className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                        onClick={(
                          event
                        ) => {
                          const video =
                            event.currentTarget.querySelector(
                              "video"
                            );

                          openProject(
                            project,
                            video
                          );
                        }}
                      >
                        <motion.video
                          ref={(
                            el
                          ) => {
                            desktopTileRefs.current[
                              project.id
                            ] = el;
                          }}
                          src={
                            project.thumbnail_url
                          }
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          animate={{
                            opacity:
                              isSelected
                                ? 0
                                : 1,
                          }}
                          transition={{
                            duration: 0,
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                          draggable={
                            false
                          }
                        />
                      </button>
                    )}
                  </div>
                );
              }
            )}

            {/* ======================================================
              DYNAMIC DESKTOP PROJECTS

              Existing positions above remain exactly as designed.
              Every later project is auto-placed into the next open
              one- or two-unit slot and receives a row span derived
              from its own aspect ratio.
          ====================================================== */}
            {projects
              .filter(
                (project) =>
                  !tiles.some(
                    (tile) => tile.position === project.position
                  )
              )
              .map((project) => {
                const isSelected =
                  selectedProject?.id === project.id &&
                  animationPhase !== "closed";
                const placement = getDynamicDesktopPlacement(
                  project,
                  viewportWidth
                );

                return (
                  <div
                    key={`dynamic-desktop-${project.id}`}
                    className="relative overflow-hidden bg-background"
                    style={{
                      ...placement,
                      aspectRatio: parseAspectRatio(project.aspect_ratio),
                    }}
                  >
                    {project.thumbnail_url && (
                      <button
                        type="button"
                        className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                        onClick={(event) => {
                          const video =
                            event.currentTarget.querySelector("video");
                          openProject(project, video);
                        }}
                      >
                        <motion.video
                          ref={(el) => {
                            desktopTileRefs.current[project.id] = el;
                          }}
                          src={project.thumbnail_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          animate={{ opacity: isSelected ? 0 : 1 }}
                          transition={{ duration: 0 }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                          draggable={false}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {/* ======================================================
              MOBILE GRID
          ====================================================== */}

          <div className="flex flex-col gap-px bg-background md:hidden">
            {mobileRatios.map(
              (
                ratio,
                index
              ) => {
                const project =
                  getProject(
                    index
                  );

                const isSelected =
                  selectedProject?.id ===
                  project?.id &&
                  animationPhase !==
                  "closed";

                return (
                  <div
                    key={index}
                    className="relative w-full overflow-hidden bg-background"
                    style={{
                      aspectRatio:
                        ratio,
                    }}
                  >
                    {project?.thumbnail_url && (
                      <button
                        type="button"
                        className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                        onClick={(
                          event
                        ) => {
                          const video =
                            event.currentTarget.querySelector(
                              "video"
                            );

                          openProject(
                            project,
                            video
                          );
                        }}
                      >
                        <motion.video
                          ref={(
                            el
                          ) => {
                            mobileTileRefs.current[
                              project.id
                            ] = el;
                          }}
                          src={
                            project.thumbnail_url
                          }
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          animate={{
                            opacity:
                              isSelected
                                ? 0
                                : 1,
                          }}
                          transition={{
                            duration: 0,
                          }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                          draggable={
                            false
                          }
                        />
                      </button>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* ======================================================
              DYNAMIC MOBILE PROJECTS
          ====================================================== */}
          <div className="flex flex-col gap-px bg-foreground md:hidden">
            {projects
              .filter(
                (project) =>
                  !tiles.some(
                    (tile) => tile.position === project.position
                  )
              )
              .map((project) => {
                const isSelected =
                  selectedProject?.id === project.id &&
                  animationPhase !== "closed";

                return (
                  <div
                    key={`dynamic-mobile-${project.id}`}
                    className="relative w-full overflow-hidden bg-background"
                    style={{
                      aspectRatio: parseAspectRatio(project.aspect_ratio),
                    }}
                  >
                    {project.thumbnail_url && (
                      <button
                        type="button"
                        className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                        onClick={(event) => {
                          const video =
                            event.currentTarget.querySelector("video");
                          openProject(project, video);
                        }}
                      >
                        <motion.video
                          ref={(el) => {
                            mobileTileRefs.current[project.id] = el;
                          }}
                          src={project.thumbnail_url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          animate={{ opacity: isSelected ? 0 : 1 }}
                          transition={{ duration: 0 }}
                          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                          draggable={false}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </motion.div>
      </div>

      {/* ========================================================
          PROJECT VIEWER
      ======================================================== */}

      <AnimatePresence>
        {isViewerMounted &&
          selectedProject &&
          originRect && (
            <>
              {/* ==================================================
                  CLICK OUTSIDE
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
                onMouseDown={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >
                <div className="flex h-full w-full flex-col">
                  {/* =================================================
                      CONTROLS
                  ================================================= */}

                  <div className="flex h-[52px] shrink-0 border-b border-black">
                    <button
                      type="button"
                      onClick={
                        closeProject
                      }
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
                      title={
                        copied
                          ? "Copied link!"
                          : "Share link"
                      }
                      onClick={async () => {
                        const shareUrl =
                          `${window.location.origin}/video-edits?project=${selectedProject.id}`;

                        const shareData =
                        {
                          title:
                            selectedProject.name,
                          text:
                            selectedProject.name,
                          url: shareUrl,
                        };

                        const isMobile =
                          typeof window !==
                          "undefined" &&
                          window.matchMedia(
                            "(max-width: 768px)"
                          ).matches;

                        let shared =
                          false;

                        if (
                          isMobile &&
                          typeof navigator !==
                          "undefined" &&
                          navigator.share
                        ) {
                          try {
                            await navigator.share(
                              shareData
                            );

                            shared =
                              true;
                          } catch {
                            // User dismissed share.
                          }
                        }

                        if (
                          !shared &&
                          typeof navigator !==
                          "undefined" &&
                          navigator.clipboard
                        ) {
                          try {
                            await navigator.clipboard.writeText(
                              shareUrl
                            );

                            setCopied(
                              true
                            );

                            if (
                              copyTimeoutRef.current
                            ) {
                              clearTimeout(
                                copyTimeoutRef.current
                              );
                            }

                            copyTimeoutRef.current =
                              setTimeout(
                                () => {
                                  setCopied(
                                    false
                                  );
                                },
                                2000
                              );
                          } catch (
                          err
                          ) {
                            console.error(
                              "Failed to copy link:",
                              err
                            );
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

                    <div className="flex flex-1 items-center overflow-hidden px-4">
                      {copied && (
                        <span className="truncate font-['Degular'] text-[11px] font-semibold uppercase tracking-[0.08em] text-black/60 transition-opacity duration-200">
                          Link copied
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateProject(-1)}
                      aria-label="Previous project"
                      disabled={projects.length < 2 || animationPhase === "closing"}
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateProject(1)}
                      aria-label="Next project"
                      disabled={projects.length < 2 || animationPhase === "closing"}
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30"
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
                      SOFTWARE
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
                      CLIENT
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5">
                    <div className="font-['Degular'] text-[12px] leading-none tracking-[0.06em]">
                      FOR WHOM
                    </div>

                    <div className="mt-2 font-['Degular'] text-[clamp(20px,2.2vw,30px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                      {selectedProject.client ? (
                        selectedProject.client_url ? (
                          <a
                            href={
                              selectedProject.client_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-opacity duration-200 hover:underline hover:opacity-75"
                          >
                            {
                              selectedProject.client
                            }
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
                      DATE
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
                </div>
              </motion.aside>

              {/* ==================================================
                  FLYING VIDEO
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
                  willChange: "left, top, width, height",
                  backfaceVisibility: "hidden",
                }}
                onMouseDown={(
                  event
                ) => {
                  event.stopPropagation();
                }}
              >
                <video
                  key={
                    selectedProject.id
                  }
                  src={
                    selectedProject.thumbnail_url ??
                    ""
                  }
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="absolute inset-0 h-full w-full select-none object-cover"
                />
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <div className="mx-auto w-full max-w-[1920px]">
        <Footer borderTop={false} />
      </div>

      {/* ========================================================
          LOADING
      ======================================================== */}

      {loading && (
        <div className="fixed bottom-6 left-6 z-10 font-['Degular'] text-sm font-semibold">
          Loading...
        </div>
      )}
    </div>
  );
}