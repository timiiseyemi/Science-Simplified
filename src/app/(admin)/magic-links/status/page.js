"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MagicLinkStatusPage() {
    const params = useSearchParams();
    const status = params.get("status");
    const message = params.get("message");

    const [count, setCount] = useState(3);

    useEffect(() => {
        if (status === "success") {
            const interval = setInterval(() => {
                setCount((c) => c - 1);
            }, 1000);

            setTimeout(() => {
                window.location.href = "/";
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [status]);

    return (
        <div style={{ padding: 40, textAlign: "center" }}>
            {status === "loading" && <h2>Verifying your login…</h2>}

            {status === "success" && (
                <>
                    <h2>Login successful!</h2>
                    <p>Redirecting in {count}...</p>
                </>
            )}

            {status === "error" && (
                <>
                    <h2>Invalid Link</h2>
                    <p>{message || "This magic link is not valid."}</p>
                </>
            )}

            {status === "expired" && (
                <>
                    <h2>Magic link expired</h2>
                    <p>Please request a new login link.</p>
                </>
            )}
        </div>
    );
}
