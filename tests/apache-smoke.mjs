import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'package.json'));
const origin='http://127.0.0.1:8098';let checks=0;
for(const route of ['/','/login','/members','/assets/app.js','/assets/app.css','/fonts/geist-variable.woff2']){
const r=await fetch(origin+route);assert.equal(r.status,200,route);checks++;}
for(const route of ['/server/config.php','/database/schema.sql','/.env','/.htaccess']){
const r=await fetch(origin+route);assert.ok([403,404].includes(r.status),route);checks++;}
let r=await fetch(origin+'/api/me');assert.equal(r.status,401);checks++;
assert.equal(r.headers.get('x-content-type-options'),'nosniff');checks++;
assert.equal(r.headers.get('x-frame-options'),'DENY');checks++;
assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);checks++;
r=await fetch(origin+'/api/login',{method:'POST',headers:{Origin:origin,'X-Gym-Request':'1','Content-Type':'application/json'},body:JSON.stringify({username:'admin.test',password:'Local-only-test-password-2026'})});
assert.equal(r.status,200);checks++;
const browser=await require('@playwright/test').chromium.launch({headless:true,channel:'msedge'});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto(origin+'/login');await page.getByLabel('Username',{exact:true}).fill('admin.test');await page.getByLabel('Password',{exact:true}).fill('Local-only-test-password-2026');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:/Welcome back/}).waitFor();
await page.goto(origin+'/members');await page.getByRole('heading',{name:'Members',exact:true,level:1}).waitFor();await page.getByRole('button',{name:/Browser Test Member/}).waitFor();await page.evaluate(()=>document.fonts.ready);
assert.match(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily),/Geist Sans/);checks++;
await page.screenshot({path:path.join(root,'test-results/members-desktop.png'),fullPage:true});
await page.goto(origin+'/dashboard');await page.getByRole('heading',{name:/Welcome back/}).waitFor();await page.setViewportSize({width:390,height:844});await page.getByText('Registered members',{exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(root,'test-results/dashboard-mobile.png'),fullPage:true});checks++;
await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');checks++;
await page.goto(origin+'/login');await page.waitForURL('**/dashboard');checks++;
}finally{await browser.close();}
console.log(checks+' Apache deployment checks passed.');

