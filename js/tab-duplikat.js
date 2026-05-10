// Hash NIK & HP dihitung di server (Apps Script). PII tidak pernah sampai ke browser.
async function detectDups(){
  const nikMap={}, hpMap={};
  rows.forEach((r,i)=>{
    const nh = r.nik_hash || null;
    const ph = r.hp_hash  || null;
    r._i=i; r._nh=nh; r._ph=ph;
    if(nh){nikMap[nh]=nikMap[nh]||[];nikMap[nh].push(i);}
    if(ph){hpMap[ph]=hpMap[ph]||[];hpMap[ph].push(i);}
  });

  const nikG = Object.entries(nikMap).filter(([,v])=>v.length>1);
  const hpG  = Object.entries(hpMap).filter(([,v])=>v.length>1);
  const nikSet = new Set(nikG.flatMap(([,v])=>v));
  const hpSet  = new Set(hpG.flatMap(([,v])=>v));
  rows.forEach((r,i)=>{ r._dn=nikSet.has(i); r._dh=hpSet.has(i); });

  let gn=0;
  dupGroups.nik = nikG.map(([h,idx])=>({type:'NIK',g:++gn,idx}));
  dupGroups.hp  = hpG.map(([h,idx])=>({type:'No. HP',g:++gn,idx}));

  const total = new Set([...nikSet,...hpSet]).size;
  if(total>0){
    const bd=document.getElementById('dupbdg'); bd.textContent=total; bd.style.display='inline-flex';
  } else {
    document.getElementById('dupbdg').style.display='none';
  }
}

function setDupF(f, btn){
  dupF=f;
  document.querySelectorAll('.dfb').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderDupTable();
}

function renderDupTable(){
  const nikN=dupGroups.nik.reduce((s,g)=>s+g.idx.length,0);
  const hpN =dupGroups.hp.reduce((s,g)=>s+g.idx.length,0);
  const both=rows.filter(r=>r._dn&&r._dh).length;
  document.getElementById('dupstats').innerHTML=`
    <span class="bdg br">⚠️ Duplikat NIK: ${nikN} data (${dupGroups.nik.length} grup)</span>
    <span class="bdg by">⚠️ Duplikat No. HP: ${hpN} data (${dupGroups.hp.length} grup)</span>
    ${both?`<span class="bdg br">🚨 Duplikat Keduanya: ${both} data</span>`:''}
  `;

  let groups=[];
  if(dupF==='all'||dupF==='nik') groups=[...groups,...dupGroups.nik];
  if(dupF==='all'||dupF==='hp')  groups=[...groups,...dupGroups.hp];
  if(dupF==='both'){
    const bi=rows.map((r,i)=>(r._dn&&r._dh)?i:null).filter(x=>x!==null);
    groups=bi.map((i,j)=>({type:'NIK & No. HP',g:j+1,idx:[i]}));
  }

  if(!groups.length){
    document.getElementById('duptb').innerHTML=`<tr><td colspan="7"><div class="es"><div class="es-i">✅</div>Tidak ada duplikat terdeteksi</div></td></tr>`;
    return;
  }

  let no=0, html='';
  groups.forEach(grp=>{
    grp.idx.forEach(i=>{
      no++;
      const r=rows[i]; if(!r)return;
      const ts=fmtTs(r.Timestamp);
      const bcls=grp.type==='NIK'?'br':grp.type==='No. HP'?'by':'br';
      html+=`<tr>
        <td>${no}</td>
        <td style="font-weight:600">${esc(r['Nama Lengkap']||'–')}</td>
        <td>${esc(r['Kecamatan Domisili']||'–')}</td>
        <td>${esc(r['Desa Domisili']||r['nmdesa']||'–')}</td>
        <td style="font-size:10px;white-space:nowrap">${ts}</td>
        <td><span class="bdg ${bcls}">${grp.type}</span></td>
        <td><span class="bdg bw">Grup ${grp.g}</span></td>
      </tr>`;
    });
  });
  document.getElementById('duptb').innerHTML=html;
}
