import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl font-bold font-display text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-6">This page could not be found.</p>
      <Link
        href="/"
        className="inline-block bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
