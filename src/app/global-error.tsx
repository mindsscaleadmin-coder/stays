"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: "#f9fafb",
          color: "#111827",
        }}
      >
        <main
          style={{
            maxWidth: "42rem",
            margin: "0 auto",
            padding: "6rem 1rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            The application hit an unexpected error. Try again or reload the page.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: "0.75rem",
                padding: "0.625rem 1.5rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-block",
                background: "#15803d",
                color: "#fff",
                borderRadius: "0.75rem",
                padding: "0.625rem 1.5rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
