'use strict';
/* ---------- 6. Окно реакции ---------- */
const STATUS_CHIP = {pending:['окно реакции','yellow'], running:['идёт серия','blue'], done:['выполнено','green'], cancelled:['отменено','red'], failed:['не выполнено','red']};
function reactorButtons(a, pid){
  const ab = ABILITY[a.abilityId], p = P(pid), out = [];
  if(ab.kind === 'shop'){
    const e = glitchError(a, pid, null);
    out.push(`<button class="btn sm red" data-a="rGlitch" data-id="${a.id}" data-p="${pid}" ${e ? `disabled title="${esc(e)}"` : ''}>Купить и применить «Сбой канона» · 3 EP</button>`);
    vouchersOf(pid).filter(v => v.status === 'active').forEach(v => out.push(`<button class="btn sm yellow" data-a="rGlitch" data-id="${a.id}" data-p="${pid}" data-v="${v.id}">«Сбой канона» по ваучеру ${esc(pname(v.holder))} (с разрешения)</button>`));
  }
  instancesOf(pid).filter(i => i.type === 'duel').forEach(i => {
    const e = duelError(a, i);
    out.push(e ? `<button class="btn sm" disabled title="${esc(e)}">Дуэль: ${esc(e)}</button>`
      : `<span class="duel">Дуэль (${i.charges} зар.): <button class="btn sm green" data-a="rDuel" data-id="${a.id}" data-i="${i.id}" data-w="1">Победа: ${esc(p.name)}</button><button class="btn sm" data-a="rDuel" data-id="${a.id}" data-i="${i.id}" data-w="0">Победа: ${esc(pname(a.actor))}</button></span>`);
  });
  return out.join(' ') || '<span class="dim small">нет доступных реакций</span>';
}
function viewReactions(){
  const a = pendingAction();
  const hist = state.actions.filter(x => x.abilityId !== 'glitch').slice(-15).reverse();
  return `<div class="screen-h"><div>${kicker('Окно реакции','green')}<h1>Реакции</h1><div class="sub">Пока окно открыто, эффект не применяется и результаты разведки не раскрываются. Одно действие можно отменить только один раз.</div></div></div>
  ${a ? pendingPanel(a) : '<section class="panel"><div class="empty">Сейчас нет действия, ожидающего реакции</div></section>'}
  <section class="panel" style="margin-top:18px"><h2>Последние действия</h2><div class="tscroll"><table class="t"><thead><tr><th>Время</th><th>Игрок</th><th>Действие</th><th>Оплата</th><th>Статус</th><th></th></tr></thead><tbody>
    ${hist.map(x => { const [t,c] = STATUS_CHIP[x.status]; return `<tr><td class="small">${fmtTime(x.t)}</td><td>${esc(pname(x.actor))}</td><td><b>${esc(ABILITY[x.abilityId].name)}</b><div class="small muted">${esc(targetsText(ABILITY[x.abilityId], x.targets))}</div></td>
      <td class="small">${esc(viaText(x).trim() || 'уникальная')}</td><td>${chip(t,c)}${x.cancelReason ? `<div class="small muted">${esc(x.cancelReason)}</div>` : ''}</td>
      <td>${['done','running','failed'].includes(x.status) ? `<button class="btn sm ghost" data-a="showResult" data-id="${x.id}">Результат</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Пока пусто</td></tr>'}
  </tbody></table></div></section>`;
}
function pendingPanel(a){
  const ab = ABILITY[a.abilityId], actor = P(a.actor);
  const others = state.players.filter(p => p.id !== actor.id);
  return `<section class="panel react">
    <div class="row">${avatar(actor, 56)}<div><div class="small muted">Инициатор</div><h2 style="margin:0">${esc(actor.name)} — «${esc(ab.name)}»</h2>
      <div class="small">Оплата: ${esc(viaText(a).trim() || 'уникальная способность')} · ${ab.kind === 'shop' ? 'покупная способность' : 'уникальная способность'}</div></div></div>
    <div class="hostnote" style="margin-top:12px">🔒 Цели: ${esc(targetsText(ab, a.targets) || 'нет')}</div>
    ${a.reactions.length ? `<div style="margin-top:10px">${a.reactions.map(r => `<div class="small">• ${r.type === 'duel' ? `Дуэль ${esc(pname(r.by))}: ${r.ok ? 'победа' : 'поражение'}` : `Сбой канона от ${esc(pname(r.by))}`}</div>`).join('')}</div>` : ''}
    <h3 class="sub3">Очередь желающих отреагировать</h3>
    <div class="row"><select id="rqAdd" style="width:auto;min-width:240px">${optList(others.filter(p => !a.queue.includes(p.id)).map(p => [p.id, p.name]), '', 'Добавить в очередь…')}</select><button class="btn sm" data-a="rqAdd" data-id="${a.id}">Добавить</button></div>
    ${a.queue.map((pid, k) => `<div class="rq"><span class="pn">${k+1}</span>${avatar(P(pid), 28)}<b>${esc(pname(pid))}</b><span class="spacer"></span>${reactorButtons(a, pid)}<button class="btn sm ghost" data-a="rqDel" data-id="${a.id}" data-p="${pid}">Пропускает</button></div>`).join('') || '<div class="dim small" style="margin:8px 0">Очередь пуста. Добавьте игроков в том порядке, в каком они подняли руку.</div>'}
    <div class="foot" style="justify-content:space-between">
      <span class="row"><label class="check small"><input type="checkbox" id="hcRefund"> вернуть оплату</label><button class="btn sm ghost" data-a="hostCancel" data-id="${a.id}">Снять действие (решение ведущего)</button></span>
      <button class="btn lg green" data-a="rClose" data-id="${a.id}">Закрыть реакции и выполнить →</button></div>
  </section>`;
}
Object.assign(A, {
  rGlitch: d => { const a = state.actions.find(x => x.id === d.id), r = P(d.p);
    confirmBox('Сбой канона', `${esc(r.name)} отменяет «${esc(ABILITY[a.abilityId].name)}» игрока ${esc(pname(a.actor))}. ${d.v ? `Оплата ваучером — подтвердите публичное разрешение держателя (${esc(pname(state.effects.vouchers.find(v => v.id === d.v).holder))}).` : `С ${esc(r.name)} спишется ${epText(ABILITY.glitch.price)}.`} EP инициатора не возвращаются.`, 'Отменить действие', true).then(ok => ok && reactGlitch(d.id, d.p, d.v || null)); },
  rDuel: d => reactDuel(d.id, d.i, d.w === '1'),
  rClose: d => closeReactions(d.id),
  rqAdd: d => { const v = $('#rqAdd').value; if(!v) return; act(null, () => { const a = state.actions.find(x => x.id === d.id); if(a.status !== 'pending') fail('Окно закрыто'); a.queue.push(v); }, {label:'Очередь реакции'}); },
  rqDel: d => act(null, () => { const a = state.actions.find(x => x.id === d.id); a.queue = a.queue.filter(x => x !== d.p); }, {label:'Очередь реакции'}),
  hostCancel: d => { const refund = $('#hcRefund').checked; confirmBox('Снять действие?', `Это корректировка ведущего, а не игровая отмена.${refund ? ' Оплата будет возвращена.' : ''}`, 'Снять', true).then(ok => ok && hostCancel(d.id, refund)); },
});
