import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(process.env.GYM_BUILD_MODULES?path.join(process.env.GYM_BUILD_MODULES,'../package.json'):path.join(root,'package.json'));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin='http://127.0.0.1:8097';
let checks=0;
try{
 await page.goto(origin+'/login');
 await page.getByLabel('Username',{exact:true}).fill('admin.test');
 await page.getByLabel('Password',{exact:true}).fill('Local-only-test-password-2026');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.waitForURL('**/dashboard');
 await page.getByRole('heading',{name:/Welcome back/}).waitFor();checks++;
 for(const [route,title] of [['members','Members'],['register','Register member'],['renewals','Membership & access'],['payments','Payment records'],['scan','Scan member QR'],['check-ins','Member check-in logs'],['analytics','Revenue analytics'],['activities','Activity logs'],['staff','Staff & access'],['settings','Settings']]){
  await page.goto(origin+'/'+route);
  await page.getByRole('heading',{name:title,exact:true,level:1}).waitFor();
  await page.waitForFunction(()=>!document.body.innerText.includes('Loading records…'));
  assert.equal(await page.locator('main [role=alert]').count(),0,route+' has an error');checks++;
 }
 await page.goto(origin+'/register');
 await page.getByLabel('Full name',{exact:true}).fill('Browser Test Member');
 // Fill the native date control using its ISO value.
 const date=page.getByLabel('Date of birth',{exact:true});
 await date.fill('1996-08-15');await date.press('Tab');
 await page.getByLabel('Phone number',{exact:true}).fill('09171234567');
 await page.getByLabel('Home address').fill('Browser test address');
 await page.getByLabel('Contact name',{exact:true}).fill('Browser Test Contact');
 await page.getByLabel('Contact phone',{exact:true}).fill('09179876543');
 await page.locator('select[name=method]').selectOption('Cash');
 await page.getByRole('checkbox',{name:'I confirm the payment has been received outside this application.'}).check();
 await page.getByRole('button',{name:'Confirm & register member'}).click();
 await page.getByRole('heading',{name:'Member registered'}).waitFor();checks++;
 const members=await (await page.request.get(origin+'/api/members?search=Browser%20Test%20Member')).json();
 const member=members[0];assert.ok(member);
 await page.goto(origin+'/scan');
 await page.getByPlaceholder('Scan or paste QR token').fill(member.qr_token);
 await page.getByRole('button',{name:'Check entry'}).click();
 await page.getByText('ENTRY DENIED',{exact:true}).waitFor();checks++;
 await page.getByRole('button',{name:'Renew monthly access'}).click();
 await page.locator('select[name=method]').selectOption('GCash');
 await page.getByRole('dialog').getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirm payment',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'detached'});
 await page.getByPlaceholder('Scan or paste QR token').fill(member.qr_token);
 await page.getByRole('button',{name:'Check entry'}).click();
 await page.getByText('ENTRY APPROVED',{exact:true}).waitFor();checks++;
 await page.goto(origin+'/members');
 await page.getByRole('button',{name:/Browser Test Member/}).waitFor();
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 await page.screenshot({path:path.join(root,'test-results/members-desktop.png'),fullPage:true});checks++;
 await page.getByRole('button',{name:/Browser Test Member/}).click();
 await page.getByRole('heading',{name:'Browser Test Member',exact:true}).waitFor();
 await page.getByRole('link',{name:'Download member QR'}).waitFor();checks++;
 await page.goto(origin+'/dashboard');
 await page.setViewportSize({width:390,height:844});
 await page.getByText('Registered members',{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
 await page.screenshot({path:path.join(root,'test-results/dashboard-mobile.png'),fullPage:true});
 const staff=await browser.newPage();
 await staff.goto(origin+'/login');
 await staff.getByLabel('Username',{exact:true}).fill('staff.test');
 await staff.getByLabel('Password',{exact:true}).fill('Local-only-test-password-2026');
 await staff.getByRole('button',{name:'Sign in',exact:true}).click();
 await staff.waitForURL('**/dashboard');
 await staff.getByRole('heading',{name:/Welcome back/}).waitFor();
 assert.equal(await staff.getByRole('link',{name:'Revenue analytics',exact:true}).count(),0);checks++;
 await staff.goto(origin+'/analytics');
 await staff.getByRole('heading',{name:'Administrator access required'}).waitFor();checks++;
 assert.equal(await page.getByText('Some interaction history could not be saved.',{exact:false}).count(),0);checks++;
 assert.deepEqual(errors,[]);checks++;
 console.log(checks+' browser workflow checks passed.');
}catch(error){console.error((await page.locator('body').innerText()).slice(-3000));throw error;}finally{await browser.close();}





