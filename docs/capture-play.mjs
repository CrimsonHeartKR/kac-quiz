import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, 'screenshots');
const BASE = 'http://localhost:5180';
const SESSION_ID = 'b6a78d53-fd9e-4565-a4cc-c178f2e33323';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('operator_id', 'screenshot-session');
    localStorage.setItem('operator_email', 'admin@kac-quiz.com');
    localStorage.setItem('operator_name', '관리자');
    localStorage.setItem('operator_role', 'admin');
  });

  const p = await ctx.newPage();

  // 06 Lobby
  await p.goto(`${BASE}/host/lobby?sessionId=${SESSION_ID}`);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: join(DIR, '06_host_lobby.png') });
  console.log('06 lobby');

  // Go to play
  await p.goto(`${BASE}/host/play?session=${SESSION_ID}`);
  await p.waitForTimeout(3000);

  // 07 OX
  await p.screenshot({ path: join(DIR, '07_ox_quiz.png') });
  console.log('07 ox');

  // 08 Reveal
  let b = p.locator('button', { hasText: '정답 공개' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: join(DIR, '08_ox_reveal.png') });
  console.log('08 reveal');

  // 09 Rank
  b = p.locator('button', { hasText: '순위 보기' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: join(DIR, '09_ranking.png') });
  console.log('09 rank');

  // 10 Next → 4지선다
  b = p.locator('button', { hasText: '다음 문항' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(5500);
  await p.screenshot({ path: join(DIR, '10_multiple_choice.png') });
  console.log('10 mc');

  // 11 Image quiz
  b = p.locator('button', { hasText: '정답 공개' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1000);
  b = p.locator('button', { hasText: '순위 보기' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1000);
  b = p.locator('button', { hasText: '다음 문항' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(5500);
  await p.screenshot({ path: join(DIR, '11_image_quiz.png') });
  console.log('11 img');

  // 12 Final
  b = p.locator('button', { hasText: '정답 공개' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1000);
  b = p.locator('button', { hasText: '순위 보기' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(1000);
  b = p.locator('button', { hasText: '최종 결과' });
  if (await b.count()) await b.click();
  await p.waitForTimeout(2000);
  await p.screenshot({ path: join(DIR, '12_final_result.png') });
  console.log('12 final');
  await p.close();

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
