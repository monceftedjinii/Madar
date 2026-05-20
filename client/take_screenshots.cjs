const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT = path.join(process.env.HOME, 'Desktop', 'screenshoots');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const PWD = 'Demo1234!';

const ACCOUNTS = {
  grh:  { email: 'rh_senior@example.com',       password: PWD },
  chef: { email: 'abdelmonceftedjini@gmail.com', password: PWD },
  emp:  { email: 'sofiane.belkacem@madar.com',   password: PWD },
};

async function login(page, creds) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for React to hydrate and render the form
  await new Promise(r => setTimeout(r, 2000));
  await page.waitForSelector('input', { timeout: 15000 });
  const inputs = await page.$$('input');
  if (inputs.length < 2) return;
  await inputs[0].click({ clickCount: 3 }); await inputs[0].type(creds.email, { delay: 30 });
  await inputs[1].click({ clickCount: 3 }); await inputs[1].type(creds.password, { delay: 30 });
  await inputs[1].press('Enter');
  // Wait for redirect after login
  await new Promise(r => setTimeout(r, 3500));
}

async function shot(page, url, filename, waitMs = 1800) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, waitMs));
  await page.screenshot({ path: path.join(OUT, filename), fullPage: false, type: 'png' });
  console.log(`  ✓  ${filename}`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 },
  });

  async function newCtx(account) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await login(page, account);
    return { ctx, page };
  }

  // ── GRH ──
  console.log('\n── GRH (Direction RH) ──');
  { const { ctx, page: grh } = await newCtx(ACCOUNTS.grh);
    await shot(grh, '/home',           '01_GRH_Dashboard.png',         2200);
    await shot(grh, '/rh/employees',   '02_GRH_Gestion_Employes.png',  1800);
    await shot(grh, '/rh/services',    '03_GRH_Services_Postes.png',   1800);
    await shot(grh, '/rh/conges',      '04_GRH_Conges_RH.png',        1800);
    await shot(grh, '/rh/absences',    '05_GRH_Absences.png',         1800);
    await shot(grh, '/rh/evaluations', '06_GRH_Evaluations.png',      1800);
    await shot(grh, '/rh/reports',     '07_GRH_Rapports.png',         1800);
    await shot(grh, '/rh/formations',  '08_GRH_Formations.png',       1800);
    await shot(grh, '/notifications',  '09_GRH_Notifications.png',    1500);
    await ctx.close(); }

  // ── Employé ──
  console.log('\n── Employé (Sofiane Belkacem) ──');
  { const { ctx, page: emp } = await newCtx(ACCOUNTS.emp);
    await shot(emp, '/home',        '10_EMP_Dashboard.png',    2200);
    await shot(emp, '/attendance',  '11_EMP_Presence.png',     1800);
    await shot(emp, '/conge',       '12_EMP_Conges.png',       1800);
    await shot(emp, '/evaluations', '13_EMP_Evaluations.png',  1800);
    await shot(emp, '/profile',     '14_EMP_Profil.png',       1800);
    await ctx.close(); }

  // ── Chef ──
  console.log('\n── Chef de service (Abdelmoncef) ──');
  { const { ctx, page: chef } = await newCtx(ACCOUNTS.chef);
    await shot(chef, '/home',             '15_CHEF_Dashboard.png',         2200);
    await shot(chef, '/chef/attendance',  '16_CHEF_Presence_Equipe.png',   1800);
    await shot(chef, '/chef/leaves',      '17_CHEF_Validation_Conges.png', 1800);
    await shot(chef, '/chef/evaluations', '18_CHEF_Evaluations.png',       1800);
    await shot(chef, '/chef/tasks',       '19_CHEF_Taches.png',            1800);
    await ctx.close(); }

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅  ${files.length} screenshots saved to ~/Desktop/screenshoots/\n`);
  files.forEach(f => console.log(`   📸  ${f}`));
})();
