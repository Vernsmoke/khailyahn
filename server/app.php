<?php
declare(strict_types=1);
ini_set('display_errors','0');
require __DIR__.'/core.php';
require __DIR__.'/operations.php';
require __DIR__.'/reports.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
$reference=bin2hex(random_bytes(8));
header('X-Request-ID: '.$reference);
function respond(mixed $body,int $status=200): never {http_response_code($status);echo json_encode($body,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);exit;}
function sendImage(string $data): never {
 if(!preg_match('~^data:image/(jpeg|png);base64,(.+)$~D',$data,$m))fail('Image not found',404);
 header('Content-Type: image/'.$m[1]);echo base64_decode($m[2]);exit;
}
$method=$_SERVER['REQUEST_METHOD']??'GET';$u=null;$route='';
try{
 cfg();
 $path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);
 if(!is_string($path)||!str_starts_with($path,'/api/'))fail('Endpoint not found',404);
 $route=trim(substr($path,5),'/');$parts=explode('/',$route);
 if(!in_array($method,['GET','POST','PATCH'],true)){header('Allow: GET, POST, PATCH');fail('Method not allowed',405);}
 // Never trust arbitrary forwarded IP headers on shared hosting.
 $address=$_SERVER['REMOTE_ADDR']??'unknown';limitRequests('api:ip:'.$address,600,60);limitRequests('api:global',3000,60);
 if($route==='login'){limitRequests('login:ip:'.$address,30,60);limitRequests('login:global',120,60);}
 $body=[];
 if($method!=='GET'){
  $origin=$_SERVER['HTTP_ORIGIN']??'';
  if($origin!==cfg()['app_origin']||($_SERVER['HTTP_X_GYM_REQUEST']??'')!=='1')fail('Request origin verification failed',403);
  if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))fail('Send JSON requests',415);
  $max=in_array($parts[0],['members','staff','branding'],true)?1500000:16384;
  $raw=file_get_contents('php://input',false,null,0,$max+1);if($raw===false||strlen($raw)>$max)fail('Request is too large',413);
  try{$body=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException){fail('Invalid JSON');}
  if(!is_array($body)||(array_is_list($body)&&$body!==[]))fail('Send a JSON object');
 }
 foreach($_GET as $value)if(!is_string($value)||strlen($value)>12000)fail('Invalid query parameter');
 $p=$_GET;
 if($route==='setup'&&$method==='POST'){limitRequests('setup:ip:'.$address,5,900);respond(setupAdmin($body),201);}
 if($route==='branding/logo'&&$method==='GET'){
  $logo=logo();if(!$logo){header('Location: /brand/kha-il-yahn-logo.png',true,307);exit;}sendImage($logo['image']);
 }
 $u=actor();
 if($route==='bootstrap'&&$method==='GET')respond(['user'=>$u,'version'=>logo()['version']??'']);
 if($route==='login'&&$method==='POST')respond(loginUser($body));
 $u=requireActor($u);limitRequests('api:user:'.$u['id'],600,60);
 if(in_array($parts[0],['analytics','activities','staff','security','branding'],true))requireActor($u,true);
 if($method==='GET'){
  if($route==='me')respond($u);
  if($route==='fees')respond(fees());
  if($route==='dashboard')respond(dashboard($u));
  if($route==='members')respond(members($p['search']??'',$p['status']??''));
  if($parts[0]==='members'&&count($parts)===2)respond(memberView($parts[1]));
  if($parts[0]==='members'&&count($parts)===3){
   if($parts[2]==='history')respond(memberHistory($u,$parts[1]));
   if($parts[2]==='preview')respond(preview(memberView($parts[1]),$p['fee']??'', $p['date']??''));
   if($parts[2]==='photo'){$photo=one('SELECT image FROM member_photo WHERE member_id=?',[$parts[1]]);if(!$photo)fail('Photo not found',404);sendImage($photo['image']);}
  }
  if($route==='payments')respond(paymentRecords($p));
  if($route==='check-ins')respond(checkRecords($p));
  if($route==='analytics')respond(analytics($u,$p));
  if($route==='activities')respond(activityRecords($u,$p));
  if($route==='staff')respond(rows('SELECT u.id,u.name,u.username,u.role,u.status,p.version photo_version FROM user_account u LEFT JOIN account_photo p ON p.user_id=u.id ORDER BY u.name'));
  if($parts[0]==='staff'&&count($parts)===3&&$parts[2]==='photo'){$photo=one('SELECT image FROM account_photo WHERE user_id=?',[$parts[1]]);if(!$photo)fail('Photo not found',404);sendImage($photo['image']);}
  if($route==='security')respond(['arcjet'=>'NOT_APPLICABLE','configurationIssues'=>[],'localRateLimits'=>true,'monitoring'=>'PHP/MySQL request throttling and Activity Logs. Arcjet is not part of this PHP build.']);
  fail('Endpoint not found',404);
 }
 $result=atomic(function()use($u,$body,$method,$route,$parts){
  // Revalidate after taking the mutation lock: an administrator may have revoked this session.
  $current=requireActor(actor());if(in_array($parts[0],['analytics','activities','staff','security','branding'],true))requireActor($current,true);
  $u=$current;
  if($route==='logout'&&$method==='POST'){query('DELETE FROM session WHERE token_hash=?',[hash('sha256',token())]);audit($u,'USER_LOGOUT',$u['name'].' signed out');return ['ok'=>true];}
  if($route==='members'&&$method==='POST')return registerMember($u,$body);
  if($parts[0]==='members'&&count($parts)===2&&$method==='PATCH')return editMember($u,$parts[1],$body);
  if($parts[0]==='members'&&count($parts)===3&&$method==='POST'){
   if($parts[2]==='payments')return renewMember($u,$parts[1],$body);
   if($parts[2]==='cancel')return cancelMember($u,$parts[1],$body);
  }
  if($route==='scan'&&$method==='POST')return scanMember($u,$body);
  if($route==='interactions'&&$method==='POST')return recordInteraction($u,$body);
  if($route==='staff'&&$method==='POST')return saveStaff($u,$body);
  if($parts[0]==='staff'&&count($parts)===2&&$method==='PATCH')return saveStaff($u,$body,$parts[1]);
  if($route==='fees'&&$method==='PATCH')return updateFees($u,$body);
  if($route==='branding/logo'&&$method==='PATCH')return updateLogo($u,$body);
  fail('Endpoint not found',404);
 });
 if($route==='logout')sessionCookie('',time()-3600);
 respond($result,$method==='POST'&&($route==='members'||$route==='staff'||($parts[2]??'')==='payments')?201:200);
}catch(Throwable $error){
 if(dbTransactionOpen())db()->rollBack();
 $status=$error instanceof ApiError?$error->status:500;
 if($status===429)header('Retry-After: 900');
 $message=$error instanceof ApiError?$error->getMessage():'Something went wrong. Contact your administrator with reference '.$reference.'.';
 if($status>=500)error_log('Gym request '.$reference.' failed: '.get_class($error).' '.$error->getMessage());
 if($u&&$method==='POST'&&($route==='members'||($parts[2]??'')==='payments')){
  try{audit($u,'PAYMENT_ATTEMPT','Payment submission was not completed',['outcome'=>'Failed','reason'=>$error instanceof ApiError?$message:'Transaction rolled back']);}catch(Throwable){}
 }
 respond(['error'=>$message,'requestId'=>$reference],$status);
}
function dbTransactionOpen(): bool {try{return db()->inTransaction();}catch(Throwable){return false;}}

