import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileDesignProject from "./MobileDesignProject";

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
    image_urls: string[] | null;
    thumbnail_url: string | null;
    description: string | null;
    published: boolean;
    position: number;
};

export default async function DesignProjectPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ img?: string }>;
}) {
    const { id } = await params;
    const { img } = await searchParams;

    const projectId = Number(id);
    if (!Number.isInteger(projectId)) notFound();

    const supabase = await createClient();

    const [{ data, error }, { data: navigationProjects, error: navigationError }] =
        await Promise.all([
            supabase
                .from("projects")
                .select(
                    "id, name, skill, kind, softwares, client, client_url, project_date, category, image_urls, thumbnail_url, description, published, position"
                )
                .eq("id", projectId)
                .eq("category", "design")
                .eq("published", true)
                .maybeSingle(),

            supabase
                .from("projects")
                .select("id, position")
                .eq("category", "design")
                .eq("published", true)
                .order("position", { ascending: true }),
        ]);

    if (error || navigationError || !data) notFound();

    const project = data as Project;

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

    const images =
        project.image_urls &&
            Array.isArray(project.image_urls) &&
            project.image_urls.length > 0
            ? project.image_urls
            : project.thumbnail_url
                ? [project.thumbnail_url]
                : [];

    if (images.length === 0) notFound();

    const requestedIndex = img ? Number(img) - 1 : 0;
    const initialImageIndex =
        Number.isInteger(requestedIndex) &&
            requestedIndex >= 0 &&
            requestedIndex < images.length
            ? requestedIndex
            : 0;

    return (
        <MobileDesignProject
            project={project}
            images={images}
            initialImageIndex={initialImageIndex}
            projectNumber={currentIndex + 1}
            projectCount={orderedNavigationProjects.length}
            previousProjectId={previousProjectId}
            nextProjectId={nextProjectId}
        />
    );
}
