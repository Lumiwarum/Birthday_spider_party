'use strict';
/* ---------- 3. Порталы и батчи ---------- */
function viewPortals(){
  const host = !isDemo(), sel = ui.sel, setup = state.phase === 'setup';
  const selInfo = sel.length ? `Источник: <b>№${sel[0]}</b>${sel[1]?` · Цель: <b>№${sel[1]}</b>`:''}${sel.length>2?` · ещё ${sel.length-2}`:''}` : 'Нажмите на портал, чтобы выбрать';
  const owners = {};
  if(state.final.confirmed) for(const [pid,n] of Object.entries(state.final.results)) owners[n] = P(pid);
  const prot = state.effects.protections.filter(p => p.round === state.roundSerial);
  return `
  <div class="screen-h"><div>${kicker('Игровое поле','blue')}<h1>Порталы</h1><div class="sub">${host?'Портал — фиксированная позиция; при перемещениях едут коробки с фигурками. Игровые перемещения выполняются способностями из магазина и уникальными способностями.':'Содержимое порталов скрыто.'}</div></div>
    ${host?`<div class="row"><button class="btn" data-a="revealAll">${ICONS.eye} Раскрыть все</button><button class="btn" data-a="hideAll">${ICONS.eyeoff} Скрыть все</button></div>`:''}</div>
  ${prot.length ? `<div class="protbar">${ICONS.lock.replace('<svg','<svg width="18" height="18"')} Защита Киборга до конца раунда (${esc(prot[0].label)}): ${prot.map(p => `<b>№${p.portal}</b>`).join(', ')}</div>` : ''}
  ${host && !isFrozen() ? `<details class="toolbar panel" ${setup ? 'open' : ''}><summary>${setup ? 'Раскладка перед игрой' : 'Ручная корректировка ведущего (вне правил игры)'}</summary>
    ${setup ? '' : '<div class="warnbig small">Эти инструменты не являются игровыми действиями: используйте их только для исправления ошибок. Для игровых перемещений — магазин и способности.</div>'}
    <div class="row" style="margin-top:10px">
    <span class="selinfo">${selInfo}</span>
    <button class="btn blue" data-a="swap" ${sel.length===2?'':'disabled'}>⇄ Обменять</button>
    <button class="btn pink" data-a="shuffleSel" ${sel.length>=2?'':'disabled'}>✦ Перемешать выбранные</button>
    <button class="btn" data-a="clearSel" ${sel.length?'':'disabled'}>Снять выбор</button>
    <span class="spacer"></span>
    ${setup ? `<button class="btn yellow" data-a="randomLayout">Случайная раскладка</button>` : ''}
    <button class="btn violet" data-a="manualAssign">Ручное назначение</button></div>
  </details>` : ''}
  ${BATCHES.map(b => {
    const members = state.players.filter(p => p.batch === b.id);
    return `<section class="batch" style="--c:${b.color}"><div class="batch-h"><span class="roman">${b.roman}</span><h2>${b.name} «${b.title}»</h2><span class="muted small">порталы ${b.portals[0]}–${b.portals[b.portals.length-1]} · мест ${b.cap}</span><span class="line"></span>
      ${members.map(p=>avatar(p,28)).join('')}</div>
      <div class="portals">${b.portals.map(n => portalCard(n, b, owners[n])).join('')}</div></section>`;
  }).join('')}
  ${host ? `<section class="panel"><h2>История перемещений<span class="spacer"></span><button class="btn sm ghost" data-a="logMoves">Весь журнал →</button></h2>${state.log.filter(e => e.type === 'move').slice(-12).reverse().map(eventRow).join('') || '<div class="empty">Перемещений пока не было</div>'}</section>` : ''}`;
}
function portalCard(n, b, owner){
  const host = !isDemo();
  const i = ui.sel.indexOf(n);
  const cls = i===0?'s-src':i===1?'s-dst':i>1?'s-more':'';
  const badge = i===0?'ИСТОЧНИК':i===1?'ЦЕЛЬ':'ВЫБРАН';
  const open = host && ui.revealed.includes(n);
  const box = B(state.portals[n-1]); const f = box && F(box.figureId);
  const prot = protectionAt(n);
  const masks = f ? [state.effects.invisible.includes(f.id) ? chip('невидима','violet') : '', (d => d ? chip('маска: ' + esc(figName(d.fakeId)), 'pink') : '')(state.effects.disguises.find(x => x.figId === f.id))].join('') : '';
  const home = state.home && f && state.home[f.id] === n;
  const canPick = host && !isFrozen();
  return `<div class="portal ${cls} ${open?'revealed':''} ${prot?'protected':''} ${ui.warp.includes(n)?'warp anim-'+(ui.anim||'swap'):''}" style="--c:${b.color}" ${canPick?`data-a="pick" data-n="${n}"`:''}>
    <span class="badge">${badge}</span><span class="p-num">${n}</span>
    ${prot ? `<span class="shield" title="Защищён Киборгом до конца раунда">${ICONS.lock}</span>` : ''}
    ${host?`<button class="p-eye" data-a="reveal" data-n="${n}" title="${open?'Скрыть':'Раскрыть'}">${open?ICONS.eyeoff:ICONS.eye}</button>`:''}
    <div class="p-gate"><div class="p-ring r2"></div><div class="p-ring"></div><div class="p-core">${open && f ? `<img src="${figSrc(f)}" alt="">` : '<span class="q">?</span>'}</div></div>
    <div class="p-info">${open && f ? `<span class="fn">${esc(f.name)}</span><span class="row" style="justify-content:center;gap:4px">${chip(esc(box.label))}${condChip(box.condition)}${box.recognizable?recogChip():''}${home?chip('дома','green'):''}</span><span class="row" style="justify-content:center;gap:4px">${masks}</span>`
      : `<span class="hid">${prot ? 'Защищён до конца раунда' : 'Содержимое скрыто'}</span>`}</div>
    ${owner?`<span class="owner" title="${esc(owner.name)}">${avatar(owner,30)}</span>`:''}
  </div>`;
}
function warp(nums, anim){ ui.warp = nums; ui.anim = anim || 'swap'; render(); }
const figLabel = n => { const f = figAt(n), b = B(state.portals[n-1]); return `№${n}: ${f?f.name:'?'} (${b?b.label:'?'})`; };
// ручные перемещения ведущего: приватная запись, не игровое действие
function hostMove(text, mutate, nums, anim){
  const ok = act(() => ({type:'setup', pub:false, text:(state.phase === 'setup' ? 'Раскладка: ' : 'Корректировка ведущего: ') + text, secret:layoutText()}), () => {
    if(isFrozen()) fail('Мультивселенная заморожена');
    mutate();
  }, {render:false});
  if(ok) warp(nums, anim);
}
Object.assign(A, {
  pick: d => { const n = +d.n; const i = ui.sel.indexOf(n); if(i>=0) ui.sel.splice(i,1); else ui.sel.push(n); render(); },
  clearSel: () => { ui.sel = []; render(); },
  reveal: d => { const n = +d.n; const i = ui.revealed.indexOf(n); if(i>=0) ui.revealed.splice(i,1); else ui.revealed.push(n); saveUi(); render(); },
  revealAll: () => { ui.revealed = ALL_PORTALS.slice(); saveUi(); render(); },
  hideAll: () => { ui.revealed = []; saveUi(); render(); },
  swap: () => { const [a,b] = ui.sel; ui.sel = []; hostMove(`обмен №${a} ⇄ №${b}`, () => swapPortals(a, b), [a,b], 'swap'); },
  shuffleSel: () => { const ns = ui.sel.slice().sort((a,b)=>a-b); ui.sel = []; hostMove(`перемешаны №${ns.join(', №')}`, () => shuffleFree(ns), ns, 'shuffle'); },
  randomLayout: () => confirmBox('Случайная раскладка', 'Все 11 коробок будут случайно разложены по порталам — каждая ровно в одном портале.', 'Перемешать всё').then(ok => {
    if(ok) hostMove('случайная раскладка всех порталов', () => { if(state.phase !== 'setup') fail('Только в подготовке'); state.portals = shuffle(state.boxes.map(b=>b.id)); }, ALL_PORTALS, 'shuffle');
  }),
  manualAssign: () => {
    let draft = state.portals.slice();
    const draw = () => openModal(`<h2>Ручное назначение коробок</h2><p class="muted small">Если выбрать коробку, которая уже стоит в другом портале, коробки поменяются местами — дубли невозможны.</p>
      <div class="massign">${draft.map((bid,i)=>`<div class="r" style="--c:${batchOf(i+1).color}"><b>${i+1}</b><select data-c="maSel" data-i="${i}">${state.boxes.map(x=>`<option value="${x.id}" ${x.id===bid?'selected':''}>${esc(x.label)} · ${esc(F(x.figureId)?.name||'—')}</option>`).join('')}</select></div>`).join('')}</div>
      <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn violet" data-a="maSave">Сохранить раскладку</button></div>`, 'wide');
    C.maSel = (d, el) => { const i = +d.i, j = draft.indexOf(el.value); if(j>=0 && j!==i) draft[j] = draft[i]; draft[i] = el.value; draw(); };
    A.maSave = () => {
      if(new Set(draft).size !== PORTALS) return toast('Обнаружены дубли коробок', 'var(--red)');
      const changed = draft.map((b,i)=>b!==state.portals[i]?i+1:0).filter(Boolean);
      closeModal();
      if(changed.length) hostMove(`ручное назначение, изменены №${changed.join(', №')}`, () => { state.portals = draft; }, changed, 'swap');
    };
    draw();
  },
  logMoves: () => { ui.logType = 'move'; ui.logPlayer = ''; A.go({s:'log'}); },
});
