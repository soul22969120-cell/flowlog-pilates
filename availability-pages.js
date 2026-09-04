(function(){
  if(location.protocol!=='file:')return;
  const settings=JSON.parse(localStorage.getItem('flowlog-admin-settings')||'null')||{},blocked=settings.blockedDates||[],dateTimes=settings.dateTimes||{};const oldCalendar=renderCalendar,oldSlots=renderSlots,baseTimes=[...times];
  renderCalendar=()=>{oldCalendar();document.querySelectorAll('#calendar .date:not(.blank)').forEach(cell=>{const d=new Date(monthCursor.getFullYear(),monthCursor.getMonth(),Number(cell.querySelector('b')?.textContent||0)),key=dayKey(d);if(blocked.includes(key)){cell.disabled=true;cell.classList.add('disabled');cell.innerHTML=`<b>${d.getDate()}</b>`}})};
  renderSlots=()=>{const key=dayKey(selected);if(blocked.includes(key)){el('slotTitle').textContent=`${selected.getMonth()+1} 月 ${selected.getDate()} 日`;el('slots').innerHTML='<div class="empty">請選擇其他日期</div>';return}const custom=dateTimes[key];if(custom){times.splice(0,times.length,...custom);oldSlots();times.splice(0,times.length,...baseTimes)}else oldSlots()};render();
})();
