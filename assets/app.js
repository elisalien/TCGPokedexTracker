// v3.8.0 – features preserved, offline loader with visible progress
(function(){
  "use strict";
  const byId = (id)=>document.getElementById(id);
  const div = (cls)=>{ const el=document.createElement('div'); el.className=cls; return el; };
  const escapeHtml = (s)=> (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));

  const REGIONS = [
    { key: 'Tout', start:1, end:1025 },
    { key: 'Kanto', start:1, end:151 },
    { key: 'Johto', start:152, end:251 },
    { key: 'Hoenn', start:252, end:386 },
    { key: 'Sinnoh', start:387, end:493 },
    { key: 'Unys', start:494, end:649 },
    { key: 'Kalos', start:650, end:721 },
    { key: 'Alola', start:722, end:809 },
    { key: 'Galar', start:810, end:898 },
    { key: 'Hisui', start:899, end:905 },
    { key: 'Paldea', start:906, end:1025 },
  ];
  const TYPE_COLORS = { Normal:'#A8A77A', Feu:'#EE8130', Eau:'#6390F0', Plante:'#7AC74C', Électrik:'#F7D02C', Glace:'#96D9D6', Combat:'#C22E28', Poison:'#A33EA1', Sol:'#E2BF65', Vol:'#A98FF3', Psy:'#F95587', Insecte:'#A6B91A', Roche:'#B6A136', Spectre:'#735797', Dragon:'#6F35FC', Ténèbres:'#705746', Acier:'#B7B7CE', Fée:'#D685AD' };

  let ALL = [];
  for(const reg of REGIONS){
    if(reg.key === 'Tout') continue; // Skip "Tout" for data initialization
    for(let i=reg.start;i<=reg.end;i++){
      ALL.push({dex:i, region:reg.key, nameFR:'', types:[], classic:false, reverse:false, language:'', set:'', notes:''});
    }
  }
  let currentTab='Kanto', activeFilter='all', searchTerm='', selectedDexes=new Set(), lastAnchorIndex=null, currentVisible=[];

  const typeGradientCSS = (types)=>{
    if(!types || !types.length) return '';
    const c1 = TYPE_COLORS[types[0]] || '#94a3b8';
    const c2 = types[1] ? (TYPE_COLORS[types[1]]||c1) : c1;
    return `background: linear-gradient(90deg, ${c1}, ${c2}); -webkit-background-clip:text; background-clip:text; color: transparent;`;
  };
  const regionSlice = (key)=>{ const r=REGIONS.find(x=>x.key===key); if(!r) return []; return ALL.filter(x=>x.dex>=r.start && x.dex<=r.end); };
  const matchesFilter = (row)=> activeFilter==='owned'? (row.classic||row.reverse) : activeFilter==='missing'? (!row.classic && !row.reverse) : activeFilter==='classic'? row.classic : activeFilter==='reverse'? row.reverse : true;
  const matchesSearch = (row)=>{ if(!searchTerm) return true; const hay = `${String(row.dex).padStart(3,'0')} ${row.nameFR||''} ${row.set||''} ${row.notes||''}`.toLowerCase(); return hay.includes(searchTerm.toLowerCase()); };
  const normalizeTags=(str)=>{ const seen=new Set(); const out=[]; (str||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(t=>{ const k=t.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(t); } }); return out.join(', '); };

  function restore(){
    try{ const bag = JSON.parse(localStorage.getItem('tcg-pokedex')||'{}'); for(const k in bag){ const idx=ALL.findIndex(x=>x.dex===Number(k)); if(idx>-1) Object.assign(ALL[idx], bag[k]); } }catch(e){ console.warn('restore error', e); }
  }
  function saveOne(row){
    try{ const bag = JSON.parse(localStorage.getItem('tcg-pokedex')||'{}'); bag[row.dex] = { nameFR:row.nameFR, types:row.types, classic:row.classic, reverse:row.reverse, language:row.language, set:row.set, notes:row.notes, region:row.region }; localStorage.setItem('tcg-pokedex', JSON.stringify(bag)); }catch(e){ console.warn('save error', e); }
  }

  function withLoader(promise, {label='Chargement…'}={}){
    const btn = byId('loadOfflineBtn');
    const prev = btn.textContent; btn.disabled = true; btn.textContent = label + ' ';
    const dots = document.createElement('span'); dots.className='loader'; dots.innerHTML='<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    btn.appendChild(dots);
    const prog = byId('progress'); const prevProg = prog.textContent; prog.textContent = label;
    return promise.finally(()=>{ btn.disabled=false; btn.textContent=prev; prog.textContent=prevProg||''; });
  }

  async function loadOfflineNames(){
    await withLoader((async()=>{
      const res = await fetch('data/fr_names.json', { cache:'no-store' });
      if(!res.ok) throw new Error('offline file not found');
      const list = await res.json();
      list.forEach(p=>{
        const slot = ALL.find(x=>x.dex===Number(p.dex));
        if(slot){ if(p.nameFR) slot.nameFR=p.nameFR; if(Array.isArray(p.types)) slot.types=p.types.slice(0,2); }
      });
      const bag = JSON.parse(localStorage.getItem('tcg-pokedex')||'{}');
      list.forEach(p=>{ const id=Number(p.dex); const s=ALL.find(x=>x.dex===id); bag[id] = { ...(bag[id]||{}), nameFR:s.nameFR, types:s.types, region:s.region }; });
      localStorage.setItem('tcg-pokedex', JSON.stringify(bag));
      render();
      alert('Noms FR (offline) chargés.');
    })(), {label:'Lecture de fr_names.json…'});
  }

  function renderNav(){
    const nav = byId('regionNav');
    nav.innerHTML='';
    ['Tout','Kanto','Johto','Hoenn','Sinnoh','Unys','Kalos','Alola','Galar','Hisui','Paldea','__DASH__'].forEach(key=>{
      const b=document.createElement('button'); b.textContent=(key==='__DASH__'?'Dashboard':key);
      b.className=(key===currentTab?'active':''); b.setAttribute('role','tab'); b.setAttribute('aria-selected', key===currentTab?'true':'false');
      b.onclick=()=>{ currentTab=key; selectedDexes.clear(); updateBulkBar(); window.scrollTo({top:0}); render(); };
      nav.appendChild(b);
    });
  }

  function render(){
    renderNav();
    if(currentTab==='__DASH__'){
      byId('regionView').hidden=true; byId('dashboardView').hidden=false;
      byId('title').textContent='Dashboard'; byId('subtitle').textContent='Vue globale de la collection (toutes régions).';
      byId('filters').style.display='none'; byId('search').style.display='none'; byId('bulkActions').style.display='none';
      renderDashboard();
    }else{
      byId('regionView').hidden=false; byId('dashboardView').hidden=true;
      byId('title').textContent=currentTab; 
      byId('subtitle').textContent=(currentTab==='Tout' ? "Vue globale - Recherche dans toutes les régions." : "Coche Reverse pour prioriser l'holo (Classique se décoche).");
      byId('filters').style.display='flex'; byId('search').style.display='block';
      renderRegion();
    }
  }

  function buildSuggestions(){
    const notesSet = new Set(); const setSet = new Set();
    ALL.forEach(r=>{ (r.notes||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(t=>notesSet.add(t)); if(r.set && r.set.trim()) setSet.add(r.set.trim()); });
    byId('notesList').innerHTML = Array.from(notesSet).slice(0,80).map(v=>`<option value="${escapeHtml(v)}"></option>`).join('');
    byId('setList').innerHTML = Array.from(setSet).slice(0,80).map(v=>`<option value="${escapeHtml(v)}"></option>`).join('');
  }

  function renderRegion(){
    buildSuggestions();
    const root=byId('rows'); root.innerHTML='';
    currentVisible = regionSlice(currentTab).filter(matchesFilter).filter(matchesSearch);
    if(currentVisible.length===0){ currentVisible = regionSlice(currentTab); }
    currentVisible.forEach((row, idx)=>{
      const el=document.createElement('div'); el.className='row'; if(selectedDexes.has(row.dex)) el.classList.add('selected');

      const sel=document.createElement('div'); sel.className='sel center';
      const sInput=document.createElement('input'); sInput.type='checkbox'; sInput.checked=selectedDexes.has(row.dex);
      sInput.addEventListener('click', e=>{
        const checked=e.target.checked;
        if(e.shiftKey && lastAnchorIndex!==null){
          const start=Math.min(lastAnchorIndex, idx); const end=Math.max(lastAnchorIndex, idx);
          for(let i=start;i<=end;i++){ const d=currentVisible[i].dex; if(checked) selectedDexes.add(d); else selectedDexes.delete(d); }
          renderRegion();
        }else{
          if(checked) selectedDexes.add(row.dex); else selectedDexes.delete(row.dex);
          el.classList.toggle('selected', checked);
          lastAnchorIndex=idx;
        }
        updateBulkBar(); e.stopPropagation();
      });
      sel.appendChild(sInput); el.appendChild(sel);

      const num=document.createElement('div'); num.className='num'; num.textContent=String(row.dex).padStart(3,'0'); el.appendChild(num);
      const nameCell=document.createElement('div'); nameCell.className='name';
      const label=document.createElement('div'); label.className='label gradtext'; label.textContent=row.nameFR||'(Nom FR à compléter)';
      const g = typeGradientCSS(row.types); if(g) label.setAttribute('style', g);
      const types=document.createElement('div'); types.className='types'; types.textContent=(row.types||[]).join(' / ');
      nameCell.appendChild(label); nameCell.appendChild(types); el.appendChild(nameCell);

      const cWrap=document.createElement('div'); cWrap.className='center'; const swC=document.createElement('label'); swC.className='switch';
      const cInput=document.createElement('input'); cInput.type='checkbox'; cInput.checked=!!row.classic; const knobC=document.createElement('span'); knobC.className='knob';
      cInput.onchange=()=>{
        const newVal=cInput.checked; row.classic=newVal; if(newVal){ row.reverse=false; } saveOne(row);
        if(selectedDexes.size>1 && selectedDexes.has(row.dex)){
          currentVisible.forEach(r=>{ if(selectedDexes.has(r.dex)){ r.classic=newVal; if(newVal){ r.reverse=false; } saveOne(r);} });
        }
        renderRegion();
      };
      swC.appendChild(cInput); swC.appendChild(knobC); cWrap.appendChild(swC); el.appendChild(cWrap);

      const rWrap=document.createElement('div'); rWrap.className='center'; const swR=document.createElement('label'); swR.className='switch';
      const rInput=document.createElement('input'); rInput.type='checkbox'; rInput.checked=!!row.reverse; const knobR=document.createElement('span'); knobR.className='knob';
      rInput.onchange=()=>{
        const newVal=rInput.checked; row.reverse=newVal; if(newVal){ row.classic=false; } saveOne(row);
        if(selectedDexes.size>1 && selectedDexes.has(row.dex)){
          currentVisible.forEach(r=>{ if(selectedDexes.has(r.dex)){ r.reverse=newVal; if(newVal){ r.classic=false; } saveOne(r);} });
        }
        renderRegion();
      };
      swR.appendChild(rInput); swR.appendChild(knobR); rWrap.appendChild(swR); el.appendChild(rWrap);

      const langCell=document.createElement('div');
      const selLang=document.createElement('select'); ['','JP','EN','FR','IT','KR','CN'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v||'—'; selLang.appendChild(o); }); selLang.value=row.language||'';
      selLang.onchange=()=>{
        row.language=selLang.value; saveOne(row);
        if(selectedDexes.size>1 && selectedDexes.has(row.dex)){
          currentVisible.forEach(r=>{ if(selectedDexes.has(r.dex)){ r.language=selLang.value; saveOne(r);} });
        }
        renderRegion();
      };
      langCell.appendChild(selLang); el.appendChild(langCell);

      const setCell=document.createElement('div'); const setIn=document.createElement('input'); setIn.type='text'; setIn.placeholder='ex. 151, Écarlate & Violet...'; setIn.value=row.set||''; setIn.setAttribute('list','setList');
      setIn.onchange=()=>{
        row.set=setIn.value; saveOne(row);
        if(selectedDexes.size>1 && selectedDexes.has(row.dex)){
          currentVisible.forEach(r=>{ if(selectedDexes.has(r.dex)){ r.set=setIn.value; saveOne(r);} });
        }
        buildSuggestions(); renderRegion();
      };
      setCell.appendChild(setIn); el.appendChild(setCell);

      const notesCell=document.createElement('div'); const notesIn=document.createElement('input'); notesIn.type='text'; notesIn.placeholder='tags (EX, Full Art, échange...)'; notesIn.value=row.notes||''; notesIn.setAttribute('list','notesList');
      notesIn.onchange=()=>{
        row.notes=normalizeTags(notesIn.value); saveOne(row);
        if(selectedDexes.size>1 && selectedDexes.has(row.dex)){
          currentVisible.forEach(r=>{ if(selectedDexes.has(r.dex)){ r.notes=normalizeTags(notesIn.value); saveOne(r);} });
        }
        buildSuggestions(); renderRegion();
      };
      notesCell.appendChild(notesIn); el.appendChild(notesCell);

      root.appendChild(el);
    });

    byId('progress').textContent = currentVisible.length + ' lignes affichées';
    updateBulkBar();
  }

  function updateBulkBar(){
    const bulk=byId('bulkActions'); const count=selectedDexes.size; byId('selCount').textContent=count;
    bulk.style.display=(count>0 && currentTab!=='__DASH__')?'flex':'none';
  }

  byId('applyBulk').onclick=()=>{
    const langVal=byId('bulkLang').value;
    const setVal=byId('bulkSet').value.trim();
    const notesVal=byId('bulkNotes').value.trim();
    const replaceNotes=byId('bulkNotesReplace').checked;
    const bulkClassic=byId('bulkClassic').value;
    const bulkReverse=byId('bulkReverse').value;

    if(selectedDexes.size===0) return;
    currentVisible.forEach(r=>{
      if(selectedDexes.has(r.dex)){
        if(langVal) r.language=langVal;
        if(setVal) r.set=setVal;
        if(notesVal){
          if(replaceNotes){ r.notes = normalizeTags(notesVal); }
          else{
            const cur = normalizeTags((r.notes||'')).split(',').map(s=>s.trim()).filter(Boolean);
            const add = normalizeTags(notesVal).split(',').map(s=>s.trim()).filter(Boolean);
            r.notes = normalizeTags([...cur, ...add].join(', '));
          }
        }
        if(bulkReverse==='on'){ r.reverse=true; r.classic=false; }
        if(bulkReverse==='off'){ r.reverse=false; }
        if(bulkClassic==='on'){ r.classic=true; r.reverse=false; }
        if(bulkClassic==='off'){ r.classic=false; }
        saveOne(r);
      }
    });
    renderRegion();
  };
  byId('clearSel').onclick=()=>{ selectedDexes.clear(); updateBulkBar(); renderRegion(); };

  function stat(key, val){ const el=div('stat'); el.innerHTML=`<span class="key">${key}</span><span class="val">${val}</span>`; return el; }
  function regionLine(name, pct){ const line=div('region-line'); const nm=div('name'); nm.textContent=name; const bar=div('bar'); const fill=div('fill'); fill.style.width=pct+'%'; bar.appendChild(fill); const val=div('val'); val.textContent=pct+'%'; line.appendChild(nm); line.appendChild(bar); line.appendChild(val); return line; }
  function renderTypeDist(containerId, predicate){
    const box=byId(containerId); box.innerHTML=''; const counts={};
    ALL.filter(predicate).forEach(p=>{ (p.types||[]).forEach(t=>counts[t]=(counts[t]||0)+1); });
    const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
      const pct=Math.round(c*100/total); const row=div('type-line'); const name=div('type-name'); name.textContent=t; const bar=div('type-bar'); const fill=div('fill'); fill.style.width=pct+'%'; bar.appendChild(fill); const val=div('val'); val.textContent=pct+'%'; row.appendChild(name); row.appendChild(bar); row.appendChild(val); box.appendChild(row);
    });
  }

  function renderDashboard(){
    const total=ALL.length, classic=ALL.filter(r=>r.classic).length, reverse=ALL.filter(r=>r.reverse).length, any=ALL.filter(r=>r.classic||r.reverse).length;
    const pct = total? Math.round(any*100/total):0;
    byId('gClassic').textContent=classic; byId('gReverse').textContent=reverse; byId('gAny').textContent=any; byId('gTotal').textContent=total;
    byId('gProgressFill').style.width=pct+'%'; byId('gProgressText').textContent=pct+'%';
    const langs=['JP','EN','FR','IT','KR','CN']; const revBox=byId('gReverseByLang'); revBox.innerHTML=''; langs.forEach(L=>revBox.appendChild(stat(L, ALL.filter(r=>r.reverse&&r.language===L).length)));
    const clsBox=byId('gClassicByLang'); clsBox.innerHTML=''; langs.forEach(L=>clsBox.appendChild(stat(L, ALL.filter(r=>r.classic&&r.language===L).length)));
    const regBox=byId('regionProgress'); regBox.innerHTML=''; REGIONS.forEach(r=>{ if(r.key === 'Tout') return; const slice=regionSlice(r.key); const anyR=slice.filter(x=>x.classic||x.reverse).length; const pctR=slice.length?Math.round(anyR*100/slice.length):0; regBox.appendChild(regionLine(r.key,pctR)); });
    const revRegBox=byId('reverseRegionProgress'); revRegBox.innerHTML=''; REGIONS.forEach(r=>{ if(r.key === 'Tout') return; const slice=regionSlice(r.key); const revR=slice.filter(x=>x.reverse).length; const pctR=slice.length?Math.round(revR*100/slice.length):0; revRegBox.appendChild(regionLine(r.key,pctR)); });
    renderTypeDist('typeDistAny', p=>p.classic||p.reverse); renderTypeDist('typeDistRev', p=>p.reverse);
    const goalsBox=byId('goalsReverse'); goalsBox.innerHTML=''; REGIONS.forEach(r=>{ if(r.key === 'Tout') return; const slice=regionSlice(r.key); const totalR=slice.length; const revR=slice.filter(x=>x.reverse).length; const missing=totalR-revR; const pctR=totalR?Math.round(revR*100/totalR):0; goalsBox.appendChild(regionLine(`${r.key} – manquants: ${missing}`, pctR)); });
    const sets={}; ALL.forEach(r=>{ if(r.set&&(r.classic||r.reverse)){ const k=r.set.trim(); sets[k]=(sets[k]||0)+1; } }); const top=Object.entries(sets).sort((a,b)=>b[1]-a[1]).slice(0,12); const topBox=byId('topSets'); topBox.innerHTML=''; top.forEach(([n,c])=>{ const item=div('top-item'); item.innerHTML=`<div class="label">${escapeHtml(n)}</div><div class="count">${c}</div>`; topBox.appendChild(item); });
    const tagCounts=(pred)=>{ const counts={}; ALL.filter(pred).forEach(r=>{ (r.notes||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(t=>{ counts[t]=(counts[t]||0)+1; }); }); return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12); };
    const topTagsAny=tagCounts(r=>r.classic||r.reverse), topTagsRev=tagCounts(r=>r.reverse);
    const anyBox=byId('topTagsAny'); anyBox.innerHTML=''; topTagsAny.forEach(([n,c])=>{ const item=div('top-item'); item.innerHTML=`<div class="label">${escapeHtml(n)}</div><div class="count">${c}</div>`; anyBox.appendChild(item); });
    const revBox2=byId('topTagsRev'); revBox2.innerHTML=''; topTagsRev.forEach(([n,c])=>{ const item=div('top-item'); item.innerHTML=`<div class="label">${escapeHtml(n)}</div><div class="count">${c}</div>`; revBox2.appendChild(item); });
  }

  byId('search').addEventListener('input', e=>{ searchTerm=e.target.value.trim(); renderRegion(); });
  document.querySelectorAll('.filters .chip').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.filters .chip').forEach(b=>b.setAttribute('aria-pressed','false')); btn.setAttribute('aria-pressed','true'); activeFilter=btn.dataset.filter; renderRegion(); }); });
  byId('exportBtn').onclick=()=>{ const payload=ALL.map(r=>({ dex:r.dex, region:r.region, nameFR:r.nameFR||'', types:r.types||[], classic:!!r.classic, reverse:!!r.reverse, language:r.language||'', set:r.set||'', notes:r.notes||'' })); const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pokedex-tcg-ALL.json'; a.click(); };
  byId('importJson').onchange=(e)=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); const looksDataset=Array.isArray(data)&&data[0]&&('dex' in data[0])&&('nameFR' in data[0]); if(looksDataset){ data.forEach(p=>{ const slot=ALL.find(x=>x.dex===p.dex); if(slot){ slot.nameFR=p.nameFR||slot.nameFR; slot.types=p.types||slot.types; slot.classic=!!p.classic; slot.reverse=!!p.reverse; slot.language=p.language||slot.language; slot.set=p.set||slot.set; slot.notes=p.notes||slot.notes; } }); const bag={}; ALL.forEach(r=>{ bag[r.dex]={ nameFR:r.nameFR, types:r.types, classic:r.classic, reverse:r.reverse, language:r.language, set:r.set, notes:r.notes, region:r.region }; }); localStorage.setItem('tcg-pokedex', JSON.stringify(bag)); } else { localStorage.setItem('tcg-pokedex', reader.result); const SAVED2=JSON.parse(reader.result); for(const k in SAVED2){ const idx=ALL.findIndex(x=>x.dex===Number(k)); if(idx>-1) Object.assign(ALL[idx], SAVED2[k]); } } render(); alert('Import réussi.'); }catch(err){ alert('Fichier invalide.'); } }; reader.readAsText(f); };
  byId('scrollTopBtn').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  byId('resetAll').onclick=()=>{ if(confirm('Réinitialiser toutes les régions ? (pense à Exporter avant)')){ localStorage.removeItem('tcg-pokedex'); location.reload(); } };
  byId('loadOfflineBtn').onclick=loadOfflineNames;

  function boot(){ restore(); render(); }
  boot();
})();