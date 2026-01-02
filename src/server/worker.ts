import { getBoss, stopBoss } from "@/server/jobs/boss";
import { registerEmployeeImportInviteWorker } from "@/server/jobs/employee-import-invite-worker";
import { registerEmployeeImportSimulationWorker } from "@/server/jobs/employee-import-simulate-worker";
import { registerEmployeeImportWorker } from "@/server/jobs/employee-import-worker";
import { registerPayslipWorker } from "@/server/jobs/payslip-worker";
import { registerSignatureBatchWorker } from "@/server/jobs/signature-batch-worker";

async function startWorker() {
  const boss = await getBoss();
  await registerEmployeeImportWorker(boss);
  await registerEmployeeImportInviteWorker(boss);
  await registerEmployeeImportSimulationWorker(boss);
  await registerPayslipWorker(boss);
  await registerSignatureBatchWorker(boss);
  console.log("[Worker] Job runner iniciado");
}

async function shutdown() {
  try {
    await stopBoss();
  } catch (error) {
    console.error("[Worker] Error cerrando pg-boss:", error);
  }
}

process.on("SIGTERM", async () => {
  console.log("[Worker] Recibido SIGTERM, cerrando...");
  await shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Recibido SIGINT, cerrando...");
  await shutdown();
  process.exit(0);
});

startWorker().catch((error) => {
  console.error("[Worker] Error al iniciar:", error);
  process.exit(1);
});
