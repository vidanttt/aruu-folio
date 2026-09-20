"use client";

import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: number;
  name: string;
  category: string;
  aspect_ratio: string;
  position: number;
  thumbnail_url: string | null;
  published: boolean;
};

export default function VideoEditsPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * Exact existing layout.
   *
   * Position mapping:
   *
   *  0 ┌─────┬──────────┬──────────┐
   *    │  0  │     1    │    2     │
   *    │     │          │          │
   *    ├─────┤────┬─────┤          │
   *    │  3  │  4 │  5  │    2     │
   *    │     │    │     │          │
   *    │     │    │     │          │
   *    └─────┴────┴─────┴──────────┘
   *
   * These positions correspond to the original grid.
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

  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, category, aspect_ratio, position, thumbnail_url, published"
        )
        .eq("category", "video-edit")
        .eq("published", true)
        .order("position", { ascending: true });

      if (error) {
        console.error("Failed to load projects:", error);
        setProjects([]);
      } else {
        setProjects(data || []);
      }

      setLoading(false);
    }

    loadProjects();
  }, []);

  function getProject(position: number) {
    return projects.find(
      (project) => project.position === position
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-between bg-background">
      <div className="w-full flex-1">
        {/* ── Mobile ── */}
        <div className="flex flex-col gap-px bg-foreground md:hidden">
          {mobileRatios.map((ratio, index) => {
            const project = getProject(index);

            return (
              <div
                key={index}
                className="relative w-full overflow-hidden bg-background"
                style={{ aspectRatio: ratio }}
              >
                {project?.thumbnail_url && (
                  <video
                    src={project.thumbnail_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Desktop: exact existing 5-column grid ── */}
        <div
          className="mx-auto hidden w-full max-w-[1920px] md:grid"
          style={{
            gridTemplateColumns: "repeat(5, 1fr)",
            gridAutoRows:
              "calc(min(100vw, 1920px) / 180)",
            gap: "1px",
            backgroundColor: "var(--foreground)",
          }}
        >
          {tiles.map((tile) => {
            const project = getProject(tile.position);

            return (
              <div
                key={tile.position}
                className="relative overflow-hidden bg-background"
                style={{
                  gridColumn: tile.col,
                  gridRow: tile.row,
                }}
              >
                {project?.thumbnail_url && (
                  <video
                    src={project.thumbnail_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto w-full max-w-[1920px]">
        <Footer borderTop={false} />
      </div>
    </div>
  );
}