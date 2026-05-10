function buildFilters(){
  const base = getBase();
  const kecs=[...new Set(base.map(r=>r['Kecamatan Domisili']?.trim()).filter(Boolean))].sort();
  const edus=[...new Set(base.map(r=>r['Ijazah Terakhir']?.trim()).filter(Boolean))].sort();
  const fkec=document.getElementById('fkec');
  fkec.innerHTML='<option value="">Semua Kecamatan</option>'+kecs.map(k=>`<option value="${k}">${k}</option>`).join('');
  const fedu=document.getElementById('fedu');
  fedu.innerHTML='<option value="">Semua Pendidikan</option>'+edus.map(e=>`<option value="${e}">${e}</option>`).join('');
}

function doFilter(){
  const q=document.getElementById('srch').value.toLowerCase();
  const kec=document.getElementById('fkec').value;
  const edu=document.getElementById('fedu').value;
  frows=getBase().filter(r=>{
    const nm=(r['Nama Lengkap']||'').toLowerCase();
    const ds=(r['Desa Domisili']||r['nmdesa']||'').toLowerCase();
    return(!q||nm.includes(q)||ds.includes(q))
      &&(!kec||r['Kecamatan Domisili']?.trim()===kec)
      &&(!edu||r['Ijazah Terakhir']?.trim()===edu);
  });
  sortRows();
  curPage=1; renderList();
}

function hasRekom(r){return /(ya|iya|sudah|ada)/i.test(r['Memiliki Surat Rekomendasi Calon Petugas Sensus Ekonomi 2026 dari Perbekel/Lurah']||'');}
function hasSobat(r){return /(sudah|ya|iya)/i.test(r['Sudah melakukan pendaftaran/registrasi melalui Sobat Mitra?']||'');}

function renderList(){
  const st=(curPage-1)*PAGE_SZ;
  const pg=frows.slice(st, st+PAGE_SZ);
  if(!pg.length){
    document.getElementById('listtb').innerHTML=`<tr><td colspan="10"><div class="es"><div class="es-i">🔍</div>Tidak ada data</div></td></tr>`;
  } else {
    document.getElementById('listtb').innerHTML = pg.map((r,i)=>{
      const rekOk = hasRekom(r);
      const sobOk = hasSobat(r);
      const isDup = r._dn||r._dh;
      return `<tr>
        <td>${st+i+1}</td>
        <td style="font-weight:600;min-width:140px">${esc(r['Nama Lengkap']||'–')}${isDup?'<span class="bdg br" style="margin-left:4px;font-size:8px">DUP</span>':''}</td>
        <td>${r['Umur']||'–'}</td>
        <td style="white-space:nowrap">${esc(r['Kecamatan Domisili']||'–')}</td>
        <td>${esc(r['Desa Domisili']||r['nmdesa']||'–')}</td>
        <td><span class="bdg bl" style="font-size:9px">${esc(r['Ijazah Terakhir']||'–')}</span></td>
        <td style="font-size:11px">${esc(r['Pekerjaan']||'–')}</td>
        <td style="text-align:center">${rekOk?'✅':'❌'}</td>
        <td style="text-align:center">${sobOk?'✅':'❌'}</td>
        <td style="font-size:10px;white-space:nowrap">${fmtTs(r.Timestamp)}</td>
      </tr>`;
    }).join('');
  }
  renderPg();
  updateSortInd();
}

// ── SORT ──────────────────────────────────────────────────────────────────────
let sortBy = {key:'ts', dir:'desc'};
const sortMap = {
  name: r=>(r['Nama Lengkap']||'').toLowerCase(),
  age:  r=>parseInt(r['Umur'])||0,
  kec:  r=>(r['Kecamatan Domisili']||'').toLowerCase(),
  desa: r=>(r['Desa Domisili']||r['nmdesa']||'').toLowerCase(),
  edu:  r=>(r['Ijazah Terakhir']||'').toLowerCase(),
  job:  r=>(r['Pekerjaan']||'').toLowerCase(),
  rec:  r=>hasRekom(r)?1:0,
  sob:  r=>hasSobat(r)?1:0,
  ts:   r=>{try{return new Date(r.Timestamp).getTime()||0;}catch(_){return 0;}}
};
function sortRows(){
  const get=sortMap[sortBy.key]; if(!get)return;
  const sgn=sortBy.dir==='desc'?-1:1;
  frows.sort((a,b)=>{const va=get(a),vb=get(b); return va<vb?-sgn : va>vb?sgn : 0;});
}
function setSort(key){
  if(sortBy.key===key) sortBy.dir = sortBy.dir==='asc'?'desc':'asc';
  else sortBy = {key, dir: (key==='ts'||key==='age')?'desc':'asc'};
  sortRows();
  curPage=1;
  renderList();
}
function updateSortInd(){
  document.querySelectorAll('thead th[data-sort]').forEach(th=>{
    const k=th.dataset.sort;
    th.classList.toggle('sa', sortBy.key===k && sortBy.dir==='asc');
    th.classList.toggle('sd', sortBy.key===k && sortBy.dir==='desc');
  });
}

function renderPg(){
  const tot=frows.length, tp=Math.ceil(tot/PAGE_SZ);
  const st=(curPage-1)*PAGE_SZ+1, en=Math.min(curPage*PAGE_SZ,tot);
  document.getElementById('pgi').textContent = tot>0?`Menampilkan ${st}–${en} dari ${tot} pendaftar`:'Tidak ada data';
  let h=`<button class="pb2" onclick="goPage(${curPage-1})" ${curPage<=1?'disabled':''}>‹</button>`;
  for(let p=Math.max(1,curPage-2);p<=Math.min(tp,curPage+2);p++)
    h+=`<button class="pb2${p===curPage?' on':''}" onclick="goPage(${p})">${p}</button>`;
  h+=`<button class="pb2" onclick="goPage(${curPage+1})" ${curPage>=tp?'disabled':''}>›</button>`;
  document.getElementById('pgb').innerHTML=h;
}

function goPage(p){
  const tp=Math.ceil(frows.length/PAGE_SZ);
  if(p<1||p>tp)return;
  curPage=p; renderList();
}

function exportCSV(){
  const base = getBase();
  const hdr=['No','Nama Lengkap','Usia','Kecamatan','Desa/Kel','Pendidikan','Pekerjaan','Surat Rekomendasi','Sobat Mitra','Waktu Daftar'];
  const body=base.map((r,i)=>[
    i+1, r['Nama Lengkap']||'', r['Umur']||'', r['Kecamatan Domisili']||'',
    r['Desa Domisili']||r['nmdesa']||'', r['Ijazah Terakhir']||'', r['Pekerjaan']||'',
    hasRekom(r)?'Ya':'Tidak',
    hasSobat(r)?'Ya':'Tidak',
    r['Timestamp']||''
  ]);
  const suffix = dedup ? '_bersih' : '';
  dlCSV([hdr,...body], `rekrutmen_mitra_se2026${suffix}_${new Date().toISOString().split('T')[0]}.csv`);
  toast('File CSV berhasil diunduh','success');
}
