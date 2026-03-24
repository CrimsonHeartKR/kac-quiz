import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5180';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // Set localStorage for login bypass
  await context.addInitScript(() => {
    localStorage.setItem('operator_id', 'screenshot-session');
    localStorage.setItem('operator_email', 'admin@kac-quiz.com');
    localStorage.setItem('operator_name', '관리자');
    localStorage.setItem('operator_role', 'admin');
  });

  // 1. Participant join
  let page = await context.newPage();
  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '01_participant_join.png') });
  console.log('01 done');
  await page.close();

  // 2. Login select
  page = await context.newPage();
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '02_login_select.png') });
  console.log('02 done');
  await page.close();

  // 3. Admin quiz list
  page = await context.newPage();
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '03_admin_quiz_list.png') });
  console.log('03 done');

  // 4. Editor
  const editBtn = page.locator('button', { hasText: '편집' }).first();
  if (await editBtn.count()) await editBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '04_admin_editor.png') });
  console.log('04 done');
  await page.close();

  // 5. Host select
  page = await context.newPage();
  await page.goto(`${BASE_URL}/host`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '05_host_select.png') });
  console.log('05 done');

  // 6. Host lobby
  const quizBtn = page.locator('button', { hasText: '종합 테스트' });
  if (await quizBtn.count()) await quizBtn.first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '06_host_lobby.png') });
  console.log('06 done');

  // Get session ID
  const sessionId = new URL(page.url()).searchParams.get('sessionId');
  if (!sessionId) { console.error('No sessionId!'); await browser.close(); return; }

  // 7~12: Quiz play flow
  await page.goto(`${BASE_URL}/host/play?session=${sessionId}`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '07_ox_quiz.png') });
  console.log('07 OX quiz done');

  // Reveal
  let btn = page.locator('button', { hasText: '정답 공개' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '08_ox_reveal.png') });
  console.log('08 OX reveal done');

  // Rank
  btn = page.locator('button', { hasText: '순위 보기' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '09_ranking.png') });
  console.log('09 ranking done');

  // Next → 4지선다
  btn = page.locator('button', { hasText: '다음 문항' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '10_multiple_choice.png') });
  console.log('10 multiple choice done');

  // Reveal → Rank → Next → Image quiz
  btn = page.locator('button', { hasText: '정답 공개' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1000);
  btn = page.locator('button', { hasText: '순위 보기' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1000);
  btn = page.locator('button', { hasText: '다음 문항' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '11_image_quiz.png') });
  console.log('11 image quiz done');

  // Reveal → Rank → Final
  btn = page.locator('button', { hasText: '정답 공개' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1000);
  btn = page.locator('button', { hasText: '순위 보기' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(1000);
  btn = page.locator('button', { hasText: '최종 결과' });
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '12_final_result.png') });
  console.log('12 final result done');
  await page.close();

  // 13. Mobile participant
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 812 });
  await mobilePage.goto(`${BASE_URL}/`);
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: join(SCREENSHOTS_DIR, '13_mobile_participant.png') });
  console.log('13 mobile done');
  await mobilePage.close();

  await browser.close();
  console.log('All screenshots captured!');
}

main().catch(console.error);
