'use strict';
/* Форма объявления действия. Цели рисуются по описанию ability.fields.
   Черновик формы живёт в formDraft, пока окно открыто. */
let formDraft = null;
function defaultTargets(ab){
  const t = {};
  (ab.fields || []).forEach(f => {
    if(f.type === 'portals') t[f.key] = Array(f.count).fill('');
    if(f.type === 'batches') t[f.key] = [];
    if(f.type === 'statements') t[f.key] = [{type:''}];
    if(f.type === 'number') t[f.key] = f.min || 1;
    if(f.type === 'direction') t[f.key] = 'fwd';
    if(f.type === 'select') t[f.key] = f.options[0][0];
    if(f.type === 'check') t[f.key] = false;
  });
  return t;
}
function openActionForm(decl){
  formDraft = {...decl, targets: decl.targets || defaultTargets(ABILITY[decl.abilityId])};
  drawForm();
}
const optList = (items, cur, empty='—') => `<option value="">${empty}</option>` + items.map(([v, t, dis]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(t)}</option>`).join('');
const figOptions = cur => optList(state.figures.map(f => [f.id, f.name]), cur);
function portalOptions(f, t, cur){
  let list = ALL_PORTALS;
  const bIn = f.inBatch && t[f.inBatch], bOut = f.outBatch && t[f.outBatch];
  if(bIn !== undefined && bIn !== '' && bIn !== false) list = BATCHES[+bIn].portals;
  if(bOut !== undefined && bOut !== '' && bOut !== false) list = list.filter(n => !BATCHES[+bOut].portals.includes(n));
  return optList(list.map(n => [n, `№${n}${isProtected(n) ? ' — защищён Киборгом' : ''}`, f.free && isProtected(n)]), cur);
}
function fieldHtml(f, t, d){
  const v = t[f.key];
  const sel = (path, opts, num) => `<select data-c="fset" data-k="${path}" ${num ? 'data-num="1"' : ''}>${opts}</select>`;
  switch(f.type){
    case 'figure':    return sel(f.key, figOptions(v));
    case 'portal':    return sel(f.key, portalOptions(f, t, v), true);
    case 'portals':   return `<div class="row">${v.map((x, i) => sel(`${f.key}.${i}`, portalOptions(f, t, x), true)).join('')}</div>`;
    case 'batch':     return sel(f.key, optList(BATCHES.map(b => [b.id, batchName(b)]), v));
    case 'batches':   return `<div class="row">${BATCHES.map(b => `<label class="check"><input type="checkbox" data-c="fbatch" data-v="${b.id}" ${v.includes(b.id) ? 'checked' : ''}> ${esc(batchName(b))}</label>`).join('')}</div>`;
    case 'number':    return `<input type="number" min="${f.min}" max="${f.max}" value="${esc(v)}" data-c="fset" data-k="${f.key}" data-num="1">`;
    case 'direction': return sel(f.key, optList([['fwd','Вперёд (№1 → №2)'], ['back','Назад (№2 → №1)']], v, '—'));
    case 'select':    return sel(f.key, optList(f.options, v, '—'));
    case 'player':    return sel(f.key, optList(state.players.filter(p => !f.others || p.id !== d.actorId).map(p => [p.id, p.name]), v));
    case 'check':     return `<label class="check"><input type="checkbox" data-c="fcheck" data-k="${f.key}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
    case 'statements':return statementsHtml(f, v || []);
  }
  return '';
}
function statementsHtml(f, list){
  const row = (s, i) => {
    const k = `${f.key}.${i}`;
    const parts = [`<select data-c="fset" data-k="${k}.type">${optList(Object.entries(STATEMENT_TYPES), s.type, 'Тип утверждения…')}</select>`];
    if(s.type && s.type !== 'manual') parts.push(`<select data-c="fset" data-k="${k}.fig">${figOptions(s.fig)}</select>`);
    if(s.type === 'in' || s.type === 'notin') parts.push(`<select data-c="fset" data-k="${k}.portal" data-num="1">${optList(ALL_PORTALS.map(n => [n, '№'+n]), s.portal)}</select>`);
    if(s.type === 'inbatch' || s.type === 'notinbatch') parts.push(`<select data-c="fset" data-k="${k}.batch">${optList(BATCHES.map(b => [b.id, batchName(b)]), s.batch)}</select>`);
    if(s.type === 'same') parts.push(`<select data-c="fset" data-k="${k}.fig2">${figOptions(s.fig2)}</select>`);
    if(s.type === 'manual') parts.push(`<input type="text" value="${esc(s.text || '')}" placeholder="Формулировка игрока" data-c="fset" data-k="${k}.text"><label class="check small"><input type="checkbox" data-c="fcheck" data-k="${k}.truth" ${s.truth ? 'checked' : ''}> Ведущий: верно</label>`);
    return `<div class="strow"><b>${i+1}</b>${parts.join('')}${list.length > 1 ? `<button class="btn sm ghost" data-a="fstDel" data-i="${i}">✕</button>` : ''}</div>`;
  };
  return list.map(row).join('') + (list.length < f.max ? `<button class="btn sm" data-a="fstAdd">+ Утверждение</button>` : '');
}
function drawForm(){
  const d = formDraft, ab = ABILITY[d.abilityId], actor = P(d.actorId), t = d.targets;
  const err = preflight(d);
  const v = d.voucherId && state.effects.vouchers.find(x => x.id === d.voucherId);
  const pay = d.via === 'ep' ? `Стоимость <b>${epText(ab.price)}</b>${actor ? ` · у игрока ${epText(actor.ep2)}` : ''}`
    : d.via === 'voucher' ? `Ваучер у <b>${esc(pname(v?.holder))}</b> — EP не списываются<label class="check" style="display:flex;margin-top:8px"><input type="checkbox" data-c="fconsent" ${d.consent ? 'checked' : ''}> ${esc(pname(v?.holder))} публично разрешает применить ваучер</label>`
    : d.via === 'repeat' ? `Бесплатный повтор «Мэйдэй!» · номинал ${epText(ab.price)}`
    : 'Уникальная способность — EP не нужны';
  const actorHtml = d.via === 'ep'
    ? `<select data-c="factor">${optList(state.players.map(p => [p.id, `${p.name} · ${epText(p.ep2)}`]), d.actorId, 'Кто покупает?')}</select>`
    : `<div class="row">${actor ? avatar(actor, 32) + `<b>${esc(actor.name)}</b>` : ''}</div>`;
  const fields = (ab.fields || []).filter(f => !f.show || f.show(t)).map(f => f.type === 'check' ? `<div style="margin-top:10px">${fieldHtml(f, t, d)}</div>` : `<label class="f">${esc(f.label)}</label>${fieldHtml(f, t, d)}`).join('');
  openModal(`<h2>${esc(ab.name)}</h2><p class="muted small">${esc(ab.desc)}</p>
    <div class="paybox">${pay}${ab.cancelable === false ? ' · <b style="color:var(--yellow)">мгновенно, без окна реакции</b>' : ''}</div>
    <label class="f">Игрок</label>${actorHtml}
    ${fields}
    <div class="formerr ${err ? 'bad' : 'ok'}">${err ? esc(err) : '✓ Можно объявлять'}</div>
    <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn yellow lg" data-a="formSubmit" ${err ? 'disabled' : ''}>${ab.cancelable === false ? 'Применить сейчас' : 'Объявить → окно реакции'}</button></div>`, 'wide');
}
Object.assign(A, {
  fstAdd: () => { formDraft.targets.st.push({type:''}); drawForm(); },
  fstDel: d => { formDraft.targets.st.splice(+d.i, 1); drawForm(); },
  formSubmit: () => { if(formDraft) declare(formDraft); },
});
Object.assign(C, {
  fset: (d, el) => { setPath(formDraft.targets, d.k, el.value === '' ? '' : d.num ? +el.value : el.value); drawForm(); },
  fcheck: (d, el) => { setPath(formDraft.targets, d.k, el.checked); drawForm(); },
  fbatch: (d, el) => { const s = new Set(formDraft.targets.batches); el.checked ? s.add(+d.v) : s.delete(+d.v); formDraft.targets.batches = [...s]; drawForm(); },
  factor: (d, el) => { formDraft.actorId = el.value; drawForm(); },
  fconsent: (d, el) => { formDraft.consent = el.checked; drawForm(); },
});

