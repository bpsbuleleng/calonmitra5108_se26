// Resolve a kecamatan filter value to the canonical kec name used in targets.json.
function resolveKec(val){
  if(!val) return '';
  const norm = s => s.trim().replace(/^kec(amatan)?[.\s]*/i,'').replace(/\s+/g,' ').toUpperCase();
  const direct = targets.find(t=>norm(t.kec)===norm(val));
  if(direct) return direct.kec;
  const desaSet = new Set(orows.map(r=>(r['Desa Domisili']||'').trim().toUpperCase()).filter(Boolean));
  if(!desaSet.size) return '';
  const inf = targets.find(t=>desaSet.has(t.desa.trim().toUpperCase()));
  return inf ? inf.kec : '';
}

function calcStats(data){
  data = data || getBase();
  const tot = data.length;
  const totAll = rows.length;
  const todayStr = new Date().toLocaleDateString('id-ID');
  const tdy = data.filter(r=>{
    try{ return r.Timestamp && new Date(r.Timestamp).toLocaleDateString('id-ID')===todayStr; }catch{return false;}
  }).length;
  const kecs = new Set(data.map(r=>r['Kecamatan Domisili']?.trim()).filter(Boolean));
  const desas = new Set(data.map(r=>(r['Desa Domisili']||r['nmdesa']||'').trim().toUpperCase()).filter(Boolean));
  const allKec = geo ? new Set(geo.features.map(f=>f.properties.nmkec)).size : '?';
  const allDesa = geo ? geo.features.length : 148;
  const dupTotal = rows.filter(r=>r._dn||r._dh).length;

  set('s-tot', tot.toLocaleString('id-ID'));
  const baseLen = getBase().length;
  set('s-tots', dedup
    ? `${baseLen} unik (${totAll-baseLen} dikecualikan)`
    : (tot===totAll ? `${tot} orang telah mendaftar` : `dari ${totAll.toLocaleString('id-ID')} total`));
  set('s-tdy', tdy.toLocaleString('id-ID'));
  set('s-tdys', tdy>0?`↑ pendaftar baru hari ini`:`Belum ada pendaftar hari ini`);
  set('s-kec', kecs.size);
  set('s-kecs', `dari ${allKec} kecamatan`);
  set('s-des', desas.size);
  set('s-dess', `dari ${allDesa} desa/kel`);
  set('s-dup', dupTotal);

  const cntByNm2 = {};
  data.forEach(r=>{ const nm=(r['Desa Domisili']||'').trim().toUpperCase(); if(nm) cntByNm2[nm]=(cntByNm2[nm]||0)+1; });
  const ofKec = document.getElementById('of-kec')?.value || '';
  const canonKec0 = resolveKec(ofKec);
  const tgScope = canonKec0 ? targets.filter(t=>t.kec===canonKec0) : targets;
  const desaMet = tgScope.filter(t => t.target>0 && (cntByNm2[t.desa.trim().toUpperCase()]||0) >= t.target).length;
  set('s-tgt', desaMet);
  set('s-tgts', `dari ${tgScope.length} desa`);
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
const COLS=['#1e40af','#3b82f6','#60a5fa','#93c5fd','#0891b2','#06b6d4',
            '#059669','#10b981','#6ee7b7','#d97706','#f59e0b','#fcd34d',
            '#7c3aed','#8b5cf6','#c4b5fd','#db2777','#f472b6'];

function tc_(){return dark?'#94a3b8':'#64748b';}
function gc_(){return dark?'#334155':'#e2e8f0';}

function cntBy(data, fld, top=12){
  const m={};
  data.forEach(r=>{const v=(r[fld]||'Tidak diisi').trim();m[v]=(m[v]||0)+1;});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,top);
}

