'use strict';
// Fantasy Liga UNA · jogo de teste 2025/26
// Lê do Supabase (schema fantasy) com a chave publishable; as escritas passam só pela função fantasy.guardar_equipa.
const EPOCA='2025/26';
const sb=window.supabase.createClient(window.FANTASY_CONFIG.url, window.FANTASY_CONFIG.key, { db: { schema: 'fantasy' } });
const RULES={"base": {"kill": 1.0, "att_err": -1.0, "att_blocked": -0.5, "ace": 2.0, "serve_err": -0.5, "block": 2.0, "rec_perf": 0.5, "rec_pos": 0.25, "rec_err": -1.0}, "ovr": {"MB": {"block": 2.75, "kill": 1.25}, "S": {"block": 3.0}, "L": {"rec_perf": 1.0, "rec_pos": 0.5, "rec_err": -1.0}, "OPP": {"block": 2.5}, "Z4": {}}, "dist": 0.25, "lib": 1.25, "play": 1, "win": 1, "clean": 1};
let BUDGET=60; const SLOTS=['S','OPP','Z4','Z4','MB','MB','L'];
const NEED={S:1,OPP:1,Z4:2,MB:2,L:1};
const POSL={S:'Distribuidor',OPP:'Oposto',Z4:'Zona 4',MB:'Central',L:'Líbero'};
const POSPL={S:'Distribuidores',OPP:'Opostos',Z4:'Zonas 4',MB:'Centrais',L:'Líberos'};
let P=[], BY=new Map();
const PTS=new Map();               // pontos dos jogadores das equipas já submetidas (vêm da função)
const pts=id=>PTS.get(id)??0;
const errMsg=e=>(e&&(e.message||e.error_description))||'Erro desconhecido';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const m=v=>v.toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1});
const n0=v=>Math.round(v).toLocaleString('pt-PT');
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let pick=[];
let activePos=null; const posF=new Set();
const spent=()=>pick.reduce((a,id)=>a+BY.get(id).price,0);
const countPos=p=>pick.filter(id=>BY.get(id).pos===p).length;
function canAdd(p){ if(pick.includes(p.id))return false; if(countPos(p.pos)>=NEED[p.pos])return false; return spent()+p.price<=BUDGET+1e-9; }

// ---- montar equipa ----
const teamSel=document.getElementById('team');
function fillTeams(){const mp=document.getElementById('maxp');[...new Set(P.map(p=>p.price))].sort((a,b)=>b-a).forEach(v=>mp.insertAdjacentHTML('beforeend',`<option value="${v}">Até ${m(v)} M</option>`));
[...new Set(P.map(p=>p.team))].sort((a,b)=>a.localeCompare(b,'pt')).forEach(t=>teamSel.insertAdjacentHTML('beforeend',`<option>${esc(t)}</option>`));}
const chips=document.getElementById('poschips');
chips.insertAdjacentHTML('beforeend',`<button type="button" class="chip" data-p="ALL" aria-pressed="true">Todas as posições</button>`);
Object.keys(POSL).forEach(k=>chips.insertAdjacentHTML('beforeend',`<button type="button" class="chip" data-p="${k}" aria-pressed="false">${POSPL[k]}</button>`));
chips.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.p;if(k==='ALL')posF.clear();else posF.has(k)?posF.delete(k):posF.add(k);activePos=null;renderAll();});
['q','team','sort','maxp'].forEach(id=>document.getElementById(id).addEventListener('input',renderList));
document.getElementById('tname').value=store.get('lu25-name')||'';
document.getElementById('tname').addEventListener('input',e=>{store.set('lu25-name',e.target.value);renderSubmit();renderAction();});

