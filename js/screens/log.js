'use strict';
/* ---------- 9. Журнал ---------- */
function viewLog(){
  const host = !isDemo();
  let list = visibleLog();
  if(ui.logType) list = list.filter(e => e.type === ui.logType);
  if(ui.logPlayer) list = list.filter(e => e.playerId === ui.logPlayer);
  list = list.slice().reverse();
  const last = undoStack[undoStack.length-1];
  return `<div class="screen-h"><div>${kicker('Хроника','green')}<h1>Журнал событий</h1><div class="sub">${host?'Записи с 🔒 и красноватым фоном — приватные: в демонстрации они скрыты. «Ручной откат» — исправление ошибок ведущего; игровая отмена способности делается в окне реакции.':'Показаны только публичные события.'}</div></div>
    ${host?`<div class="row"><button class="btn yellow" data-a="undo" ${last?'':'disabled'}>${ICONS.undo.replace('<svg','<svg width="16" height="16"')} Ручной откат${last?': '+esc(last.label.slice(0,48))+(last.label.length>48?'…':''):''}</button></div>`:''}</div>
  <section class="panel"><div class="row" style="margin-bottom:12px">
    <select style="width:auto" data-c="logType"><option value="">Все типы</option>${Object.entries(EVENT_TYPES).map(([k,v])=>`<option value="${k}" ${ui.logType===k?'selected':''}>${v.label}</option>`).join('')}</select>
    <select style="width:auto" data-c="logPlayer"><option value="">Все игроки</option>${state.players.map(p=>`<option value="${p.id}" ${ui.logPlayer===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
    <span class="spacer"></span><span class="muted small">${list.length} событий</span></div>
    ${list.map(eventRow).join('') || '<div class="empty">Нет событий</div>'}</section>`;
}


Object.assign(C, {
  logType: (d, el) => { ui.logType = el.value; saveUi(); render(); },
  logPlayer: (d, el) => { ui.logPlayer = el.value; saveUi(); render(); }
});
