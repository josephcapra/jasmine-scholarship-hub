const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'https://paradiserealtyfla.app/jasmine/';
const SCREENSHOT_DIR = '/tmp/jasmine-screenshots';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function test() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  const results = [];

  try {
    // Test 1: Load main page
    console.log('Testing: Main page load...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png` });
    results.push({ test: 'Main page load', status: 'PASS' });

    // Test 2: Check login screen exists
    const loginScreen = await page.$('#login-screen');
    results.push({ test: 'Login screen present', status: loginScreen ? 'PASS' : 'FAIL' });

    // Test 3: Load with preview mode
    console.log('Testing: Parent preview mode...');
    await page.goto(`${BASE_URL}?preview=parent`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-preview-mode.png` });

    const previewBanner = await page.$('#preview-banner');
    results.push({ test: 'Preview mode banner', status: previewBanner ? 'PASS' : 'FAIL' });

    // Test 4: Check tabs exist
    const tabs = await page.$$('.nav-tab');
    results.push({ test: `Navigation tabs (${tabs.length} found)`, status: tabs.length >= 6 ? 'PASS' : 'FAIL' });

    // Test 5: Click Profile tab
    console.log('Testing: Profile tab...');
    const profileTab = await page.$('[data-section="profile"]');
    if (profileTab) {
      await profileTab.click();
      await delay(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-profile-tab.png` });
      results.push({ test: 'Profile tab click', status: 'PASS' });
    } else {
      results.push({ test: 'Profile tab click', status: 'FAIL - not found' });
    }

    // Test 6: Click Scholarships tab
    console.log('Testing: Scholarships tab...');
    const scholarshipsTab = await page.$('[data-section="scholarships"]');
    if (scholarshipsTab) {
      await scholarshipsTab.click();
      await delay(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-scholarships-tab.png` });
      results.push({ test: 'Scholarships tab click', status: 'PASS' });
    }

    // Test 7: Check Find Scholarships button
    const findBtn = await page.$('button[onclick*="ScholarshipSearch"]');
    results.push({ test: 'Find Scholarships button', status: findBtn ? 'PASS' : 'FAIL' });

    // Test 8: Goals tab and financial tracker
    console.log('Testing: Goals tab...');
    const goalsTab = await page.$('[data-section="goals"]');
    if (goalsTab) {
      await goalsTab.click();
      await delay(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/05-goals-tab.png` });
      const totalEarned = await page.$('#total-earned-amount');
      results.push({ test: 'Financial tracker', status: totalEarned ? 'PASS' : 'FAIL' });
    }

    // Test 9: Parent page
    console.log('Testing: Parent page...');
    await page.goto(`${BASE_URL}joe.html`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-parent-login.png` });
    const parentLogin = await page.$('#login');
    results.push({ test: 'Parent login page', status: parentLogin ? 'PASS' : 'FAIL' });

  } catch (error) {
    results.push({ test: 'Error', status: `FAIL: ${error.message}` });
  }

  await browser.close();

  console.log('\n========== TEST RESULTS ==========');
  let passed = 0, failed = 0;
  results.forEach(r => {
    const icon = r.status.startsWith('PASS') ? '✓' : '✗';
    console.log(`${icon} ${r.test}: ${r.status}`);
    if (r.status.startsWith('PASS')) passed++;
    else failed++;
  });
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
}

test().catch(console.error);
