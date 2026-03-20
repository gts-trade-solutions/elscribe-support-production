// server.js
const http = require("http");
const next = require("next");

// Load env (optional if you're already using dotenvx; safe to keep)
try {
  require("dotenv").config({ path: ".env.local" });
  require("dotenv").config({ path: ".env" });
} catch {}

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// IMPORTANT: dev must be true unless NODE_ENV === 'production'
const dev =
  String(process.env.NODE_ENV || "development").toLowerCase() !== "production";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));

  // Attach Socket.IO (Part 1 scaffold)
  let io = null;
  try {
    const { createSocketServer } = require("./server/socket");
    io = createSocketServer(server, { dev });
    // Allow API routes to emit realtime events so REST fallback still updates peers.
    globalThis.__fixmate_io = io;
  } catch (e) {
    console.warn("[socket] not attached:", e?.message || e);
  }

  server.listen(port, hostname, () => {
    console.log(
      `> Server ready on ${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `http://${hostname}:${port}`}`,
    );
    console.log(
      `> Server running on port ${port}`,
    );
    console.log(
      `> Mode: ${dev ? "development" : "production"} (NODE_ENV=${process.env.NODE_ENV})`,
    );
  });

  // Graceful shutdown (fixes Ctrl+C hang)
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`> ${signal} received. Shutting down...`);

    try {
      if (io) io.close();
    } catch {}

    await new Promise((resolve) => {
      server.close(() => resolve());
      // Force-exit if something refuses to close
      setTimeout(resolve, 2000).unref();
    });

    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
