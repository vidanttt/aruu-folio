import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function GET() {
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

        let totalBytes = 0;
        let continuationToken: string | undefined;

        do {
            const response = await r2.send(
                new ListObjectsV2Command({
                    Bucket: R2_BUCKET,
                    ContinuationToken: continuationToken,
                })
            );

            for (const object of response.Contents ?? []) {
                totalBytes += object.Size ?? 0;
            }

            continuationToken = response.IsTruncated
                ? response.NextContinuationToken
                : undefined;
        } while (continuationToken);

        return NextResponse.json({
            bytes: totalBytes,
        });
    } catch (error) {
        console.error("R2 usage error:", error);

        return NextResponse.json(
            { error: "Failed to calculate R2 storage usage." },
            { status: 500 }
        );
    }
}