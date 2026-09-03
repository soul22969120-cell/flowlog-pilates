(async()=>{
  if(location.protocol==='file:') return;
  const base=(window.FLOWLOG_SUPABASE_URL||'https://rvlaxuujzbuyoopseeqt.supabase.co').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'sb_publishable_hmGW4kELcllIw_7hqXzylA_8mHJZ7sm';
  const publicSite='https://soul22969120-cell.github.io/flowlog-pilates/';
  const api=base+'/rest/v1/bookings';
  const tokenKey='flowlog-line-access-token';
  let token=localStorage.getItem(tokenKey)||'';
  let userId='',lineName='LINE 使用者';
  const exposeUser=()=>{window.FLOWLOG_LINE_USER_ID=userId;window.FLOWLOG_LINE_NAME=lineName};
  try{userId=JSON.parse(atob((token.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{}
  const loginBtn=el('loginBtn');
  const setLogged=()=>{exposeUser();if(loginBtn){loginBtn.textContent='✓ LINE 已登入';loginBtn.classList.add('logged');el('bookingForm')?.querySelectorAll('label').forEach(x=>x.remove())}};
  const loadProfile=async()=>{if(!token)return;try{const r=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});if(!r.ok)return;const u=await r.json(),m=u.user_metadata||{},identity=(u.identities||[]).map(x=>x.identity_data||{}).find(x=>x.name||x.displayName||x.display_name||x.nickname)||{};userId=u.id||userId;lineName=m.full_name||m.display_name||m.displayName||m.name||m.nickname||m.user_name||identity.name||identity.displayName||identity.display_name||identity.nickname||u.email||lineName}catch{}};
  const rememberStudent=async()=>{if(!userId||!lineName||lineName==='LINE 使用者')return;const saved=JSON.parse(localStorage.getItem('flowlog-known-students')||'[]').filter(row=>row.user_id!==userId);saved.push({user_id:userId,name:lineName});localStorage.setItem('flowlog-known-students',JSON.stringify(saved));await fetch(base+'/rest/v1/student_profiles',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:userId,display_name:lineName,updated_at:new Date().toISOString()})}).catch(()=>null)};
  const params=new URLSearchParams(location.hash.replace(/^#/,'').replace(/^\?/ ,''));
  if(params.get('access_token')){token=params.get('access_token');localStorage.setItem(tokenKey,token);try{userId=JSON.parse(atob((token.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{}history.replaceState(null,'',location.pathname+location.search);await loadProfile();await rememberStudent();setLogged();toast('LINE 登入成功')}
  else if(token&&userId){await loadProfile();await rememberStudent();setLogged();}
  else if(loginBtn)loginBtn.onclick=()=>{location.href=base+'/auth/v1/authorize?provider=custom%3Aline-oauth&redirect_to='+encodeURIComponent(publicSite)};
  if(token&&!userId){localStorage.removeItem(tokenKey);token=''}
  const publicHeaders=()=>({apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'});
  const headers=()=>({apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'});
  const toBooking=row=>({id:row.id,offset:Math.round((new Date(row.booking_date+'T00:00:00')-today)/86400000),time:row.booking_time,name:row.name,phone:row.phone||'',status:row.status});
  const syncOwnName=async rows=>{
    if(!userId||!lineName||lineName==='LINE 使用者')return;
    const stale=rows.filter(row=>row.name!==lineName);
    await Promise.all(stale.map(row=>fetch(api+'?id=eq.'+encodeURIComponent(row.id),{method:'PATCH',headers:{...headers(),Prefer:'return=minimal'},body:JSON.stringify({name:lineName})}).catch(()=>null)));
  };
  const load=async()=>{const slotResponse=await fetch(base+'/rest/v1/booking_slots?select=booking_date,booking_time',{headers:publicHeaders()});if(!slotResponse.ok)throw Error('時段讀取失敗 '+slotResponse.status);seed={};(await slotResponse.json()).forEach(row=>{const key=row.booking_date;(seed[key]||=[]).push(row.booking_time)});if(userId&&token){const ownResponse=await fetch(api+'?select=*&user_id=eq.'+encodeURIComponent(userId)+'&order=booking_date.asc,booking_time.asc',{headers:headers()});if(!ownResponse.ok)throw Error('我的預約讀取失敗 '+ownResponse.status);const rows=await ownResponse.json();await syncOwnName(rows);bookings=rows.filter(row=>new Date(row.booking_date+'T00:00:00')>=today).map(row=>toBooking({...row,name:lineName||row.name}))}else bookings=[];render()};
  el('bookingForm').onsubmit=async e=>{e.preventDefault();if(!userId){toast('請先使用 LINE 登入');return}const body={booking_date:dayKey(dateAt(pending.offset)),booking_time:pending.time,name:lineName,phone:null,user_id:userId};try{const r=await fetch(api,{method:'POST',headers:{...headers(),Prefer:'return=representation'},body:JSON.stringify(body)});if(r.status===409)throw Error('這個時段剛剛已被預約');if(!r.ok)throw Error('預約失敗，請稍後再試');el('modal').classList.remove('open');e.target.reset();await load();toast('預約成功！已加入我的預約')}catch(err){toast(err.message)}};
  try{await load()}catch(err){console.error('FlowLog booking service:',err);toast('目前無法連線到預約服務（'+(err.message||'未知錯誤')+'）')}
})();
