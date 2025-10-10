import { LoginForm } from "../_components/login-form";

export default function Login() {
  return (
    <div className="border-border bg-card/95 w-full max-w-md rounded-3xl border shadow-lg backdrop-blur">
      {/* Header */}
      <div className="space-y-1 px-7 pt-8">
        <h1 className="text-3xl leading-tight font-bold">
          ¡Ya estás aquí!
          <br />
          Empecemos
        </h1>
        <p className="text-muted-foreground text-sm">Inicia sesión para unirte a tu equipo</p>
      </div>

      {/* Formulario */}
      <div className="space-y-5 px-7 pt-5 pb-8">
        <LoginForm />
      </div>
    </div>
  );
}
