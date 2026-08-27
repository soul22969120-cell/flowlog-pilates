(async()=>{
  const base=(window.FLOWLOG_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'';
  if(!base||!key||key.startsWith('請')) return;
  const api=base+'/rest/v1/bookings',headers={apikey:key,Authorization:'Bearer '+key};
  window.load=async()=>{try{const r=await fetch(api+'?select=*&order=booking_date.asc,booking_time.asc',{headers});if(!r.ok)throw Error();const now=new Date();now.setHours(0,0,0,0);bookings=(await r.json()).filter(x=>new Date(x.booking_date+'T00:00:00')>=now).map(x=>({id:x.id,offset:Math.round((new Date(x.booking_date+'T00:00:00')-now)/86400000),time:x.booking_time,name:x.name,phone:'',status:x.status}));render()}catch{document.getElementById('status').textContent='連線失敗'}};
  await load();
})();
