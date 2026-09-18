"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";

export default function Error({
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
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-bold font-display text-gray-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        We could not load this page. Try again or return to the home page.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-block bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-block bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
