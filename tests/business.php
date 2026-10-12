<?php
require dirname(__DIR__).'/server/core.php';
require dirname(__DIR__).'/server/operations.php';
$checks=0;
function check($value,$message){global $checks;if(!$value)throw new RuntimeException($message);$checks++;}
check(months('2024-01-31',1)==='2024-02-29','Leap-year month end');
check(months('2024-02-29',12)==='2025-02-28','Leap-year anniversary');
check(months('2025-01-31',1)==='2025-02-28','Clamped short month');
check(days('2026-09-01',14)==='2026-09-15','Annual grace end');
$m=['status'=>'REGISTERED'];$a=['start_date'=>'2025-09-01','expires_on'=>'2026-09-01','grace_end'=>'2026-09-15','status'=>'ACTIVE'];
$x=['start_date'=>'2026-08-25','expires_on'=>'2026-09-25','status'=>'ACTIVE'];
check(eligible($m,$a,$x,'2026-09-01')['grace']===true,'Expiry first grace day');
check(eligible($m,$a,$x,'2026-09-15')['approved']===true,'Grace includes day 14');
check(eligible($m,$a,$x,'2026-09-16')['approved']===false,'Beyond grace denied');
check(eligible($m,$a,null,'2026-08-30')['renewal']==='MONTHLY','Annual alone no access');
$a['status']='CANCELLED';check(!eligible($m,$a,$x,'2026-09-01')['approved'],'Cancellation overrides grace');
$a['status']='ACTIVE';$a['grace_end']='2026-12-01';
check(eligible($m,$a,$x,'2026-09-25')['approved'],'Monthly expiry inclusive');
check(!eligible($m,$a,$x,'2026-09-26')['approved'],'Monthly after expiry denied');
check(!eligible(['status'=>'ARCHIVED'],$a,$x,'2026-09-01')['approved'],'Archived denied');
check(!eligible(null,null,null,'2026-09-01')['approved'],'Unknown QR denied');
foreach(['2026-02-30','bad','2026-2-01'] as $date){try{validDate($date);throw new RuntimeException('Bad date accepted');}catch(ApiError){$checks++;}}
$hash=passwordHash(str_repeat('a',80).'one');
check(passwordVerify(str_repeat('a',80).'one',$hash),'Password verification');
check(!passwordVerify(str_repeat('a',80).'two',$hash),'Passwords differ beyond bcrypt byte limit');
$_COOKIE['gym_session']=['malformed'];
check(token()==='','Malformed session cookie is ignored');
unset($_COOKIE['gym_session']);
check(dayOf('2026-10-11T16:05:00.000Z')==='2026-10-12','Manila midnight');
$v=preview(['annual'=>['status'=>'ACTIVE','expires_on'=>'2020-01-01','start_date'=>'2019-01-01'],'monthly'=>null],'ANNUAL','2026-01-01');
check($v['end']==='2021-01-01','Lapsed annual continues from prior expiry');
$v=preview(['annual'=>null,'monthly'=>['status'=>'ACTIVE','expires_on'=>'2020-01-01','start_date'=>'2019-12-01']],'MONTHLY','2026-01-01');
check($v['end']==='2026-02-01','Lapsed monthly restarts from payment');
echo "$checks business checks passed.\n";

