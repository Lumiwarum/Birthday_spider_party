'use strict';
/* ---------- E. Figures & boxes ---------- */
function viewFigures(){
  const flt = ui.figFilter;
  const cnt = k => state.boxes.filter(b => b.condition === k).length;
  const rec = state.boxes.filter(b => b.recognizable).length;
  const shown = state.figures.filter(f => { const b = boxOfFig(f.id); if(!b) return flt==='all'; return flt==='all' || (flt==='rec' ? b.recognizable : b.condition===flt); });
  const fBtn = (k, t) => `<button class="${flt===k?'on':''}" data-a="figFilter" data-v="${k}">${t}</button>`;
  return `
  <div class="screen-h"><div>${kicker('Только ведущий','green')}<h1>Коробки и фигурки</h1><div class="sub">Коробка — отдельная физическая сущность. Перемещения двигают коробки между порталами; связь «фигурка ↔ коробка» меняется только здесь.</div></div>
    <div class="seg">${fBtn('all','Все '+state.boxes.length)}${fBtn('perfect','Идеальные '+cnt('perfect'))}${fBtn('light','Слегка помяты '+cnt('light'))}${fBtn('heavy','Заметно помяты '+cnt('heavy'))}${fBtn('rec','Узнаваемые '+rec)}</div></div>
  <section class="panel" style="margin-bottom:18px"><h2>Таблица соответствия <span class="n">портал → коробка → фигурка</span></h2><div class="tscroll"><table class="t">
    <thead><tr><th>Портал</th><th>Батч</th><th>Коробка</th><th>Фигурка</th><th>Упаковка</th><th>Узнаваемость</th><th>Заметки</th></tr></thead><tbody>
    ${state.portals.map((bid,i) => { const b = B(bid), f = b && F(b.figureId), bt = batchOf(i+1); return `<tr><td><b style="font:900 18px var(--display);color:${bt.color}">${i+1}</b></td><td>${bt.roman}</td><td>${b?esc(b.label):'—'}</td><td>${f?`<b>${esc(f.name)}</b> <span class="muted small">${esc(f.nameEn)}</span>`:'—'}</td><td>${b?condChip(b.condition):''}</td><td>${b&&b.recognizable?recogChip():'<span class="dim small">нет</span>'}</td><td class="small muted">${b?esc(b.notes):''}</td></tr>`; }).join('')}
    </tbody></table></div></section>
  <div class="fcards">${shown.map(figCard).join('') || '<div class="empty">Нет коробок с таким фильтром</div>'}</div>`;
}
function figCard(f){
  const b = boxOfFig(f.id);
  const n = b ? portalOfBox(b.id) : 0;
  const bt = n ? batchOf(n) : null;
  const ph = b && imgSrc(b.photo);
  const ed = (kind, id, field, extra='') => `data-c="edit" data-kind="${kind}" data-id="${id}" data-field="${field}" ${extra}`;
  return `<article class="fcard ${b&&b.recognizable?'rec':''}" style="--c:${esc(f.color)}">
    <div>
      <div class="fimg" data-a="upload" data-kind="figure" data-id="${f.id}" data-field="image" title="Загрузить изображение"><img src="${figSrc(f)}" alt=""><span class="up">ЗАГРУЗИТЬ ФОТО</span></div>
      ${f.image?`<button class="btn sm ghost" style="margin-top:6px;width:100%" data-a="clearImg" data-kind="figure" data-id="${f.id}" data-field="image">Убрать фото</button>`:''}
      <div style="margin-top:10px;text-align:center">${n?`<div style="font:900 34px var(--display);color:${bt.color};line-height:1">№${n}</div><div class="small muted">портал · ${bt.name}</div>${state.home ? `<div class="small muted">дом: №${state.home[f.id]}</div>` : ''}`:'<span class="chip red">не в портале</span>'}</div>
    </div>
    <div>
      <div class="fl2"><div><label class="f">Имя</label><input type="text" value="${esc(f.name)}" ${ed('figure',f.id,'name')}></div><div><label class="f">Англ. имя</label><input type="text" value="${esc(f.nameEn)}" ${ed('figure',f.id,'nameEn')}></div></div>
      <label class="f">Описание</label><textarea rows="2" ${ed('figure',f.id,'desc')}>${esc(f.desc)}</textarea>
      <label class="f">Личный квест персонажа</label><input type="text" value="${esc(f.quest)}" ${ed('figure',f.id,'quest')}>
      ${b?`<div class="fbox">
        <div class="fbox-h">${ICONS.box.replace('<svg','<svg width="18" height="18"')}<b>Коробка</b>
          <select style="width:auto" data-c="assignBox" data-fig="${f.id}">${state.boxes.map(x=>`<option value="${x.id}" ${x.id===b.id?'selected':''}>${esc(x.label)}${x.id!==b.id?' (сейчас: '+esc(F(x.figureId)?.nameEn||'—')+')':''}</option>`).join('')}</select>
          <span class="dim small">ID: ${b.id}</span></div>
        <div class="row" style="align-items:flex-start;gap:10px">
          <div class="bphoto" data-a="upload" data-kind="box" data-id="${b.id}" data-field="photo" title="Фото коробки">${ph?`<img src="${ph}" alt="">`:'+ фото<br>коробки'}</div>
          <div style="flex:1;min-width:180px">
            <div class="fl2"><div><label class="f" style="margin-top:0">Метка коробки</label><input type="text" value="${esc(b.label)}" ${ed('box',b.id,'label','data-rr="1"')}></div>
            <div><label class="f" style="margin-top:0">Упаковка</label><select ${ed('box',b.id,'condition','data-rr="1"')}>${Object.entries(CONDITIONS).map(([k,v])=>`<option value="${k}" ${b.condition===k?'selected':''}>${v}</option>`).join('')}</select></div></div>
            <label class="check" style="margin-top:8px"><input type="checkbox" ${b.recognizable?'checked':''} ${ed('box',b.id,'recognizable','data-rr="1"')}> Может быть узнаваема внешне</label>
          </div></div>
        ${b.photo?`<button class="btn sm ghost" style="margin-top:6px" data-a="clearImg" data-kind="box" data-id="${b.id}" data-field="photo">Убрать фото коробки</button>`:''}
        <label class="f">Заметки ведущего</label><textarea rows="2" ${ed('box',b.id,'notes')}>${esc(b.notes)}</textarea>
      </div>`:'<div class="empty">Нет коробки</div>'}
    </div>
  </article>`;
}


Object.assign(A, {

  figFilter: d => { ui.figFilter = d.v; saveUi(); render(); },
  upload: d => { uploadTarget = d; $('#fileImg').value = ''; $('#fileImg').click(); },
  clearImg: d => { const o = d.kind==='figure'?F(d.id):d.kind==='box'?B(d.id):P(d.id); act({type:'setup', text:'Удалено изображение: ' + (o.name||o.label)}, () => { o[d.field] = null; }); }
});

Object.assign(C, {
  assignBox: (d, el) => {
    const f = F(d.fig), cur = boxOfFig(f.id), target = B(el.value); if(!target || target===cur) return;
    const other = F(target.figureId);
    act({type:'setup', text:`Коробки переназначены: ${f.nameEn} → ${target.label}${other?', '+other.nameEn+' → '+cur.label:''}`}, () => { const tmp = target.figureId; target.figureId = f.id; cur.figureId = tmp; });
  }
});
