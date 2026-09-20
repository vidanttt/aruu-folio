"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user?.email) {
                setLoggedInEmail(user.email);
            }

            setCheckingSession(false);
        }

        checkSession();
    }, [supabase]);

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/admin");
        router.refresh();
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        setLoggedInEmail(null);
        setEmail("");
        setPassword("");
        router.refresh();
    }

    if (checkingSession) {
        return null;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-white text-black">
            <form
                onSubmit={handleLogin}
                className="flex w-full max-w-sm flex-col gap-4 p-8"
            >
                <h1 className="text-3xl font-bold">Admin Login</h1>

                {loggedInEmail && (
                    <div className="border border-black p-3">
                        <p className="text-sm">Logged in as</p>
                        <p className="font-medium">{loggedInEmail}</p>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="mt-3 underline"
                        >
                            Log out
                        </button>
                    </div>
                )}

                {!loggedInEmail && (
                    <>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border border-black p-3 outline-none"
                            required
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border border-black p-3 outline-none"
                            required
                        />

                        {error && <p className="text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-black p-3 text-white"
                        >
                            {loading ? "Logging in..." : "Log in"}
                        </button>
                    </>
                )}
            </form>
        </main>
    );
}