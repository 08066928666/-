#!/usr/bin/env node
/**
 * Ensures .env and SQLite database exist before starting the dev server.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");
const dbPath = path.join(root, "dev.db");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

if (!fs.existsSync(envPath)) {
  console.log("Creating .env from .env.example ...");
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  } else {
    fs.writeFileSync(
      envPath,
      'DATABASE_URL="file:./dev.db"\nJWT_SECRET="tokubai-hub-dev-secret"\n'
    );
  }
}

if (!fs.existsSync(dbPath)) {
  console.log("Database not found. Running setup ...");
  try {
    run("npx prisma migrate deploy");
    run("npm run db:seed");
    console.log("Database setup complete.");
  } catch (e) {
    console.error("\nSetup failed. Try manually:");
    console.error("  cd tokubai-hub");
    console.error("  npm install");
    console.error("  npm run db:setup");
    console.error("  npm run dev\n");
    process.exit(1);
  }
} else {
  console.log("Database OK:", dbPath);
}

console.log("\nStarting Tokubai Hub ...");
console.log("Open: http://localhost:3000\n");