function renderCourt(){
  // 5-1 clássico: rede em cima; à frente zona 4, central e oposto; atrás zona 4, central e distribuidor; líbero entra para o central de trás
  const ids={}; Object.keys(NEED).forEach(p=>ids[p]=pick.filter(id=>BY.get(id).pos===p));
  const slot=(p,k)=>{const id=ids[p][k];
    if(id){const x=BY.get(id);return `<div class="slot filled"><span class="pos ${p}">${p}</span><span class="nm">${esc(x.name)}</span><span class="dim" style="font-size:11px">${esc(x.team)}</span><span class="pr">${m(x.price)} M</span><button class="x" data-rm="${id}" aria-label="Retirar ${esc(x.name)}">×</button></div>`;}
    return `<button type="button" class="slot ${activePos===p?'active':''}" data-slot="${p}"><span class="pos ${p}">${p}</span><span>${POSL[p]}</span><span class="dim" style="font-size:11px">+ escolher</span></button>`;};
  document.getElementById('court').innerHTML=`<div class="pitch" role="group" aria-label="Campo"><span class="net-l">REDE</span>
    <div class="rowc">${slot('Z4',0)}${slot('MB',0)}${slot('OPP',0)}</div><div class="attack" style="position:relative;margin:16px -12px -18px"></div><div class="rowc back">${slot('Z4',1)}${slot('MB',1)}${slot('S',0)}</div></div>
    <div class="bench"><div class="bt">Líbero<br><span style="text-transform:none;letter-spacing:0;font-family:var(--body);font-size:11px;opacity:.85">entra para o central de trás</span></div>${slot('L',0)}</div>`;
  const left=BUDGET-spent(); const mo=document.getElementById('money');
  mo.className='money'+(left<-1e-9?' over':''); mo.innerHTML=`${m(left)} M<small>disponíveis de ${m(BUDGET)} M</small>`;
  document.getElementById('meter').style.width=Math.min(100,100*spent()/BUDGET)+'%';
  document.getElementById('count').textContent=`${pick.length} de 7 jogadores`;
}
document.getElementById('court').addEventListener('click',e=>{
  const rm=e.target.closest('[data-rm]'); if(rm){toggle(+rm.dataset.rm);return;}
  const s=e.target.closest('[data-slot]'); if(s){const p=s.dataset.slot; posF.clear(); if(activePos===p){activePos=null;renderAll();return;} activePos=p;renderAll();document.getElementById('list').scrollTop=0;if(window.innerWidth<1000)document.getElementById('poschips').scrollIntoView({behavior:'smooth',block:'start'});}
});
function renderList(){
  const q=document.getElementById('q').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const mpSel=document.getElementById('maxp'), left=Math.max(0,BUDGET-spent());
  const bo=mpSel.querySelector('option[value="budget"]'); if(bo) bo.textContent=`Mostrar jogadores acessíveis (${m(left)}M)`;
  const t=teamSel.value, so=document.getElementById('sort').value, mx=mpSel.value==='budget'?left+1e-9:(parseFloat(mpSel.value)||Infinity);
  const pf=activePos?new Set([activePos]):posF;
  chips.querySelectorAll('.chip').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p==='ALL'?!pf.size:pf.has(b.dataset.p)));
  let L=P.filter(p=>(p.price<=mx||pick.includes(p.id))&&(!t||p.team===t)&&(!pf.size||pf.has(p.pos))&&(!q||p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(q)));
  L.sort(so==='n'?(a,b)=>a.name.localeCompare(b.name,'pt'):so==='pa'?(a,b)=>a.price-b.price||a.name.localeCompare(b.name,'pt'):(a,b)=>b.price-a.price||a.name.localeCompare(b.name,'pt'));
  document.getElementById('lcount').textContent=`${L.length} jogador${L.length===1?'':'es'}${activePos?' · a escolher: '+POSL[activePos]:''}`;
  document.getElementById('list').innerHTML=L.map(p=>{
    const on=pick.includes(p.id), ok=canAdd(p);
    const why=on?'':countPos(p.pos)>=NEED[p.pos]?'Posição completa':!ok?'Sem orçamento':'';
    const info=esc(p.hist||'');
    return `<div class="row${on?' picked':''}"><span class="pos ${p.pos}">${p.pos}</span><div><div class="nm">${esc(p.name)}</div><div class="sub">${esc(p.team)}${info?' · '+info:''}</div></div><div class="pr">${m(p.price)}</div>
      <button class="add${on?' rm':''}" data-id="${p.id}" ${!on&&!ok?'disabled':''} title="${why}">${on?'Retirar':ok?'Escolher':why==='Posição completa'?'Completa':'Caro'}</button></div>`;
  }).join('')||'<div class="empty">Nenhum jogador com estes filtros.</div>';
}
document.getElementById('list').addEventListener('click',e=>{const b=e.target.closest('button[data-id]')||e.target.closest('.row')?.querySelector('button[data-id]');if(b&&!b.disabled)toggle(+b.dataset.id);});
function toggle(id){
  const i=pick.indexOf(id);
  if(i>=0)pick.splice(i,1); else{const p=BY.get(id); if(!canAdd(p))return; pick.push(id); if(activePos&&countPos(activePos)>=NEED[activePos]){activePos=null; if(window.innerWidth<1000) setTimeout(()=>document.getElementById('court').scrollIntoView({behavior:'smooth',block:'start'}),0);}}
  store.set('lu25-draft',pick); renderAll();
}
function renderSubmit(){
  const ok=pick.length===7&&spent()<=BUDGET+1e-9&&document.getElementById('tname').value.trim().length>=2;
  document.getElementById('submit').disabled=!ok;
  const left=7-pick.length;
  document.getElementById('submitmsg').textContent=ok?'Pronto. Confirma a equipa antes de submeter.':left>0?`Faltam ${left} jogador${left===1?'':'es'}.`:'Dá um nome à equipa (2 a 30 caracteres).';
}
function renderAction(){
  const ab=document.getElementById('actionbar'), onBuild=!document.getElementById('v-build').hidden;
  ab.hidden=!onBuild; document.body.classList.toggle('has-action',onBuild);
  if(!onBuild) return;
  const left=BUDGET-spent(), mo=document.getElementById('ab-money');
  mo.textContent=`${m(left)} M`; mo.className=left<-1e-9?'over':'';
  const falta=7-pick.length;
  document.getElementById('ab-count').textContent=`disponíveis · ${pick.length} de 7 jogadores`;
  const go=document.getElementById('ab-go');
  go.disabled=falta>0; go.textContent=falta>0?`Faltam ${falta}`:'Continuar';
}
document.getElementById('ab-go').addEventListener('click',()=>{
  const tn=document.getElementById('tname');
  if(tn.value.trim().length>=2&&!document.getElementById('submit').disabled){document.getElementById('submit').click();return;}
  document.querySelector('.submitcard').scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>tn.focus({preventScroll:true}),350);
});
function renderAll(){renderCourt();renderList();renderSubmit();renderAction();}

