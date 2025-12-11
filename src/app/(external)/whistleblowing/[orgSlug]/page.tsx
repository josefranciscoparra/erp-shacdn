import Link from "next/link";
import { notFound } from "next/navigation";

import { FileText, Lock, Search, Shield, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationByPublicSlug } from "@/server/actions/whistleblowing";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function PublicWhistleblowingPortalPage({ params }: PageProps) {
  const { orgSlug } = await params;

  const result = await getOrganizationByPublicSlug(orgSlug);

  if (!result.success || !result.organization) {
    notFound();
  }

  const { organization } = result;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Shield className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Canal de Denuncias</h1>
          <p className="text-muted-foreground mt-2">{organization.name}</p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Canal Interno de Información</CardTitle>
            <CardDescription>
              En cumplimiento de la Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que
              informen sobre infracciones normativas y de lucha contra la corrupción.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                  <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Confidencialidad</p>
                  <p className="text-muted-foreground text-xs">Tu identidad está protegida por la ley</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                  <UserX className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Anonimato Opcional</p>
                  <p className="text-muted-foreground text-xs">Puedes enviar tu denuncia de forma anónima</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Protección Legal</p>
                  <p className="text-muted-foreground text-xs">Garantizada protección contra represalias</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Seguimiento</p>
                  <p className="text-muted-foreground text-xs">Consulta el estado de tu denuncia</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <Button size="lg" className="w-full" asChild>
                <Link href={`/whistleblowing/${orgSlug}/new`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Presentar una denuncia
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link href={`/whistleblowing/${orgSlug}/track`}>
                  <Search className="mr-2 h-4 w-4" />
                  Consultar estado de denuncia
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Notice */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-muted-foreground text-center text-xs">
              Este canal está gestionado de acuerdo con la Ley 2/2023 y el Reglamento (UE) 2019/1937. Los datos
              personales se tratarán conforme al RGPD y la LOPDGDD. La organización garantiza la protección del
              informante frente a cualquier tipo de represalia.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
