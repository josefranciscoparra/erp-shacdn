import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Timenow",
  version: packageJson.version,
  copyright: `© ${currentYear}, Timenow.`,
  meta: {
    title: "Timenow | Software ERP para Empresas",
    description:
      "Solución ERP completa para optimizar tu negocio. Gestión de recursos humanos, nóminas, control horario y más.",
  },
};
