#!/usr/bin/env node
/**
 * Poll localhost:3000 until the dev server responds, then open the default browser.
 */
const http = require("http");
const { exec } = require("child_process");

const URL = process.env.TOKUBAI_URL || "http://localhost:3000";
const MAX_WAIT_MS = Number(process.env.TOKUBAI_WAIT_MS || 180000);
const INTERVAL_MS = 1000;

function openBrowser(target) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${target}"`
      : process.platform === "darwin"
        ? `open "${target}"`
        : `xdg-open "${target}"`;

  exec(cmd, { shell: process.platform === "win32" }, (err) => {
    if (err) {
      console.error("Could not open browser. Open manually:", target);
      process.exit(1);
    }
  });
}

function probe() {
  return new Promise((resolve) => {
    const req = http.get(URL, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

(async () => {
  const started = Date.now();
  process.stdout.write(`Waiting for ${URL}`);

  while (Date.now() - started < MAX_WAIT_MS) {
    if (await probe()) {
      console.log("\nServer ready. Opening browser...");
      openBrowser(URL);
      return;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  console.error(`\nTimeout after ${MAX_WAIT_MS / 1000}s. Open manually: ${URL}`);
  process.exit(1);
})();
