import { prisma } from "@/lib/prisma";

/**
 * Categorías predeterminadas para el Canal de Denuncias
 *
 * Basadas en la Ley 2/2023 de protección al informante y mejores prácticas PYMES.
 * Estas categorías se crean automáticamente al crear una nueva organización.
 */
export const DEFAULT_WHISTLEBLOWING_CATEGORIES = [
  {
    name: "Acoso y Discriminación",
    description:
      "Acoso sexual, laboral, por razón de sexo, raza, edad, discapacidad u otras circunstancias personales o sociales.",
    requiresEvidence: false,
    order: 1,
  },
  {
    name: "Corrupción, Fraude y Uso Indebido de Recursos",
    description:
      "Sobornos, malversación de fondos, manipulaciones contables, comisiones ilegales, conflictos de interés.",
    requiresEvidence: false,
    order: 2,
  },
  {
    name: "Prácticas Laborales Irregulares",
    description: "Irregularidades en fichajes, contratos, horas extra, nóminas, clasificación profesional.",
    requiresEvidence: false,
    order: 3,
  },
  {
    name: "Protección de Datos y Seguridad de la Información",
    description:
      "Brechas de seguridad, accesos indebidos a información confidencial, uso no autorizado de datos personales.",
    requiresEvidence: false,
    order: 4,
  },
  {
    name: "Salud y Seguridad en el Trabajo",
    description:
      "Condiciones de trabajo peligrosas, riesgos no evaluados, incumplimientos de Prevención de Riesgos Laborales.",
    requiresEvidence: false,
    order: 5,
  },
  {
    name: "Incumplimiento de Normativa o Políticas Internas",
    description: "Violaciones del código ético, incumplimiento de leyes aplicables, políticas internas no respetadas.",
    requiresEvidence: false,
    order: 6,
  },
  {
    name: "Otras Irregularidades",
    description: "Cualquier otra conducta irregular que no encaje en las categorías anteriores.",
    requiresEvidence: false,
    order: 7,
  },
] as const;

/**
 * Crea las categorías de whistleblowing predeterminadas para una organización.
 * Se usa automáticamente al crear una nueva organización.
 *
 * @param orgId - ID de la organización
 * @returns Número de categorías creadas
 */
export async function createDefaultWhistleblowingCategories(orgId: string): Promise<number> {
  const categories = DEFAULT_WHISTLEBLOWING_CATEGORIES.map((cat) => ({
    ...cat,
    orgId,
    active: true,
  }));

  const result = await prisma.whistleblowingCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Verifica si una organización tiene categorías de whistleblowing configuradas.
 *
 * @param orgId - ID de la organización
 * @returns true si tiene al menos una categoría
 */
export async function hasWhistleblowingCategories(orgId: string): Promise<boolean> {
  const count = await prisma.whistleblowingCategory.count({
    where: { orgId },
  });
  return count > 0;
}

/**
 * Seed de categorías para organizaciones existentes que no tengan ninguna.
 * Útil para migraciones o para asegurar que todas las orgs tienen categorías.
 *
 * @returns Objeto con estadísticas del seed
 */
export async function seedWhistleblowingCategoriesForAllOrgs(): Promise<{
  orgsProcessed: number;
  orgsWithNewCategories: number;
  totalCategoriesCreated: number;
}> {
  // Obtener todas las organizaciones
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  let orgsWithNewCategories = 0;
  let totalCategoriesCreated = 0;

  for (const org of orgs) {
    const hasCategories = await hasWhistleblowingCategories(org.id);

    if (!hasCategories) {
      const count = await createDefaultWhistleblowingCategories(org.id);
      orgsWithNewCategories++;
      totalCategoriesCreated += count;
      console.log(`✓ Creadas ${count} categorías para: ${org.name}`);
    } else {
      console.log(`- ${org.name} ya tiene categorías, omitiendo`);
    }
  }

  return {
    orgsProcessed: orgs.length,
    orgsWithNewCategories,
    totalCategoriesCreated,
  };
}
