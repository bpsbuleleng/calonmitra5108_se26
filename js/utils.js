function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}

// Normalize desa name for cross-source matching (form data vs targets vs GeoJSON).
// Strips administrative prefixes ("Desa", "Kel.", "Kelurahan") that appear in form data
// but are absent from the canonical target/GeoJSON names.
function normDesa(s){
  if(!s) return '';
  return String(s).trim()
    .replace(/^(desa|kel\.?|kelurahan|dusun|dsn\.?)\s+/i,'')
    .replace(/\s+/g,' ')
    .toUpperCase();
}
function show(id){const e=document.getElementById(id);if(e)e.style.display='flex';}
function hide(id){const e=document.getElementById(id);if(e)e.style.display='none';}
function ltxt(t){const e=document.getElementById('ltxt');if(e)e.textContent=t;}
function fmtTs(ts){
  try{ if(!ts)return '–'; return new Date(ts).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch{ return ts||'–'; }
}

function dlCSV(rows2d, filename){
  const csv = rows2d.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'}));
  a.download = filename; a.click();
}

function toast(msg,type='info'){
  const ico={info:'ℹ️',success:'✅',error:'❌',warning:'⚠️'};
  const el=document.createElement('div');
  el.className='toast';
  el.innerHTML=`<span>${ico[type]}</span><span>${esc(msg)}</span>`;
  document.getElementById('tc').appendChild(el);
  setTimeout(()=>el.remove(),3500);
}

function toggleDark(){
  dark=!dark;
  document.documentElement.setAttribute('data-theme', dark?'dark':'light');
  document.getElementById('thbtn').textContent = dark?'☀️':'🌙';
  localStorage.setItem('th', dark?'d':'l');
  refreshChartTheme();
}
function refreshChartTheme(){
  const tc = dark?'#94a3b8':'#64748b';
  const gc = dark?'#334155':'#e2e8f0';
  Object.values(charts).forEach(ch=>{
    if(!ch)return;
    if(ch.options.scales) Object.values(ch.options.scales).forEach(sc=>{
      if(sc.ticks)sc.ticks.color=tc;
      if(sc.grid)sc.grid.color=gc;
    });
    if(ch.options.plugins?.legend?.labels) ch.options.plugins.legend.labels.color=tc;
    ch.update();
  });
}

function goTab(t){
  document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('on', el.dataset.tab===t));
  document.querySelectorAll('.tsec').forEach(el=>el.classList.toggle('on', el.id===`tsec-${t}`));
  if(t==='map'){
    setTimeout(()=>{
      if(!mapPainted && geo){ initMap(); paintMap(); mapPainted=true; }
      if(lmap){ lmap.invalidateSize(); if(gjLayer) lmap.fitBounds(gjLayer.getBounds(),{padding:[20,20]}); }
    },150);
  }
  if(t==='rekap') renderRekap();
}

function schedRefresh(){
  clearInterval(rTimer); clearInterval(cTimer);
  nextAt=Date.now()+REFRESH_MS;
  cTimer=setInterval(()=>{
    const rem=Math.max(0,Math.round((nextAt-Date.now())/1000));
    document.getElementById('rcd').textContent=`${Math.floor(rem/60)}:${String(rem%60).padStart(2,'0')}`;
  },1000);
  rTimer=setInterval(doRefresh,REFRESH_MS);
}
