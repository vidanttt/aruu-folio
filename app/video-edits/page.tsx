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

import { useRouter } from "next/navigation";
import Footer from "../components/Footer";
import MobileFooter from "../components/MobileFooter";
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

const OPEN_DURATION = 0.375;
const CLOSE_DURATION = 0.25;

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

type VideoDimensionMap = Record<
  number,
  {
    width: number;
    height: number;
  }
>;

function getVideoRatio(
  project: Project,
  dimensions: VideoDimensionMap
) {
  const natural = dimensions[project.id];

  if (natural?.width && natural?.height) {
    return natural.width / natural.height;
  }

  // Until metadata is available, use a neutral placeholder ratio.
  // The layout updates automatically as soon as the real video
  // dimensions are loaded.
  return 1;
}

function getVideoTileSpan(ratio: number) {
  // Same editorial grid rule as the Design page:
  // landscape = two horizontal units,
  // square/portrait = one horizontal unit.
  return ratio > 1 ? 2 : 1;
}

type VideoTilePlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function buildVideoMasonry(
  projects: Project[],
  dimensions: VideoDimensionMap,
  containerWidth: number
): Record<number, VideoTilePlacement> {
  const placements: Record<number, VideoTilePlacement> = {};
  if (!containerWidth || projects.length === 0) return placements;

  /*
   * Desktop stays a strict 5-unit system.
   *
   * A portrait/square uses 1 unit and a landscape uses 2 units.
   * We dynamically choose which remaining project goes into the
   * lowest available pocket, so the five-unit grid can close gaps
   * instead of blindly following one fixed skyline order.
   *
   * The five-unit width never changes and videos keep their real
   * dimensions. Only the packing order/vertical position changes.
   */
  const GRID_COLUMNS = 5;
  const columnWidth = containerWidth / GRID_COLUMNS;
  const skyline = Array.from({ length: GRID_COLUMNS }, () => 0);
  const remaining = projects.map((project, index) => ({ project, index }));

  while (remaining.length > 0) {
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

    for (
      let candidateIndex = 0;
      candidateIndex < remaining.length;
      candidateIndex += 1
    ) {
      const project = remaining[candidateIndex].project;
      const ratio = Math.max(
        0.01,
        getVideoRatio(project, dimensions)
      );

      const columnSpan = getVideoTileSpan(ratio);
      const width = columnWidth * columnSpan;
      const height = width / ratio;

      for (
        let startColumn = 0;
        startColumn <= GRID_COLUMNS - columnSpan;
        startColumn += 1
      ) {
        const occupied = skyline.slice(
          startColumn,
          startColumn + columnSpan
        );

        const top = Math.max(...occupied);
        const nextSkyline = [...skyline];
        const bottom = top + height;

        for (
          let column = startColumn;
          column < startColumn + columnSpan;
          column += 1
        ) {
          nextSkyline[column] = bottom;
        }

        const newMax = Math.max(...nextSkyline);
        const newMin = Math.min(...nextSkyline);
        const spread = newMax - newMin;

        const score: [number, number, number, number] = [
          top,
          spread,
          newMax,
          remaining[candidateIndex].index,
        ];

        if (
          !best ||
          score[0] < best.score[0] ||
          (score[0] === best.score[0] &&
            score[1] < best.score[1]) ||
          (score[0] === best.score[0] &&
            score[1] === best.score[1] &&
            score[2] < best.score[2]) ||
          (score[0] === best.score[0] &&
            score[1] === best.score[1] &&
            score[2] === best.score[2] &&
            score[3] < best.score[3])
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

    const chosen = remaining.splice(
      best.remainingIndex,
      1
    )[0].project;

    placements[chosen.id] = {
      left: best.startColumn * columnWidth,
      top: best.top,
      width: best.width,
      height: best.height,
    };

    const bottom = best.top + best.height;
    const span = Math.round(
      best.width / columnWidth
    );

    for (
      let column = best.startColumn;
      column < best.startColumn + span;
      column += 1
    ) {
      skyline[column] = bottom;
    }
  }

  return placements;
}

type MobileVideoTilePlacement = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function buildMobileVideoMasonry(
  projects: Project[],
  dimensions: VideoDimensionMap,
  containerWidth: number
): Record<number, MobileVideoTilePlacement> {
  const placements: Record<
    number,
    MobileVideoTilePlacement
  > = {};

  if (!containerWidth) return placements;

  const columnWidth = containerWidth / 2;
  let cursorY = 0;

  /*
   * Same mobile rule as the Design page:
   * - two clearly vertical videos can sit side-by-side
   * - everything else gets a full-width tile
   * - a lone vertical video becomes full-width instead of
   *   leaving an empty half-row
   */
  for (
    let index = 0;
    index < projects.length;
    index += 1
  ) {
    const project = projects[index];
    const ratio = Math.max(
      0.01,
      getVideoRatio(project, dimensions)
    );

    const isPortrait = ratio < 0.82;
    const nextProject = projects[index + 1];
    const nextRatio = nextProject
      ? Math.max(
        0.01,
        getVideoRatio(nextProject, dimensions)
      )
      : 1;
    const nextIsPortrait =
      Boolean(nextProject) && nextRatio < 0.82;

    if (isPortrait && nextIsPortrait) {
      const firstHeight =
        columnWidth / ratio;
      const secondHeight =
        columnWidth / nextRatio;
      const rowHeight = Math.max(
        firstHeight,
        secondHeight
      );

      placements[project.id] = {
        left: 0,
        top: cursorY,
        width: columnWidth,
        height: firstHeight,
      };

      placements[nextProject.id] = {
        left: columnWidth,
        top: cursorY,
        width: columnWidth,
        height: secondHeight,
      };

      cursorY += rowHeight;
      index += 1;
      continue;
    }

    const width = containerWidth;
    const height = width / ratio;

    placements[project.id] = {
      left: 0,
      top: cursorY,
      width,
      height,
    };

    cursorY += height;
  }

  return placements;
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function VideoEditsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoDimensions, setVideoDimensions] =
    useState<VideoDimensionMap>({});

  const [desktopGridWidth, setDesktopGridWidth] =
    useState(0);

  const [mobileGridWidth, setMobileGridWidth] =
    useState(0);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [copied, setCopied] = useState(false);

  const viewerVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const [viewerPlaying, setViewerPlaying] =
    useState(true);

  const [viewerMuted, setViewerMuted] =
    useState(true);

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

  function setDesktopGridPlayback(
    playing: boolean
  ) {
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(min-width: 768px)").matches
    ) {
      return;
    }

    Object.values(desktopTileRefs.current).forEach(
      (video) => {
        if (!video) return;

        if (playing) {
          const playPromise = video.play();

          if (playPromise) {
            playPromise.catch(() => {
              // Browser autoplay restrictions can reject play().
            });
          }
        } else {
          video.pause();
        }
      }
    );
  }

  useEffect(() => {
    setDesktopGridPlayback(
      animationPhase === "closed"
    );
  }, [animationPhase]);

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
  const artworkAnimationIdRef = useRef(0);

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
    artworkAnimationIdRef.current += 1;

    artLeft.stop();
    artTop.stop();
    artWidth.stop();
    artHeight.stop();
  }

  function animateArtworkRectTo(
    rect: Rect,
    duration: number,
    withBounce = false
  ) {
    stopArtworkAnimation();

    const animationId = artworkAnimationIdRef.current;

    const animateTo = (
      target: Rect,
      phaseDuration: number
    ) => {
      animateMotionValue(
        artLeft,
        target.left,
        {
          duration: phaseDuration,
          ease: EASE,
        }
      );

      animateMotionValue(
        artTop,
        target.top,
        {
          duration: phaseDuration,
          ease: EASE,
        }
      );

      animateMotionValue(
        artWidth,
        target.width,
        {
          duration: phaseDuration,
          ease: EASE,
        }
      );

      animateMotionValue(
        artHeight,
        target.height,
        {
          duration: phaseDuration,
          ease: EASE,
        }
      );
    };

    if (!withBounce) {
      animateTo(rect, duration);
      return;
    }

    const BOUNCE_SCALE = 1.035;
    const BOUNCE_TIME = Math.min(
      0.14,
      duration * 0.4
    );
    const SETTLE_TIME = Math.max(
      0,
      duration - BOUNCE_TIME
    );

    const current = getArtworkRect();

    const bounceWidth =
      current.width * BOUNCE_SCALE;
    const bounceHeight =
      current.height * BOUNCE_SCALE;

    const bounceRect: Rect = {
      left:
        current.left -
        (bounceWidth - current.width) / 2,
      top:
        current.top -
        (bounceHeight - current.height) / 2,
      width: bounceWidth,
      height: bounceHeight,
    };

    const bounceAnimations = [
      animateMotionValue(
        artLeft,
        bounceRect.left,
        {
          duration: BOUNCE_TIME,
          ease: EASE,
        }
      ),
      animateMotionValue(
        artTop,
        bounceRect.top,
        {
          duration: BOUNCE_TIME,
          ease: EASE,
        }
      ),
      animateMotionValue(
        artWidth,
        bounceRect.width,
        {
          duration: BOUNCE_TIME,
          ease: EASE,
        }
      ),
      animateMotionValue(
        artHeight,
        bounceRect.height,
        {
          duration: BOUNCE_TIME,
          ease: EASE,
        }
      ),
    ];

    Promise.all(
      bounceAnimations.map((animation) =>
        animation.then(() => undefined)
      )
    )
      .then(() => {
        if (
          artworkAnimationIdRef.current !==
          animationId
        ) {
          return;
        }

        animateTo(
          rect,
          SETTLE_TIME
        );
      })
      .catch(() => {
        // Animation was interrupted.
      });
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
    function syncDesktopGridWidth() {
      if (window.innerWidth < 768) {
        setDesktopGridWidth(0);
        setMobileGridWidth(window.innerWidth);
        return;
      }

      setDesktopGridWidth(
        Math.min(window.innerWidth, 1920)
      );
      setMobileGridWidth(0);
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
    async function loadProjects() {
      setLoading(true);

      const { data, error } =
        await supabase
          .from("projects")
          .select(
            "id, name, skill, kind, softwares, client, client_url, project_date, category, position, thumbnail_url, description, published"
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
        ? viewportWidth * 0.5
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
        ? 8
        : 48;

    const paddingY =
      viewportWidth < 768
        ? 12
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

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      router.push(`/video-edits/${project.id}`);
      return;
    }

    // Freeze every desktop grid preview as soon as the viewer opens.
    // They stay paused for the entire open/close animation and resume
    // together only after the viewer has fully returned to the grid.
    setDesktopGridPlayback(false);

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

    setViewerPlaying(true);
    setViewerMuted(true);

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

    // Resume the desktop grid immediately when the close animation starts.
    setDesktopGridPlayback(true);

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
        // The animationPhase effect resumes all desktop grid previews here.

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
          OPEN_DURATION,
          true
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

          {(() => {
            const placements = buildVideoMasonry(
              projects,
              videoDimensions,
              desktopGridWidth
            );

            const gridHeight = projects.reduce(
              (max, project) => {
                const placement =
                  placements[project.id];

                return Math.max(
                  max,
                  placement
                    ? placement.top +
                    placement.height
                    : 0
                );
              },
              0
            );

            return (
              <div
                className="mx-auto hidden w-full max-w-[1920px] md:block"
                style={{
                  height: gridHeight,
                  position: "relative",
                  backgroundColor:
                    "var(--background)",
                }}
              >
                {projects.map((project) => {
                  const placement =
                    placements[project.id];

                  if (!placement) {
                    return null;
                  }

                  const isSelected =
                    selectedProject?.id ===
                    project.id &&
                    animationPhase !== "closed";

                  return (
                    <div
                      key={project.id}
                      className="absolute overflow-hidden border border-black bg-background"
                      style={{
                        left: placement.left,
                        top: placement.top,
                        width: placement.width,
                        height: placement.height,
                        boxSizing: "border-box",
                      }}
                    >
                      {project.thumbnail_url && (
                        <button
                          type="button"
                          className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                          onClick={(event) => {
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
                            ref={(el) => {
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
                            onLoadedMetadata={(
                              event
                            ) => {
                              const video =
                                event.currentTarget;

                              if (
                                !video.videoWidth ||
                                !video.videoHeight
                              ) {
                                return;
                              }

                              setVideoDimensions(
                                (current) => ({
                                  ...current,
                                  [project.id]: {
                                    width:
                                      video.videoWidth,
                                    height:
                                      video.videoHeight,
                                  },
                                })
                              );
                            }}
                            animate={{
                              opacity:
                                isSelected
                                  ? 0
                                  : 1,
                            }}
                            transition={{
                              duration: 0,
                            }}
                            className="h-full w-full object-cover scale-[1.006] transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.011] group-hover:contrast-[1.25]"
                            draggable={false}
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ======================================================
              MOBILE GRID
          ====================================================== */}

          {(() => {
            const placements = buildMobileVideoMasonry(
              projects,
              videoDimensions,
              mobileGridWidth
            );

            const gridHeight = projects.reduce(
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
              <div className="relative w-full bg-background md:hidden">
                <div
                  className="relative w-full"
                  style={{
                    height: gridHeight,
                  }}
                >
                  {projects.map((project) => {
                    const placement =
                      placements[project.id];

                    if (!placement) {
                      return null;
                    }

                    const isSelected =
                      selectedProject?.id ===
                      project.id &&
                      animationPhase !== "closed";

                    return (
                      <div
                        key={project.id}
                        className="absolute overflow-hidden border border-black bg-background"
                        style={{
                          left: placement.left,
                          top: placement.top,
                          width: placement.width,
                          height: placement.height,
                          boxSizing: "border-box",
                        }}
                      >
                        {project.thumbnail_url && (
                          <button
                            type="button"
                            className="group absolute inset-0 block h-full w-full overflow-hidden bg-background"
                            onClick={(event) => {
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
                              ref={(el) => {
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
                              onLoadedMetadata={(
                                event
                              ) => {
                                const video =
                                  event.currentTarget;

                                if (
                                  !video.videoWidth ||
                                  !video.videoHeight
                                ) {
                                  return;
                                }

                                setVideoDimensions(
                                  (current) => ({
                                    ...current,
                                    [project.id]: {
                                      width:
                                        video.videoWidth,
                                      height:
                                        video.videoHeight,
                                    },
                                  })
                                );
                              }}
                              animate={{
                                opacity:
                                  isSelected
                                    ? 0
                                    : 1,
                              }}
                              transition={{
                                duration: 0,
                              }}
                              className="h-full w-full object-cover scale-[1.006] transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.011] group-hover:contrast-[1.25]"
                              draggable={false}
                            />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
                className="fixed inset-0 z-30"
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
                className="fixed bottom-0 left-0 top-[clamp(4rem,10vh,5.6rem)] z-[100] w-[20vw] min-w-[200px] max-w-[380px] max-md:w-[50vw] max-md:min-w-0 max-md:max-w-none overflow-hidden border-r border-black bg-white"
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
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30 max-md:w-12 max-md:text-[24px]"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateProject(1)}
                      aria-label="Next project"
                      disabled={projects.length < 2 || animationPhase === "closing"}
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-l border-black font-['Degular'] text-[24px] leading-none transition-opacity hover:opacity-50 disabled:pointer-events-none disabled:opacity-30 max-md:w-12 max-md:text-[24px]"
                    >
                      ›
                    </button>
                  </div>

                  {/* =================================================
                      NAME
                  ================================================= */}

                  <div className="border-b border-black px-6 py-6 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      NAME
                    </div>

                    <div className="mt-3 max-w-full font-['Degular'] font-semibold text-[clamp(27px,4vw,56px)] leading-[0.85] tracking-[-0.05em] max-md:text-[38px]">
                      {
                        selectedProject.name
                      }
                    </div>
                  </div>

                  {/* =================================================
                      SKILL
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      SKILL
                    </div>

                    <div className="mt-2 font-['Degular'] font-semibold text-[clamp(20px,2.2vw,30px)] leading-[0.9] tracking-[-0.05em] max-md:text-[24px]">
                      {
                        selectedProject.skill ||
                        "—"
                      }
                    </div>
                  </div>

                  {/* =================================================
                      KIND
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      KIND
                    </div>

                    <div className="mt-2 font-['Degular'] font-semibold text-[clamp(20px,2.2vw,30px)] leading-[0.9] tracking-[-0.05em] max-md:text-[24px]">
                      {
                        selectedProject.kind ||
                        "—"
                      }
                    </div>
                  </div>

                  {/* =================================================
                      SOFTWARE
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      SOFTWARE(S) USED
                    </div>

                    <div className="mt-2 font-['Degular'] font-semibold text-[clamp(20px,2.2vw,30px)] leading-[0.9] tracking-[-0.05em] max-md:text-[24px]">
                      {selectedProject.softwares
                        ? selectedProject.softwares.split(",").map((software, index) => (
                          <span key={index} className="block">
                            {software.trim()}
                          </span>
                        ))
                        : "—"}
                    </div>
                  </div>

                  {/* =================================================
                      CLIENT
                  ================================================= */}

                  <div className="border-b border-black px-6 py-5 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      FOR WHOM
                    </div>

                    <div className="mt-2 font-['Degular'] font-semibold text-[clamp(20px,2.2vw,30px)] leading-[0.9] tracking-[-0.05em] max-md:text-[24px]">
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

                  <div className="border-b border-black px-6 py-5 max-md:px-4 max-md:py-4">
                    <div className="font-['Degular'] font-semibold text-[12px] leading-none tracking-[-0.05em]">
                      WHEN
                    </div>

                    <div className="mt-2 font-['Degular'] font-semibold text-[clamp(20px,2.2vw,30px)] leading-[0.9] tracking-[-0.05em] max-md:text-[24px]">
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

                  <div className="px-6 pt-5 max-md:px-4 max-md:pt-4">
                    {selectedProject.description && (
                      <p className="max-w-full font-['Degular'] font-semibold text-[clamp(13px,1.15vw,16px)] leading-[1.4] tracking-[-0.05em] max-md:text-[15px]">
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
                className="fixed z-40 overflow-hidden"
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
                  ref={viewerVideoRef}
                  key={
                    selectedProject.id
                  }
                  src={
                    selectedProject.thumbnail_url ??
                    ""
                  }
                  autoPlay
                  muted={viewerMuted}
                  loop
                  playsInline
                  preload="auto"
                  onPlay={() => setViewerPlaying(true)}
                  onPause={() => setViewerPlaying(false)}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                />

                <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 p-4">
                  <button
                    type="button"
                    aria-label={
                      viewerPlaying
                        ? "Pause video"
                        : "Play video"
                    }
                    onClick={() => {
                      const video =
                        viewerVideoRef.current;

                      if (!video) return;

                      if (video.paused) {
                        void video.play();
                      } else {
                        video.pause();
                      }
                    }}
                    className="flex h-9 w-9 items-center justify-center border border-white bg-black/70 text-white transition-opacity hover:opacity-70"
                  >
                    {viewerPlaying ? (
                      <span className="flex gap-[3px]">
                        <span className="h-3.5 w-[2px] bg-white" />
                        <span className="h-3.5 w-[2px] bg-white" />
                      </span>
                    ) : (
                      <span className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={
                      viewerMuted
                        ? "Unmute video"
                        : "Mute video"
                    }
                    onClick={() => {
                      const video =
                        viewerVideoRef.current;

                      if (!video) return;

                      video.muted =
                        !video.muted;

                      setViewerMuted(
                        video.muted
                      );
                    }}
                    className="flex h-9 w-9 items-center justify-center border border-white bg-black/70 text-white transition-opacity hover:opacity-70"
                  >
                    {viewerMuted ? (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 9V15H8L13 19V5L8 9H4Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M17 9L21 15"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M21 9L17 15"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 9V15H8L13 19V5L8 9H4Z"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M17 9C18.3 10.3 18.3 13.7 17 15"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M19.5 6.5C22.8 9.8 22.8 14.2 19.5 17.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <div className="mx-auto mt-30 w-full max-w-[1920px] border-t border-black">
        <div className="hidden md:block">
          <Footer borderTop={false} />
        </div>

        <div className="md:hidden">
          <MobileFooter />
        </div>
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