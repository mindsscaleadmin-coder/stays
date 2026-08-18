import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.join(process.cwd(), ".data", "postgres");
const PORT = Number(process.env.LOCAL_PG_PORT || 5432);
const USER = "farmstays";
const PASSWORD = "farmstays";
const DATABASE = "farmstays";

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (await portOpen(PORT)) {
    console.log(`Postgres already listening on ${PORT}`);
    process.exit(0);
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const pidFile = path.join(DATA_DIR, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    authMethod: "password",
    onLog: (message) => process.stdout.write(String(message)),
    onError: (message) => console.error(message),
  });

  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("Initializing local Postgres cluster...");
    await pg.initialise();
  }

  console.log("Starting local Postgres...");
  await pg.start();

  try {
    await pg.createDatabase(DATABASE);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      console.log(`createDatabase: ${message}`);
    }
  }

  console.log(
    `Local Postgres ready at postgresql://${USER}@localhost:${PORT}/${DATABASE}`
  );

  const keepAlive = setInterval(() => undefined, 1 << 30);
  const shutdown = async () => {
    clearInterval(keepAlive);
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
