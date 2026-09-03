(()=>{
  const base=(window.FLOWLOG_SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'');
  const key=window.FLOWLOG_SUPABASE_KEY||'';
  const configuredAdminId=window.FLOWLOG_ADMIN_USER_ID||'';
  const tokenKey='flowlog-line-access-token';
  const isLocal=location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';

  const addStyle=()=>{
    const style=document.createElement('style');
    style.textContent=`body:not(.admin-authorized) .top,body:not(.admin-authorized) .wrap{display:none!important}.admin-auth-gate{min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f8f6}.admin-auth-card{width:min(420px,100%);padding:30px;border:1px solid #e3ebe7;border-radius:18px;background:#fff;box-shadow:0 15px 35px #24473e0c;color:#263532}.admin-auth-card h1{margin:0 0 10px;font-size:26px}.admin-auth-card p{margin:0 0 20px;color:#71807b;line-height:1.7}.admin-auth-button{width:100%;border:0;border-radius:12px;padding:14px;background:#06c755;color:#fff;font:800 16px -apple-system,BlinkMacSystemFont,"Noto Sans TC",sans-serif;cursor:pointer}.admin-auth-note{margin-top:14px;font-size:12px;color:#71807b}.admin-auth-link{display:block;margin-top:16px;color:#28665b;text-align:center;font-size:13px;text-decoration:none}`;
    document.head.appendChild(style);
  };
  const showGate=(title,message,canLogin=true)=>{
    document.body.classList.remove('admin-authorized');
    let gate=document.getElementById('adminAuthGate');
    if(!gate){gate=document.createElement('main');gate.id='adminAuthGate';gate.className='admin-auth-gate';document.body.prepend(gate)}
    gate.innerHTML=`<section class="admin-auth-card"><h1>${title}</h1><p>${message}</p>${canLogin?'<button class="admin-auth-button" id="adminLineLogin">使用 LINE 登入</button>':''}<a class="admin-auth-link" href="pilates-studio.html">回學生預約頁</a></section>`;
    const login=document.getElementById('adminLineLogin');
    if(login)login.onclick=()=>{if(!base||!key){alert('尚未設定 Supabase 連線');return}location.href=base+'/auth/v1/authorize?provider=custom%3Aline-oauth&redirect_to='+encodeURIComponent(location.href)};
  };
  const allow=()=>{document.getElementById('adminAuthGate')?.remove();document.body.classList.add('admin-authorized')};

  addStyle();
  if(isLocal){allow();return}
  if(!configuredAdminId){showGate('老師後台尚未啟用','需要先設定老師的 LINE 帳號，才能查看學生資料。',false);return}
  const token=localStorage.getItem(tokenKey);
  if(!token){showGate('老師後台','請使用老師本人的 LINE 帳號登入。');return}
  (async()=>{
    try{
      const userResponse=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});
      if(!userResponse.ok)throw Error();
      const user=await userResponse.json();
      if(user.id!==configuredAdminId){showGate('沒有後台權限','此 LINE 帳號不是老師帳號，無法查看學生預約。',false);return}
      window.FLOWLOG_ADMIN_SESSION={token,user};
      allow();
    }catch{localStorage.removeItem(tokenKey);showGate('請重新登入','登入資訊已失效，請使用老師 LINE 帳號登入。')}
  })();
})();
