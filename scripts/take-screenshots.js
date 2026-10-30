const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\herna\\.gemini\\antigravity\\brain\\a710839d-ec15-4018-9199-b54389a2fe6c\\screenshots';

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  console.log('1. Capturando Home Desktop...');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUT_DIR, '01-home-desktop.png'), fullPage: false });

  console.log('2. Capturando Home Mobile (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUT_DIR, '02-home-mobile.png'), fullPage: true });

  console.log('3. Consultando Patente en Home Mobile...');
  const inputSelector = 'input[type="text"]';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'AE123CD');
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, '03-home-search-result-mobile.png'), fullPage: true });

  console.log('4. Capturando Ticket /v/{token} Mobile (390px)...');
  await page.goto('http://localhost:3000/v/demo-token-amarok-ae123cd-el32', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, '04-ticket-mobile.png'), fullPage: true });

  console.log('5. Capturando Ticket /v/{token} Desktop...');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/v/demo-token-amarok-ae123cd-el32', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, '05-ticket-desktop.png'), fullPage: false });

  console.log('6. Login Admin...');
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admin@taller32.local');
  await page.type('input[type="password"]', 'Taller32Admin!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('7. Capturando Formulario Nuevo Servicio Mobile (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  // Navegar a nuevo servicio
  await page.goto('http://localhost:3000/admin/services/new', { waitUntil: 'networkidle2' });
  // Si muestra selector de vehículo, elegimos el primero
  const chooseBtn = await page.$('a[href*="/admin/services/new?vehicle_id="]');
  if (chooseBtn) {
    await chooseBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  }
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT_DIR, '06-new-service-mobile.png'), fullPage: true });

  console.log('8. Capturando Ficha del Vehículo y Modal Sticker QR...');
  await page.setViewport({ width: 1024, height: 800 });
  await page.goto('http://localhost:3000/admin/vehicles', { waitUntil: 'networkidle2' });
  // Buscar un vehículo activo (como AE123CD)
  await page.type('input[placeholder*="Buscar"]', 'AE123CD');
  await new Promise((r) => setTimeout(r, 600));
  const fichaLink = await page.$('a[href*="/admin/vehicles/"]');
  if (fichaLink) {
    await fichaLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    // Clic en Imprimir Sticker
    const printBtn = await page.$('button ::-p-text(Imprimir Sticker)');
    if (printBtn) {
      await printBtn.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
    await page.screenshot({ path: path.join(OUT_DIR, '07-vehicle-sticker-modal.png'), fullPage: false });
  }

  await browser.close();
  console.log('✨ Screenshots capturados exitosamente en:', OUT_DIR);
}

run().catch((err) => {
  console.error('Error al capturar screenshots:', err);
  process.exit(1);
});
