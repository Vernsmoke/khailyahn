<?php
declare(strict_types=1);
class ApiError extends RuntimeException {
 public function __construct(string $message, public int $status=400) {parent::__construct($message);}
}
function fail(string $message,int $status=400): never {throw new ApiError($message,$status);}
function cfg(): array {
 static $config;
 if(!isset($config)){
  $file=__DIR__.'/config.php';
  if(!is_file($file)) fail('Server setup is incomplete. Follow START-HERE.html.',503);
  $config=require $file;
  if(!is_array($config)||empty($config['app_origin'])||str_starts_with($config['db_name']??'','REPLACE_')) fail('Server configuration is incomplete.',503);
  $origin=$config['app_origin'];
  $local=preg_match('~^http://(127\.0\.0\.1|localhost)(:\d+)?$~D',$origin);
  if(!$local&&(!str_starts_with($origin,'https://')||($config['cookie_secure']??false)!==true))fail('HTTPS configuration is required.',503);
 }
 return $config;
}
function db(): PDO {
 static $pdo;
 if(!$pdo){$c=cfg();$pdo=new PDO("mysql:host={$c['db_host']};port={$c['db_port']};dbname={$c['db_name']};charset=utf8mb4",$c['db_user'],$c['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);}
 return $pdo;
}
function query(string $sql,array $values=[]): PDOStatement {$s=db()->prepare($sql);$s->execute($values);return $s;}
function one(string $sql,array $values=[]): ?array {$r=query($sql,$values)->fetch();return $r===false?null:$r;}
function rows(string $sql,array $values=[]): array {return query($sql,$values)->fetchAll();}
function insertRow(string $table,array $row): void {
 // Table/column names are internal constants, never request input.
 query('INSERT INTO '.$table.' ('.implode(',',array_keys($row)).') VALUES ('.implode(',',array_fill(0,count($row),'?')).')',array_values($row));
}
function atomic(callable $fn): mixed {
 db()->beginTransaction();
 try{query('SELECT id FROM app_lock WHERE id=1 FOR UPDATE');$result=$fn();db()->commit();return $result;}
 catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
function uid(): string {$h=bin2hex(random_bytes(16));return substr($h,0,8).'-'.substr($h,8,4).'-4'.substr($h,13,3).'-'.dechex(8+(hexdec($h[16])%4)).substr($h,17,3).'-'.substr($h,20);}
function stamp(): string {return gmdate('Y-m-d\TH:i:s').sprintf('.%03dZ',(int)((microtime(true)*1000)%1000));}
function today(): string {return (new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->format('Y-m-d');}
function dayOf(string $stamp): string {return (new DateTimeImmutable($stamp))->setTimezone(new DateTimeZone('Asia/Manila'))->format('Y-m-d');}
function validDate(mixed $value): string {
 if(!is_string($value)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value))fail('Use a valid YYYY-MM-DD date');
 $d=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('UTC'));
 if(!$d||$d->format('Y-m-d')!==$value)fail('Invalid calendar date');
 return $value;
}
function days(string $date,int $days): string {return (new DateTimeImmutable($date,new DateTimeZone('UTC')))->modify(($days>=0?'+':'').$days.' days')->format('Y-m-d');}
function months(string $date,int $months): string {
 $d=new DateTimeImmutable(substr($date,0,7).'-01',new DateTimeZone('UTC'));
 $d=$d->modify('+'.$months.' months');
 return $d->format('Y-m-').str_pad((string)min((int)substr($date,8,2),(int)$d->format('t')),2,'0',STR_PAD_LEFT);
}
function textField(array $data,string $key,int $min,int $max,string $default=''): string {
 $v=$data[$key]??$default;if(!is_string($v))fail("Invalid $key");
 $v=trim($v);$length=mb_strlen($v);if($length<$min||$length>$max)fail("$key must contain $min to $max characters");return $v;
}
function choice(mixed $v,array $allowed,string $name): string {if(!is_string($v)||!in_array($v,$allowed,true))fail("Invalid $name");return $v;}
function uuidField(mixed $v): string {if(!is_string($v)||!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$v))fail('Invalid submission ID');return strtolower($v);}
function audit(?array $user,string $event,string $description,array $opts=[]): void {
 insertRow('activity_log',['id'=>uid(),'actor_id'=>$user['id']??null,'actor_name'=>$user['name']??'System','actor_role'=>$user['role']??null,
 'member_id'=>$opts['memberId']??null,'payment_id'=>$opts['paymentId']??null,'annual_id'=>$opts['annualId']??null,'monthly_id'=>$opts['monthlyId']??null,
 'event_type'=>$event,'description'=>$description,'outcome'=>$opts['outcome']??'Success','reason'=>$opts['reason']??null,'created_at'=>stamp()]);
}
function limitRequests(string $bucket,int $max,int $seconds): void {
 $key=hash('sha256',$bucket);$now=time();
 query('INSERT INTO request_limit (bucket,hits,expires_at) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=IF(expires_at<=?,1,hits+1),expires_at=IF(expires_at<=?,VALUES(expires_at),expires_at)',[$key,$now+$seconds,$now,$now]);
 $r=one('SELECT hits FROM request_limit WHERE bucket=?',[$key]);
 if((int)$r['hits']>$max)fail('Too many requests. Please try again later.',429);
 if(random_int(1,100)===1)query('DELETE FROM request_limit WHERE expires_at<?',[$now]);
}
function token(): string {
 $value=$_COOKIE['gym_session']??'';
 return is_string($value)?$value:'';
}
function actor(): ?array {
 $token=token();if(!preg_match('/^[a-f0-9]{64}$/D',$token))return null;
 return one("SELECT u.id,u.name,u.username,u.role,u.status FROM session s JOIN user_account u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='ACTIVE'",[hash('sha256',$token),stamp()]);
}
function requireActor(?array $u,bool $admin=false): array {if(!$u)fail('Please sign in to continue',401);if($admin&&$u['role']!=='ADMIN')fail('Administrator access required',403);return $u;}
function sessionCookie(string $token,int $expires): void {setcookie('gym_session',$token,['expires'=>$expires,'path'=>'/','secure'=>cfg()['cookie_secure'],'httponly'=>true,'samesite'=>'Lax']);}
function passwordValue(mixed $v): string {if(!is_string($v)||strlen($v)<12||strlen($v)>128)fail('Passwords must contain 12 to 128 characters');return $v;}
function passwordHash(string $v): string {
 // SHA-256 prehash avoids bcrypt's 72-byte truncation on PHP installations without Argon2.
 return 'sha256-bcrypt:'.password_hash(hash('sha256',$v),PASSWORD_BCRYPT,['cost'=>12]);
}
function passwordVerify(string $v,string $hash): bool {return str_starts_with($hash,'sha256-bcrypt:')&&password_verify(hash('sha256',$v),substr($hash,14));}
function loginUser(array $body): array {
 $username=strtolower(textField($body,'username',1,40));$password=$body['password']??'';
 if(!is_string($password)||strlen($password)<1||strlen($password)>128)fail('Invalid credentials',401);
 limitRequests('login:name:'.$username,5,900);
 $u=one('SELECT * FROM user_account WHERE username=?',[$username]);
 $hash=$u['password_hash']??'sha256-bcrypt:$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
 $valid=passwordVerify($password,$hash);
 if(!$valid||!$u||$u['status']!=='ACTIVE'){audit(null,'USER_LOGIN','Unsuccessful sign-in attempt',['outcome'=>'Failed']);fail('Invalid credentials or inactive account',401);}
 unset($u['password_hash'],$u['created_at']);$token=bin2hex(random_bytes(32));
 atomic(function()use($username,$u,$token){
  query('DELETE FROM request_limit WHERE bucket=?',[hash('sha256','login:name:'.$username)]);
  query('DELETE FROM session WHERE expires_at<=?',[stamp()]);
  $old=rows('SELECT token_hash FROM session WHERE user_id=? ORDER BY created_at DESC,token_hash DESC',[$u['id']]);
  foreach(array_slice($old,4) as $s)query('DELETE FROM session WHERE token_hash=?',[$s['token_hash']]);
  insertRow('session',['token_hash'=>hash('sha256',$token),'user_id'=>$u['id'],'expires_at'=>gmdate('Y-m-d\TH:i:s.000\Z',time()+28800),'created_at'=>stamp()]);
  audit($u,'USER_LOGIN',$u['name'].' signed in');
 });
 sessionCookie($token,time()+28800);return ['user'=>$u];
}
function photo(mixed $data,bool $logo=false): string {
 if($data==='')return '';
 if(!is_string($data)||strlen($data)>1400000||!preg_match('~^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$~D',$data,$m))fail('Choose a JPEG, PNG or WebP photo under 1 MB.');
 $bytes=base64_decode($m[2],true);if($bytes===false||strlen($bytes)>1048576)fail('Photo must be under 1 MB.');
 $info=@getimagesizefromstring($bytes);
 if(!$info||$info[0]*$info[1]>25000000||!in_array($info[2],[IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_WEBP],true))fail('Invalid or oversized image');
 if(!function_exists('imagecreatefromstring'))fail('Enable the PHP GD extension in hosting settings.',503);
 $source=@imagecreatefromstring($bytes);if(!$source)fail('Image could not be read');
 $scale=min(1,512/max($info[0],$info[1]));$w=max(1,(int)round($info[0]*$scale));$h=max(1,(int)round($info[1]*$scale));
 $dest=imagecreatetruecolor($w,$h);
 if($logo){imagealphablending($dest,false);imagesavealpha($dest,true);imagefill($dest,0,0,imagecolorallocatealpha($dest,0,0,0,127));}
 else imagefill($dest,0,0,imagecolorallocate($dest,255,255,255));
 imagecopyresampled($dest,$source,0,0,0,0,$w,$h,$info[0],$info[1]);
 ob_start();if($logo)imagepng($dest);else imagejpeg($dest,null,85);$result=ob_get_clean();imagedestroy($source);imagedestroy($dest);
 return 'data:image/'.($logo?'png':'jpeg').';base64,'.base64_encode($result);
}
function savePhoto(string $table,string $key,string $id,string $image): void {
 if($image===''){query("DELETE FROM $table WHERE $key=?",[$id]);return;}
 query("INSERT INTO $table ($key,image,version) VALUES (?,?,?) ON DUPLICATE KEY UPDATE image=VALUES(image),version=VALUES(version)",[$id,$image,uid()]);
}
function fees(): array {$v=[];foreach(rows('SELECT fee_type,amount FROM fee_setting') as $r)$v[$r['fee_type']]=(int)$r['amount'];return $v;}
function eligible(?array $member,?array $annual,?array $monthly,string $day): array {
 $deny=fn($r,$renewal=null)=>['approved'=>false,'reason'=>$r,'renewal'=>$renewal];
 if(!$member)return $deny('Unknown or unregistered QR code');
 if($member['status']==='ARCHIVED')return $deny('Member is archived');
 if(!$annual)return $deny('Annual membership is inactive','ANNUAL');
 if($annual['status']==='CANCELLED')return $deny('Annual membership is cancelled','ANNUAL');
 if($day<$annual['start_date'])return $deny('Annual membership has not started','ANNUAL');
 if($day>($annual['grace_end']??$annual['expires_on']))return $deny('Annual membership expired beyond grace','ANNUAL');
 if(!$monthly)return $deny('Monthly access is inactive','MONTHLY');
 if($monthly['status']==='CANCELLED')return $deny('Monthly access is cancelled','MONTHLY');
 if($day<$monthly['start_date'])return $deny('Monthly access has not started','MONTHLY');
 if($day>$monthly['expires_on'])return $deny('Monthly access has expired','MONTHLY');
 $grace=$day>=$annual['expires_on'];return ['approved'=>true,'reason'=>$grace?'Entry approved · annual grace period':'Entry approved','renewal'=>null,'grace'=>$grace];
}
function memberView(string $id): array {
 $m=one('SELECT * FROM member WHERE id=?',[$id]);if(!$m)fail('Member not found',404);
 $m['annual']=one('SELECT * FROM annual_membership WHERE member_id=?',[$id]);
 $m['monthly']=one('SELECT * FROM monthly_access WHERE member_id=?',[$id]);
 $m['photo_version']=one('SELECT version FROM member_photo WHERE member_id=?',[$id])['version']??null;
 $m['eligibility']=eligible($m,$m['annual'],$m['monthly'],today());return $m;
}
function members(string $search='',string $status=''): array {
 $args=[];$sql='SELECT id FROM member WHERE 1=1';
 if($search!==''){$sql.=' AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)';$args=array_fill(0,3,'%'.$search.'%');}
 if($status!==''){$sql.=' AND status=?';$args[]=$status;}
 return array_map(fn($r)=>memberView($r['id']),rows($sql.' ORDER BY created_at DESC',$args));
}
function memberInput(array $data): array {
 $r=[];foreach(['name'=>[2,100],'address'=>[3,300],'emergency_name'=>[2,100],'phone'=>[7,24],'emergency_phone'=>[7,24],'email'=>[0,254]] as $k=>$bounds)$r[$k]=textField($data,$k,...$bounds);
 foreach(['phone','emergency_phone'] as $k)if(!preg_match('/^[+\d ()-]+$/D',$r[$k]))fail('Invalid phone number');
 if($r['email']!==''&&!filter_var($r['email'],FILTER_VALIDATE_EMAIL))fail('Invalid email address');
 $r['birth_date']=validDate($data['birth_date']??null);if($r['birth_date']<'1900-01-01'||$r['birth_date']>today())fail('Enter a valid birth date');
 $r['blood_type']=choice($data['blood_type']??'',['','A+','A-','B+','B-','AB+','AB-','O+','O-'],'blood type');
 if(array_key_exists('photo',$data))$r['photo']=photo($data['photo']);return $r;
}
function paymentInput(array $data): array {
 if(($data['confirmed']??false)!==true)fail('Confirm receipt of payment before continuing');
 $r=['fee_type'=>choice($data['fee_type']??null,['ANNUAL','MONTHLY'],'fee'),'method'=>choice($data['method']??null,['Cash','GCash','Other'],'payment method'),
 'payment_date'=>validDate($data['payment_date']??null),'confirmed'=>true,'idempotency_key'=>uuidField($data['idempotency_key']??null)];
 if($r['payment_date']<'2000-01-01'||$r['payment_date']>today())fail('Payment date must not be in the future');
 if(isset($data['expected_amount'])){if(!is_int($data['expected_amount'])||$data['expected_amount']<=0)fail('Invalid expected amount');$r['expected_amount']=$data['expected_amount'];}
 return $r;
}
function fingerprint(array $data): string {return hash('sha256',json_encode($data,JSON_THROW_ON_ERROR));}
function previousPayment(array $u,string $key,string $hash): ?array {
 $p=one('SELECT * FROM payment WHERE idempotency_key=?',[$key]);
 if($p&&($p['request_hash']!==$hash||$p['recorded_by']!==$u['id']))fail('This submission key was already used for different payment details',409);return $p;
}
function insertPayment(array $u,string $member,array $p,string $hash,string $start,string $end): string {
 $amount=fees()[$p['fee_type']];if(isset($p['expected_amount'])&&$p['expected_amount']!==$amount)fail('The fee has changed. Reload this page to review the latest price before confirming payment.',409);
 $id=uid();insertRow('payment',['id'=>$id,'member_id'=>$member,'fee_type'=>$p['fee_type'],'amount'=>$amount,'method'=>$p['method'],'payment_date'=>$p['payment_date'],
 'recorded_by'=>$u['id'],'created_at'=>stamp(),'idempotency_key'=>$p['idempotency_key'],'request_hash'=>$hash,'period_start'=>$start,'period_end'=>$end]);return $id;
}
function preview(array $m,string $fee,string $date): array {
 choice($fee,['ANNUAL','MONTHLY'],'fee');validDate($date);if($date<'2000-01-01'||$date>today())fail('Invalid payment date');
 $e=$m[$fee==='ANNUAL'?'annual':'monthly'];$continue=$e&&$e['status']==='ACTIVE'&&($fee==='ANNUAL'||$e['expires_on']>=today());
 $base=$continue?$e['expires_on']:$date;$end=months($base,$fee==='ANNUAL'?12:1);
 $r=['start'=>$continue?$e['start_date']:$date,'period_start'=>$base,'end'=>$end];
 if($fee==='ANNUAL')$r['grace_end']=days($end,14);return $r;
}

