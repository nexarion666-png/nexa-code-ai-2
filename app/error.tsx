"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-ink"><div className="max-w-md rounded-3xl border border-line bg-panel p-7 text-center"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm text-muted">Nexa Code AI could not load this view.</p><button onClick={() => reset()} className="mt-5 min-h-11 rounded-xl bg-white px-5 text-sm font-semibold text-black">Try again</button></div></main>;
}
