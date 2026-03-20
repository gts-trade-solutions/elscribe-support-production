/*
 * Worker process entrypoint (BullMQ/Redis comes in later parts).
 * For Part 1 we just boot the process cleanly and keep it running.
 */

const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

console.log("> Worker started (Part 1 scaffold)");

// Keep the process alive so PM2 can manage it.
const keepAlive = setInterval(() => {}, 30_000);

async function shutdown(signal) {
  console.log(`\n> ${signal} received. Shutting down worker...`);
  clearInterval(keepAlive);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
