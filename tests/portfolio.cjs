const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
 await page.screenshot({path:'tests/desktop.png'});
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#magazine button').first().click();
 await page.waitForTimeout(200);
 assert(await page.locator('#ebookModal').isVisible());
 assert((await page.locator('#ebookCoverView').boundingBox()).height>200);
 await page.locator('[aria-label="Next Page"]').click();await page.waitForTimeout(700);
 assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'2');
 const spread=await page.locator('#ebookSpreadView').boundingBox();assert(spread.width>500&&spread.height>300);
 await page.screenshot({path:'tests/reader-desktop.png'});
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(700);assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'3');
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(700);assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'2');
 await page.locator('#readerJump').selectOption('34');assert(await page.locator('[aria-label="Next Page"]').isDisabled());
 await page.locator('[aria-label="Previous Page"]').click();await page.waitForTimeout(700);assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'33');
 await page.locator('#readerThumbToggle').click();await page.locator('#readerThumbnails button').nth(13).click();assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'14');
 await page.locator('#readerZoom').click();assert.equal(await page.locator('#readerZoom').getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#ebookModal').isVisible(),false);
 // Reopening while a page animation is running must not restore stale state.
 await page.evaluate(()=>{openEbookModal(2);nextEbookPage();closeEbookModal();openEbookModal(8);});await page.waitForTimeout(700);assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'8');
 await page.keyboard.press('Escape');
 for(const width of [390,768]){
  await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);
  await page.screenshot({path:`tests/viewport-${width}.png`});
  await page.locator('#mobileNavBtn').click();assert.equal(await page.locator('#mobileNavBtn').getAttribute('aria-expanded'),'true');
  await page.locator('#mobileDrawer a[href="#magazine"]').click();
  await page.locator('#magazine button').first().click();await page.locator('#readerJump').selectOption('2');
  assert((await page.locator('#ebookSpreadView').boundingBox()).width>300);
  await page.screenshot({path:`tests/reader-${width}.png`});
  await page.locator('#readerZoom').click();await page.waitForFunction(()=>document.getElementById('ebookViewerContainer').scrollWidth>document.getElementById('ebookViewerContainer').clientWidth);
  await page.keyboard.press('Escape');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{openEbookModal(1);nextEbookPage();});assert.equal(await page.locator('#ebookCurrentPageNum').textContent(),'2');
 const missing=await page.evaluate(async()=>{let urls=[...document.querySelectorAll('[src],a[href]')].map(el=>el.getAttribute('src')||el.getAttribute('href')).filter(x=>x&& !/^(https?:|#|mailto:|tel:|data:)/.test(x));return (await Promise.all([...new Set(urls)].map(async u=>({u,status:(await fetch(u)).status})))).filter(x=>x.status!==200);});assert.deepEqual(missing,[]);
 assert.deepEqual(errors,[]);console.log('PASS: desktop / tablet / mobile, reader cover and spreads, forward/back, boundaries, jump, thumbnails, zoom, Escape, interrupted animation, reduced motion, local assets, zero JS errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


