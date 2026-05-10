// Dynamically resolve the desa field name from a row object.
// Tries exact canonical name first, then scans for any field containing "desa"
// (but not "kecamatan") so the dashboard works regardless of exact question wording.
let _desaFieldCache = null;
function resolveDesaField(r){
  if(_desaFieldCache) return _desaFieldCache;
  const keys = Object.keys(r);
  _desaFieldCache =
    (keys.find(k => k === 'Desa Domisili')) ||
    (keys.find(k => /desa/i.test(k) && !/kecamatan/i.test(k))) ||
    'Desa Domisili';
  console.log('[Rekap] Field desa terdeteksi:', _desaFieldCache);
  return _desaFieldCache;
}
function getDesaVal(r){ return r[resolveDesaField(r)] || r['nmdesa'] || ''; }

function buildRekapData(){
  _desaFieldCache = null; // reset on each full rebuild
  const cntByNm = {};
  const base = getBase();
  base.forEach(r=>{
    const nm = normDesa(getDesaVal(r));
    if(nm) cntByNm[nm] = (cntByNm[nm]||0) + 1;
  });

  // Populate persistent debug info — rendered by showRekapDbg() if counts stay at 0
  const totalCnt = Object.values(cntByNm).reduce((a,b)=>a+b,0);
  window._rkDbgInfo = {
    baseLen: base.length,
    totalCnt,
    fieldDetected: base.length ? resolveDesaField(base[0]) : '(no rows)',
    sampleRaw:  base.slice(0,3).map(r=>r[resolveDesaField(r)]||''),
    sampleNorm: base.slice(0,3).map(r=>normDesa(getDesaVal(r))),
    cntKeys:    Object.keys(cntByNm).slice(0,8),
    tgtSample:  targets.slice(0,5).map(t=>normDesa(t.desa)+' → '+( cntByNm[normDesa(t.desa)]||0 ))
  };
  console.log('[Rekap dbg]', window._rkDbgInfo);

  const desaRows = targets.map(t=>{
    const tot = cntByNm[normDesa(t.desa)] || 0;
    const pct = t.target > 0 ? tot/t.target : 0;
    const status = t.target===0 ? 'nodata' : tot===0 ? 'empty' : tot>=t.target ? 'met' : 'partial';
    return {iddesa:t.iddesa, desa:t.desa, kec:t.kec, tot, tgt:t.target, pct, status};
  });

  // Aggregate to kecamatan — kec values are all canonical from targets, so always 9 rows.
  const kecMap = {};
  desaRows.forEach(d=>{
    if(!kecMap[d.kec]) kecMap[d.kec] = {kec:d.kec, tot:0, tgt:0, desa:0, met:0};
    kecMap[d.kec].tot += d.tot;
    kecMap[d.kec].tgt += d.tgt;
    kecMap[d.kec].desa++;
    if(d.status==='met') kecMap[d.kec].met++;
  });
  const kecRows = Object.values(kecMap).map(k=>({...k, pct: k.tgt>0 ? k.tot/k.tgt : 0}));

  return {desaRows, kecRows};
}

let _rekapCache = null;
function getRekap(){ return _rekapCache || (_rekapCache = buildRekapData()); }

function renderRekap(){
  _rekapCache = null;
  buildRekapFilters();
  renderRekapKec();
  renderRekapDesa();
  renderTargetList();
}

const RKEC_COLS = {
  kec:  r=>r.kec.toLowerCase(),
  tot:  r=>r.tot,
  tgt:  r=>r.tgt,
  pct:  r=>r.pct,
  des:  r=>r.desa,
  met:  r=>r.met
};

function setRSort(key, th){
  if(rekapSort.key===key) rekapSort.dir = rekapSort.dir==='asc'?'desc':'asc';
  else rekapSort = {key, dir: key==='kec'||key==='kec2'||key==='desa' ? 'asc' : 'desc'};
  document.querySelectorAll('#rekap-kec-tbl th[data-sort], #rekap-desa-tbl th[data-sort]').forEach(t=>{
    t.classList.remove('sa','sd');
  });
  if(th){ th.classList.add(rekapSort.dir==='asc'?'sa':'sd'); }
  renderRekapKec();
  renderRekapDesa();
}

