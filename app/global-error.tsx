'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong!</h2>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}