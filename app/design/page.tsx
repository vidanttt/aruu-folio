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
 * Site header height.
 *
 * The sidebar (and the artwork's target
 * area) begin a few pixels BELOW this, so
 * the header's own bottom border line is
 * never covered by the sidebar.
 */
const HEADER_HEIGHT = 72;
const HEADER_GAP = 4;
const SIDEBAR_TOP = HEADER_HEIGHT + HEADER_GAP;

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

const tiles = [
  {
    position: 0,
    col: "1 / 2",
    row: "1 / 55",
  },
  {
    position: 1,
    col: "2 / 4",
    row: "1 / 55",
  },
  {
    position: 2,
    col: "4 / 6",
    row: "1 / 42",
  },
  {
    position: 3,
    col: "1 / 2",
    row: "55 / 109",
  },
  {
    position: 4,
    col: "2 / 4",
    row: "55 / 82",
  },
  {
    position: 5,
    col: "4 / 5",
    row: "42 / 96",
  },
  {
    position: 6,
    col: "5 / 6",
    row: "42 / 96",
  },
];

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

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  /*
   * When a second tile is clicked while the first artwork is
   * closing, the first artwork gets its own independent close
   * animation. This lets the old image finish travelling back
   * while the newly clicked image starts its opening animation
   * at the exact same time.
   */
  const [outgoingArtwork, setOutgoingArtwork] =
    useState<{
      projectId: number;
      imageUrl: string;
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

  // Independent MotionValues for an artwork that is already
  // closing while a new artwork starts opening.
  const outgoingLeft = useMotionValue(0);
  const outgoingTop = useMotionValue(0);
  const outgoingWidth = useMotionValue(0);
  const outgoingHeight = useMotionValue(0);

  function getArtworkRect(): Rect {
    return {
      left: artLeft.get(),
      top: artTop.get(),
      width: artWidth.get(),
      height: artHeight.get(),
    };
  }

  function setOutgoingRectInstant(
    rect: Rect
  ) {
    outgoingLeft.set(rect.left);
    outgoingTop.set(rect.top);
    outgoingWidth.set(rect.width);
    outgoingHeight.set(rect.height);
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

  const outgoingCloseFrameRef =
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
      stopOutgoingCloseAnimation();
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

  function stopOutgoingCloseAnimation() {
    if (
      outgoingCloseFrameRef.current !==
      null
    ) {
      cancelAnimationFrame(
        outgoingCloseFrameRef.current
      );

      outgoingCloseFrameRef.current =
        null;
    }
  }

  function getSafeCloseTarget(
    liveTarget: Rect
  ): Rect {
    return {
      ...liveTarget,
      top: Math.max(
        SIDEBAR_TOP,
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

  function runOutgoingCloseAnimation(
    projectId: number,
    startRect: Rect,
    durationMs: number
  ) {
    stopOutgoingCloseAnimation();

    const startTime =
      performance.now();

    // Same live-scroll baseline for an artwork that is already
    // closing while a new artwork is being opened.
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

      const liveTarget =
        getSafeCloseTarget(
          getLiveTileRect(
            projectId
          ) || initialTarget
        );

      /* Follow scroll 1:1 while preserving the close easing. */
      setOutgoingRectInstant({
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
        outgoingCloseFrameRef.current =
          requestAnimationFrame(
            frame
          );
      } else {
        outgoingCloseFrameRef.current =
          null;

        setOutgoingArtwork(null);
      }
    }

    outgoingCloseFrameRef.current =
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
            "id, name, skill, kind, softwares, client, project_date, category, aspect_ratio, position, image_urls, thumbnail_url, description, published"
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

    /*
     * Header height.
     *
     * Sidebar begins directly underneath it.
     */
    const headerHeight = SIDEBAR_TOP;

    /*
     * Sidebar width.
     */
    const panelWidth =
      viewportWidth < 768
        ? Math.min(
          viewportWidth * 0.82,
          420
        )
        : Math.min(
          Math.max(
            viewportWidth * 0.27,
            280
          ),
          520
        );

    /*
     * Artwork area begins to the right
     * of the sidebar and underneath header.
     */
    const contentLeft = panelWidth;

    const contentTop = headerHeight;

    const contentWidth =
      viewportWidth - contentLeft;

    const contentHeight =
      viewportHeight - contentTop;

    /*
     * Breathing room.
     */
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

    return fitImageIntoArea(
      naturalWidth,
      naturalHeight,
      area
    );
  }

  /*
   * ============================================================
   * OPEN PROJECT
   * ============================================================
   */

  function openProject(
    project: Project,
    imageElement: HTMLImageElement
  ) {
    const rect =
      imageElement.getBoundingClientRect();

    const sourceRect: Rect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    /*
     * If the current artwork is already closing and the user
     * clicks another tile, do NOT kill the first artwork's close
     * animation. Transfer it to an independent outgoing layer.
     * The newly clicked artwork can then start opening immediately.
     */
    if (
      animationPhase === "closing" &&
      selectedProject
    ) {
      const oldImages =
        getProjectImages(
          selectedProject
        );

      const oldImageUrl =
        oldImages[
        selectedImageIndex
        ];

      if (oldImageUrl) {
        const oldRect =
          getArtworkRect();

        setOutgoingRectInstant(
          oldRect
        );

        setOutgoingArtwork({
          projectId:
            selectedProject.id,
          imageUrl:
            oldImageUrl,
        });

        runOutgoingCloseAnimation(
          selectedProject.id,
          oldRect,
          CLOSE_DURATION * 1000
        );
      }
    }

    /*
     * Cancel the old active close loop after its state has been
     * transferred to the independent outgoing layer above.
     */
    stopCloseAnimation();

    /*
     * Stop any active MotionValue tween. This is important when
     * switching during an opening animation: the new artwork must
     * continue from the exact pixel where the old artwork currently
     * is instead of snapping.
     */
    stopArtworkAnimation();

    const wasAnimating =
      animationPhase !== "closed";

    /*
     * Fresh open: snap straight to the clicked tile before growing.
     * Interrupting an existing animation: keep the current artwork
     * exactly where it is and retarget it toward the new artwork.
     */
    if (!wasAnimating) {
      setArtworkRectInstant(
        sourceRect
      );
    } else if (
      animationPhase === "closing"
    ) {
      // The old closing artwork was transferred above, so this
      // active layer now becomes the newly clicked artwork.
      setArtworkRectInstant(
        sourceRect
      );
    }

    setOriginRect(sourceRect);

    setSelectedProject(project);

    setSelectedImageIndex(0);

    document.body.style.overflow =
      "hidden";

    setAnimationPhase("opening");
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
        setSelectedProject(null);

        setSelectedImageIndex(0);

        setOriginRect(null);

        setAnimationPhase("closed");
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

    setSelectedImageIndex(
      (current) =>
        current === 0
          ? images.length - 1
          : current - 1
    );
  }

  function showNextImage() {
    if (!selectedProject) return;

    const images =
      getProjectImages(
        selectedProject
      );

    if (images.length <= 1) return;

    setSelectedImageIndex(
      (current) =>
        current === images.length - 1
          ? 0
          : current + 1
    );
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

      /*
       * Motion values pick up the current
       * in-progress value automatically, so
       * this smoothly retargets even if a
       * previous animation (open OR close) was
       * still mid-flight — no two-frame wait
       * needed like the old initial/animate
       * approach required.
       */
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
        animateArtworkRectTo(
          calculateTargetRect(
            image.naturalWidth,
            image.naturalHeight
          ),
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

      if (event.key === "ArrowLeft") {
        showPreviousImage();
        return;
      }

      if (event.key === "ArrowRight") {
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
        scale: 0.992,
        filter: "blur(12px)",
      }
      : {
        scale: 1,
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

        <div className="hidden w-full md:block">
          <div
            className="mx-auto grid box-border w-full"
            style={{
              maxWidth: "1920px",

              gridTemplateColumns:
                "repeat(5, 1fr)",

              gridAutoRows:
                "calc(min(100vw, 1920px) / 180)",

              borderTop:
                "1px solid #000",

              borderLeft:
                "1px solid #000",
            }}
          >
            {tiles.map((tile) => {
              const project =
                projects.find(
                  (item) =>
                    item.position ===
                    tile.position
                );

              const images = project
                ? getProjectImages(
                  project
                )
                : [];

              const image =
                images[0] || null;

              /*
               * Hide ONLY the original image
               * that is currently being animated.
               *
               * The tile itself stays WHITE.
               *
               * This prevents the black rectangle.
               */
              const isSelectedTile =
                (selectedProject?.id ===
                  project?.id &&
                  animationPhase !==
                  "closed") ||
                outgoingArtwork?.projectId ===
                project?.id;

              return (
                <div
                  key={tile.position}
                  className="relative overflow-hidden border-b border-r border-black bg-white"
                  style={{
                    gridColumn: tile.col,
                    gridRow: tile.row,
                  }}
                >
                  {project && image ? (
                    <button
                      type="button"
                      className="group absolute inset-0 block h-full w-full overflow-hidden bg-white"
                      onClick={(event) => {
                        const img =
                          event.currentTarget.querySelector(
                            "img"
                          );

                        if (!img) return;

                        openProject(
                          project,
                          img
                        );
                      }}
                    >
                      <motion.img
                        src={image}
                        alt={
                          project.name
                        }
                        ref={(el) => {
                          desktopTileRefs.current[
                            project.id
                          ] = el;
                        }}
                        animate={{
                          opacity:
                            isSelectedTile
                              ? 0
                              : 1,
                        }}
                        transition={{
                          duration: 0,
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                        draggable={false}
                      />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================
            MOBILE GRID
        ====================================================== */}

        <div className="block w-full md:hidden">
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns:
                "repeat(2, 1fr)",

              gridAutoRows:
                "calc(100vw / 20)",

              borderTop:
                "1px solid #000",

              borderLeft:
                "1px solid #000",
            }}
          >
            {projects.map(
              (project) => {
                const images =
                  getProjectImages(
                    project
                  );

                const image =
                  images[0] || null;

                if (!image) {
                  return null;
                }

                const isSelectedTile =
                  (selectedProject?.id ===
                    project.id &&
                    animationPhase !==
                    "closed") ||
                  outgoingArtwork?.projectId ===
                  project.id;

                return (
                  <div
                    key={project.id}
                    className="relative aspect-square overflow-hidden border-b border-r border-black"
                  >
                    <button
                      type="button"
                      className="group absolute inset-0 h-full w-full overflow-hidden bg-white"
                      onClick={(
                        event
                      ) => {
                        const img =
                          event.currentTarget.querySelector(
                            "img"
                          );

                        if (!img) return;

                        openProject(
                          project,
                          img
                        );
                      }}
                    >
                      <motion.img
                        src={image}
                        alt={
                          project.name
                        }
                        ref={(el) => {
                          mobileTileRefs.current[
                            project.id
                          ] = el;
                        }}
                        animate={{
                          opacity:
                            isSelectedTile
                              ? 0
                              : 1,
                        }}
                        transition={{
                          duration: 0,
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                        draggable={false}
                      />
                    </button>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          OUTGOING ARTWORK

          This exists only when the user clicks another tile while
          the previous artwork is still closing. It allows the old
          artwork to finish its close at the exact same time the
          new artwork begins opening.
      ======================================================== */}

      {outgoingArtwork && (
        <motion.div
          className="fixed z-[75] overflow-hidden"
          style={{
            left: outgoingLeft,
            top: outgoingTop,
            width: outgoingWidth,
            height: outgoingHeight,
            pointerEvents: "none",
          }}
        >
          <img
            src={outgoingArtwork.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-contain"
            draggable={false}
          />
        </motion.div>
      )}

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

                  Sits BELOW the static site header
                  (top-[76px], a few px clear of its
                  bottom border) and to the left.

                  Its own control row (close / share /
                  prev / next) lives INSIDE it, as the
                  first bordered section — it is not a
                  separate fixed header and never
                  overlaps the static site header.
              ================================================== */}

              <motion.aside
                className="fixed bottom-0 left-0 top-[76px] z-[100] w-[27vw] min-w-[280px] max-w-[520px] overflow-hidden border-r border-black bg-white"
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
                      onClick={async () => {
                        const shareData = {
                          title:
                            selectedProject.name,

                          text:
                            selectedProject.name,

                          url:
                            window.location.href,
                        };

                        try {
                          if (
                            navigator.share
                          ) {
                            await navigator.share(
                              shareData
                            );
                          } else {
                            await navigator.clipboard.writeText(
                              window.location.href
                            );
                          }
                        } catch {
                          /*
                           * User cancelled share.
                           */
                        }
                      }}
                      className="flex h-full w-[52px] shrink-0 items-center justify-center border-r border-black transition-opacity hover:opacity-50"
                    >
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
                    </button>

                    <div className="flex-1" />

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
                      {
                        selectedProject.client ||
                        "—"
                      }
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
                <AnimatePresence
                  mode="wait"
                  initial={false}
                >
                  {selectedImages[
                    selectedImageIndex
                  ] && (
                      <motion.img
                        key={
                          selectedImages[
                          selectedImageIndex
                          ]
                        }
                        src={
                          selectedImages[
                          selectedImageIndex
                          ]
                        }
                        alt={
                          selectedProject.name
                        }
                        className="absolute inset-0 h-full w-full select-none object-contain"
                        draggable={false}
                        initial={{
                          opacity: 0,
                        }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.3,
                          ease: EASE,
                        }}
                      />
                    )}
                </AnimatePresence>
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