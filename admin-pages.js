(async()=>{
  const base=(window.FLOWLOG_SUPABASE_URL||'https://rvlaxuujzbuyoopseeqt.supabase.co').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'sb_publishable_hmGW4kELcllIw_7hqXzylA_8mHJZ7sm';
  const token=window.FLOWLOG_ADMIN_SESSION?.token||localStorage.getItem('flowlog-line-access-token')||key;
  const api=base+'/rest/v1/bookings',headers={apikey:key,Authorization:'Bearer '+token};
  const isLocal=false;
  window.load=async()=>{const localPreview=location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';if(localPreview){bookings=JSON.parse(localStorage.getItem('flowlog-v1-bookings')||'[]');render();return}try{const r=await fetch(api+'?select=*&order=booking_date.asc,booking_time.asc',{headers});if(!r.ok){document.getElementById('status').textContent=r.status===401||r.status===403?'後台沒有讀取權限':'連線失敗';return}const now=new Date();now.setHours(0,0,0,0);const rows=await r.json();const remote=rows.filter(x=>new Date(x.booking_date+'T00:00:00')>=now).map(x=>({id:x.id,booking_date:x.booking_date,offset:Math.round((new Date(x.booking_date+'T00:00:00')-now)/86400000),time:x.booking_time,name:x.name,phone:'',status:x.status}));const local=isLocal?JSON.parse(localStorage.getItem('flowlog-v1-bookings')||'[]'):[];const merged=[...remote,...local];bookings=merged.filter((row,index,list)=>{const key=row.id??`${row.booking_date||row.date||row.offset}|${row.time||row.booking_time}`;return list.findIndex(item=>(item.id??`${item.booking_date||item.date||item.offset}|${item.time||item.booking_time}`)===key)===index});render()}catch{document.getElementById('status').textContent='連線失敗'}};
  await load();
})();