function showRekapDbg(kecRows){
  const allZero = kecRows.length > 0 && kecRows.every(k=>k.tot===0);
  let el = document.getElementById('rkdbg');
  if(!el){
    el = document.createElement('div');
    el.id = 'rkdbg';
    el.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:10px 0;font-size:12px;font-family:monospace;line-height:1.6;display:none';
    const card = document.querySelector('#tsec-rekap .card.sec');
    if(card) card.prepend(el);
  }
  if(!allZero){ el.style.display='none'; return; }
  const d = window._rkDbgInfo || {};
  el.style.display = 'block';
  el.innerHTML = `<b style="font-size:13px">⚠️ Debug: semua pendaftar = 0</b><br>
    Baris data (getBase): <b>${d.baseLen??'?'}</b> &nbsp;|&nbsp; Nilai desa terekstrak: <b>${d.totalCnt??'?'}</b><br>
    Kolom desa terdeteksi: <b>${esc(d.fieldDetected??'?')}</b><br>
    Nilai mentah [0–2]: <b>${(d.sampleRaw||[]).map(v=>esc(v||'(kosong)')).join(' | ')}</b><br>
    Setelah normDesa:   <b>${(d.sampleNorm||[]).map(v=>esc(v||'(kosong)')).join(' | ')}</b><br>
    Kunci cntByNm:      <b>${(d.cntKeys||[]).map(esc).join(' | ')||'(kosong)'}</b><br>
    Target sample (norm → hit): <b>${(d.tgtSample||[]).map(esc).join(' | ')}</b>`;
}

