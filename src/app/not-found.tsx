import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">Página no encontrada</h1>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          La página que buscas no existe o puede haber sido movida.
        </p>
      </div>
      <Link
        href="/dashboard/me"
        className="border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
