const fs = require('fs');
const path = require('path');

try {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  if (fs.existsSync(standaloneDir)) {
    const srcStatic = path.join(__dirname, '..', '.next', 'static');
    const destStatic = path.join(standaloneDir, '.next', 'static');
    const srcPublic = path.join(__dirname, '..', 'public');
    const destPublic = path.join(standaloneDir, 'public');

    if (fs.existsSync(srcStatic)) {
      fs.cpSync(srcStatic, destStatic, { recursive: true, force: true });
    }
    if (fs.existsSync(srcPublic)) {
      fs.cpSync(srcPublic, destPublic, { recursive: true, force: true });
    }
    console.log('[copy_standalone] Successfully synced standalone static assets.');
  } else {
    console.log('[copy_standalone] Standalone build directory not present, skipped.');
  }
} catch (e) {
  console.warn('[copy_standalone] Warning copying standalone assets:', e.message);
}
