<?php
declare(strict_types=1);
function registerMember(array $u,array $body): array {
 $m=memberInput(objectField($body,'member'));$p=paymentInput(objectField($body,'payment'));$monthly=isset($body['monthlyPayment'])?paymentInput(objectField($body,'monthlyPayment')):null;
 if($p['fee_type']!=='ANNUAL')fail('Registration requires the annual membership payment');
 if($monthly&&($monthly['fee_type']!=='MONTHLY'||$monthly['idempotency_key']===$p['idempotency_key']))fail('Monthly access requires a separate monthly payment');
 $hash=fingerprint([$m,$p,$monthly]);$prior=previousPayment($u,$p['idempotency_key'],$hash);if($prior)return memberView($prior['member_id']);
 if($monthly&&one('SELECT id FROM payment WHERE idempotency_key=?',[$monthly['idempotency_key']]))fail('Monthly payment submission key has already been used',409);
 $id=uid();$annualId=uid();$image=$m['photo']??'';unset($m['photo']);
 insertRow('member',array_merge($m,['id'=>$id,'code'=>'KHA-'.strtoupper(bin2hex(random_bytes(4))),'qr_token'=>bin2hex(random_bytes(24)),
 'status'=>'REGISTERED','created_by'=>$u['id'],'created_at'=>stamp(),'updated_at'=>stamp()]));
 if($image!=='')savePhoto('member_photo','member_id',$id,$image);
 $expires=months($p['payment_date'],12);
 insertRow('annual_membership',['id'=>$annualId,'member_id'=>$id,'start_date'=>$p['payment_date'],'expires_on'=>$expires,'grace_end'=>days($expires,14),'status'=>'ACTIVE']);
 $paymentId=insertPayment($u,$id,$p,$hash,$p['payment_date'],$expires);
 audit($u,'MEMBER_REGISTERED','Registered '.$m['name'],['memberId'=>$id,'annualId'=>$annualId]);
 audit($u,'PAYMENT_CONFIRMED','Confirmed annual payment for '.$m['name'],['memberId'=>$id,'annualId'=>$annualId,'paymentId'=>$paymentId]);
 if($monthly){
  $monthlyId=uid();$end=months($monthly['payment_date'],1);
  insertRow('monthly_access',['id'=>$monthlyId,'member_id'=>$id,'start_date'=>$monthly['payment_date'],'expires_on'=>$end,'status'=>'ACTIVE']);
  $paymentId=insertPayment($u,$id,$monthly,fingerprint([$id,$monthly]),$monthly['payment_date'],$end);
  audit($u,'PAYMENT_CONFIRMED','Confirmed monthly payment for '.$m['name'],['memberId'=>$id,'monthlyId'=>$monthlyId,'paymentId'=>$paymentId]);
 }
 return memberView($id);
}
function renewMember(array $u,string $id,array $body): array {
 $p=paymentInput($body);$hash=fingerprint([$id,$p]);$prior=previousPayment($u,$p['idempotency_key'],$hash);if($prior)return memberView($prior['member_id']);
 $m=memberView($id);if($m['status']==='ARCHIVED')fail('Archived members cannot receive new payments');
 $v=preview($m,$p['fee_type'],$p['payment_date']);$annual=$p['fee_type']==='ANNUAL';$old=$m[$annual?'annual':'monthly'];
 $eid=$old['id']??uid();$table=$annual?'annual_membership':'monthly_access';
 if($annual)query("INSERT INTO annual_membership (id,member_id,start_date,expires_on,grace_end,status) VALUES (?,?,?,?,?,'ACTIVE') ON DUPLICATE KEY UPDATE start_date=VALUES(start_date),expires_on=VALUES(expires_on),grace_end=VALUES(grace_end),status='ACTIVE'",[$eid,$id,$v['start'],$v['end'],$v['grace_end']]);
 else query("INSERT INTO monthly_access (id,member_id,start_date,expires_on,status) VALUES (?,?,?,?,'ACTIVE') ON DUPLICATE KEY UPDATE start_date=VALUES(start_date),expires_on=VALUES(expires_on),status='ACTIVE'",[$eid,$id,$v['start'],$v['end']]);
 $pid=insertPayment($u,$id,$p,$hash,$v['period_start'],$v['end']);
 $opts=['memberId'=>$id,'paymentId'=>$pid,($annual?'annualId':'monthlyId')=>$eid];
 audit($u,'PAYMENT_CONFIRMED','Confirmed '.strtolower($p['fee_type']).' payment for '.$m['name'].'; period '.$v['period_start'].' to '.$v['end'],$opts);
 if($old)audit($u,'ENTITLEMENT_RENEWED','Renewed '.strtolower($p['fee_type']).' for '.$m['name'].'; previous expiry '.$old['expires_on'].', new expiry '.$v['end'],['memberId'=>$id,'paymentId'=>$pid]);
 return memberView($id);
}
function editMember(array $u,string $id,array $body): array {
 $m=memberView($id);if($m['status']==='ARCHIVED')fail('Archived members cannot be edited');
 $v=memberInput($body);if(array_key_exists('photo',$v)){savePhoto('member_photo','member_id',$id,$v['photo']);unset($v['photo']);}
 $v['updated_at']=stamp();$set=implode(',',array_map(fn($k)=>$k.'=?',array_keys($v)));query("UPDATE member SET $set WHERE id=?",[...array_values($v),$id]);
 audit($u,'MEMBER_EDITED','Edited '.$m['name'].' ('.$m['code'].')',['memberId'=>$id]);return memberView($id);
}
function cancelMember(array $u,string $id,array $body): array {
 $action=choice($body['action']??null,['ANNUAL','MONTHLY','ARCHIVE'],'action');$reason=textField($body,'reason',3,500);
 if(($body['confirmed']??false)!==true)fail('Confirm this action before continuing');
 $m=memberView($id);if($m['status']==='ARCHIVED')fail('This member is already archived');
 if($action==='ARCHIVE')query("UPDATE member SET status='ARCHIVED',updated_at=? WHERE id=?",[stamp(),$id]);
 else{
  $current=$m[$action==='ANNUAL'?'annual':'monthly'];if(!$current||$current['status']==='CANCELLED')fail('This entitlement is inactive or already cancelled');
  $table=$action==='ANNUAL'?'annual_membership':'monthly_access';query("UPDATE $table SET status='CANCELLED' WHERE member_id=?",[$id]);
 }
 audit($u,$action==='ARCHIVE'?'MEMBER_ARCHIVED':'ENTITLEMENT_CANCELLED',($action==='ARCHIVE'?'Archived member':'Cancelled '.strtolower($action)).' '.$m['name'].' ('.$m['code'].')',['memberId'=>$id,'reason'=>$reason,'outcome'=>'Completed']);
 return memberView($id);
}
function scanMember(array $u,array $body): array {
 $token=textField($body,'token',0,12000);$m=one('SELECT id FROM member WHERE qr_token=?',[$token]);$m=$m?memberView($m['id']):null;
 $result=$m['eligibility']??eligible(null,null,null,today());$id=uid();
 insertRow('check_in_log',['id'=>$id,'member_id'=>$m['id']??null,'scanner_id'=>$u['id'],'scanned_at'=>stamp(),'result'=>$result['approved']?'APPROVED':'DENIED','reason'=>$result['approved']?null:$result['reason'],'renewal'=>$result['renewal']]);
 return ['id'=>$id,'member'=>$m,...$result];
}
function saveStaff(array $u,array $body,?string $id=null): array {
 requireActor($u,true);$name=textField($body,'name',2,100);$username=strtolower(textField($body,'username',3,40));
 if(!preg_match('/^[a-z0-9._-]+$/D',$username))fail('Invalid username');
 $role=choice($body['role']??null,['ADMIN','STAFF'],'role');$status=choice($body['status']??null,['ACTIVE','DISABLED'],'status');
 $password=$body['password']??'';if(!is_string($password))fail('Invalid password');
 if(!$id||$password!=='')passwordValue($password);
 $old=$id?one('SELECT * FROM user_account WHERE id=?',[$id]):null;if($id&&!$old)fail('Account not found',404);
 $reason=textField($body,'reason',0,500);
 if($status==='DISABLED'&&($old['status']??null)!=='DISABLED'&&(($body['confirmed']??false)!==true||mb_strlen($reason)<3))fail('Confirm disabling this account and give a reason (at least 3 characters)');
 if(one('SELECT id FROM user_account WHERE username=? AND id<>?',[$username,$id??'']))fail('Username is already in use',409);
 $admins=(int)one("SELECT COUNT(*) n FROM user_account WHERE role='ADMIN' AND status='ACTIVE'")['n'];
 if($old&&$old['role']==='ADMIN'&&$old['status']==='ACTIVE'&&$admins<=1&&($role!=='ADMIN'||$status!=='ACTIVE'))fail('Keep at least one active Admin account');
 $userId=$id??uid();
 if(!$id)insertRow('user_account',['id'=>$userId,'name'=>$name,'username'=>$username,'password_hash'=>passwordHash($password),'role'=>$role,'status'=>$status,'created_at'=>stamp()]);
 else {
  query('UPDATE user_account SET name=?,username=?,role=?,status=? WHERE id=?',[$name,$username,$role,$status,$id]);
  if($password!=='')query('UPDATE user_account SET password_hash=? WHERE id=?',[passwordHash($password),$id]);
  if($password!==''||$role!==$old['role']||$status!==$old['status'])query('DELETE FROM session WHERE user_id=?',[$id]);
 }
 if(array_key_exists('photo',$body))savePhoto('account_photo','user_id',$userId,photo($body['photo']));
 audit($u,$id?'ACCOUNT_UPDATED':'ACCOUNT_CREATED',($id?'Updated':'Created').' account '.$name.' ('.$username.'); role '.$role.'; status '.$status,['reason'=>$reason?:null]);
 if($id&&$password!=='')audit($u,'PASSWORD_RESET','Reset password for '.$name.'; existing sessions ended.');
 return one('SELECT id,name,username,role,status FROM user_account WHERE id=?',[$userId]);
}
function recordInteraction(array $u,array $body): array {
 $id=uuidField($body['id']??null);$page=choice($body['page']??null,['dashboard','members','register','renewals','payments','scan','check-ins','analytics','activities','staff','settings'],'page');
 $kind=choice($body['kind']??null,['PAGE_VIEWED','CONTROL_CLICKED','FILTER_CHANGED','MEMBER_PROFILE_VIEWED'],'interaction');
 $label=textField($body,'label',1,120);
 if(in_array($page,['analytics','activities','staff','settings'],true))requireActor($u,true);
 $old=one('SELECT actor_id FROM interaction_receipt WHERE id=?',[$id]);if($old){if($old['actor_id']!==$u['id'])fail('Event belongs to another user',409);return ['ok'=>true];}
 $memberId=null;$description=($kind==='PAGE_VIEWED'?'Opened page: ':($kind==='FILTER_CHANGED'?'Changed control: ':'Clicked control: ')).($kind==='PAGE_VIEWED'?$page:$label).' ('.$page.')';
 if($kind==='MEMBER_PROFILE_VIEWED'){$memberId=uuidField($body['memberId']??null);$m=memberView($memberId);$description='Viewed member profile: '.$m['name'].' ('.$m['code'].')';}
 audit($u,$kind,$description,['outcome'=>'Info','memberId'=>$memberId]);insertRow('interaction_receipt',['id'=>$id,'actor_id'=>$u['id']]);return ['ok'=>true];
}
function memberHistory(array $u,string $id): array {
 memberView($id);
 $events=['MEMBER_REGISTERED','MEMBER_EDITED','PAYMENT_CONFIRMED','ENTITLEMENT_RENEWED','ENTITLEMENT_CANCELLED','MEMBER_ARCHIVED'];
 if($u['role']==='ADMIN')$events[]='MEMBER_PROFILE_VIEWED';
 return rows('SELECT id,event_type,description,reason,created_at FROM activity_log WHERE member_id=? AND event_type IN ('.implode(',',array_fill(0,count($events),'?')).') ORDER BY created_at DESC,seq DESC',[$id,...$events]);
}
function updateFees(array $u,array $body): array {
 requireActor($u,true);$before=fees();
 foreach(['ANNUAL','MONTHLY'] as $fee){$v=$body[$fee]??null;if(!is_int($v)||$v<1||$v>100000000)fail('Fees must be positive amounts up to PHP 1,000,000');query('UPDATE fee_setting SET amount=? WHERE fee_type=?',[$v,$fee]);}
 $after=fees();audit($u,'FEE_UPDATED','Updated fees (centavos): '.json_encode($before).' to '.json_encode($after).'. Existing payments unchanged.');return $after;
}
function updateLogo(array $u,array $body): array {
 requireActor($u,true);if(!array_key_exists('logo',$body))fail('Logo is required');$version='';
 if($body['logo']===null)query("DELETE FROM app_setting WHERE setting_key='brand_logo'");
 else {$image=photo($body['logo'],true);if($image==='')fail('Choose a logo image');$version=uid();$value=json_encode(['image'=>$image,'version'=>$version],JSON_THROW_ON_ERROR);query("INSERT INTO app_setting (setting_key,value) VALUES ('brand_logo',?) ON DUPLICATE KEY UPDATE value=VALUES(value)",[$value]);}
 audit($u,'BRANDING_UPDATED',$version?'Updated the web app logo':'Restored the original web app logo');return ['version'=>$version];
}
function logo(): ?array {$row=one("SELECT value FROM app_setting WHERE setting_key='brand_logo'");return $row?json_decode($row['value'],true,512,JSON_THROW_ON_ERROR):null;}
function setupAdmin(array $body): array {
 $configured=cfg()['setup_token']??'';$supplied=$body['token']??'';
 if(!is_string($configured)||strlen($configured)<32||!is_string($supplied)||!hash_equals($configured,$supplied))fail('Setup token is invalid or setup is disabled.',403);
 return atomic(function()use($body){
  if(one("SELECT value FROM app_setting WHERE setting_key='installed'")||one('SELECT id FROM user_account LIMIT 1'))fail('Setup is already complete.',409);
  $username=strtolower(textField($body,'username',3,40));if(!preg_match('/^[a-z0-9._-]+$/D',$username))fail('Invalid username');
  $u=['id'=>uid(),'name'=>textField($body,'name',2,100),'username'=>$username,'role'=>'ADMIN','status'=>'ACTIVE'];
  insertRow('user_account',[...$u,'password_hash'=>passwordHash(passwordValue($body['password']??null)),'created_at'=>stamp()]);
  insertRow('app_setting',['setting_key'=>'installed','value'=>stamp()]);audit($u,'ACCOUNT_CREATED','Created initial administrator through setup');
  return ['ok'=>true];
 });
}
function objectField(array $body,string $key): array {if(!isset($body[$key])||!is_array($body[$key])||array_is_list($body[$key]))fail("Invalid $key");return $body[$key];}