/* ---------- результат действия (только ведущему) ---------- */
function showResult(actionId){
  const a = state.actions.find(x => x.id === actionId); if(!a) return;
  const ab = ABILITY[a.abilityId], r = a.result || {};
  if(a.status === 'running' && r.interactive === 'gambler') return gamblerModal(a.id);
  if(isDemo()) return;
  openModal(`<h2>${esc(ab.name)}: результат</h2>
    ${a.status === 'failed' ? `<div class="warnbig">Не выполнено: ${esc(r.failed)}</div>` : ''}
    ${r.private && r.private.length ? `<div class="privcard">${kicker('Сообщить приватно игроку ' + esc(pname(a.actor)), 'blue')}${r.private.map(x => `<div class="privline">${esc(x)}</div>`).join('')}</div>` : ''}
    ${r.publicText ? `<p><b>Публично:</b> ${esc(r.publicText)}</p>` : ''}
    ${r.host ? `<div class="hostnote">🔒 Только ведущему: ${esc(r.host)}</div>` : ''}
    <div class="foot"><button class="btn violet" data-a="closeModal">Готово</button></div>`);
}
function gamblerModal(actionId){
  const a = state.actions.find(x => x.id === actionId), claims = a.result.claims || [];
  const last = claims[claims.length - 1];
  openModal(`<h2>Азартный игрок · ${esc(pname(a.actor))}</h2>
    <p class="muted small">Игрок называет пару «портал — фигурка». Проверка по реальному расположению, маскировки игнорируются.</p>
    ${last ? `<div class="bigverdict ${last.ok ? 'ok' : 'bad'}">${last.ok ? 'ВЕРНО' : 'НЕВЕРНО'}</div>` : ''}
    <div class="small muted">Верных подряд: ${claims.filter(c => c.ok).length}</div>
    ${a.status === 'running' ? `<div class="row" style="margin-top:12px"><select id="gmP">${optList(ALL_PORTALS.map(n => [n, '№'+n]), '')}</select><select id="gmF">${figOptions('')}</select></div>
      <div class="foot"><button class="btn ghost" data-a="gmStop" data-id="${a.id}">Завершить серию</button><button class="btn yellow" data-a="gmClaim" data-id="${a.id}">Проверить</button></div>`
    : `<p><b>Серия завершена.</b></p><div class="foot"><button class="btn violet" data-a="closeModal">Готово</button></div>`}`);
}
Object.assign(A, {
  gmClaim: d => { const ok = gamblerClaim(d.id, $('#gmP').value, $('#gmF').value); if(ok !== null) gamblerModal(d.id); },
  gmStop: d => { gamblerStop(d.id); closeModal(); },
  showResult: d => showResult(d.id),
});
