'use strict';
/* ---------- 1. Панель вечеринки ---------- */
function nextSteps(){
  const s = [], pend = pendingAction();
  if(pend) s.push(['red', `Окно реакции: «${ABILITY[pend.abilityId].name}» (${pname(pend.actor)})`, 'reactions']);
  const run = state.actions.find(a => a.status === 'running');
  if(run) s.push(['yellow', `Идёт серия «Азартного игрока» — ${pname(run.actor)}`, 'reactions']);
  if(state.phase === 'setup'){
    s.push(['blue', 'Разложите фигурки по порталам (случайно или вручную)', 'portals']);
    s.push(['blue', 'Распределите гостей по стартовым порталам — так определятся персонажи и квесты', 'players']);
    s.push(['green', 'Нажмите «Начать вечеринку» — первоначальное расположение зафиксируется', null]);
  }
  if(state.phase === 'rounds'){
    const r = currentRound(), g = r.games.find(x => x.status === 'planned');
    s.push(g ? ['pink', `Запишите итоги игры «${g.name}»`, 'rewards'] : ['green', nextEnabledRound() >= 0 ? 'Все игры раунда завершены — можно начинать следующий раунд' : 'Последний раунд завершён — откройте финальное окно', null]);
  }
  if(state.phase === 'window') s.push(['yellow', 'Финальное окно: последние покупки и способности, затем «Заморозить мультивселенную»', null]);
  if(state.phase === 'frozen'){
    const f = state.final, free = state.players.filter(p => p.batch === null).length;
    s.push(free ? ['blue', `Выбор батчей: осталось ${free}`, 'final'] : !f.draw ? ['blue', 'Соберите тайные предпочтения и проведите распределение', 'final'] : !f.confirmed ? ['green', 'Подтвердите распределение', 'final'] : ['pink', 'Финальное раскрытие', 'final']);
  }
  return s;
}
function phaseControls(){
  if(isDemo()) return '';
  switch(state.phase){
    case 'setup':  return `<button class="btn lg red" data-a="startParty">Начать вечеринку →</button>`;
    case 'rounds': return `<button class="btn lg red" data-a="nextRound">${nextEnabledRound() >= 0 ? 'Следующий раунд →' : 'Открыть финальное окно →'}</button>`;
    case 'window': return `<button class="btn lg blue" data-a="freeze">❄ Заморозить мультивселенную</button>`;
    case 'frozen': return `<button class="btn lg violet" data-a="go" data-s="final">К финалу →</button>`;
  }
  return '';
}
function viewDash(){
  const rk = ranking(), errs = integrity(), r = currentRound();
  const sumRp = state.players.reduce((a,p)=>a+p.rp,0), sumEp = state.players.reduce((a,p)=>a+p.ep2,0);
  const ev = visibleLog().slice(-8).reverse();
  const steps = nextSteps();
  const track = [['setup','Подготовка'], ...state.rounds.filter(x => x.enabled).map(x => [x.id, `${x.name}: ${x.title}`]), ['window','Финальное окно'], ['frozen','Финал'], ['done','Завершение']];
  const curKey = state.phase === 'rounds' ? r.id : state.phase;
  const curIdx = track.findIndex(([k]) => k === curKey);
  return `
  <section class="panel hero hal">
    ${kicker('Spider-Verse Birthday Metagame')}
    <h1 class="glitch" data-text="Паучья мультивселенная">Паучья мультивселенная</h1>
    <div class="stage-box">
      <span class="stage-num">${esc(PHASES[state.phase])}</span>
      <span class="stage-cur">${esc(roundLabel())}</span>
      ${r ? `<span class="muted">игр: ${r.games.filter(g=>g.status==='done').length}/${r.games.filter(g=>g.status!=='skipped').length}</span>` : ''}
      <span class="spacer"></span>${phaseControls()}
    </div>
    <div class="stage-track">${track.map(([k,t],i) => `<button disabled class="${i<curIdx?'done':''} ${i===curIdx?'on':''}" title="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  </section>
  ${!isDemo() && steps.length ? `<section class="panel nexts"><h2>Ближайшие действия</h2>${steps.map(([c,t,s]) => `<div class="nx"><span class="chip ${c}">●</span><span>${esc(t)}</span>${s ? `<button class="btn sm ghost" data-a="go" data-s="${s}">Открыть →</button>` : ''}</div>`).join('')}</section>` : ''}
  <div class="stats">
    <div class="stat" style="--c:var(--pink)"><div class="l">Участников</div><div class="v">${state.players.length}</div></div>
    <div class="stat" style="--c:var(--yellow)"><div class="l">Всего RP</div><div class="v">${sumRp}</div></div>
    <div class="stat" style="--c:var(--blue)"><div class="l">Всего EP</div><div class="v">${fmtEP(sumEp)}</div></div>
    ${isDemo()?'':`<div class="stat" style="--c:${errs.length?'var(--red)':'var(--green)'}"><div class="l">Целостность</div><div class="v" style="font-size:22px;margin-top:14px">${errs.length?'⚠ '+errs.length:'✓ В порядке'}</div>${errs.length?`<div class="small" style="color:#ff8597;margin-top:6px">${errs.map(esc).join('<br>')}</div>`:''}</div>`}
  </div>
  <div class="grid g2">
    <section class="panel"><h2>Таблица лидеров <span class="n">по RP</span><span class="spacer"></span><button class="btn sm ghost" data-a="go" data-s="players">Все →</button></h2>
      ${rk.map(({p,place})=>`<div class="lb-row p${place}"><span class="lb-place">${place}</span>${avatar(p,36)}<span class="pname">${esc(p.name)}</span><span class="lb-rp">${p.rp} RP</span><span class="lb-ep">${epText(p.ep2)}</span></div>`).join('') || '<div class="empty">Нет игроков</div>'}
    </section>
    <section class="panel compact"><h2>Последние события<span class="spacer"></span><button class="btn sm ghost" data-a="go" data-s="log">Журнал →</button></h2>
      ${ev.map(eventRow).join('') || '<div class="empty">Событий пока нет</div>'}
    </section>
  </div>
  <div class="navcards">${SCREENS.filter(s=>s.id!=='dash' && !(s.host && isDemo())).map(s=>`<button class="navcard" style="--c:${s.color}" data-a="go" data-s="${s.id}"><div class="ic">${ICONS[s.icon]}</div><b>${s.name}</b><span>${s.desc}</span></button>`).join('')}</div>`;
}
Object.assign(A, {
  startParty: () => confirmBox('Начать вечеринку?', 'Текущее расположение фигурок будет зафиксировано как первоначальное (для «Возвращения домой»). Персонажей участникам после старта менять нельзя.', 'Начать').then(ok => ok && startParty()),
  nextRound: () => nextRound(),
  freeze: () => confirmBox('Заморозить мультивселенную?', 'После заморозки любые покупки, способности и перемещения будут запрещены. Неиспользованные ваучеры и повторы сгорят. Порядок при равенстве RP определит публичная жеребьёвка.', '❄ Заморозить', true).then(ok => ok && freeze()),
});
