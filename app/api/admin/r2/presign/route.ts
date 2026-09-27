import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export async function POST(request: Request) {
    try {
        // Check Supabase session
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

        // Check admin/editor role
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

        // Read upload information
        const body = await request.json();

        const { path, contentType } = body;

        if (!path || typeof path !== "string") {
            return NextResponse.json(
                { error: "Missing file path" },
                { status: 400 }
            );
        }

        if (!contentType || typeof contentType !== "string") {
            return NextResponse.json(
                { error: "Missing content type" },
                { status: 400 }
            );
        }

        // Generate temporary R2 upload URL
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: path,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(r2, command, {
            expiresIn: 60 * 5,
        });

        return NextResponse.json({
            uploadUrl,
            publicUrl: `${R2_PUBLIC_URL}/${path}`,
            path,
        });
    } catch (error) {
        console.error("R2 presign error:", error);

        return NextResponse.json(
            { error: "Failed to create upload URL" },
            { status: 500 }
        );
    }
}