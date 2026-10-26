'use strict';
/* ---------- 2. Участники ---------- */
function viewPlayers(){
  const host = !isDemo();
  const rk = ranking(); const place = Object.fromEntries(rk.map(r=>[r.p.id, r.place]));
  const list = ui.playerSort === 'rank' ? rk.map(r=>r.p) : state.players;
  return `
  <div class="screen-h"><div>${kicker('Участники','pink')}<h1>Участники</h1><div class="sub">Рейтинг — только по RP (RP не тратится). EP — валюта магазина, шаг 0,5. При равенстве RP порядок финального выбора решит публичная жеребьёвка.</div></div>
    <div class="row"><div class="seg"><button class="${ui.playerSort==='rank'?'on':''}" data-a="psort" data-v="rank">По рейтингу</button><button class="${ui.playerSort==='list'?'on':''}" data-a="psort" data-v="list">По списку</button></div>
    ${host && state.phase === 'setup' ? '<button class="btn red" data-a="addPlayer">+ Добавить участника</button>' : ''}</div></div>
  ${host && state.phase === 'setup' ? startTable() : ''}
  <div class="pcards">${list.map(p => playerCard(p, place[p.id])).join('') || '<div class="empty">Добавьте участников</div>'}</div>`;
}
/* Стартовая раздача: гость получает портал, фигурка в нём (на начало вечеринки) — его персонаж */
function startTable(){
  const free = state.players.filter(p => !p.startPortal);
  return `<section class="panel starttab"><h2>Стартовая раздача по порталам<span class="spacer"></span><button class="btn yellow" data-a="randomPortals">🎲 Случайно распределить гостей</button></h2>
    <p class="muted small">Сначала разложите фигурки по порталам («Порталы»), затем распределите гостей. Фигурка в стартовом портале определяет персонажа гостя: его личный квест и способность. После «Начать вечеринку» раздача фиксируется.</p>
    <div class="tscroll"><table class="t"><thead><tr><th>Портал</th><th>Фигурка</th><th>Гость</th><th>Квест</th><th>Способность</th></tr></thead><tbody>
    ${ALL_PORTALS.map(n => { const f = figAt(n), b = batchOf(n), p = state.players.find(x => x.startPortal === n);
      return `<tr><td><b style="font:900 20px var(--display);color:${b.color}">№${n}</b></td>
        <td><span class="row"><span class="thumb" style="--c:${esc(f.color)}"><img src="${figSrc(f)}" alt=""></span><b>${esc(f.name)}</b></span></td>
        <td><select data-c="setPortalPlayer" data-n="${n}" style="width:auto;min-width:150px">${optList(state.players.map(x => [x.id, x.name + (x.startPortal && x.startPortal !== n ? ` (сейчас №${x.startPortal})` : '')]), p ? p.id : '', '— никто —')}</select></td>
        <td class="small">${esc(f.quest)}</td><td class="small"><b>${esc(UNIQUE_BY_FIG[f.id].name)}</b></td></tr>`; }).join('')}
    </tbody></table></div>
    ${free.length ? `<p class="small" style="color:var(--yellow)">Без портала: ${free.map(p => esc(p.name)).join(', ')}</p>` : ''}
  </section>`;
}
function playerCard(p, place){
  const host = !isDemo(), ch = charOf(p);
  const q = `<div class="qbtns">`;
  const quests = questsOf(p.id), insts = instancesOf(p.id), vs = vouchersOf(p.id);
  const fig = p.prize && F(p.prize);
  return `<article class="pcard" style="--c:${esc(p.color)}" id="pc-${p.id}">
    <span class="rank ${place===1?'r1':''}">#${place}</span>
    <div class="pcard-top">${avatar(p)}<div><div class="pname">${esc(p.name)}</div><div class="small muted">${host && ch ? `Старт: №${p.startPortal} · ${esc(ch.name)}` : host && state.phase === 'setup' ? 'Стартовый портал не назначен' : 'Место: ' + place}</div></div></div>
    <div class="pts">
      <div class="pt rp"><div class="l">RP · РЕПУТАЦИЯ</div><div class="v" data-v="rp">${p.rp}</div>${host ? q + [1,2,3].map(n=>`<button data-a="pts" data-id="${p.id}" data-k="rp" data-d="${n}">+${n}</button>`).join('') + `<button data-a="ptsCustom" data-id="${p.id}" data-k="rp" title="Произвольное изменение">±</button></div>` : ''}</div>
      <div class="pt ep ${p.ep2<0?'neg':''}"><div class="l">EP · ЭНЕРГИЯ</div><div class="v" data-v="ep">${fmtEP(p.ep2)}</div>${host ? q + [1,2,3].map(n=>`<button data-a="pts" data-id="${p.id}" data-k="ep" data-d="${n*2}">+${n}</button>`).join('') + `<button data-a="ptsCustom" data-id="${p.id}" data-k="ep" title="Произвольное изменение (шаг 0,5)">±</button></div>` : ''}</div>
    </div>
    ${host ? `<div class="qlist">${quests.map(qq => `<div class="qitem ${qq.status}"><div><b>${esc(questTitle(qq))}</b> ${qq.closedBySteal ? chip('закрыт кражей','') : qq.status==='done' ? chip('выполнен','green') : chip('в процессе','yellow')}${qq.takenByMiles ? chip('взят Майлзом','red') : ''}</div><div class="small muted">${esc(questText(qq))}</div>
        ${qq.status==='open' && canPlay() ? `<div class="row" style="margin-top:6px">${qq.origin!==MILES ? `<button class="btn sm green" data-a="questDone" data-id="${qq.id}">Квест выполнен</button>` : ''}${qq.origin===MILES ? `<button class="btn sm red" data-a="milesSteal" data-id="${qq.id}">Украсть квест…</button>` : ''}</div>` : ''}</div>`).join('') || '<div class="dim small">Квест не назначен</div>'}</div>
      <div class="meta">${insts.map(i => chip(esc(ABILITY[i.type].name) + (ABILITY[i.type].reaction ? ` · ${i.charges} зар.` : ''), usesLeft(i) > 0 || ABILITY[i.type].passive ? 'violet' : '')).join('')}
        ${vs.map(v => chip(`Ваучер у ${esc(pname(v.holder))}: ${v.status==='active'?'активен':v.status==='used'?'использован':'сгорел'}`, v.status==='active'?'yellow':'')).join('')}
        ${vouchersHeldBy(p.id).map(v => chip(`Хранит ваучер Сан-Спайдер: ${v.status==='active'?'активен':v.status==='used'?'использован':'сгорел'}`, v.status==='active'?'yellow':'')).join('')}
        ${p.batch!==null?chip(esc(batchName(BATCHES[p.batch])),'blue'):''}${fig?chip('Фигурка: '+esc(fig.name),'green'):''}</div>` : `<div class="meta">${p.batch!==null?chip(esc(batchName(BATCHES[p.batch])),'blue'):''}</div>`}
    <div class="acts"><button class="btn sm" data-a="history" data-id="${p.id}">История</button>${host?`<button class="btn sm" data-a="editPlayer" data-id="${p.id}">Изменить</button>${p.charId===SUN && canPlay() ? `<button class="btn sm" data-a="sunHints" data-id="${p.id}">Подсказки о квестах</button>` : ''}`:''}</div>
  </article>`;
}
// назначить стартовый портал; если он занят — участники меняются порталами
function setStartPortal(pid, n){
  const p = P(pid);
  act({type:'setup', playerId:pid, pub:false, text:`${p.name}: стартовый портал ${n ? '№' + n : '—'}`}, () => {
    if(state.phase !== 'setup') fail('Стартовую раздачу можно менять только в подготовке');
    const other = n && state.players.find(x => x.startPortal === n && x.id !== pid);
    if(other) other.startPortal = p.startPortal;
    p.startPortal = n;
  });
}
// kind: 'rp' | 'ep'; для EP delta — в половинках
function changePoints(pid, kind, delta, reason=''){
  const p = P(pid); if(!p || !delta) return;
  const field = kind === 'rp' ? 'rp' : 'ep2';
  const amount = kind === 'rp' ? `${sign(delta)} RP` : `${signEP(delta)} EP`;
  const go = () => act({type:kind, playerId:pid, text:`${p.name}: ${amount}${reason?' — '+reason:''}`}, () => { p[field] += delta; });
  if(kind === 'ep' && p.ep2 + delta < 0)
    confirmBox('Отрицательный баланс EP', `У ${esc(p.name)} ${epText(p.ep2)}. После операции будет ${epText(p.ep2+delta)}. Продолжить?`, 'Да, разрешить минус', true).then(ok => ok && go());
  else if(kind === 'rp' && p.rp + delta < 0) toast('RP не может стать отрицательным', 'var(--red)');
  else go();
}
function playerModal(pid){
  const p = P(pid); if(!p) return;
  const ed = f => `data-c="edit" data-kind="player" data-id="${p.id}" data-field="${f}" data-rr="1"`;
  const setup = state.phase === 'setup';
  openModal(`<h2 class="row">${avatar(p,44)} Участник</h2>
    <div class="fl2"><div><label class="f">Имя</label><input type="text" value="${esc(p.name)}" ${ed('name')}></div>
    <div><label class="f">Цвет</label><input type="color" value="${esc(p.color)}" ${ed('color')} style="width:100%;height:40px;background:none;border:2px solid var(--line);border-radius:6px"></div></div>
    <label class="f">Стартовый портал (секретно)</label>
    ${setup ? `<select data-c="setStart" data-id="${p.id}">${optList(ALL_PORTALS.map(n => { const o = state.players.find(x => x.startPortal === n && x.id !== p.id); return [n, `№${n} — ${figAt(n).name}${o ? ` (сейчас у ${o.name})` : ''}`]; }), p.startPortal || '', 'не назначен')}</select><div class="small muted">Персонаж = фигурка в этом портале. Если портал уже занят, участники поменяются.</div>`
      : `<div><b>№${p.startPortal || '—'} · ${esc(charOf(p)?.name || 'персонаж не назначен')}</b> <span class="small muted">— после старта не меняется</span></div>`}
    <label class="f">Аватар</label><div class="avpick">${AVATARS.map((_,i)=>`<button class="${p.avatar==='builtin:'+i?'on':''}" data-a="setAvatar" data-id="${p.id}" data-v="builtin:${i}">${avatar({...p, avatar:'builtin:'+i})}</button>`).join('')}
      <button class="${!p.avatar?'on':''}" data-a="setAvatar" data-id="${p.id}" data-v="">${avatar({...p, avatar:null})}</button>
      ${p.avatar&&!p.avatar.startsWith('builtin:')?`<button class="on">${avatar(p)}</button>`:''}</div>
    <button class="btn sm" style="margin-top:8px" data-a="upload" data-kind="player" data-id="${p.id}" data-field="avatar">${ICONS.upload.replace('<svg','<svg width="14" height="14"')} Загрузить своё фото</button>
    <div class="foot">${setup ? `<button class="btn red ghost" data-a="delPlayer" data-id="${p.id}">Удалить участника</button>` : ''}<span class="spacer"></span><button class="btn violet" data-a="closeModal">Готово</button></div>`);
}
function sunHintsModal(pid){
  const others = state.players.filter(p => p.id !== pid);
  openModal(`<h2>Подсказки для Сан-Спайдер</h2><p class="muted small">Выберите 2–3 участников — их текущие квесты будут показаны приватно.</p>
    <div class="pgrid">${others.map(p => `<label class="pick"><input type="checkbox" class="sunpick" value="${p.id}"> ${avatar(p,28)} ${esc(p.name)}</label>`).join('')}</div>
    <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn yellow" data-a="sunHintsGo" data-id="${pid}">Показать</button></div>`);
}
Object.assign(A, {
  psort: d => { ui.playerSort = d.v; saveUi(); render(); },
  pts: d => changePoints(d.id, d.k, +d.d),
  ptsCustom: d => {
    const p = P(d.id), k = d.k, isEp = k === 'ep';
    openModal(`<h2>${esc(p.name)}: ${isEp ? 'EP' : 'RP'}</h2><p class="muted">Сейчас: <b>${isEp ? epText(p.ep2) : p.rp + ' RP'}</b></p>
      <label class="f">Количество${isEp ? ' (шаг 0,5)' : ''}</label><input type="number" id="ptsN" value="1" min="${isEp ? 0.5 : 1}" step="${isEp ? 0.5 : 1}">
      <label class="f">Причина (необязательно)</label><input type="text" id="ptsR" placeholder="например: спорный момент в «Шляпе»">
      <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn red" data-a="ptsApply" data-s="-1">− Списать</button><button class="btn green" data-a="ptsApply" data-s="1">+ Начислить</button></div>`);
    setTimeout(() => $('#ptsN')?.select(), 30);
    A.ptsApply = dd => {
      const raw = Math.abs(parseFloat(String($('#ptsN').value).replace(',', '.')) || 0);
      const n = isEp ? Math.round(raw * 2) : Math.round(raw);
      if(isEp && Math.abs(raw * 2 - n) > 1e-9) return toast('EP меняется с шагом 0,5', 'var(--red)');
      const r = $('#ptsR').value.trim(); closeModal(); if(n) changePoints(p.id, k, n * +dd.s, r);
    };
  },
  addPlayer: () => act(() => ({type:'player', text:`Добавлен участник ${state.players[state.players.length-1].name} (0 RP, 2 EP)`}), () => {
    if(state.phase !== 'setup') fail('Добавлять участников можно только в подготовке');
    const used = new Set(state.players.map(p=>p.avatar));
    const taken = new Set(state.players.map(x => x.startPortal));
    const p = newPlayer('Участник ' + (state.players.length+1), state.players.length, null, ALL_PORTALS.find(n => !taken.has(n)) || null);
    const free = AVATARS.findIndex((_,i)=>!used.has('builtin:'+i)); p.avatar = free>=0 ? 'builtin:'+free : null;
    state.players.push(p);
  }),
  randomPortals: () => confirmBox('Случайно распределить гостей?', 'Каждый гость получит случайный стартовый портал — и персонажа, чья фигурка там стоит. Текущая раздача будет заменена.', '🎲 Распределить').then(ok => ok &&
    act({type:'setup', pub:false, text:'Гости случайно распределены по стартовым порталам'}, () => {
      if(state.phase !== 'setup') fail('Распределять гостей можно только в подготовке');
      const ns = shuffle(ALL_PORTALS);
      state.players.forEach((p, i) => { p.startPortal = ns[i] || null; });
    })),
  history: d => {
    const p = P(d.id);
    const ev = visibleLog().filter(e => e.playerId === p.id).reverse();
    openModal(`<h2 class="row">${avatar(p,40)} ${esc(p.name)}: история</h2><div class="compact">${ev.map(eventRow).join('') || '<div class="empty">Нет записей</div>'}</div>
      <div class="foot"><button class="btn" data-a="closeModal">Закрыть</button></div>`, 'wide');
  },
  editPlayer: d => playerModal(d.id),
  setAvatar: d => { const p = P(d.id); act({type:'setup', text:`${p.name}: смена аватара`, playerId:p.id}, () => { p.avatar = d.v || null; }); playerModal(p.id); },
  delPlayer: d => { const p = P(d.id); confirmBox('Удалить участника?', `<b>${esc(p.name)}</b> будет удалён вместе с квестом. Записи журнала останутся.`, 'Удалить', true).then(ok => {
    if(!ok) return;
    act({type:'player', text:`Удалён участник ${p.name}`}, () => {
      if(state.phase !== 'setup') fail('Удалять участников можно только в подготовке');
      state.players = state.players.filter(x=>x.id!==p.id); state.quests = state.quests.filter(q => q.holder !== p.id);
    });
  }); },
  questDone: d => { const q = Q(d.id), r = q.takenByMiles ? MILES_REWARD : QUEST_REWARD;
    const abs = [UNIQUE_BY_FIG[q.origin].name, ...(q.takenByMiles ? [UNIQUE_BY_FIG[MILES].name] : [])].map(n => `«${esc(n)}»`).join(' и ');
    confirmBox('Квест выполнен?', `${esc(pname(q.holder))}: «${esc(questText(q))}».<br>Награда: +${r.rp} RP, +${fmtEP(r.ep2)} EP и ${q.takenByMiles ? 'способности' : 'способность'} ${abs}.`, 'Засчитать').then(ok => ok &&
    act(null, () => { if(!canPlay()) fail(phaseError() || 'Сейчас нельзя'); completeQuest(Q(d.id)); })); },
  milesSteal: d => {
    const q = Q(d.id), miles = P(q.holder);
    const victims = state.players.filter(p => p.id !== miles.id && openQuestOf(p.id));
    openModal(`<h2>Майлз крадёт квест</h2><p class="muted small">Квест жертвы переходит к ${esc(miles.name)}, квест Майлза закрывается без награды. Жертва сразу получает +${fmtEP(MILES_VICTIM_EP2)} EP и квест Бродяги. Когда ${esc(miles.name)} выполнит взятый квест: +${MILES_REWARD.rp} RP, +${fmtEP(MILES_REWARD.ep2)} EP, «Невидимость» и способность владельца квеста.</p>
      <label class="f">У кого украсть</label><select id="msV">${optList(victims.map(p => [p.id, `${p.name} — ${questTitle(openQuestOf(p.id))}`]), '')}</select>
      <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn red" data-a="milesGo" data-id="${q.id}">Украсть</button></div>`);
  },
  milesGo: d => { const v = $('#msV').value; if(!v) return toast('Выберите участника', 'var(--red)'); closeModal(); act(null, () => { if(!canPlay()) fail(phaseError()); milesSteal(d.id, v); }); },
  sunHints: d => sunHintsModal(d.id),
  sunHintsGo: d => {
    const ids = [...document.querySelectorAll('.sunpick:checked')].map(x => x.value);
    if(ids.length < 2 || ids.length > 3) return toast('Выберите 2–3 участников', 'var(--red)');
    act({type:'quest', pub:false, playerId:d.id, text:`${pname(d.id)} (Сан-Спайдер) получает подсказки о квестах: ${ids.map(pname).join(', ')}`,
      secret: ids.map(id => `${pname(id)}: ${openQuestOf(id) ? questText(openQuestOf(id)) : 'нет открытого квеста'}`).join('; ')}, () => {}, {render:false});
    openModal(`<h2>Подсказки для Сан-Спайдер</h2>${kicker('Показать приватно','blue')}${ids.map(id => { const q = openQuestOf(id); return `<div class="privline"><b>${esc(pname(id))}:</b> ${q ? esc(questText(q)) : 'нет открытого квеста'}</div>`; }).join('')}<div class="foot"><button class="btn violet" data-a="closeModal">Готово</button></div>`);
  },
});
Object.assign(C, {
  setStart: (d, el) => { setStartPortal(d.id, el.value ? +el.value : null); playerModal(d.id); },
  setPortalPlayer: (d, el) => {
    const n = +d.n, cur = state.players.find(x => x.startPortal === n);
    if(el.value) setStartPortal(el.value, n);
    else if(cur) setStartPortal(cur.id, null);
  },
});
