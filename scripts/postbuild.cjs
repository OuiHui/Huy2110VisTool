#!/usr/bin/env node
const fs = require('fs');
const src = 'dist/index.html';
const dest = 'dist/404.html';
if (!fs.existsSync(src)) {
  console.error('[postbuild] dist/index.html not found; build may have failed');
  process.exit(1);
}
try {
  fs.copyFileSync(src, dest);
  console.log('[postbuild] Created dist/404.html');
} catch (e) {
  console.error('[postbuild] Failed to create 404.html:', e);
  process.exit(1);
}
