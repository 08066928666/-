#!/usr/bin/env node
/** Generate PWA PNG icons from SVG placeholder (simple orange squares with emoji text via canvas alternative) */
const fs = require("fs");
const path = require("path");

// Minimal valid PNG (1x1 orange) as fallback - browsers accept; real deploy can replace with designed icons
// We write a simple 192/512 solid color PNG using raw PNG structure
function createSolidPng(size, r, g, b) {
  const { createHash } = require("crypto");
  // Use sharp if available, else write SVG-based approach
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="rgb(${r},${g},${b})"/>
    <text x="50%" y="54%" font-size="${size * 0.45}" text-anchor="middle" dominant-baseline="middle">🏷️</text>
  </svg>`;
  return svg;
}

const publicDir = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(publicDir, "icon.svg"), createSolidPng(512, 249, 115, 22));
console.log("icon.svg updated");

// For PNG, copy SVG as icon reference - manifest needs PNG; create via simple base64 minimal PNGs
// 192x192 orange PNG (pre-encoded minimal - use online tool in prod)
const png192 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAATElEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFLz0k0AAAAAElFTkSuQmCC",
  "base64"
);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png192);
console.log("PWA icons generated");
