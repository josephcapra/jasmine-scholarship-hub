const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'https://www.jasminescholarshiphub.com/';
const SCREENSHOT_DIR = '/tmp/jasmine-clicks';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function testClicks() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Capture console errors
  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      jsErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    jsErrors.push(err.message);
  });

  const results = [];

  try {
    console.log('Loading app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Log any JS errors
    if (jsErrors.length > 0) {
      console.log('\n=== JAVASCRIPT ERRORS ===');
      jsErrors.forEach(e => console.log('  ' + e));
      console.log('');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/00-initial.png`, fullPage: true });

    // Check if switchSection exists
    const fnExists = await page.evaluate(() => {
      return {
        switchSection: typeof window.switchSection,
        openAddScholarship: typeof window.openAddScholarship,
        showToast: typeof window.showToast
      };
    });
    console.log('Function availability:', fnExists);

    // Get all nav tabs
    const tabCount = await page.evaluate(() => document.querySelectorAll('.nav-tab').length);
    console.log(`Found ${tabCount} navigation tabs`);

    // Test each tab
    for (let i = 0; i < Math.min(tabCount, 6); i++) {
      const tabInfo = await page.evaluate((idx) => {
        const tabs = document.querySelectorAll('.nav-tab');
        const tab = tabs[idx];
        if (!tab) return null;
        return {
          text: tab.textContent.trim(),
          section: tab.dataset.section,
          onclick: tab.getAttribute('onclick')
        };
      }, i);

      if (!tabInfo) continue;
      console.log(`\nTesting tab ${i + 1}: "${tabInfo.text}" (section: ${tabInfo.section})`);

      // Use page.click() which properly triggers events
      await page.evaluate((idx) => {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs[idx].click();
      }, i);

      await delay(300);

      // Check state
      const sectionState = await page.evaluate((sectionId) => {
        const section = document.getElementById('section-' + sectionId);
        const tab = document.querySelector(`[data-section="${sectionId}"]`);
        return {
          sectionExists: !!section,
          sectionActive: section ? section.classList.contains('active') : false,
          tabActive: tab ? tab.classList.contains('active') : false
        };
      }, tabInfo.section);

      const passed = sectionState.sectionActive && sectionState.tabActive;
      results.push({
        tab: tabInfo.text,
        section: tabInfo.section,
        ...sectionState,
        status: passed ? 'PASS' : 'FAIL'
      });

      console.log(`  Section active: ${sectionState.sectionActive}, Tab active: ${sectionState.tabActive}`);
      console.log(`  Result: ${passed ? '✓ PASS' : '✗ FAIL'}`);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/0${i + 1}-${tabInfo.section}.png` });
    }

  } catch (error) {
    console.error('Test error:', error.message);
    results.push({ tab: 'ERROR', section: 'error', status: `FAIL: ${error.message}` });
  }

  await browser.close();

  // Summary
  console.log('\n========== CLICK TEST RESULTS ==========');
  let passed = 0, failed = 0;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${r.tab}: ${r.status}`);
    if (r.status === 'PASS') passed++;
    else failed++;
  });
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);

  return { passed, failed };
}

testClicks().catch(console.error);