function renderRekapKec(){
  const {kecRows} = getRekap();
  const rkecF = document.getElementById('rkec-f')?.value || '';
  const filtered = rkecF ? kecRows.filter(k=>k.kec===rkecF) : kecRows;
  const get = RKEC_COLS[rekapSort.key]||RKEC_COLS.tot;
  const sgn = rekapSort.dir==='desc'?-1:1;
  const sorted = [...filtered].sort((a,b)=>{const va=get(a),vb=get(b);return va<vb?-sgn:va>vb?sgn:0;});

  document.getElementById('rekap-kec-body').innerHTML = sorted.map(k=>{
    const pct = Math.round(k.pct*100);
    const w = Math.min(100,pct);
    const col = k.pct>=1?'#059669':k.pct>=.5?'#d97706':'#dc2626';
    const badgeCls = k.pct>=1?'bg':k.pct>=.5?'by':'br';
    return `<tr>
      <td style="font-weight:700">${esc(k.kec)}</td>
      <td style="font-variant-numeric:tabular-nums;font-weight:600">${k.tot.toLocaleString('id-ID')}</td>
      <td style="font-variant-numeric:tabular-nums">${k.tgt.toLocaleString('id-ID')}</td>
      <td><span class="bdg ${badgeCls}">${pct}%</span></td>
      <td>${k.desa}</td>
      <td><span class="bdg ${k.met===k.desa?'bg':'bw'}">${k.met} / ${k.desa}</span></td>
      <td style="min-width:100px;width:120px">
        <div style="height:6px;background:var(--brd);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${w}%;background:${col};border-radius:3px;transition:width .8s"></div>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">Belum ada data</td></tr>`;
  showRekapDbg(sorted);
}

const RDESA_COLS = {
  desa: r=>r.desa.toLowerCase(),
  kec2: r=>r.kec.toLowerCase(),
  tot2: r=>r.tot,
  tgt2: r=>r.tgt,
  pct2: r=>r.pct,
};
const RD_PG = 25;
let rekapDesaRows = [];

function renderRekapDesa(){
  const {desaRows} = getRekap();
  const q      = (document.getElementById('rekap-srch')?.value||'').toLowerCase();
  const rkecF  = document.getElementById('rkec-f')?.value  || '';
  const rdesaF = document.getElementById('rdesa-f')?.value || '';
  rekapDesaRows = desaRows.filter(d=>{
    const matchQ = !q      || d.desa.toLowerCase().includes(q) || d.kec.toLowerCase().includes(q);
    const matchK = !rkecF  || d.kec===rkecF;
    const matchD = !rdesaF || d.desa.trim().toUpperCase()===rdesaF.trim().toUpperCase();
    return matchQ && matchK && matchD;
  });
  const get = RDESA_COLS[rekapSort.key];
  if(get){
    const sgn = rekapSort.dir==='desc'?-1:1;
    rekapDesaRows.sort((a,b)=>{const va=get(a),vb=get(b);return va<vb?-sgn:va>vb?sgn:0;});
  } else {
    rekapDesaRows.sort((a,b)=>a.kec.localeCompare(b.kec)||a.desa.localeCompare(b.desa));
  }
  const tp = Math.ceil(rekapDesaRows.length/RD_PG);
  rekapDesaPage = Math.min(rekapDesaPage, Math.max(1,tp));
  const st = (rekapDesaPage-1)*RD_PG;
  const pg = rekapDesaRows.slice(st, st+RD_PG);

  const statusIco = {met:'✅',partial:'⚠️',empty:'⛔',nodata:'–'};
  const badgeCls  = {met:'bg',partial:'by',empty:'br',nodata:'bw'};
  document.getElementById('rekap-desa-body').innerHTML = pg.map((d,i)=>{
    const pct = Math.round(d.pct*100);
    const w = Math.min(100,pct);
    const col = d.pct>=1?'#059669':d.pct>=.5?'#d97706':'#dc2626';
    return `<tr>
      <td>${st+i+1}</td>
      <td style="font-weight:600">${esc(d.desa||'–')}</td>
      <td style="white-space:nowrap">${esc(d.kec||'–')}</td>
      <td style="font-weight:700;font-variant-numeric:tabular-nums">${d.tot}</td>
      <td style="font-variant-numeric:tabular-nums">${d.tgt||'–'}</td>
      <td>${d.tgt>0?`<span class="bdg ${badgeCls[d.status]}">${pct}%</span>`:'–'}</td>
      <td>${statusIco[d.status]}</td>
      <td style="min-width:80px;width:100px">
        ${d.tgt>0?`<div style="height:6px;background:var(--brd);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${w}%;background:${col};border-radius:3px;transition:width .8s"></div>
        </div>`:'–'}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)">Tidak ada data</td></tr>`;

  const en = Math.min(st+RD_PG, rekapDesaRows.length);
  document.getElementById('rekap-pgi').textContent = rekapDesaRows.length>0
    ? `Menampilkan ${st+1}–${en} dari ${rekapDesaRows.length} desa` : '';
  let h = `<button class="pb2" onclick="goRDPage(${rekapDesaPage-1})" ${rekapDesaPage<=1?'disabled':''}>‹</button>`;
  for(let p=Math.max(1,rekapDesaPage-2);p<=Math.min(tp,rekapDesaPage+2);p++)
    h+=`<button class="pb2${p===rekapDesaPage?' on':''}" onclick="goRDPage(${p})">${p}</button>`;
  h+=`<button class="pb2" onclick="goRDPage(${rekapDesaPage+1})" ${rekapDesaPage>=tp?'disabled':''}>›</button>`;
  document.getElementById('rekap-pgb').innerHTML=h;
}

function goRDPage(p){
  const tp=Math.ceil(rekapDesaRows.length/RD_PG);
  if(p<1||p>tp)return;
  rekapDesaPage=p; renderRekapDesa();
}

function exportRekapKec(){
  const {kecRows} = buildRekapData();
  const hdr = ['Kecamatan','Total Pendaftar','Target Petugas','% Terpenuhi','Jumlah Desa','Desa Memenuhi Target'];
  const body = kecRows.map(k=>[k.kec, k.tot, k.tgt, Math.round(k.pct*100)+'%', k.desa, k.met]);
  dlCSV([hdr,...body], `rekap_kecamatan_se2026_${new Date().toISOString().split('T')[0]}.csv`);
  toast('Export rekap kecamatan berhasil','success');
}

function exportRekapDesa(){
  const {desaRows} = buildRekapData();
  const hdr = ['Kecamatan','Desa/Kelurahan','Total Pendaftar','Target Petugas','% Terpenuhi','Status'];
  const statusLabel = {met:'Memenuhi',partial:'Belum Cukup',empty:'Belum Ada Pendaftar',nodata:'–'};
  const body = desaRows.map(d=>[d.kec, d.desa, d.tot, d.tgt||'', d.tgt>0?Math.round(d.pct*100)+'%':'–', statusLabel[d.status]]);
  dlCSV([hdr,...body], `rekap_desa_se2026_${new Date().toISOString().split('T')[0]}.csv`);
  toast('Export rekap desa berhasil','success');
}

// ── REKAP FILTER ──────────────────────────────────────────────────────────────
function buildRekapFilters(){
  const kecs = [...new Set(targets.map(t=>t.kec))].filter(Boolean).sort();
  const el = document.getElementById('rkec-f');
  if(!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">Semua Kecamatan</option>' +
    kecs.map(k=>`<option value="${esc(k)}"${k===cur?' selected':''}>${esc(k)}</option>`).join('');
  refreshRekapDesaOpts();
}
function refreshRekapDesaOpts(){
  const kec = document.getElementById('rkec-f')?.value || '';
  const desas = targets.filter(t=>!kec||t.kec===kec).map(t=>t.desa).sort();
  const el = document.getElementById('rdesa-f');
  if(!el) return;
  const cur = el.value;
  el.innerHTML = '<option value="">Semua Desa</option>' +
    desas.map(d=>`<option value="${esc(d)}"${d===cur?' selected':''}>${esc(d)}</option>`).join('');
  if(cur && !desas.includes(cur)) el.value = '';
}
function onRekapFilter(changed){
  if(changed==='kec') refreshRekapDesaOpts();
  const active = !!(document.getElementById('rkec-f')?.value || document.getElementById('rdesa-f')?.value);
  document.getElementById('rkec-reset').style.display = active ? 'inline-flex' : 'none';
  rekapDesaPage = 1;
  renderRekapKec();
  renderRekapDesa();
  renderTargetList();
}
function resetRekapFilter(){
  ['rkec-f','rdesa-f'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  refreshRekapDesaOpts();
  document.getElementById('rkec-reset').style.display = 'none';
  rekapDesaPage = 1;
  renderRekapKec();
  renderRekapDesa();
  renderTargetList();
}

// ── TARGET FULFILLMENT ────────────────────────────────────────────────────────
function setTgF(f, btn){
  tgF = f;
  document.querySelectorAll('#tg-seg .seg-b').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderTargetList();
}

function renderTargetList(){
  const tgList = document.getElementById('tg-list');
  const tgSum  = document.getElementById('tg-summary');
  if(!tgList) return;
  if(!targets.length){
    tgList.innerHTML = `<div class="es"><div class="es-i">📭</div>Data target belum dimuat</div>`;
    if(tgSum) tgSum.innerHTML = '';
    return;
  }
  const cntByNm = {};
  getBase().forEach(r=>{ const nm=normDesa(getDesaVal(r)); if(nm) cntByNm[nm]=(cntByNm[nm]||0)+1; });
  const rkecF  = document.getElementById('rkec-f')?.value  || '';
  const rdesaF = document.getElementById('rdesa-f')?.value || '';
  let scope = targets.slice();
  if(rdesaF)      scope = scope.filter(t=>normDesa(t.desa)===normDesa(rdesaF));
  else if(rkecF)  scope = scope.filter(t=>t.kec===rkecF);

  const items = scope.map(t=>{
    const actual = cntByNm[normDesa(t.desa)]||0;
    const pct = t.target>0 ? actual/t.target : 0;
    const status = (t.target>0 && actual>=t.target) ? 'met' : (actual===0 ? 'empty' : 'partial');
    return {...t, actual, pct, status};
  });

  const met=items.filter(i=>i.status==='met').length;
  const part=items.filter(i=>i.status==='partial').length;
  const emp=items.filter(i=>i.status==='empty').length;
  const totT=items.reduce((s,i)=>s+i.target,0);
  const totA=items.reduce((s,i)=>s+i.actual,0);
  const totPct = totT>0 ? Math.round(totA/totT*100) : 0;
  if(tgSum) tgSum.innerHTML = `
    <span class="bdg bg">✅ Memenuhi: ${met}</span>
    <span class="bdg by">⚠️ Belum Cukup: ${part}</span>
    <span class="bdg br">⛔ Belum Ada: ${emp}</span>
    <span class="bdg bw" style="margin-left:auto">Total: ${totA} / ${totT} petugas (${totPct}%)</span>
  `;

  let view = items;
  if(tgF!=='all') view = items.filter(i=>i.status===tgF);

  view.sort((a,b)=>{
    if(tgF==='all'){
      const o={empty:0,partial:1,met:2};
      if(a.status!==b.status) return o[a.status]-o[b.status];
    }
    if(a.status==='partial' && b.status==='partial') return a.pct - b.pct;
    return b.target - a.target;
  });

  const ic = {met:'✅', partial:'⚠️', empty:'⛔'};
  tgList.innerHTML = view.length ? view.map(i=>{
    const w = Math.min(100, Math.round(i.pct*100));
    return `<div class="tg-row tg-${i.status}">
      <div class="tg-name">
        <span class="tg-desa">${ic[i.status]} ${esc(i.desa)}</span>
        <span class="tg-kec">Kec. ${esc(i.kec)}</span>
      </div>
      <div class="tg-bar"><div class="tg-fill" style="width:${w}%"></div></div>
      <div class="tg-num">${i.actual} / ${i.target}</div>
      <div class="tg-pct">${Math.round(i.pct*100)}%</div>
    </div>`;
  }).join('') : `<div class="es"><div class="es-i">🔍</div>Tidak ada desa pada filter ini</div>`;
}
