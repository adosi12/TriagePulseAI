/**
 * Sentinel AI — Full Dashboard Demo Recording Script
 * Uses Playwright to record a narrated walkthrough video of the dashboard.
 *
 * Recorded flow:
 *  0. Landing — Outlook P1 email modal
 *  1. Launch AI Investigation from the modal
 *  2. Watch all 8 steps animate one-by-one
 *  3. Expand / inspect each step panel
 *  4. Switch to Logs view
 *  5. Switch to Metrics view
 *  6. Switch to Topology map
 *  7. Switch to Integrations — create Jira ticket + send Slack
 *  8. Switch to Incident Memory
 *  9. Switch to RCA standalone view
 * 10. Change scenario (Kafka Consumer Lag)
 * 11. Run pipeline again
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'recordings');
const VIDEO_PATH = path.join(OUTPUT_DIR, 'sentinel-ai-demo.webm');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Helper — smooth human-like delay
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const humanWait = (min = 800, max = 1600) =>
  wait(Math.floor(Math.random() * (max - min) + min));

// Helper — smooth scroll to element
async function scrollTo(page, selector) {
  try {
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await wait(400);
  } catch {}
}

// Helper — highlight element briefly with a yellow ring
async function highlight(page, selector) {
  try {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const orig = el.style.outline;
      el.style.outline = '3px solid #fbbf24';
      el.style.outlineOffset = '2px';
      setTimeout(() => { el.style.outline = orig; el.style.outlineOffset = ''; }, 1200);
    }, selector);
    await wait(1200);
  } catch {}
}

async function main() {
  console.log('🎬 Starting Sentinel AI dashboard recording...');
  console.log(`📂 Output: ${VIDEO_PATH}`);

  const browser = await chromium.launch({
    headless: false,        // visible window so the recording looks real
    args: [
      '--start-maximized',
      '--disable-infobars',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1440, height: 900 },
    },
    colorScheme: 'dark',
  });

  const page = await context.newPage();

  // ─────────────────────────────────────────────────────────────────────────
  // 0. Open Sentinel AI dashboard
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 0: Opening Sentinel AI at http://localhost:5173');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await wait(2500);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Outlook P1 modal is visible on load
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 1: Outlook P1 modal visible');
  await wait(3000); // Hold on modal so viewer can read it

  // Scroll inside modal to read the email preview
  await wait(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Click "Launch AI Investigation"
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 2: Launching AI Investigation from Outlook modal');
  const launchBtn = page.locator('button:has-text("Launch AI Investigation")');
  await highlight(page, 'button');
  await launchBtn.click();
  await wait(1000);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Watch the AI pipeline animate through all 8 steps
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 3: Watching AI pipeline animate...');
  await wait(2000); // Step 0 activates

  // Slowly scroll down as steps complete to keep them in view
  for (let i = 0; i < 8; i++) {
    await wait(2000);
    await page.evaluate(() => window.scrollBy({ top: 80, behavior: 'smooth' }));
  }

  // Wait for full pipeline to finish (8 steps × ~2s each + buffer)
  await wait(6000);

  // Scroll back to top to show the complete flow
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1500);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Expand & inspect each step by clicking headers
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 4: Inspecting step panels...');

  // Step 1 — Incident Intake
  const stepHeaders = page.locator('.step-header-row');
  const count = await stepHeaders.count();
  console.log(`  Found ${count} step headers`);

  // Collapse all first for clean reveal
  for (let i = 0; i < Math.min(count, 8); i++) {
    try {
      await stepHeaders.nth(i).click();
      await wait(200);
    } catch {}
  }
  await wait(800);

  // Now re-expand step by step with pauses
  for (let i = 0; i < Math.min(count, 8); i++) {
    try {
      await stepHeaders.nth(i).scrollIntoViewIfNeeded();
      await wait(500);
      await stepHeaders.nth(i).click();
      await wait(1800); // Pause to let viewer read

      // Specific interactions per step
      if (i === 2) {
        // Telemetry: switch tabs
        const tabs = page.locator('.panel-tab');
        const tabCount = await tabs.count();
        if (tabCount >= 2) {
          await tabs.nth(1).click(); // Metrics tab
          await wait(1500);
          if (tabCount >= 3) {
            await tabs.nth(2).click(); // Traces tab
            await wait(1500);
            await tabs.nth(0).click(); // Back to Logs
            await wait(800);
          }
        }
      }

      if (i === 3) {
        // Topology: click a node
        const nodes = page.locator('.topo-node');
        const nodeCount = await nodes.count();
        if (nodeCount >= 3) {
          await nodes.nth(2).click(); // Click the failing node
          await wait(2000);
          await nodes.nth(2).click(); // Close detail
          await wait(800);
        }
      }

      if (i === 4) {
        // RCA: tick a checklist item
        const items = page.locator('.checklist-item');
        if (await items.count() > 0) {
          await items.first().click();
          await wait(1200);
        }
      }

    } catch (err) {
      console.log(`  Skipped step ${i}: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Navigate to Logs view
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 5: Navigating to Logs view');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);
  await page.locator('.nav-item:has-text("Logs")').click();
  await wait(2000);

  // Type in search box
  const searchBox = page.locator('.toolbar-input');
  await searchBox.click();
  await searchBox.type('ERROR', { delay: 80 });
  await wait(1500);
  await searchBox.selectText();
  await searchBox.fill('');
  await wait(500);

  // Filter by ERROR level
  await page.locator('.toolbar-select').selectOption('ERROR');
  await wait(1500);
  await page.locator('.toolbar-select').selectOption('ALL');
  await wait(500);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Navigate to Metrics view
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 6: Navigating to Metrics view');
  await page.locator('.nav-item:has-text("Metrics")').click();
  await wait(2500);
  // Scroll to show time-series table
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await wait(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Navigate to Topology Map
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 7: Navigating to Service Topology Map');
  await page.locator('.nav-item:has-text("Service Map")').click();
  await wait(2500);

  // Click the failed node to show detail
  const topoNodes = page.locator('.topo-node');
  const topoCount = await topoNodes.count();
  if (topoCount >= 3) {
    await topoNodes.nth(2).click();
    await wait(2500);
    await topoNodes.nth(2).click(); // close
    await wait(800);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Navigate to Integrations — Create Jira + Send Slack
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 8: Navigating to Integrations view');
  await page.locator('.nav-item:has-text("Integrations")').click();
  await wait(2000);

  // Create Jira ticket
  const jiraBtn = page.locator('button:has-text("Create TPAI"), button:has-text("Create"), .btn-jira').first();
  try {
    await jiraBtn.scrollIntoViewIfNeeded();
    await wait(600);
    await jiraBtn.click();
    await wait(2000);
  } catch {}

  // Send Slack alert
  const slackBtn = page.locator('button:has-text("Send Alert"), button:has-text("Send"), .btn-slack').first();
  try {
    await slackBtn.scrollIntoViewIfNeeded();
    await wait(600);
    await slackBtn.click();
    await wait(2000);
  } catch {}

  // Scroll down to show Created tickets log if present
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await wait(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Navigate to Incident Memory
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 9: Navigating to Incident Memory view');
  await page.locator('.nav-item:has-text("Incident Memory")').click();
  await wait(2500);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await wait(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Navigate to Root Cause Analysis standalone view
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 10: Navigating to RCA view');
  await page.locator('.nav-item:has-text("Root Cause")').click();
  await wait(2500);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await wait(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Switch scenario to Kafka Consumer Lag and re-run pipeline
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 11: Switching to Kafka scenario');
  const scenarioSelect = page.locator('.scenario-select');
  await scenarioSelect.selectOption({ index: 1 }); // INC-9511 Kafka
  await wait(1500);

  // Go back to Investigation view
  await page.locator('.nav-item:has-text("AI Investigation")').click();
  await wait(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(800);

  // Click Run AI Pipeline again
  const runBtn = page.locator('button:has-text("Run AI Pipeline")');
  try {
    await runBtn.scrollIntoViewIfNeeded();
    await wait(500);
    await runBtn.click();
    await wait(2000);
    // Watch it progress
    for (let i = 0; i < 6; i++) {
      await wait(2200);
      await page.evaluate(() => window.scrollBy({ top: 70, behavior: 'smooth' }));
    }
    await wait(5000);
  } catch {}

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Final — scroll back to show complete investigation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Step 12: Final overview scroll');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(3000);

  // Slowly scroll through the full completed flow
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy({ top: 120, behavior: 'smooth' }));
    await wait(600);
  }
  await wait(2000);

  // ─────────────────────────────────────────────────────────────────────────
  // Done — close and save video
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🎬 Recording complete. Saving video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the generated .webm file and rename it
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latest = files.sort().pop();
    const src = path.join(OUTPUT_DIR, latest);
    fs.renameSync(src, VIDEO_PATH);
    console.log(`\n✅ Video saved to: ${VIDEO_PATH}`);
    console.log('   Open with VLC, Windows Media Player, or any browser.');
    console.log('   File: sentinel-ai-demo.webm (WebM/VP8 format)\n');
  } else {
    console.log('⚠️  No video file found in output directory.');
  }
}

main().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
