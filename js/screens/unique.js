'use strict';
/* ---------- 5. Уникальные способности ---------- */
function viewUnique(){
  const vs = state.effects.vouchers;
  return `<div class="screen-h"><div>${kicker('Только ведущий','violet')}<h1>Уникальные способности</h1><div class="sub">Способность открывается выполнением квеста и принадлежит тому, кто этот квест выполнил. ${phaseError() ? '<b style="color:var(--red)">' + esc(phaseError()) + '</b>' : ''}</div></div></div>
  <div class="ucards">${UNIQUE.map(u => uniqueCard(u)).join('')}</div>
  <section class="panel" style="margin-top:18px"><h2>Ваучеры Сан-Спайдер</h2>
    ${vs.length ? `<table class="t"><thead><tr><th>Держатель ваучера</th><th>Применяет</th><th>Статус</th><th></th></tr></thead><tbody>${vs.map(v => `<tr><td><b>${esc(pname(v.holder))}</b></td><td>${esc(pname(v.owner))} (Сан-Спайдер)</td>
      <td>${v.status==='active'?chip('активен','yellow'):v.status==='used'?chip('использован: '+esc(ABILITY[v.abilityId]?.name||''),''):chip('сгорел при заморозке','red')}</td>
      <td>${v.status==='active' && canPlay() ? `<button class="btn sm yellow" data-a="voucherUse" data-id="${v.id}">Применить…</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Ваучеров пока нет</div>'}
  </section>`;
}
function uniqueCard(u){
  const f = F(u.fig), insts = state.abilities.filter(i => i.type === u.id);
  return `<article class="ucard ${insts.length ? '' : 'locked'}" style="--c:${esc(f.color)}">
    <div class="row"><span class="fig"><img src="${figSrc(f)}" alt=""></span><div><b>${esc(u.name)}</b><div class="small muted">${esc(f.name)}</div></div></div>
    <div class="small">${esc(u.desc)}</div>
    ${insts.length ? insts.map(i => instanceBlock(u, i)).join('') : `<div class="lockline">${ICONS.lock.replace('<svg','<svg width="14" height="14"')} Откроется после выполнения квеста ${esc(f.name.split(' ')[0])}</div>`}
  </article>`;
}
function instanceBlock(u, i){
  const owner = P(i.owner), play = canPlay() && !pendingAction();
  const head = `<div class="inst-h">${avatar(owner, 26)}<b>${esc(owner.name)}</b><span class="spacer"></span>`;
  if(u.id === 'tea'){
    const dr = i.data.drinkers;
    return `<div class="inst">${head}${chip(`+${dr.length}/${TEA_MAX} EP`,'blue')}</div>
      <div class="small muted">Отметьте гостей, выпивших чай (каждый — один раз):</div>
      <div class="pgrid">${state.players.filter(p => p.id !== owner.id).map(p => `<label class="pick"><input type="checkbox" data-c="tea" data-id="${i.id}" data-p="${p.id}" ${dr.includes(p.id)?'checked':''} ${!canPlay() || (!dr.includes(p.id) && dr.length >= TEA_MAX) ? 'disabled' : ''}> ${esc(p.name)}</label>`).join('')}</div></div>`;
  }
  if(u.id === 'duel') return `<div class="inst">${head}${chip(`зарядов: ${i.charges}/${DUEL_CHARGES}`, i.charges ? 'yellow' : '')}</div><div class="small muted">Применяется в окне реакции.</div></div>`;
  if(u.id === 'mayday'){
    const spent = maydaySpent(i), left = MAYDAY_LIMIT2 - spent;
    const member = role => {
      const pid = maydayMember(i, role), used = i.data.used[role];
      if(!pid) return '';
      const src = maydaySources(i, role).map(id => ABILITY[id]);
      return `<div class="mrow"><b>${esc(pname(pid))}</b> ${role === 'owner' ? '(Питер Б.)' : '(Мэйдэй)'} — ${used ? chip(`повтор использован: ${esc(ABILITY[used.abilityId].name)} (${fmtEP(used.price)} EP)`, '') :
        src.length ? src.map(a => `<button class="btn sm ${a.price <= left ? 'yellow' : ''}" data-a="maydayRepeat" data-id="${i.id}" data-r="${role}" data-ab="${a.id}" ${a.price > left || !play ? 'disabled' : ''} title="${a.price > left ? 'превышает оставшийся лимит' : ''}">${esc(a.name)} · ${fmtEP(a.price)}</button>`).join(' ') : '<span class="dim small">партнёр ещё не использовал покупных способностей</span>'}</div>`;
    };
    return `<div class="inst">${head}${chip(`лимит: ${fmtEP(spent)}/${fmtEP(MAYDAY_LIMIT2)} EP`, left ? 'blue' : 'red')}</div>
      <label class="f">Партнёр-«младенец»</label><select data-c="maydayBaby" data-id="${i.id}" ${i.data.used.owner || i.data.used.baby ? 'disabled' : ''}>${optList(state.players.filter(p => p.id !== owner.id).map(p => [p.id, p.name]), i.data.baby, 'не назначен')}</select>
      ${i.data.baby ? member('owner') + member('baby') : '<div class="dim small">Назначьте партнёра, чтобы открыть повторы</div>'}</div>`;
  }
  const left = usesLeft(i);
  return `<div class="inst">${head}${u.uses === Infinity ? chip('без ограничений','green') : chip(left > 0 ? 'доступна' : 'использована', left > 0 ? 'green' : '')}
    ${left > 0 ? `<button class="btn sm violet" data-a="useUnique" data-id="${i.id}" ${play ? '' : 'disabled'}>${u.id === 'leak' ? 'Открыть таблицу' : 'Применить…'}</button>` : ''}</div></div>`;
}
function voucherPick(vid){
  const v = state.effects.vouchers.find(x => x.id === vid);
  const list = SHOP.filter(a => !a.reactionOnly && a.price <= VOUCHER_MAX2);
  openModal(`<h2>Ваучер у ${esc(pname(v.holder))}</h2><p class="muted small">${esc(pname(v.owner))} бесплатно применяет покупную способность до ${epText(VOUCHER_MAX2)} — с публичного разрешения ${esc(pname(v.holder))}.</p>
    <div class="pgrid">${list.map(a => `<button data-a="voucherGo" data-id="${vid}" data-ab="${a.id}"><span><b>${esc(a.name)}</b><br><span class="small muted">${fmtEP(a.price)} EP</span></span></button>`).join('')}</div>
    <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button></div>`);
}
Object.assign(A, {
  useUnique: d => { const i = instance(d.id); openActionForm({abilityId:i.type, via:'unique', actorId:i.owner, instanceId:i.id}); },
  maydayRepeat: d => { const i = instance(d.id); openActionForm({abilityId:d.ab, via:'repeat', actorId:maydayMember(i, d.r), instanceId:i.id, role:d.r}); },
  voucherUse: d => voucherPick(d.id),
  voucherGo: d => { const v = state.effects.vouchers.find(x => x.id === d.id); openActionForm({abilityId:d.ab, via:'voucher', actorId:v.owner, voucherId:v.id}); },
});
Object.assign(C, {
  tea: (d, el) => {
    const i = instance(d.id), p = P(d.p), owner = P(i.owner);
    act({type:'ep', playerId:owner.id, pub:false, text:`${owner.name}: «Чайная церемония» — ${el.checked ? `${p.name}: чай выпит, +1 EP` : `отметка ${p.name} снята, −1 EP`}`}, () => {
      if(!canPlay()) fail(phaseError());
      const dr = i.data.drinkers;
      if(el.checked){
        if(dr.includes(p.id)) fail('Этот гость уже учтён');
        if(dr.length >= TEA_MAX) fail(`Максимум +${TEA_MAX} EP`);
        dr.push(p.id); owner.ep2 += 2;
      } else { i.data.drinkers = dr.filter(x => x !== p.id); owner.ep2 -= 2; }
    });
  },
  maydayBaby: (d, el) => {
    const i = instance(d.id);
    act({type:'setup', playerId:i.owner, pub:false, text:`«Мэйдэй!»: ${pname(i.owner)} в паре с ${el.value ? pname(el.value) : '—'}`}, () => {
      if(i.data.used.owner || i.data.used.baby) fail('Повторы уже использовались — пару менять нельзя');
      i.data.baby = el.value || null;
    });
  },
});
