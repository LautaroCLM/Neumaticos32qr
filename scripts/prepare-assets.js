const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const src = path.resolve('IMG/logo.png');
  const pubDir = path.resolve('public');

  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }

  // 1. Copiar logo.png a public/
  fs.copyFileSync(src, path.join(pubDir, 'logo.png'));
  console.log('✔ Copiado IMG/logo.png a public/logo.png');

  // 2. Optimizar a WebP
  await sharp(src)
    .webp({ quality: 90 })
    .toFile(path.join(pubDir, 'logo.webp'));
  console.log('✔ Generado public/logo.webp');

  // 3. Generar icon-192.png
  await sharp(src)
    .resize(192, 192, { fit: 'contain', background: { r: 10, g: 11, b: 13, alpha: 0 } })
    .png()
    .toFile(path.join(pubDir, 'icon-192.png'));
  console.log('✔ Generado public/icon-192.png');

  // 4. Generar icon-512.png
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: { r: 10, g: 11, b: 13, alpha: 0 } })
    .png()
    .toFile(path.join(pubDir, 'icon-512.png'));
  console.log('✔ Generado public/icon-512.png');

  // 5. Generar favicon.png (32x32) y favicon.ico
  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(pubDir, 'favicon.png'));
  
  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('png')
    .toFile(path.join(pubDir, 'favicon.ico'));
  console.log('✔ Generado public/favicon.ico y favicon.png');
}

main().catch(console.error);
