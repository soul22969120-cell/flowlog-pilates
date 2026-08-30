(async()=>{
  if(location.protocol==='file:') return;
  const base=(window.FLOWLOG_SUPABASE_URL||'https://rvlaxuujzbuyoopseeqt.supabase.co').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'sb_publishable_hmGW4kELcllIw_7hqXzylA_8mHJZ7sm';
  const publicSite='https://soul22969120-cell.github.io/flowlog-pilates/';
  const loginBtn=el('loginBtn');
  if(loginBtn){
    const params=new URLSearchParams(location.hash.replace(/^#/,'').replace(/^\?/ ,''));
    if(params.get('access_token')){
      loginBtn.textContent='✓ LINE 已登入';
      loginBtn.classList.add('logged');
      toast('LINE 登入成功');
      history.replaceState(null,'',location.pathname+location.search);
    }else{
      loginBtn.onclick=()=>{location.href=base+'/auth/v1/authorize?provider=custom%3Aline&redirect_to='+encodeURIComponent(publicSite)};
    }
  }
  const api=base+'/rest/v1/bookings';
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  const toBooking=row=>({id:row.id,birthday:row.birthday_mmdd,offset:Math.round((new Date(row.booking_date+'T00:00:00')-today)/86400000),time:row.booking_time,name:row.name,phone:'',status:row.status});
  const load=async()=>{const r=await fetch(api+'?select=*&order=booking_date.asc,booking_time.asc',{headers});if(!r.ok)throw Error();bookings=(await r.json()).filter(row=>new Date(row.booking_date+'T00:00:00')>=today).map(toBooking);seed={};render()};
  el('bookingForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),digits=String(f.get('birthday_mmdd')||'').replace(/\D/g,'').slice(0,4),birthday_mmdd=digits.length===3?`0${digits[0]}/${digits.slice(1)}`:digits.length===4?`${digits.slice(0,2)}/${digits.slice(2)}`:digits;if(!/^\d{2}\/\d{2}$/.test(birthday_mmdd)){toast('請輸入生日月／日，例如 0825');return}try{const r=await fetch(api,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({booking_date:dayKey(dateAt(pending.offset)),booking_time:pending.time,name:String(f.get('name')).trim(),birthday_mmdd})});if(r.status===409)throw Error('這個時段剛剛已被預約');if(!r.ok)throw Error('預約失敗，請稍後再試');el('modal').classList.remove('open');e.target.reset();await load();toast('預約成功！之後請用姓名＋生日管理預約')}catch(err){toast(err.message)}};
  try{await load()}catch{toast('目前無法連線到預約服務')}
})();
