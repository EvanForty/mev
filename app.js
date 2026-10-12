(function(){
  const $ = s => document.querySelector(s);
  const toastEl = $('#toast'); let tT;
  function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); clearTimeout(tT); tT=setTimeout(()=>toastEl.classList.remove('show'),2600); }
  const hasWeb3 = typeof window.solanaWeb3 !== 'undefined';

  /* ---------- wallet (Solana wallet providers + @solana/web3.js) ---------- */
  const WALLETS = [
    { name:'Phantom',  get:()=> window.phantom && window.phantom.solana && window.phantom.solana.isPhantom ? window.phantom.solana : (window.solana && window.solana.isPhantom ? window.solana : null), url:'https://phantom.app/' },
    { name:'Solflare', get:()=> window.solflare && window.solflare.isSolflare ? window.solflare : null, url:'https://solflare.com/' },
    { name:'Backpack', get:()=> window.backpack && window.backpack.solana ? window.backpack.solana : (window.backpack || null), url:'https://backpack.app/' },
  ];
  const state = { provider:null, wallet:null, pubkey:null };
  const short = k => k.slice(0,4)+'…'+k.slice(-4);

  function toPubkey(pk){
    const s = pk && pk.toString ? pk.toString() : String(pk);
    if (hasWeb3){ try { return new solanaWeb3.PublicKey(s); } catch(e){ return null; } }
    return { toBase58:()=>s, toString:()=>s };
  }

  function renderWallet(){
    const connected = !!state.pubkey;
    const label = connected ? short(state.pubkey.toBase58()) : 'connect wallet';
    $('#walletBtn').textContent = label;
    $('#wmProvider').textContent = connected ? state.wallet+' connected' : '';
    $('#wmAddr').textContent = connected ? state.pubkey.toBase58() : '';
    $('#launchBtn').textContent = connected ? 'launch bot' : 'connect wallet to launch';
    $('#dMsg').textContent = connected ? 'No bots running on this wallet yet.' : 'Connect a wallet to see your bots.';
    $('#dConnect').textContent = connected ? 'launch a bot' : 'connect wallet';
    if(!connected) $('#walletMenu').classList.remove('open');
  }

  function openConnect(){
    const list = $('#wList'); list.innerHTML='';
    WALLETS.forEach(w=>{
      const p = w.get(); const b = document.createElement('button');
      b.innerHTML = '<span>'+w.name+'</span><span class="tag '+(p?'ok':'')+'">'+(p?'detected':'install')+'</span>';
      b.onclick = () => p ? connect(w.name,p) : window.open(w.url,'_blank','noopener');
      list.appendChild(b);
    });
    $('#connectModal').classList.add('open');
    list.querySelector('button').focus();
  }

  async function connect(name, provider){
    try{
      const res = await provider.connect();
      const raw = (res && res.publicKey) || provider.publicKey;
      const pk = toPubkey(raw);
      if(!pk) throw new Error('The wallet returned an invalid address.');
      state.provider = provider; state.wallet = name; state.pubkey = pk;
      if (provider.on){
        provider.on('accountChanged', npk => { if(npk){ state.pubkey = toPubkey(npk); renderWallet(); toast('Switched to '+short(state.pubkey.toBase58())); } else disconnect(); });
        provider.on('disconnect', () => { state.pubkey=null; renderWallet(); });
      }
      $('#connectModal').classList.remove('open');
      renderWallet(); toast(name+' connected: '+short(pk.toBase58()));
    }catch(e){
      toast(e && e.code===4001 ? 'Connection request was rejected in '+name+'.' : (e.message || 'Could not connect to '+name+'.'));
    }
  }

  async function disconnect(){
    try{ if(state.provider && state.provider.disconnect) await state.provider.disconnect(); }catch(e){}
    state.provider=null; state.pubkey=null; state.wallet=null; renderWallet(); toast('Wallet disconnected.');
  }

  // silent reconnect if the wallet already trusts this site
  window.addEventListener('load', async ()=>{
    for (const w of WALLETS){
      const p = w.get();
      if (p && p.connect){ try{ const r = await p.connect({ onlyIfTrusted:true }); const pk = toPubkey((r&&r.publicKey)||p.publicKey); if(pk){ state.provider=p; state.wallet=w.name; state.pubkey=pk; renderWallet(); break; } }catch(e){} }
    }
  });

  $('#walletBtn').onclick = e => { e.stopPropagation(); state.pubkey ? $('#walletMenu').classList.toggle('open') : openConnect(); };
  $('#disconnect').onclick = disconnect;
  $('#copyAddr').onclick = async () => { try{ await navigator.clipboard.writeText(state.pubkey.toBase58()); toast('Address copied.'); }catch(e){ toast('Copy failed. Select the address and copy it manually.'); } };
  document.addEventListener('click', e => { if(!e.target.closest('.wallet')) $('#walletMenu').classList.remove('open'); });
  $('#cmClose').onclick = () => $('#connectModal').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); }));
  document.addEventListener('keydown', e => { if(e.key==='Escape' && document.querySelector('.modal.open')){ document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); e.stopImmediatePropagation(); } });

  /* ---------- live epoch from Solana mainnet ---------- */
  // Swap in your own RPC endpoint (Helius, Triton, QuickNode...) for production traffic.
  const RPC_URL = 'https://api.mainnet-beta.solana.com';
  const conn = hasWeb3 ? new solanaWeb3.Connection(RPC_URL, 'confirmed') : null;
  async function tick(){
    if(!conn) return;
    try{
      const e = await conn.getEpochInfo();
      $('#epoch').textContent = e.epoch + ' · ' + Math.floor(e.slotIndex / e.slotsInEpoch * 100) + '%';
    }catch(err){ /* keep last value; the public RPC can rate-limit */ }
  }
  tick(); setInterval(tick, 60000);

  /* ---------- launch console ---------- */
  const PAIRS = ['SOL/USDC','SOL/USDT','JUP/SOL','JTO/SOL','BONK/SOL','WIF/SOL','RAY/SOL','mSOL/SOL','jitoSOL/SOL'];
  const pairBox = $('#pairs');
  PAIRS.forEach((p,i)=>{
    const id='pr'+i;
    pairBox.insertAdjacentHTML('beforeend','<input type="checkbox" id="'+id+'" value="'+p+'"'+(i<2?' checked':'')+'><label for="'+id+'">'+p+'</label>');
  });
  const COLORS = ['#b05cff','#efdcbc','#ffcf6b','#8fb6ff','#ff9ad5','#5ef2b4'];
  let color = COLORS[0];
  const sw = $('#swatches');
  COLORS.forEach((c,i)=>{ const b=document.createElement('button'); b.type='button'; b.style.background=c; b.setAttribute('aria-label','colour '+(i+1)); b.setAttribute('aria-pressed', i===0); b.onclick=()=>{ color=c; sw.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', x===b)); preview(); }; sw.appendChild(b); });
  const strat = () => (document.querySelector('input[name="strat"]:checked')||{}).value || 'Arbitrage';
  const pairs = () => [...pairBox.querySelectorAll('input:checked')].map(x=>x.value);
  function preview(){
    const n = $('#bName').value.trim();
    $('#pvName').textContent = n || 'your bot';
    $('#pvAv').textContent = n ? n[0].toUpperCase() : '?';
    $('#pvAv').style.background = color;
    const ps = pairs();
    $('#pvMeta').textContent = strat()+' · '+(ps.length? ps.length+' pair'+(ps.length>1?'s':'') : 'no pairs')+' · '+($('#bCap').value||0)+' SOL';
  }
  $('#launchForm').addEventListener('input', preview);
  $('#launchForm').addEventListener('change', preview);
  preview();

  let running = false;
  $('#launchForm').addEventListener('submit', async e => {
    e.preventDefault();
    if(running) return;
    if(!state.pubkey){ openConnect(); return; }
    const name = $('#bName').value.trim();
    const cap = parseFloat($('#bCap').value), min = parseFloat($('#bMin').value), ps = pairs();
    if(!name){ $('#bName').focus(); toast('Give your bot a name first.'); return; }
    if(!ps.length){ toast('Pick at least one trading pair.'); return; }
    if(!(cap>0)){ $('#bCap').focus(); toast('Enter a capital amount above 0 SOL.'); return; }
    if(!(min>=0)){ $('#bMin').focus(); toast('Enter a minimum profit of 0 SOL or more.'); return; }
    running = true; $('#launchBtn').disabled = true;
    const list = $('#logList'); list.innerHTML=''; $('#logState').textContent='configuring'; $('#logState').style.color='#ffcf6b'; $('#logBar').style.width='0';
    const signer = hasWeb3 ? short(solanaWeb3.Keypair.generate().publicKey.toBase58()) : 'ok';
    const steps = [
      ['owner wallet', short(state.pubkey.toBase58())],
      ['generating bot signer key', signer],
      ['bot name', '"'+name+'"'],
      ['strategy', strat()],
      ['trading pairs', ps.join(', ')],
      ['capital allocation', cap+' SOL'],
      ['risk limit', $('#bLoss').value+' max daily loss'],
      ['profit threshold', min+' SOL per trade'],
    ];
    const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    for (let i=0;i<steps.length;i++){
      const li=document.createElement('li'); li.innerHTML='&gt; '+steps[i][0]+' … <span class="w">working</span>'; list.appendChild(li);
      await new Promise(r=>setTimeout(r, 320+Math.random()*300));
      const sp=li.querySelector('span'); sp.className='ok'; sp.textContent=steps[i][1];
      $('#logBar').style.width = ((i+1)/steps.length*100)+'%';
    }
    const done=document.createElement('li');
    done.innerHTML='<span class="ok">✓ configuration ready for '+esc(name)+'. follow <a href="https://x.com/MEVLaunch" target="_blank" rel="noopener noreferrer" style="color:#dcb8ff">@MEVLaunch</a> for go-live.</span><span class="cursor"></span>';
    list.appendChild(done);
    $('#logState').textContent='ready'; $('#logState').style.color='#b05cff';
    toast('Configuration ready for '+name+'.');
    running=false; $('#launchBtn').disabled=false;
  });

  $('#dConnect').onclick = () => state.pubkey ? (location.hash = 'launch') : openConnect();

  /* ---------- marketplace ---------- */
  // Each bot: { n:name, s:strategy, c:colour, ret:30d return %, succ:success %, dd:max drawdown %, risk:'low'|'medium'|'high', age:days }
  const BOTS = [];
  let sortKey='ret', q='';
  const escH = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function renderMk(){
    const rows = BOTS.filter(b => !q || (b.n+' '+b.s).toLowerCase().includes(q))
      .sort((a,b)=> sortKey==='new' ? a.age-b.age : b[sortKey]-a[sortKey]);
    $('#mkBody').innerHTML = rows.length ? rows.map((b,i)=>`
      <tr>
        <td class="rank">${i+1}</td>
        <td><div class="vname"><div class="avatar" style="background:${b.c}">${escH(b.n[0].toUpperCase())}</div><div><b>${escH(b.n)}</b></div></div></td>
        <td>${escH(b.s)}</td>
        <td class="num">${b.ret.toFixed(2)}%</td>
        <td class="num">${b.succ.toFixed(1)}%</td>
        <td class="num">${b.dd.toFixed(1)}%</td>
        <td><span class="up ${b.risk!=='low'?'warn':''}"><i></i>${b.risk}</span></td>
        <td><button class="td-btn" type="button">view</button></td>
      </tr>`).join('') : (BOTS.length
      ? '<tr><td colspan="8" style="color:var(--mute);font-family:var(--mono);font-size:14px">No bots match that search. Try a strategy name.</td></tr>'
      : '<tr><td colspan="8" style="padding:56px 14px;text-align:center"><div style="font-family:var(--px);font-size:22px;margin-bottom:8px">no bots yet</div><div style="color:var(--mute);font-size:15px;margin-bottom:18px">The marketplace fills up as people launch. Yours can be the first listing.</div><a class="btn" href="#launch">launch the first bot</a></td></tr>');
  }
  $('#mkSearch').addEventListener('input', e=>{ q=e.target.value.trim().toLowerCase(); renderMk(); });
  document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{ sortKey=b.dataset.sort; document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderMk(); });
  renderMk();
  renderWallet();

  /* ---------- HQ floor ---------- */
  const BOTS_ON_FLOOR = [
    { id:'arbo', name:'ARBO',  strat:'Arbitrage',    radio:'sArb',   c:'#b05cff', x:140, y:140, text:'Buys on one pool and sells on another in a single transaction, when the gap beats fees and tips.' },
    { id:'dexa', name:'DEXA',  strat:'Cross-DEX',    radio:'sCross', c:'#8fb6ff', x:420, y:140, text:'Watches Raydium, Orca, Meteora and Phoenix and closes price gaps between them.' },
    { id:'liqi', name:'LIQI',  strat:'Liquidations', radio:'sLiq',   c:'#ffcf6b', x:420, y:420, text:'Repays unhealthy loans on lending protocols and collects the liquidation bonus.' },
    { id:'tail', name:'TAIL',  strat:'Backrunning',  radio:'sBack',  c:'#5ef2b4', x:140, y:420, text:'Trades right after a large swap moves a price. Never in front of it.' },
  ];
  const plane = $('#plane'), list = $('#rosterList');
  let selected = 'arbo';
  BOTS_ON_FLOOR.forEach((b,i)=>{
    const pod = document.createElement('div');
    pod.className = 'pod'+(b.off?' off':''); pod.dataset.id=b.id;
    pod.style.left=b.x+'px'; pod.style.top=b.y+'px'; pod.style.setProperty('--c',b.c); pod.style.setProperty('--d',(i*.4)+'s');
    pod.innerHTML='<div class="pad"></div><div class="stand"><button class="bb" type="button" aria-label="'+b.name+', '+b.strat+(b.off?', powered down':'')+'"><span class="tag">'+b.name+'</span><img src="/bot.png" width="104" height="71" alt=""></button></div>';
    pod.querySelector('.bb').addEventListener('click', e=>{ e.stopPropagation(); if(!moved) select(b.id); });
    plane.appendChild(pod);
    const li=document.createElement('li'); if(b.off) li.className='off';
    li.innerHTML='<button type="button" aria-pressed="false" style="--c:'+b.c+'"><img src="/bot.png" width="44" height="30" alt=""><span><b>'+b.name+'</b><span>'+b.strat+'</span></span><span class="chip" style="--c:'+b.c+'">'+(b.off?'off':'ready')+'</span></button>';
    li.querySelector('button').onclick=()=>select(b.id);
    list.appendChild(li);
  });
  function select(id){
    selected=id; const b=BOTS_ON_FLOOR.find(x=>x.id===id);
    plane.querySelectorAll('.pod').forEach(p=>p.classList.toggle('sel',p.dataset.id===id));
    list.querySelectorAll('li button').forEach((btn,i)=>btn.setAttribute('aria-pressed',BOTS_ON_FLOOR[i].id===id));
    $('#dtName').textContent=b.name+' · '+b.strat.toLowerCase(); $('#dtName').style.color = b.off ? 'var(--mute)' : b.c;
    $('#dtText').textContent=b.text;
    const go=$('#dtGo');
    if(b.off){ go.textContent='not available'; go.setAttribute('aria-disabled','true'); go.classList.add('ghost'); }
    else { go.textContent='configure '+b.name; go.removeAttribute('aria-disabled'); go.classList.remove('ghost'); }
    $('#floorMsg').textContent = b.off ? b.name+' is powered down.' : b.name+' selected. '+b.strat.toLowerCase()+' bot.';
  }
  $('#dtGo').addEventListener('click', e=>{
    const b=BOTS_ON_FLOOR.find(x=>x.id===selected);
    if(b.off){ e.preventDefault(); return; }
    const r=document.getElementById(b.radio); if(r){ r.checked=true; preview(); }
  });
  select('arbo');

  // camera: drag to rotate, auto-orbit when idle
  const box=$('#stagebox'), reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let rz=30, auto=!reduce.matches, drag=null, moved=false, last=performance.now(), idleAt=0;
  const setRz=v=>{ rz=v; plane.style.setProperty('--rz', rz+'deg'); };
  setRz(rz);
  $('#autoCam').setAttribute('aria-pressed', auto);
  $('#autoCam').onclick=()=>{ auto=!auto; $('#autoCam').setAttribute('aria-pressed',auto); if(auto){ last=performance.now(); requestAnimationFrame(loop); } };
  $('#resetCam').onclick=()=>setRz(30);
  box.addEventListener('pointerdown', e=>{ if(e.button!==0) return; drag={x:e.clientX, rz}; moved=false; });
  window.addEventListener('pointermove', e=>{ if(!drag) return; const dx=e.clientX-drag.x; if(Math.abs(dx)>4){ moved=true; box.classList.add('dragging'); } setRz(drag.rz+dx*.4); });
  window.addEventListener('pointerup', ()=>{ if(drag){ drag=null; idleAt=performance.now(); box.classList.remove('dragging'); setTimeout(()=>{moved=false},0); } });
  function loop(now){
    if(!auto) return;
    const dt=Math.min(64,now-last); last=now;
    if(!drag && now-idleAt>1500) setRz(rz+dt*.006);
    requestAnimationFrame(loop);
  }
  if(auto) requestAnimationFrame(loop);

  /* ---------- panels (hash routing) ---------- */
  const hdr=document.querySelector('.top');
  const setHdr=()=>document.documentElement.style.setProperty('--hdr', hdr.getBoundingClientRect().height+'px');
  setHdr(); window.addEventListener('resize', setHdr);
  if (window.ResizeObserver) new ResizeObserver(setHdr).observe(hdr);
  const PANELS=['launch','dashboard','market','ledger','flywheel'];
  let lastFocus=null;
  function route(){
    const h=location.hash.slice(1);
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
    const isPanel=PANELS.includes(h);
    if(isPanel){
      lastFocus=lastFocus||document.activeElement;
      const p=document.getElementById('p-'+h); p.classList.add('open'); p.scrollTop=0;
      document.body.classList.add('locked'); p.querySelector('.close').focus();
    } else {
      document.body.classList.remove('locked');
      if(h==='how'||h==='hq'){ const t=document.getElementById(h); if(t) t.scrollIntoView(); }
      if(lastFocus && lastFocus.focus){ lastFocus.focus({preventScroll:true}); } lastFocus=null;
    }
    const cur=isPanel?h:(h==='how'?'how':'hq');
    document.querySelectorAll('.tabs a').forEach(a=>{ if(a.dataset.tab===cur) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  }
  function closePanel(){ history.pushState('', document.title, location.pathname+location.search); route(); }
  document.querySelectorAll('.panel').forEach(p=>{
    p.querySelector('.close').onclick=closePanel;
    p.addEventListener('click', e=>{ if(e.target===p) closePanel(); });
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && document.querySelector('.panel.open') && !document.querySelector('.modal.open')) closePanel(); });
  window.addEventListener('hashchange', route);
  route();
})();
