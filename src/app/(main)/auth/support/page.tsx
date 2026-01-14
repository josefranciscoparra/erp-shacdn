"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Status = "idle" | "loading" | "success" | "error";

export default function SupportLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("Validando token de soporte...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Token invalido o ausente.");
      return;
    }

    const run = async () => {
      setStatus("loading");
      const result = await signIn("support-token", {
        token,
        redirect: false,
      });

      if (result?.error) {
        setStatus("error");
        setMessage("El token es invalido o ha expirado.");
        return;
      }

      setStatus("success");
      setMessage("Acceso de soporte verificado. Redirigiendo...");
      router.push("/dashboard");
      router.refresh();
    };

    void run();
  }, [router, searchParams]);

  return (
    <Card className="border-border bg-card/95 w-full max-w-md rounded-3xl border p-8 shadow-lg backdrop-blur">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {status === "success" ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : status === "error" ? (
            <ShieldAlert className="text-destructive h-6 w-6" />
          ) : (
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          )}
          <h1 className="text-2xl font-bold">Acceso de soporte</h1>
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>

      {status === "error" && (
        <div className="mt-6">
          <Button asChild className="w-full">
            <Link href="/auth/login">Volver al login</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
