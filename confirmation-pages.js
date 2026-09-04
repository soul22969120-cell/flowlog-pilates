(async()=>{
  const form=document.querySelector('#bookingForm');
  if(!form)return;
  const local=location.protocol==='file:';

  // 本機預覽用：模擬 LINE 登入後建立預約。
  if(local){
    form.onsubmit=e=>{
      e.preventDefault();
      const data=new FormData(form),name=String(data.get('name')||window.FLOWLOG_LINE_NAME||'').trim();
      if(!name){toast('請先使用 LINE 登入');return}
      bookings.push({id:Date.now(),offset:pending.offset,time:pending.time,name,phone:'',status:'已預約'});
      save();
      el('modal').classList.remove('open');
      form.reset();
      render();
      toast('本機測試預約成功');
    };
  }

  // 學生已改用 LINE 身份確認，不再顯示姓名＋生日備用查詢。
  document.querySelector('.manage-box')?.remove();

  // 線上模式的 bookings 已由 Supabase 依 user_id 篩選；本機則只顯示測試登入者的資料。
  renderUpcoming=()=>{
    const guest=JSON.parse(localStorage.getItem('flowlog-guest')||'null');
    const own=local?bookings.filter(b=>b.name===(window.FLOWLOG_LINE_NAME||guest?.name)):bookings;
    const target=document.querySelector('#upcoming');
    if(!target)return;
    target.innerHTML=own.length?own.slice().sort((a,b)=>a.offset-b.offset||a.time.localeCompare(b.time)).map(b=>`<div class="booking"><div class="calendar-icon">•</div><div class="booking-main"><strong>${fmt(dateAt(b.offset))} · ${b.time}</strong><small>${b.name}</small></div><button class="cancel" data-own-id="${b.id}">取消</button></div>`).join(''):'<div class="empty">目前還沒有預約</div>';
    target.querySelectorAll('[data-own-id]').forEach(button=>button.onclick=async()=>{
      if(!confirm('確定要取消這筆預約嗎？'))return;
      if(local){
        bookings=bookings.filter(b=>b.id!==+button.dataset.ownId);
        save();render();toast('預約已取消，時段重新開放');
      }else{
        const base=(window.FLOWLOG_SUPABASE_URL||'https://rvlaxuujzbuyoopseeqt.supabase.co').replace(/\/rest\/v1\/?$/,'');
        const key=window.FLOWLOG_SUPABASE_KEY||'sb_publishable_hmGW4kELcllIw_7hqXzylA_8mHJZ7sm';
        const token=localStorage.getItem('flowlog-line-access-token')||key;
        const r=await fetch(base+'/rest/v1/bookings?id=eq.'+encodeURIComponent(button.dataset.ownId),{method:'DELETE',headers:{apikey:key,Authorization:'Bearer '+token}});
        if(r.ok){await location.reload()}else toast('取消預約失敗');
      }
    });
  };
  renderUpcoming();
})();
