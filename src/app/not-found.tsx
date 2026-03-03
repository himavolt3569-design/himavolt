import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 mb-6">
        <span className="text-4xl font-black text-gray-300">404</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-[#0F1219] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-95"
      >
        Go Home
      </Link>
    </div>
  );
}
