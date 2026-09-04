(()=>{
  if(location.protocol!=='file:'&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1')return;
  const defaults=[];
  const settings=JSON.parse(localStorage.getItem('flowlog-admin-settings')||'null')||{months:3,times:defaults,blockedDates:[],dateTimes:{}};
  let remoteStudents=[];
  settings.months=Number(settings.months)||3; settings.times=settings.times||defaults; settings.blockedDates=settings.blockedDates||[]; settings.dateTimes=settings.dateTimes||{};
  // 舊版曾有固定示範時段；移除它們，改由老師逐日開放。
  if(!Object.keys(settings.dateTimes).length)settings.times=[];
  const saveSettings=()=>localStorage.setItem('flowlog-admin-settings',JSON.stringify(settings));
  const localList=()=>JSON.parse(localStorage.getItem('flowlog-v1-bookings')||'[]');
  const allBookings=()=>{
    const current=typeof bookings!=='undefined'&&Array.isArray(bookings)?bookings:[];
    const local=localList();
    return [...current,...local].filter((row,index,list)=>{
      const key=`${row.id||''}|${row.booking_date||row.date||row.offset}|${row.booking_time||row.time}`;
      return list.findIndex(item=>`${item.id||''}|${item.booking_date||item.date||item.offset}|${item.booking_time||item.time}`===key)===index;
    });
  };
  const bookingDate=b=>b.booking_date||b.date||dayKey(dateAt(b.offset||0));
  const bookingTime=b=>b.booking_time||b.time||'';
  const dateForCell=cell=>{const label=document.getElementById('monthLabel')?.textContent||'';const m=label.match(/(\d{4}).*?(\d{1,2})/);const year=m?+m[1]:today.getFullYear(),month=m?+m[2]-1:today.getMonth(),day=+(cell.querySelector('b')?.textContent||0);return dayKey(new Date(year,month,day))};
  const knownStudents=()=>{
    const map=new Map();
    allBookings().forEach(row=>{const name=(row.name||'').trim();if(name)map.set(row.user_id||name,{name,user_id:row.user_id||''})});
    const saved=JSON.parse(localStorage.getItem('flowlog-known-students')||'[]');
    saved.forEach(row=>{if(row.name)map.set(row.user_id||row.name,row)});
    remoteStudents.forEach(row=>{if(row.name)map.set(row.user_id||row.name,row)});
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
  };
  const loadRemoteStudents=async()=>{
    const base=(window.FLOWLOG_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'');
    const key=window.FLOWLOG_SUPABASE_KEY||''; const token=localStorage.getItem('flowlog-line-access-token')||'';
    if(!base||!key||!token)return;
    try{const response=await fetch(base+'/rest/v1/student_profiles?select=user_id,display_name&order=display_name.asc',{headers:{apikey:key,Authorization:'Bearer '+token}});if(response.ok)remoteStudents=(await response.json()).map(row=>({user_id:row.user_id,name:row.display_name}))}catch{}
  };
  const overlay=document.createElement('div'); overlay.className='date-dialog';
  overlay.innerHTML='<div class="date-dialog-card"><button class="date-dialog-close" type="button">×</button><h2 id="dialogTitle"></h2><div class="date-actions"><button class="secondary" id="closeDate" type="button">關閉日期</button><button class="primary" id="openDate" type="button">開放日期</button></div><h3>當日開放時段</h3><div id="dialogTimes" class="dialog-times"></div><div class="add-time"><input id="dialogNewTime" type="time" value="09:00"><button class="secondary" id="dialogAddTime" type="button">＋ 新增時段</button></div><h3>新增學生預約</h3><div class="admin-add-booking"><select id="dialogStudent"><option value="">選擇已登入學生</option></select><select id="dialogBookingTime"><option value="">選擇時段</option></select><button class="primary" id="dialogAddBooking" type="button">新增預約</button></div><div id="dialogBookings"></div></div>';
  document.body.append(overlay);
  const getEl=id=>document.getElementById(id);
  const show=key=>{
    const closed=settings.blockedDates.includes(key), times=settings.dateTimes[key]||settings.times, rows=allBookings();
    getEl('dialogTitle').textContent=key; getEl('closeDate').disabled=closed; getEl('openDate').disabled=!closed;
    getEl('dialogTimes').innerHTML=times.map(t=>`<span>${t}<button type="button" data-remove-time="${t}">×</button></span>`).join('');
    document.querySelectorAll('[data-remove-time]').forEach(button=>button.onclick=()=>{settings.dateTimes[key]=(settings.dateTimes[key]||settings.times).filter(t=>t!==button.dataset.removeTime);saveSettings();show(key)});
    getEl('closeDate').onclick=()=>{if(!settings.blockedDates.includes(key))settings.blockedDates.push(key);saveSettings();overlay.classList.remove('open');bind()};
    getEl('openDate').onclick=()=>{settings.blockedDates=settings.blockedDates.filter(x=>x!==key);saveSettings();overlay.classList.remove('open');bind()};
    getEl('dialogAddTime').onclick=()=>{const t=getEl('dialogNewTime').value;if(t&&!times.includes(t)){settings.dateTimes[key]=[...times,t].sort();saveSettings();show(key)}};
    const occupied=new Set(rows.filter(row=>bookingDate(row)===key).map(bookingTime));
    getEl('dialogBookingTime').innerHTML='<option value="">選擇時段</option>'+times.map(t=>`<option value="${t}" ${occupied.has(t)?'disabled':''}>${t}${occupied.has(t)?'（已預約）':''}</option>`).join('');
    getEl('dialogStudent').innerHTML='<option value="">選擇已登入學生</option>'+knownStudents().map(student=>`<option value="${encodeURIComponent(JSON.stringify(student))}">${student.name}</option>`).join('');
    getEl('dialogAddBooking').onclick=()=>addBooking(key);
    const local=localList(), items=rows.filter(row=>bookingDate(row)===key);
    getEl('dialogBookings').innerHTML=items.length?'<h3>學生預約</h3>'+items.map((row,i)=>`<div class="edit-booking"><b>${row.name||'學生'}</b><input type="date" data-edit-date="${i}" value="${bookingDate(row)}"><select data-edit-time="${i}">${times.map(t=>`<option ${t===bookingTime(row)?'selected':''}>${t}</option>`).join('')}</select><button type="button" class="cancel" data-edit-cancel="${i}">取消</button></div>`).join(''):'<p class="dialog-empty">這天沒有學生預約</p>';
    document.querySelectorAll('[data-edit-cancel]').forEach(button=>button.onclick=()=>{if(!confirm('確定要取消這筆預約嗎？'))return;const row=items[+button.dataset.editCancel];const next=local.filter(item=>item!==row&&item.id!==row.id);localStorage.setItem('flowlog-v1-bookings',JSON.stringify(next));if(typeof render==='function')render();show(key)});
    document.querySelectorAll('[data-edit-date]').forEach(input=>input.onchange=()=>{const row=items[+input.dataset.editDate];const localRow=local.find(item=>item.id===row.id||item===row);if(!localRow)return;if(localRow.booking_date)localRow.booking_date=input.value;else localRow.date=input.value;localRow.offset=Math.round((new Date(input.value+'T00:00:00')-today)/86400000);localStorage.setItem('flowlog-v1-bookings',JSON.stringify(local));if(typeof render==='function')render();show(key)});
    document.querySelectorAll('[data-edit-time]').forEach(input=>input.onchange=()=>{const row=items[+input.dataset.editTime];const localRow=local.find(item=>item.id===row.id||item===row);if(!localRow)return;if(localRow.booking_time)localRow.booking_time=input.value;else localRow.time=input.value;localStorage.setItem('flowlog-v1-bookings',JSON.stringify(local));if(typeof render==='function')render();show(key)});
    overlay.classList.add('open');
  };
  const addBooking=async key=>{
    const studentValue=getEl('dialogStudent').value,time=getEl('dialogBookingTime').value;
    if(!studentValue||!time){alert('請先選擇學生與時段');return}
    const student=JSON.parse(decodeURIComponent(studentValue));
    if(allBookings().some(row=>bookingDate(row)===key&&bookingTime(row)===time)){alert('這個時段已經有預約');return}
    const base=(window.FLOWLOG_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,''); const apiKey=window.FLOWLOG_SUPABASE_KEY||''; const token=localStorage.getItem('flowlog-line-access-token')||'';
    if(base&&apiKey&&token.startsWith('ey')&&student.user_id){
      const response=await fetch(base+'/rest/v1/bookings',{method:'POST',headers:{apikey:apiKey,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({booking_date:key,booking_time:time,name:student.name,phone:null,user_id:student.user_id,status:'已預約'})});
      if(!response.ok){alert('新增失敗，請確認老師帳號具有預約管理權限');return}
    }else{
      const local=localList(); local.push({id:Date.now(),booking_date:key,date:key,booking_time:time,time,name:student.name,user_id:student.user_id||'',phone:'',status:'已預約'}); localStorage.setItem('flowlog-v1-bookings',JSON.stringify(local));
    }
    if(typeof render==='function')render(); show(key); alert(`已新增 ${student.name} 的預約`);
  };
  const bind=()=>document.querySelectorAll('#calendar .day:not(.blank)').forEach(cell=>{const key=dateForCell(cell);cell.classList.toggle('disabled',settings.blockedDates.includes(key));cell.onclick=()=>show(key)});
  overlay.querySelector('.date-dialog-close').onclick=()=>overlay.classList.remove('open');
  const style=document.createElement('style');style.textContent='.layout>.panel:nth-child(2) .day{cursor:pointer}.layout>.panel:nth-child(2) .day.disabled{opacity:.45;background:#e9e9e9;color:#888}.date-dialog{position:fixed;inset:0;display:none;place-items:center;padding:18px;background:#0006;z-index:10}.date-dialog.open{display:grid}.date-dialog-card{position:relative;width:min(620px,100%);max-height:90vh;overflow:auto;padding:22px;background:#fff;border-radius:16px}.date-dialog-close{position:absolute;right:15px;top:10px;border:0;background:none;font-size:27px;cursor:pointer}.date-dialog-card h2{margin:0 0 18px}.date-dialog-card h3{font-size:14px;margin:18px 0 10px}.date-actions,.add-time,.admin-add-booking{display:flex;gap:8px}.date-actions button,.add-time button,.admin-add-booking button{flex:1}.date-actions button:disabled{opacity:.35}.dialog-times{display:flex;flex-wrap:wrap;gap:8px}.dialog-times span{display:inline-flex;gap:7px;align-items:center;padding:8px 10px;border:1px solid #ccc;border-radius:8px}.dialog-times button{border:0;background:none;color:#555;cursor:pointer}.add-time{margin-top:10px}.add-time input,.admin-add-booking select{min-width:0;flex:1;padding:9px;border:1px solid #ccc;border-radius:7px;background:#fff}.admin-add-booking{display:grid;grid-template-columns:1.2fr 1fr auto}.edit-booking{display:grid;grid-template-columns:1fr 1.25fr 1fr auto;align-items:center;gap:8px;border-top:1px solid #eee;padding:10px 0}.edit-booking input,.edit-booking select{width:100%;padding:8px;border:1px solid #ccc;border-radius:7px}.edit-booking .cancel{border:0;background:none;color:#555;cursor:pointer}.dialog-empty{color:#777;font-size:13px}@media(max-width:760px){.admin-add-booking{grid-template-columns:1fr 1fr}.admin-add-booking button{grid-column:1/-1}.edit-booking{grid-template-columns:1fr 1fr}.edit-booking b{grid-column:1/-1}.edit-booking .cancel{grid-column:1/-1;text-align:left}}';document.head.append(style);bind();loadRemoteStudents();new MutationObserver(bind).observe(getEl('calendar'),{childList:true});
})();
// 讓點選日期有清楚的深色邊框提示。
document.addEventListener('click',event=>{
  const cell=event.target.closest?.('#calendar .day:not(.blank)');
  if(!cell)return;
  document.querySelectorAll('#calendar .day.selected').forEach(item=>item.classList.remove('selected'));
  cell.classList.add('selected');
});
