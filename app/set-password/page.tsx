"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
    const supabase = createClient();
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const { error } = await supabase.auth.updateUser({
            password,
        });

        if (error) {
            setMessage(error.message);
            return;
        }

        setMessage("Password set successfully!");

        setTimeout(() => {
            router.push("/admin");
            router.refresh();
        }, 1000);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-white text-black">
            <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 p-8">
                <h1 className="text-3xl font-bold">Set Password</h1>

                <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-black p-3"
                    minLength={8}
                    required
                />

                <button
                    type="submit"
                    className="bg-black p-3 text-white"
                >
                    Set Password
                </button>

                {message && <p>{message}</p>}
            </form>
        </main>
    );
}