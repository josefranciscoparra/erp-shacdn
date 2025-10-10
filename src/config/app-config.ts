import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Timenow",
  version: packageJson.version,
  copyright: `© ${currentYear}, Timenow.`,
  meta: {
    title: "timenow - ERP Software",
    description:
      "Timenow es un sistema de gestión empresarial (ERP) moderno construido con Next.js 15, Tailwind CSS v4, y shadcn/ui. Gestión completa de recursos humanos, nóminas y control de tiempos.",
  },
};
