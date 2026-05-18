const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'prerendered');
const dest = path.join(__dirname, '..', 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${destPath}`);
    }
  }
}

copyDir(src, dest);
console.log('✓ Prerendered HTML files copied to dist/');
