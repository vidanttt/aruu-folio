import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!role || !["admin", "editor"].includes(role.role)) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const body = await request.json();

        const paths = Array.isArray(body?.paths)
            ? body.paths.filter(
                (path: unknown): path is string =>
                    typeof path === "string" && path.length > 0
            )
            : [];

        if (paths.length === 0) {
            return NextResponse.json({ deleted: 0 });
        }

        // Delete from R2
        for (const path of paths) {
            await r2.send(
                new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: path,
                })
            );
        }

        // Also clean up legacy Supabase Storage.
        const { error: supabaseStorageError } = await supabase.storage
            .from("aruu")
            .remove(paths);

        if (supabaseStorageError) {
            throw new Error(
                `Supabase Storage cleanup failed: ${supabaseStorageError.message}`
            );
        }

        return NextResponse.json({
            deleted: paths.length,
        });
    } catch (error) {
        console.error("R2/storage delete error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to delete media.",
            },
            { status: 500 }
        );
    }
}