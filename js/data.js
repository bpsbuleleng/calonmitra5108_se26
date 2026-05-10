function earliestIdx(indices){
  return indices.reduce((a,b)=>{
    try{ return new Date(rows[a].Timestamp).getTime() <= new Date(rows[b].Timestamp).getTime() ? a : b; }
    catch{ return a; }
  });
}

function buildCleanRows(){
  const kept = new Set();
  const nikSeen = new Set(), hpSeen = new Set();
  const sorted = rows.map((r,i)=>({r,i})).sort((a,b)=>{
    try{ return new Date(a.r.Timestamp).getTime() - new Date(b.r.Timestamp).getTime(); }catch{ return 0; }
  });
  for(const {r,i} of sorted){
    const nh=r._nh, ph=r._ph;
    const alreadySeen = (nh && nikSeen.has(nh)) || (ph && hpSeen.has(ph));
    if(!alreadySeen) kept.add(i);
    if(nh) nikSeen.add(nh);
    if(ph) hpSeen.add(ph);
  }
  return rows.filter((_,i)=>kept.has(i));
}

function toggleDedup(){
  dedup = !dedup;
  const btn = document.getElementById('dedup-btn');
  btn.classList.toggle('on', dedup);
  set('dedup-icon', dedup ? '✅' : '📋');
  set('dedup-label', dedup ? 'Data Bersih' : 'Semua Data');
  applyOFilter();
  renderOverview();
  renderReqs();
  const base = getBase();
  const q=document.getElementById('srch').value.toLowerCase();
  const kec=document.getElementById('fkec').value;
  const edu=document.getElementById('fedu').value;
  frows = base.filter(r=>{
    const nm=(r['Nama Lengkap']||'').toLowerCase();
    const ds=(r['Desa Domisili']||r['nmdesa']||'').toLowerCase();
    return(!q||nm.includes(q)||ds.includes(q))&&(!kec||r['Kecamatan Domisili']?.trim()===kec)&&(!edu||r['Ijazah Terakhir']?.trim()===edu);
  });
  sortRows(); curPage=1; renderList();
  buildFilters(); buildOFilters();
  if(mapPainted && gjLayer && geo) paintMap();
  if(document.getElementById('tsec-rekap').classList.contains('on')) renderRekap();
}

async function load(){
  show('lov'); ltxt('Mengambil data...');
  try{
    if(!WEBAPP_URL){
      throw new Error('WEBAPP_URL belum diisi. Lihat apps_script/Code.gs untuk cara deploy.');
    }
    const [data, gj, tg] = await Promise.all([
      fetchData(),
      geo ? Promise.resolve(geo) : fetch(GEO_URL).then(r=>r.json()),
      targets.length ? Promise.resolve(targets) : fetch('excel/targets.json').then(r=>r.json()).catch(()=>[])
    ]);
    geo = gj;
    targets = tg || [];
    targetByIdDesa = {};
    targets.forEach(t => { targetByIdDesa[t.iddesa] = t.target; });
    rows = data.filter(r => r && r.Timestamp && String(r.Timestamp).trim());
    frows = [...rows];
    ltxt('Memproses data...');
    await process();
    document.getElementById('upd').textContent =
      'Diperbarui: ' + new Date().toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    toast('Data berhasil dimuat','success');
    schedRefresh();
  }catch(e){
    console.error(e);
    toast('Gagal memuat data: '+e.message,'error');
  }finally{ hide('lov'); }
}

async function fetchData(){
  const r = await fetch(WEBAPP_URL, {redirect:'follow', cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j = await r.json();
  if(j.error) throw new Error(j.error);
  return j.rows || [];
}

async function process(){
  await detectDups();
  cleanRows = buildCleanRows();
  buildOFilters();
  buildRekapFilters();
  applyOFilter();
  renderOverview();
  renderReqs();
  renderDupTable();
  frows = [...getBase()];
  sortRows(); renderList();
  buildFilters();
  renderRekap();
  mapPainted = false;
  fillMapKecFilter();
  if(document.getElementById('tsec-map').classList.contains('on')){
    initMap(); paintMap(); mapPainted=true;
    setTimeout(()=>lmap&&lmap.invalidateSize(),100);
  }
}

function renderOverview(){
  calcStats(orows);
  buildCharts(orows);
}

function fillMapKecFilter(){
  if(!geo)return;
  const kecs = [...new Set(geo.features.map(f=>f.properties.nmkec))].sort();
  const mkf = document.getElementById('mkf');
  if(mkf) mkf.innerHTML='<option value="">Semua Kecamatan</option>'+kecs.map(k=>`<option value="${k}">${k}</option>`).join('');
}

async function doRefresh(){
  if(!WEBAPP_URL){ toast('WEBAPP_URL belum diisi','error'); return; }
  show('lov'); ltxt('Memperbarui data...');
  try{
    const data = await fetchData();
    rows = data.filter(r => r && r.Timestamp && String(r.Timestamp).trim());
    frows=[...rows];
    await process();
    toast('Data berhasil diperbarui','success');
  }catch(e){ toast('Gagal memperbarui data','error'); }
  finally{ hide('lov'); schedRefresh(); }
}
