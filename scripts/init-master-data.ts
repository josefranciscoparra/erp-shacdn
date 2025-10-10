/**
 * Script maestro para inicializar TODOS los datos base del sistema
 * Ejecutar con: npm run init:master
 *
 * ORDEN DE EJECUCIÓN:
 * 1. Organización por defecto
 * 2. Super Admin
 * 3. Tipos de ausencia
 * 4. Niveles de posición
 */

import { execSync } from "child_process";

const scripts = [
  {
    name: "Organización y Centro de Coste",
    path: "scripts/init-default-org.ts",
  },
  {
    name: "Super Admin",
    path: "scripts/init-super-admin.ts",
  },
  {
    name: "Tipos de Ausencia",
    path: "scripts/init-absence-types.ts",
  },
  {
    name: "Niveles de Posición",
    path: "scripts/seed-position-levels.ts",
  },
];

async function main() {
  console.log("🚀 Inicializando datos maestros del sistema...\n");
  console.log("━".repeat(60));
  console.log("\n");

  let completed = 0;
  let failed = 0;

  for (const script of scripts) {
    console.log(`📦 ${script.name}`);
    console.log(`   Ejecutando: ${script.path}\n`);

    try {
      execSync(`npx tsx ${script.path}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      completed++;
      console.log("\n");
    } catch (error) {
      console.error(`❌ Error ejecutando ${script.name}`);
      failed++;
      console.log("\n");
    }

    console.log("━".repeat(60));
    console.log("\n");
  }

  // Resumen final
  console.log("📊 RESUMEN DE INICIALIZACIÓN\n");
  console.log(`   ✅ Completados: ${completed}/${scripts.length}`);
  console.log(`   ❌ Fallidos: ${failed}/${scripts.length}`);

  if (failed === 0) {
    console.log("\n🎉 ¡Sistema inicializado correctamente!");
    console.log("\n📝 Credenciales de acceso:");
    console.log("   Email: superadmin@system.com");
    console.log("   Password: Admin123!");
    console.log("\n⚠️  IMPORTANTE: Cambiar la contraseña en el primer login");
  } else {
    console.log("\n⚠️  Algunos scripts fallaron. Revisa los errores arriba.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});
