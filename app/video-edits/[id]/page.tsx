import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileVideoEditProject from "./MobileDesignProject";

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
    thumbnail_url: string | null;
    description: string | null;
    published: boolean;
    position: number;
};

export default async function VideoEditProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const projectId = Number(id);
    if (!Number.isInteger(projectId)) notFound();

    const supabase = await createClient();

    const [{ data, error }, { data: navigationProjects, error: navigationError }] =
        await Promise.all([
            supabase
                .from("projects")
                .select(
                    "id, name, skill, kind, softwares, client, client_url, project_date, category, thumbnail_url, description, published, position"
                )
                .eq("id", projectId)
                .eq("category", "video-edit")
                .eq("published", true)
                .maybeSingle(),

            supabase
                .from("projects")
                .select("id, position")
                .eq("category", "video-edit")
                .eq("published", true)
                .order("position", { ascending: true }),
        ]);

    if (error || navigationError || !data) notFound();

    const project = data as Project;

    if (!project.thumbnail_url) notFound();

    const orderedNavigationProjects =
        (navigationProjects ?? []) as { id: number; position: number }[];

    const currentIndex = orderedNavigationProjects.findIndex(
        (item) => item.id === project.id
    );

    if (currentIndex < 0) notFound();

    const previousProjectId =
        orderedNavigationProjects.length > 1
            ? orderedNavigationProjects[
                (currentIndex - 1 + orderedNavigationProjects.length) %
                orderedNavigationProjects.length
            ].id
            : null;

    const nextProjectId =
        orderedNavigationProjects.length > 1
            ? orderedNavigationProjects[
                (currentIndex + 1) % orderedNavigationProjects.length
            ].id
            : null;

    return (
        <MobileVideoEditProject
            project={project}
            thumbnail={project.thumbnail_url}
            projectNumber={currentIndex + 1}
            projectCount={orderedNavigationProjects.length}
            previousProjectId={previousProjectId}
            nextProjectId={nextProjectId}
        />
    );
}