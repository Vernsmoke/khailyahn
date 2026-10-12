<?php
declare(strict_types=1);
function dateRange(array $p): callable {
 $from=$p['from']??'';$to=$p['to']??'';if($from!=='')validDate($from);if($to!=='')validDate($to);
 if($from!==''&&$to!==''&&$from>$to)fail('Start date must be on or before end date');
 return fn(string $d)=>($from===''||$d>=$from)&&($to===''||$d<=$to);
}
function matchesSearch(string $haystack,array $p): bool {return mb_strpos(mb_strtolower($haystack),mb_strtolower($p['search']??''))!==false;}
function paymentRecords(array $p=[]): array {
 $include=dateRange($p);$result=[];
 foreach(rows('SELECT p.id,p.member_id,p.fee_type,p.amount,p.method,p.payment_date,p.recorded_by,p.created_at,p.period_start,p.period_end,m.name member_name,m.code,u.name recorder FROM payment p JOIN member m ON m.id=p.member_id JOIN user_account u ON u.id=p.recorded_by ORDER BY p.payment_date DESC,p.created_at DESC') as $r){
  if(!$include($r['payment_date'])||(!empty($p['fee'])&&$r['fee_type']!==$p['fee'])||(!empty($p['member'])&&$r['member_id']!==$p['member'])||!matchesSearch($r['member_name'].' '.$r['code'],$p))continue;
  $r['amount']=(int)$r['amount'];$result[]=$r;
 }return $result;
}
function checkRecords(array $p=[]): array {
 $include=dateRange($p);
 return array_values(array_filter(rows('SELECT c.*,m.name member_name,m.code,u.name scanner FROM check_in_log c LEFT JOIN member m ON m.id=c.member_id JOIN user_account u ON u.id=c.scanner_id ORDER BY c.scanned_at DESC'),
 fn($r)=>$include(dayOf($r['scanned_at']))&&(empty($p['result'])||$r['result']===$p['result'])&&(empty($p['member'])||$r['member_id']===$p['member'])&&matchesSearch(($r['member_name']??'Unknown QR').' '.($r['code']??''),$p)));
}
function analytics(array $u,array $p=[]): array {
 requireActor($u,true);$records=paymentRecords($p);$groups=[];$annual=0;$monthly=0;
 foreach($records as $r){$month=substr($r['payment_date'],0,7);if(!isset($groups[$month]))$groups[$month]=['month'=>$month,'annual'=>0,'monthly'=>0];
 $fee=$r['fee_type']==='ANNUAL'?'annual':'monthly';$groups[$month][$fee]+=$r['amount'];if($fee==='annual')$annual+=$r['amount'];else $monthly+=$r['amount'];}
 ksort($groups);return ['total'=>$annual+$monthly,'annual'=>$annual,'monthly'=>$monthly,'count'=>count($records),'trend'=>array_values($groups)];
}
function activityRecords(array $u,array $p=[]): array {
 requireActor($u,true);$include=dateRange($p);$all=rows('SELECT a.*,m.name member_name,m.code FROM activity_log a LEFT JOIN member m ON m.id=a.member_id ORDER BY a.created_at DESC,a.seq DESC');
 $day=today();$daily=['total'=>0,'staffLogins'=>0,'payments'=>0,'memberEdits'=>0];$types=[];$records=[];
 foreach($all as $r){
  unset($r['seq']);$types[$r['event_type']]=true;
  if(dayOf($r['created_at'])===$day){
   $daily['total']++;if($r['event_type']==='USER_LOGIN'&&$r['actor_role']==='STAFF'&&$r['outcome']==='Success')$daily['staffLogins']++;
   if($r['event_type']==='PAYMENT_CONFIRMED'&&$r['payment_id']&&$r['outcome']==='Success')$daily['payments']++;
   if($r['event_type']==='MEMBER_EDITED'&&$r['outcome']==='Success')$daily['memberEdits']++;
  }
  $category=in_array($r['event_type'],['PAGE_VIEWED','CONTROL_CLICKED','FILTER_CHANGED','MEMBER_PROFILE_VIEWED'],true)?'interaction':'operation';
  if($include(dayOf($r['created_at']))&&(empty($p['category'])||$category===$p['category'])&&(empty($p['type'])||$r['event_type']===$p['type'])&&(empty($p['actor'])||$r['actor_id']===$p['actor'])&&matchesSearch($r['description'].' '.($r['member_name']??'').' '.($r['code']??''),$p))$records[]=$r;
 }
 $types=array_keys($types);sort($types);return ['records'=>$records,'daily'=>$daily,'actors'=>rows('SELECT id,name FROM user_account ORDER BY name'),'types'=>$types];
}
function dashboard(array $u): array {
 $day=today();$members=members();$visits=checkRecords(['from'=>days($day,-6),'to'=>$day]);
 $alerts=array_values(array_filter($members,fn($m)=>$m['status']==='REGISTERED'&&$m['annual']&&$m['annual']['status']==='ACTIVE'&&$m['annual']['expires_on']<=days($day,14)));
 usort($alerts,fn($a,$b)=>strcmp($a['annual']['expires_on'],$b['annual']['expires_on']));
 $daily=array_filter($visits,fn($r)=>dayOf($r['scanned_at'])===$day);$trend=[];
 for($i=-6;$i<=0;$i++){$date=days($day,$i);$trend[]=['date'=>$date,'count'=>count(array_filter($visits,fn($r)=>dayOf($r['scanned_at'])===$date&&$r['result']==='APPROVED'))];}
 $result=['members'=>count(array_filter($members,fn($m)=>$m['status']==='REGISTERED')),'eligible'=>count(array_filter($members,fn($m)=>$m['eligibility']['approved'])),
 'checkIns'=>count(array_filter($daily,fn($r)=>$r['result']==='APPROVED')),'denied'=>count(array_filter($daily,fn($r)=>$r['result']==='DENIED')),
 'alerts'=>array_slice($alerts,0,6),'alertsCount'=>count($alerts),'recent'=>array_slice(checkRecords(),0,5),'payments'=>array_slice(paymentRecords(),0,5),'demo'=>false,'visits'=>$trend];
 if($u['role']==='ADMIN'){$result['revenueToday']=analytics($u,['from'=>$day,'to'=>$day])['total'];$result['analytics']=analytics($u);}
 return $result;
}