function mkDonut(id, entries){
  const el=document.getElementById(id); if(!el)return null;
  const ch = charts[id]; if(ch)ch.destroy();
  return charts[id]=new Chart(el,{
    type:'doughnut',
    data:{labels:entries.map(e=>e[0]),datasets:[{data:entries.map(e=>e[1]),backgroundColor:COLS,borderWidth:2,borderColor:dark?'#1e293b':'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{color:tc_(),font:{size:10},boxWidth:11,padding:6}}}}
  });
}

function mkBar(id, labels, data, horiz=false, lg=false){
  const el=document.getElementById(id); if(!el)return null;
  const ch=charts[id]; if(ch)ch.destroy();
  return charts[id]=new Chart(el,{
    type:'bar',
    data:{labels,datasets:[{data,backgroundColor:COLS.slice(0,data.length),borderRadius:5,borderSkipped:false}]},
    options:{
      indexAxis:horiz?'y':'x',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{ticks:{color:tc_(),font:{size:10},maxRotation:horiz?0:30},grid:{color:horiz?gc_():'transparent'}},
        y:{ticks:{color:tc_(),font:{size:10}},grid:{color:horiz?'transparent':gc_()},beginAtZero:true}
      }
    }
  });
}

function mkLine(id, labels, data){
  const el=document.getElementById(id); if(!el)return null;
  const ch=charts[id]; if(ch)ch.destroy();
  return charts[id]=new Chart(el,{
    type:'line',
    data:{labels,datasets:[{data,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#3b82f6',borderWidth:2}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index'}},
      scales:{
        x:{ticks:{color:tc_(),font:{size:10},maxTicksLimit:10},grid:{color:gc_()}},
        y:{ticks:{color:tc_(),font:{size:10},stepSize:1},grid:{color:gc_()},beginAtZero:true}
      }
    }
  });
}

function trendData(data, nDays){
  const now=new Date();
  const labels=[], vals=[];
  for(let i=nDays-1;i>=0;i--){
    const d=new Date(now); d.setDate(d.getDate()-i);
    const ds=d.toLocaleDateString('id-ID');
    labels.push(d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}));
    vals.push(data.filter(r=>{try{return r.Timestamp&&new Date(r.Timestamp).toLocaleDateString('id-ID')===ds;}catch{return false;}}).length);
  }
  return {labels,vals};
}

function setTrend(d, btn){
  trDays=d;
  document.querySelectorAll('#tr-seg .seg-b').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const td=trendData(orows, trDays);
  mkLine('trendC', td.labels, td.vals);
}

function buildCharts(data){
  data = data || rows;
  const td=trendData(data, trDays);
  mkLine('trendC', td.labels, td.vals);

  const edu=cntBy(data,'Ijazah Terakhir');
  mkDonut('eduC', edu);

  const job=cntBy(data,'Pekerjaan');
  mkBar('jobC', job.map(e=>e[0]), job.map(e=>e[1]), true);

  const ofKec = document.getElementById('of-kec')?.value || '';
  const ofDesa = document.getElementById('of-desa')?.value || '';
  let kecE, kecTtl;
  if(ofDesa){
    kecE  = cntBy(data, 'Desa Domisili', 1);
    kecTtl = `Sebaran — Desa ${ofDesa}`;
  } else if(ofKec){
    kecE  = cntBy(data, 'Desa Domisili', 30);
    kecTtl = `Sebaran per Desa — Kec. ${ofKec}`;
  } else {
    kecE  = cntBy(data, 'Kecamatan Domisili', 20);
    kecTtl = 'Sebaran per Kecamatan';
  }
  set('kecC-ttl', kecTtl);
  mkBar('kecC', kecE.map(e=>e[0]), kecE.map(e=>e[1]), false);

  const ageBk={'<20':0,'20–29':0,'30–39':0,'40–49':0,'≥50':0};
  data.forEach(r=>{const a=parseInt(r['Umur']);if(!isNaN(a)){
    if(a<20)ageBk['<20']++;
    else if(a<30)ageBk['20–29']++;
    else if(a<40)ageBk['30–39']++;
    else if(a<50)ageBk['40–49']++;
    else ageBk['≥50']++;
  }});
  mkBar('ageC', Object.keys(ageBk), Object.values(ageBk));

  const sobat=cntBy(rows,'Sudah melakukan pendaftaran/registrasi melalui Sobat Mitra?');
  mkDonut('sobatC', sobat);

  const docLbls=['Unggah KTP','Surat Rekomendasi','Surat Pernyataan'];
  const docCnt=[
    rows.filter(r=>r['KTP']?.trim()).length,
    rows.filter(r=>r['Surat Rekomendasi']?.trim()).length,
    rows.filter(r=>r['Surat Pernyataan Kesiapan']?.trim()).length
  ];
  mkBar('docC', docLbls, docCnt);
}

// ── OVERVIEW FILTER ───────────────────────────────────────────────────────────
function uniq(field, base){
  return [...new Set((base||getBase()).map(r=>r[field]?.toString().trim()).filter(Boolean))].sort();
}
function buildOFilters(){
  const fill=(id, opts, label)=>{
    const el=document.getElementById(id); if(!el)return;
    const cur=el.value;
    el.innerHTML=`<option value="">${label}</option>`+opts.map(o=>`<option value="${esc(o)}"${o===cur?' selected':''}>${esc(o)}</option>`).join('');
  };
  fill('of-kec', uniq('Kecamatan Domisili'), 'Semua Kecamatan');
  fill('of-edu', uniq('Ijazah Terakhir'), 'Semua Pendidikan');
  fill('of-job', uniq('Pekerjaan'), 'Semua Pekerjaan');
  refreshDesaOpts();
}
function refreshDesaOpts(){
  const kec=document.getElementById('of-kec').value;
  const b = getBase();
  const base = kec ? b.filter(r=>r['Kecamatan Domisili']?.trim()===kec) : b;
  const opts=uniq('Desa Domisili', base);
  const el=document.getElementById('of-desa'); if(!el)return;
  const cur=el.value;
  const stillValid = !cur || opts.includes(cur);
  el.innerHTML='<option value="">Semua Desa</option>'+opts.map(o=>`<option value="${esc(o)}"${o===cur&&stillValid?' selected':''}>${esc(o)}</option>`).join('');
  if(!stillValid) el.value='';
}
function applyOFilter(){
  const base = getBase();
  const kec=document.getElementById('of-kec').value;
  const desa=document.getElementById('of-desa').value;
  const edu=document.getElementById('of-edu').value;
  const job=document.getElementById('of-job').value;
  orows = base.filter(r=>
       (!kec ||r['Kecamatan Domisili']?.trim()===kec)
    && (!desa||r['Desa Domisili']?.trim()===desa)
    && (!edu ||r['Ijazah Terakhir']?.trim()===edu)
    && (!job ||r['Pekerjaan']?.trim()===job)
  );
  const active = !!(kec||desa||edu||job);
  document.getElementById('of-reset').style.display = active?'inline-flex':'none';
  document.getElementById('of-info').textContent = active
    ? `Menampilkan ${orows.length.toLocaleString('id-ID')} dari ${base.length.toLocaleString('id-ID')} pendaftar`
    : '';
}
function onOFilter(changed){
  if(changed==='kec') refreshDesaOpts();
  applyOFilter();
  renderOverview();
}
function resetOFilter(){
  ['of-kec','of-desa','of-edu','of-job'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  refreshDesaOpts();
  applyOFilter();
  renderOverview();
}
