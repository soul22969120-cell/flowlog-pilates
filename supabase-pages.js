(async()=>{
  if(location.protocol==='file:') return;
  const base=(window.FLOWLOG_SUPABASE_URL||'https://rvlaxuujzbuyoopseeqt.supabase.co').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'sb_publishable_hmGW4kELcllIw_7hqXzylA_8mHJZ7sm';
  const publicSite='https://soul22969120-cell.github.io/flowlog-pilates/';
  const api=base+'/rest/v1/bookings';
  const tokenKey='flowlog-line-access-token';
  let token=localStorage.getItem(tokenKey)||'';
  let userId='';
  try{userId=JSON.parse(atob((token.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{}
  const loginBtn=el('loginBtn');
  const setLogged=()=>{if(loginBtn){loginBtn.textContent='✓ LINE 已登入';loginBtn.classList.add('logged');el('bookingForm')?.querySelectorAll('label').forEach(x=>x.remove())}};
  const params=new URLSearchParams(location.hash.replace(/^#/,'').replace(/^\?/ ,''));
  if(params.get('access_token')){token=params.get('access_token');localStorage.setItem(tokenKey,token);try{userId=JSON.parse(atob((token.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{}history.replaceState(null,'',location.pathname+location.search);setLogged();toast('LINE 登入成功')}
  else if(token&&userId)setLogged();
  else if(loginBtn)loginBtn.onclick=()=>{location.href=base+'/auth/v1/authorize?provider=custom%3Aline&redirect_to='+encodeURIComponent(publicSite)};
  const headers=()=>({apikey:key,Authorization:'Bearer '+(token||key),'Content-Type':'application/json'});
  const toBooking=row=>({id:row.id,offset:Math.round((new Date(row.booking_date+'T00:00:00')-today)/86400000),time:row.booking_time,name:row.name,birthday:row.birthday_mmdd,status:row.status});
  const load=async()=>{const slotResponse=await fetch(base+'/rest/v1/booking_slots?select=booking_date,booking_time',{headers:headers()});if(!slotResponse.ok)throw Error();seed={};(await slotResponse.json()).forEach(row=>{const key=row.booking_date;(seed[key]||=[]).push(row.booking_time)});if(userId){const ownResponse=await fetch(api+'?select=*&user_id=eq.'+encodeURIComponent(userId)+'&order=booking_date.asc,booking_time.asc',{headers:headers()});if(!ownResponse.ok)throw Error();bookings=(await ownResponse.json()).filter(row=>new Date(row.booking_date+'T00:00:00')>=today).map(toBooking)}else bookings=[];render()};
  el('bookingForm').onsubmit=async e=>{e.preventDefault();if(!userId){toast('請先使用 LINE 登入');return}const f=new FormData(e.target),body={booking_date:dayKey(dateAt(pending.offset)),booking_time:pending.time,name:'LINE 使用者',birthday_mmdd:null,user_id:userId};try{const r=await fetch(api,{method:'POST',headers:{...headers(),Prefer:'return=representation'},body:JSON.stringify(body)});if(r.status===409)throw Error('這個時段剛剛已被預約');if(!r.ok)throw Error('預約失敗，請稍後再試');el('modal').classList.remove('open');e.target.reset();await load();toast('預約成功！已加入我的預約')}catch(err){toast(err.message)}};
  try{await load()}catch{toast('目前無法連線到預約服務')}
})();