// ---- estado ----
let current=null;   // equipa acabada de submeter {n,p,pts:{id:pontos},added:{id,posicao}|null}
let league=[], leagueState='idle';
function valid(p){if(!Array.isArray(p)||p.length!==7||!p.every(id=>BY.has(id)))return false;const c={};p.forEach(id=>{const x=BY.get(id).pos;c[x]=(c[x]||0)+1});return Object.keys(NEED).every(k=>c[k]===NEED[k])&&p.reduce((a,id)=>a+BY.get(id).price,0)<=BUDGET+1e-9;}
const teamPts=ids=>ids.reduce((a,id)=>a+pts(id),0);

// ---- submeter ----
const dlg=document.getElementById('confirm');
document.getElementById('submit').addEventListener('click',()=>{
  document.getElementById('c-list').innerHTML=`<b>${esc(document.getElementById('tname').value.trim())}</b><br>`+pick.map(id=>{const p=BY.get(id);return `${p.pos} · ${esc(p.name)} (${m(p.price)} M)`}).join('<br>')+`<br>Total: ${m(spent())} M`;
  dlg.hidden=false; document.getElementById('c-yes').focus();
});
document.getElementById('c-no').addEventListener('click',()=>{dlg.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')dlg.hidden=true;});
document.getElementById('c-yes').addEventListener('click',async()=>{
  const yes=document.getElementById('c-yes'); yes.disabled=true;
  const team={n:document.getElementById('tname').value.trim(),p:[...pick]};
  const {data,error}=await sb.rpc('pontuar_equipa',{p_epoca:EPOCA,p_jogadores:team.p});
  yes.disabled=false; dlg.hidden=true;
  if(error){const s=document.getElementById('submitmsg');s.className='msg err';s.textContent='Não deu para submeter: '+errMsg(error);return;}
  const map={}; (data||[]).forEach(r=>{map[r.jogador_id]=Number(r.pontos);});
  current={...team,pts:map,added:null};
  store.set('lu25-current',current);
  go('resultado');
});
document.getElementById('newteam').addEventListener('click',()=>{
  pick=[]; store.set('lu25-draft',pick); document.getElementById('tname').value=''; store.set('lu25-name','');
  current=null; store.set('lu25-current',null); go('montar');
});

// ---- resultado da equipa ----
function renderResults(){
  if(!current) return;
  Object.entries(current.pts||{}).forEach(([k,v])=>PTS.set(Number(k),v));
  const tot=teamPts(current.p);
  document.getElementById('r-name').textContent=current.n;
  document.getElementById('r-score').textContent=n0(tot);
  const rows=current.p.map(id=>BY.get(id)).filter(Boolean).sort((a,b)=>SLOTS.indexOf(a.pos)-SLOTS.indexOf(b.pos));
  document.getElementById('r-team').innerHTML=`<thead><tr><th class="l">Jogador</th><th>Preço</th><th>Pontos</th></tr></thead><tbody>${rows.map(p=>`<tr><td class="l"><span class="pos ${p.pos}">${p.pos}</span> ${esc(p.name)}<div class="dim" style="font-size:12px">${esc(p.team)}</div></td><td>${m(p.price)}</td><td><b>${n0(pts(p.id))}</b></td></tr>`).join('')}</tbody><tfoot><tr><td class="l"><b>Total</b></td><td>${m(rows.reduce((a,p)=>a+p.price,0))}</td><td><b>${n0(tot)}</b></td></tr></tfoot>`;
  const sh=document.getElementById('r-share');
  if(current.added){
    sh.innerHTML=`<p style="margin:0"><b>No ranking</b> · ${current.added.posicao}.º lugar quando foi registada.</p>`; return;
  }
  sh.innerHTML=`<h3>Pôr no ranking</h3><div class="submitbox" style="margin-top:0"><input id="mname" maxlength="30" placeholder="O teu nome" aria-label="O teu nome"><button class="btn" id="addrank">Adicionar ao ranking</button></div><div class="msg" id="addmsg"></div>`;
  document.getElementById('mname').value=store.get('lu25-manager')||'';
  document.getElementById('addrank').addEventListener('click',addToRanking);
}
let writing=false;
async function addToRanking(){
  const nm=document.getElementById('mname').value.trim(), msg=document.getElementById('addmsg');
  if(nm.length<2){msg.className='msg err';msg.textContent='Escreve o teu nome (2 a 30 caracteres).';return;}
  if(writing) return; writing=true; document.getElementById('addrank').disabled=true;
  store.set('lu25-manager',nm);
  const {data,error}=await sb.rpc('guardar_equipa',{p_epoca:EPOCA,p_nome_equipa:current.n,p_nome_treinador:nm,p_jogadores:current.p});
  writing=false;
  if(error){document.getElementById('addrank').disabled=false;msg.className='msg err';msg.textContent='Não deu para guardar: '+errMsg(error);return;}
  const r=Array.isArray(data)?data[0]:data;
  current.added={id:r.id,posicao:r.posicao}; store.set('lu25-current',current); renderResults();
}

// ---- ranking ----
async function loadLeague(){
  leagueState='loading'; renderLeague();
  const {data,error}=await sb.from('equipas').select('id,nome_equipa,nome_treinador,jogadores,pontos,criada_em').eq('epoca',EPOCA).order('pontos',{ascending:false}).order('criada_em',{ascending:true}).limit(500);
  if(error){leagueState='error';league=[];renderLeague(errMsg(error));return;}
  league=data||[]; leagueState='ok'; renderLeague();
}
function renderLeague(err){
  const el=document.getElementById('r-league');
  if(leagueState==='loading'){el.innerHTML='<div class="empty">A carregar o ranking…</div>';return;}
  if(leagueState==='error'){el.innerHTML=`<div class="empty err">Não deu para carregar o ranking: ${esc(err||'')}</div>`;return;}
  const mine=current&&current.added?current.added.id:null;
  el.innerHTML=`<p style="margin:0 0 8px"><button class="btn ghost" id="reload" style="font-size:14px;padding:7px 12px">Atualizar</button></p>`+(league.length?`<table class="rk"><thead><tr><th class="l">#</th><th class="l">Equipa</th><th>Pontos</th></tr></thead><tbody>${league.map((t,i)=>`<tr class="${t.id===mine?'me':''}"><td class="l" style="vertical-align:top">${i+1}</td><td class="l"><details><summary><b>${esc(t.nome_equipa)}</b><div class="who">${esc(t.nome_treinador)}</div></summary><div class="pl">${(t.jogadores||[]).map(id=>BY.get(id)).filter(Boolean).sort((a,b)=>SLOTS.indexOf(a.pos)-SLOTS.indexOf(b.pos)).map(p=>`<span class="pos ${p.pos}" style="min-width:28px;font-size:10px;padding:2px 4px">${p.pos}</span> ${esc(p.name)} <span style="opacity:.75">· ${esc(p.team)} · ${m(p.price)} M</span>`).join('<br>')}</div></details></td><td style="vertical-align:top"><b>${n0(Number(t.pontos))}</b></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Ainda não há equipas no ranking.</div>');
  document.getElementById('reload').addEventListener('click',loadLeague);
}

// ---- regras de pontos ----
(function(){
  const R=RULES, ORD=['S','OPP','Z4','MB','L'];
  const v=(k,p)=>{const o=R.ovr[p]||{};return k in o?o[k]:R.base[k];};
  const f=x=>(x>0?'+':x<0?'−':'')+Math.abs(x).toLocaleString('pt-PT',{maximumFractionDigits:2});
  const ACT=[['kill','Ataque ganho (ponto de ataque)'],['att_err','Erro de ataque'],['att_blocked','Ataque bloqueado pelo adversário'],['ace','Ace (ponto direto de serviço)'],['serve_err','Erro de serviço'],['block','Bloco ganho (ponto de bloco)'],['rec_perf','Receção perfeita'],['rec_pos','Receção positiva (boa, mas não perfeita)'],['rec_err','Erro de receção (ace sofrido)']];
  const noL=['kill','att_err','att_blocked','ace','serve_err','block'];
  const cell=(k,p)=>{if(p==='L'&&noL.includes(k))return '<td class="dim">–</td>';const x=v(k,p);return `<td class="${x!==R.base[k]?'hl':''} ${x<0?'neg':''}">${f(x)}</td>`;};
  const ex=15*v('kill','Z4')+3*v('att_err','Z4')+v('att_blocked','Z4')+v('ace','Z4')+2*v('serve_err','Z4')+v('block','Z4')+6*v('rec_perf','Z4')+6*v('rec_pos','Z4')+v('rec_err','Z4')+R.play+R.win;
  document.getElementById('rules').innerHTML=`<h2>Regras de pontos</h2>
   <p>Cada jogador soma pontos em cada jogo da época 2025/26, a partir das estatísticas oficiais da Federação. Os pontos da tua equipa são a soma dos pontos dos 7 jogadores em todos os jogos: fase regular, playoffs e manutenção.</p>
   <h3 style="margin-top:14px">Pontos por ação</h3>
   <p class="dim" style="margin:0 0 6px;font-size:13px">As células destacadas são valores próprios da posição, para equilibrar o que cada uma faz em campo.</p>
   <div style="overflow-x:auto"><table class="rt"><thead><tr><th class="l">Ação</th>${ORD.map(p=>`<th><span class="pos ${p}">${p}</span></th>`).join('')}</tr></thead><tbody>
   ${ACT.map(([k,l])=>`<tr><td class="l">${l}</td>${ORD.map(p=>cell(k,p)).join('')}</tr>`).join('')}
   <tr><td class="l">Bónus de distribuição: por cada ataque ganho da equipa, nos sets em que foi titular</td>${ORD.map(p=>p==='S'?`<td class="hl">${f(R.dist)}</td>`:'<td class="dim">–</td>').join('')}</tr>
   <tr><td class="l">Bónus de líbero: por cada set jogado</td>${ORD.map(p=>p==='L'?`<td class="hl">${f(R.lib)}</td>`:'<td class="dim">–</td>').join('')}</tr>
   <tr><td class="l">Jogou (entrou em campo pelo menos num set)</td>${ORD.map(()=>`<td>${f(R.play)}</td>`).join('')}</tr>
   <tr><td class="l">Vitória da equipa (se jogou)</td>${ORD.map(()=>`<td>${f(R.win)}</td>`).join('')}</tr>
   <tr><td class="l">Vitória por 3-0 (extra, se jogou)</td>${ORD.map(()=>`<td>${f(R.clean)}</td>`).join('')}</tr>
   </tbody></table></div>
   <p class="dim" style="font-size:13px;margin-top:6px">S distribuidor · OPP oposto · Z4 zona 4 · MB central · L líbero</p>
   <h3 style="margin-top:14px">Notas</h3>
   <ul style="margin:0;padding-left:18px">
    <li>A receção perfeita põe a bola na mão do distribuidor; a positiva é boa mas obriga-o a deslocar-se. As receções fracas que não dão ponto ao adversário valem 0.</li>
    <li>O distribuidor quase não ataca, por isso ganha pontos com os ataques ganhos da equipa: conta o jogo todo, na proporção dos sets em que começou a jogar.</li>
    <li>As defesas não são publicadas pela Federação. O líbero recebe um bónus por set jogado para compensar.</li>
    <li>Um suplente que entra só para servir ou para a rotação também pontua, mas joga menos sets.</li>
    <li>Exemplo: um zona 4 com 15 ataques ganhos, 3 erros de ataque, 1 ataque bloqueado, 1 ace, 2 erros de serviço, 1 bloco e, na receção, 6 perfeitas, 6 positivas e 1 erro, num jogo ganho por 3-1, faz ${ex.toLocaleString('pt-PT',{maximumFractionDigits:2})} pontos.</li>
   </ul>`;
})();

// ---- navegação ----
function route(){
  if(!BY.size) return;
  let v=location.hash.slice(1); current=store.get('lu25-current');
  if(v==='resultado'&&!current) v='montar';
  if(!['montar','resultado','ranking','regras'].includes(v)) v=current?'resultado':'montar';
  document.getElementById('v-build').hidden=v!=='montar';
  document.getElementById('v-res').hidden=v!=='resultado';
  document.getElementById('v-rank').hidden=v!=='ranking';
  document.getElementById('v-rules').hidden=v!=='regras';
  document.querySelectorAll('.tabs a, .bottomnav a').forEach(a=>a.dataset.v===(v==='resultado'?'montar':v)?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  if(v==='montar') renderAll(); else if(v==='resultado') renderResults(); else if(v==='ranking') loadLeague();
  renderAction();
  window.scrollTo(0,0);
}
// A navegação entre separadores substitui a entrada atual do histórico em vez de criar novas:
// assim o botão de recuar do telemóvel/browser sai da app em vez de voltar ao separador anterior.
function go(v){ history.replaceState(null,'','#'+v); route(); }
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]'); if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
  const v=a.getAttribute('href').slice(1); if(!v) return;
  e.preventDefault(); go(v);
});
window.addEventListener('hashchange',route);

// ---- arranque ----
(async function boot(){
  const boot=document.getElementById('boot');
  const [ep,jg]=await Promise.all([
    sb.from('epocas').select('orcamento,aberta').eq('epoca',EPOCA).maybeSingle(),
    sb.from('jogadores').select('jogador_id,nome,equipa,posicao,preco,historico').eq('epoca',EPOCA).limit(1000)
  ]);
  if(ep.error||jg.error){boot.innerHTML=`<span class="err">Não deu para carregar os jogadores: ${esc(errMsg(ep.error||jg.error))}</span>`;return;}
  if(ep.data) BUDGET=Number(ep.data.orcamento)||60;
  P=(jg.data||[]).map(r=>({id:r.jogador_id,name:r.nome,team:r.equipa,pos:r.posicao,price:Number(r.preco),hist:r.historico}));
  BY=new Map(P.map(p=>[p.id,p]));
  pick=(store.get('lu25-draft')||[]).filter(id=>BY.has(id));
  current=store.get('lu25-current'); if(current&&!valid(current.p)) current=null;
  fillTeams(); boot.remove(); route();
})();
