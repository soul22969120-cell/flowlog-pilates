(function(){
  const isLocal=location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
  if(isLocal){
    const localBookings=JSON.parse(localStorage.getItem('flowlog-v1-bookings')||'[]');
    // 本機測試與遠端資料都可能存在，合併而不是互相覆蓋。
    const current=Array.isArray(bookings)?bookings:[];
    const merged=[...current,...localBookings];
    bookings=merged.filter((row,index,list)=>{
      const key=row.id??`${row.booking_date||row.date||row.offset}|${row.time||row.booking_time}`;
      return list.findIndex(item=>(item.id??`${item.booking_date||item.date||item.offset}|${item.time||item.booking_time}`)===key)===index;
    });
  }

  const panel=document.querySelector('.layout>.panel:nth-child(2)');
  const calendar=document.getElementById('calendar');
  const label=document.getElementById('monthLabel');
  if(!panel||!calendar||!label)return;

  let cursor=new Date(today.getFullYear(),today.getMonth(),1);
  const firstMonth=new Date(today.getFullYear(),today.getMonth(),1);
  let adminSettings=JSON.parse(localStorage.getItem('flowlog-admin-settings')||'null')||{months:3};
  let lastMonth=new Date(today.getFullYear(),today.getMonth()+(adminSettings.months||3)-1,1);
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const nav=document.createElement('div');
  nav.className='admin-calendar-nav';
  nav.innerHTML='<button type="button" id="adminPrevMonth" aria-label="上個月">‹</button><button type="button" id="adminNextMonth" aria-label="下個月">›</button><select id="adminOpenMonths" aria-label="開放月數"><option value="1">開放 1 個月</option><option value="2">開放 2 個月</option><option value="3">開放 3 個月</option><option value="6">開放 6 個月</option></select>';
  panel.querySelector('.panel-head')?.append(nav);
  const prev=nav.querySelector('#adminPrevMonth'),next=nav.querySelector('#adminNextMonth'),monthsSelect=nav.querySelector('#adminOpenMonths');
  monthsSelect.value=String(adminSettings.months||3);
  monthsSelect.onchange=()=>{adminSettings.months=+monthsSelect.value;localStorage.setItem('flowlog-admin-settings',JSON.stringify(adminSettings));lastMonth=new Date(today.getFullYear(),today.getMonth()+adminSettings.months-1,1);if(cursor>lastMonth)cursor=new Date(lastMonth);draw()};
  const style=document.createElement('style');
  style.textContent='.admin-calendar-nav{display:flex;gap:6px;align-items:center}.admin-calendar-nav button,.admin-calendar-nav select{height:30px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--deep);font-size:13px;line-height:1;cursor:pointer}.admin-calendar-nav button{width:30px;font-size:22px}.admin-calendar-nav select{padding:0 7px}.admin-calendar-nav button:disabled{opacity:.35;cursor:not-allowed}.calendar-booking{display:block;text-align:center!important;background:#f0f8f4;border-radius:5px;padding:3px 4px;margin-top:3px;color:var(--deep);font-size:9px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day.has-booking{border-color:#9fcab9}.day.today .calendar-booking{background:#fff}@media(max-width:760px){.admin-calendar-nav select{max-width:110px;font-size:11px}.calendar-booking{font-size:8px;padding:3px 2px}.day{min-height:66px}}';
  document.head.append(style);

  const draw=()=>{
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1).getDay();
    const days=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    calendar.innerHTML='';
    for(let i=0;i<first;i++){const blank=document.createElement('div');blank.className='day blank';calendar.append(blank)}
    for(let n=1;n<=days;n++){
      const date=new Date(cursor.getFullYear(),cursor.getMonth(),n);
      const rows=bookings.filter(b=>{
        const storedDate=b.booking_date||b.date;
        return storedDate===dayKey(date)||b.offset===Math.round((date-today)/86400000);
      });
      const cell=document.createElement('div');
      cell.className='day'+(dateKey(date)===dateKey(today)?' today':'')+(rows.length?' has-booking':'');
      cell.innerHTML=`<b>${n}</b>${rows.map(b=>`<small class="calendar-booking">${b.time||b.booking_time||''}<br>${b.name||''}</small>`).join('')}`;
      calendar.append(cell);
    }
    document.dispatchEvent(new Event('flowlog:calendar-rendered'));
    label.textContent=`${cursor.getFullYear()} 年 ${cursor.getMonth()+1} 月`;
    prev.disabled=monthKey(cursor)<=monthKey(firstMonth);
    next.disabled=monthKey(cursor)>=monthKey(lastMonth);
  };
  const dateKey=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  prev.onclick=()=>{if(!prev.disabled){cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);draw()}};
  next.onclick=()=>{if(!next.disabled){cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);draw()}};

  const original=window.render;
  window.render=()=>{original?.();draw()};
  draw();
  // 遠端資料是非同步載入，確保載入後日期格會補上姓名與時段。
  setTimeout(draw,300);
  setTimeout(draw,1000);
})();
