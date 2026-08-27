(async()=>{
  const base=(window.FLOWLOG_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'';
  if(!base||!key||key.startsWith('請')) return;
  const api=base+'/rest/v1/bookings';
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  const toBooking=row=>({id:row.id,offset:Math.round((new Date(row.booking_date+'T00:00:00')-today)/86400000),time:row.booking_time,name:row.name,phone:'',status:row.status});
  const load=async()=>{const r=await fetch(api+'?select=*&order=booking_date.asc,booking_time.asc',{headers});if(!r.ok)throw Error();bookings=(await r.json()).filter(row=>new Date(row.booking_date+'T00:00:00')>=today).map(toBooking);seed={};render()};
  el('bookingForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const r=await fetch(api,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({booking_date:dayKey(dateAt(pending.offset)),booking_time:pending.time,name:String(f.get('name')).trim()})});if(r.status===409)throw Error('這個時段剛剛已被預約');if(!r.ok)throw Error('預約失敗，請稍後再試');el('modal').classList.remove('open');e.target.reset();await load();toast('預約成功！時段已為你鎖定')}catch(err){toast(err.message)}};
  try{await load()}catch{toast('目前無法連線到預約服務')}
})();
