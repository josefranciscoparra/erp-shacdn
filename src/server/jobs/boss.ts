import { PgBoss } from "pg-boss";

let bossInstance: PgBoss | null = null;
let bossStartPromise: Promise<PgBoss> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está configurada para el sistema de jobs");
  }
  return databaseUrl;
}

function resolveBossSchema() {
  const schema = process.env.PG_BOSS_SCHEMA;
  return schema ?? "pgboss";
}

export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) return bossInstance;

  if (!bossStartPromise) {
    const databaseUrl = getDatabaseUrl();
    const schema = resolveBossSchema();

    bossStartPromise = (async () => {
      const boss = new PgBoss({
        connectionString: databaseUrl,
        schema,
        application_name: "timenow-jobs",
      });

      boss.on("error", (error) => {
        console.error("[pg-boss] Error:", error);
      });

      await boss.start();
      bossInstance = boss;
      return boss;
    })();
  }

  return bossStartPromise;
}

export async function stopBoss() {
  if (!bossInstance) return;
  await bossInstance.stop();
  bossInstance = null;
  bossStartPromise = null;
}
