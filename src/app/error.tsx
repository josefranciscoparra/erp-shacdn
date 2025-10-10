"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Algo salió mal</h1>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.
        </p>
      </div>
      <button
        onClick={reset}
        className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
