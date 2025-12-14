'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-900">500</h1>
        <p className="mt-4 text-xl text-gray-600">Something went wrong</p>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-8 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
