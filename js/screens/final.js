'use strict';
/* ---------- 8. Финал ---------- */
const FINAL_TABS = ['Выбор батчей','Тайные предпочтения','Распределение','Раскрытие'];
function viewFinal(){
  // номер вкладки мог остаться из старой версии (было 5 вкладок) — приводим к допустимому
  const t = Math.min(Math.max(ui.finalTab | 0, 0), FINAL_TABS.length - 1);
  const head = `<div class="screen-h"><div>${kicker('Финал','violet')}<h1>Финальное распределение</h1><div class="sub">Канон — строго по RP · Аномалия — взвешенная жеребьёвка (RP+3)³ · Коллапс — полностью случайно.</div></div>
    ${!isDemo() && state.phase === 'window' ? '<button class="btn lg blue" data-a="freeze">❄ Заморозить мультивселенную</button>' : ''}</div>`;
  if(!isFrozen()) return head + `<section class="panel chooser">${kicker('Ещё не время','yellow')}<h2 style="margin:10px 0">Финал начнётся после заморозки</h2><p class="muted">Сейчас: ${esc(roundLabel())}. Заморозка доступна в финальном окне способностей.</p></section>`;
  const body = [finalBatches, finalPrefs, finalDistribute, finalReveal][t]();
  return head + `<div class="steps">${FINAL_TABS.map((n,i)=>`<button class="step ${i===t?'on':''}" data-a="finalTab" data-i="${i}"><div><div class="sn">${i+1}</div><div class="st">${n}</div></div></button>`).join('')}</div>${body}`;
}
function batchColumns(){
  return `<div class="bcols">${BATCHES.map(b=>`<div class="bcol" style="--c:${b.color}"><h3><span>${b.roman} «${esc(b.title)}» · №${b.portals[0]}–${b.portals[b.portals.length-1]}</span><span>${batchCount(b.id)}/${b.cap}</span></h3>
    ${state.players.filter(p=>p.batch===b.id).map(p=>`<div class="m">${avatar(p,28)}<b>${esc(p.name)}</b><span class="spacer"></span><span class="small muted">${p.rp} RP</span></div>`).join('') || '<div class="dim small">пусто</div>'}</div>`).join('')}</div>`;
}
function finalBatches(){
  const host = !isDemo(), f = state.final, order = finalOrder(), locked = !!f.draw;
  const cur = order.find(p => p.batch === null);
  const full = b => batchCount(b.id) >= b.cap;
  const tb = f.tiebreak || {};
  const tied = new Set(state.players.filter(p => state.players.some(q => q.id !== p.id && q.rp === p.rp)).map(p => p.id));
  return `<div class="grid g2">
    <section class="panel">${cur && !locked ? `<div class="chooser">${kicker('Сейчас выбирает','pink')}<div class="who">${avatar(cur,70)}<b>${esc(cur.name)}</b></div>
        ${host?`<div class="bpick">${BATCHES.map(b=>`<button style="--c:${b.color}" data-a="pickBatch" data-id="${cur.id}" data-b="${b.id}" ${full(b)?'disabled':''}><span class="r">${b.roman}</span><span class="cap">«${esc(b.title)}»<br>${batchCount(b.id)}/${b.cap}${full(b)?' · заполнен':''}</span></button>`).join('')}</div>`:'<p class="muted">Ведущий отмечает выбор…</p>'}</div>`
      : `<div class="chooser">${kicker(locked?'Распределение проведено':'Выбор завершён','green')}<h2 style="margin:10px 0">${locked?'Батчи зафиксированы':'Все участники выбрали батч'}</h2>${host && !locked ? '<button class="btn lg violet" data-a="finalTab" data-i="1">Дальше: тайные предпочтения →</button>' : ''}</div>`}
      ${batchColumns()}
    </section>
    <section class="panel"><h2>Порядок выбора <span class="n">RP ↓, при равенстве — публичная жеребьёвка</span></h2>
      <div class="olist">${order.map((p,i)=>`<div class="o ${cur&&cur.id===p.id&&!locked?'cur':''}"><span class="pn">${i+1}</span>${avatar(p,32)}<b>${esc(p.name)}</b><span class="small muted">${p.rp} RP</span>${tied.has(p.id) ? chip('жеребьёвка','yellow') : ''}<span class="spacer"></span>
        ${host && !locked ? `<button class="btn sm ghost" data-a="orderMove" data-id="${p.id}" data-d="-1" ${i===0?'disabled':''}>↑</button><button class="btn sm ghost" data-a="orderMove" data-id="${p.id}" data-d="1" ${i===order.length-1?'disabled':''}>↓</button>
          <select data-c="setBatch" data-id="${p.id}"><option value="">—</option>${BATCHES.map(b=>`<option value="${b.id}" ${p.batch===b.id?'selected':''}>${b.roman}</option>`).join('')}</select>`
          : p.batch!==null?chip(BATCHES[p.batch].roman,'blue'):''}</div>`).join('')}</div>
      ${host && !locked ? '<p class="small muted">↑↓ и выпадающий список — ручная корректировка ведущего (пишется в журнал).</p>' : ''}
    </section></div>`;
}
function finalPrefs(){
  if(isDemo()) return `<section class="panel chooser">${kicker('Секретно','red')}<h2 style="margin:10px 0">Тайные предпочтения скрыты</h2></section>`;
  const locked = !!state.final.draw;
  return `<div class="grid g2">${BATCHES.map(b => { const ps = state.players.filter(p=>p.batch===b.id); return `<section class="panel" style="--c:${b.color}"><h2 style="color:${b.color}">${b.name} «${esc(b.title)}» <span class="n">${b.mode === 'random' ? 'предпочтения не учитываются' : 'ранжирование всех четырёх номеров'}</span></h2>
    ${b.mode === 'random' ? `<p class="muted small">Три фигурки распределятся случайно, все 6 перестановок равновероятны.</p>${ps.map(p => `<div class="row" style="padding:6px 0">${avatar(p,28)}<b>${esc(p.name)}</b></div>`).join('')}` :
    ps.map(p=>`<div class="row" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">${avatar(p,32)}<b style="min-width:80px">${esc(p.name)}</b>${p.prefs?chip('указано','green'):chip('по умолчанию')}<span class="spacer"></span>
      <div class="prefs">${prefsOf(p).map((n,i,arr)=>`<span class="pref"><small>${i+1}</small><button data-a="prefMove" data-id="${p.id}" data-n="${n}" data-d="-1" ${i===0||locked?'disabled':''}>‹</button><b>${n}</b><button data-a="prefMove" data-id="${p.id}" data-n="${n}" data-d="1" ${i===arr.length-1||locked?'disabled':''}>›</button></span>`).join('')}</div></div>`).join('') || '<div class="dim small">В батче нет участников</div>'}</section>`; }).join('')}
    <section class="panel"><h2>Дальше</h2><p class="muted small">Слева направо — от самого желанного номера. Когда все предпочтения собраны, проведите распределение.</p><button class="btn violet" data-a="finalTab" data-i="2">К распределению →</button></section></div>`;
}
function finalDistribute(){
  const host = !isDemo(), f = state.final, d = f.draw;
  if(!host && !f.confirmed) return `<section class="panel chooser">${kicker('Секретно','red')}<h2 style="margin:10px 0">Распределение ещё не подтверждено</h2></section>`;
  const unassigned = state.players.filter(p => p.batch === null);
  const row = (x, extra) => { const p = P(x.pid), b = batchOf(x.n); return `<tr><td><span class="row">${avatar(p,26)} <b>${esc(p.name)}</b></span></td><td>${p.rp} RP</td>${extra || ''}<td><b style="font:900 20px var(--display);color:${b.color}">№${x.n}</b></td>${host ? `<td>${x.choice ? chip(x.choice + '-й выбор', x.choice===1?'green':'yellow') : ''}</td><td>${esc(figAt(x.n).name)}</td>` : ''}</tr>`; };
  const head = extra => `<thead><tr><th>Участник</th><th>RP</th>${extra || ''}<th>Номер</th>${host ? '<th>Выбор</th><th>Фигурка (реально)</th>' : ''}</tr></thead>`;
  return `<section class="panel">
    <div class="row" style="margin-bottom:14px">${host && !d ? `<button class="btn lg blue" data-a="drawFinal" ${unassigned.length === state.players.length ? 'disabled' : ''}>Провести распределение и жеребьёвки</button>` : ''}
      ${host && d && !f.confirmed ? `<button class="btn lg green" data-a="confirmFinal">Подтвердить результаты</button>` : ''}
      ${host && f.confirmed ? `<button class="btn" data-a="unconfirmFinal">Снять подтверждение</button>` : ''}
      ${f.confirmed ? `<span class="spacer"></span><button class="btn lg pink" data-a="finalTab" data-i="3">К раскрытию →</button>` : ''}</div>
    ${unassigned.length && !d ? `<p class="small" style="color:var(--yellow)">Без батча: ${unassigned.map(p=>esc(p.name)).join(', ')} — не участвуют в распределении.</p>` : ''}
    ${d ? `<h3 class="sub3" style="color:${BATCHES[0].color}">I «Канон» — строго по рейтингу</h3><div class="tscroll"><table class="t">${head()}<tbody>${d.b0.map(x => row(x)).join('')}</tbody></table></div>
      <h3 class="sub3" style="color:${BATCHES[1].color}">II «Аномалия» — взвешенная жеребьёвка</h3><div class="tscroll"><table class="t">${head('<th>Шаг · шанс</th>')}<tbody>${d.b1.map((x, k) => row(x, `<td>${k+1} · ${Math.round((x.probs.find(q => q[0] === x.pid) || [0,0])[1] * 100)}%<div class="small muted">${x.probs.map(([pid, pr]) => `${esc(pname(pid))} ${Math.round(pr*100)}%`).join(', ')}</div></td>`)).join('')}</tbody></table></div>
      <h3 class="sub3" style="color:${BATCHES[2].color}">III «Коллапс» — случайная перестановка</h3><div class="tscroll"><table class="t">${head()}<tbody>${d.b2.map(x => row(x)).join('')}</tbody></table></div>
      ${!f.confirmed ? '<p class="small muted">Результаты жеребьёвок сохранены и не перебрасываются при перезагрузке. Переиграть можно только ручным откатом.</p>' : ''}`
    : '<div class="empty">Распределение ещё не проведено</div>'}
  </section>`;
}
function finalReveal(){
  const f = state.final;
  if(!f.confirmed) return `<section class="panel chooser"><h2>Раскрытие откроется после подтверждения распределения</h2></section>`;
  const list = finalOrder().filter(p => f.results[p.id]);
  const allOpen = list.every(p => f.revealed.includes(p.id));
  return `<div class="row" style="margin-bottom:14px"><button class="btn lg pink" data-a="revealNext" ${allOpen?'disabled':''}>Раскрыть следующего</button><button class="btn" data-a="revealAllFinal" ${allOpen?'disabled':''}>Раскрыть всех сразу</button>${isDemo()?'':`<button class="btn ghost" data-a="revealHideAll">Закрыть все карточки</button>`}<span class="spacer"></span>${allOpen&&!isDemo()?`<button class="btn lg green" data-a="finish" ${state.phase==='done'?'disabled':''}>Завершить вечеринку</button>`:''}</div>
  <div class="reveal-grid">${list.map(p => { const n = f.results[p.id], fg = F(p.prize), b = batchOf(n), open = f.revealed.includes(p.id), box = fg && boxOfFig(fg.id);
    return `<div class="rcard ${open?'open':''}" data-a="revealOne" data-id="${p.id}" style="--c:${b.color}"><div class="rcard-in">
      <div class="rface">${avatar(p,64)}<b class="fname">${esc(p.name)}</b><span class="pnum">№${n}</span><span class="small muted">нажмите, чтобы открыть портал</span></div>
      <div class="rface back" style="--c:${esc(fg?fg.color:b.color)}">${open ? `<span class="small muted">${esc(p.name)} · портал №${n}</span>
        ${fg && figFullSrc(fg) ? `<div class="fimgL full"><img src="${figFullSrc(fg)}" alt=""></div>` : `<div class="fimgL">${fg?`<img src="${figSrc(fg)}" alt="">`:''}</div>`}
        <b class="fname">${fg?esc(fg.name):'?'}</b>${box ? `<span class="small">${esc(box.label)} · ${CONDITIONS[box.condition]}${box.notes ? ' · ' + esc(box.notes) : ''}</span>` : ''}` : ''}</div>
    </div></div>`; }).join('')}</div>`;
}
const setRevealed = ids => act(null, () => { state.final.revealed = ids; }, {label:'Раскрытие'});
Object.assign(A, {
  finalTab: d => { ui.finalTab = +d.i; saveUi(); render(); },
  pickBatch: d => pickBatch(d.id, +d.b, false),
  orderMove: d => moveInOrder(d.id, +d.d),
  prefMove: d => movePref(d.id, +d.n, +d.d),
  drawFinal: () => confirmBox('Провести распределение?', 'Будут проведены жеребьёвки «Аномалии» и «Коллапса». Результат сохранится и не изменится при перезагрузке.', 'Провести').then(ok => ok && drawFinal()),
  confirmFinal: () => confirmBox('Подтвердить результаты?', 'Номера порталов закрепятся за участниками. Фигурка определяется по реальному содержимому портала, маскировки игнорируются.', 'Подтвердить').then(ok => ok && confirmFinal()),
  unconfirmFinal: () => confirmBox('Снять подтверждение?', 'Полученные фигурки будут сброшены (жеребьёвки сохранятся).', 'Снять', true).then(ok => ok && unconfirmFinal()),
  revealOne: d => { const r = state.final.revealed; if(!r.includes(d.id)) setRevealed([...r, d.id]); },
  revealNext: () => { const p = finalOrder().find(p => state.final.results[p.id] && !state.final.revealed.includes(p.id)); if(p) A.revealOne({id:p.id}); },
  revealAllFinal: () => setRevealed(finalOrder().filter(p => state.final.results[p.id]).map(p => p.id)),
  revealHideAll: () => setRevealed([]),
  finish: () => act({type:'final', pub:true, text:'Вечеринка завершена. Спасибо, пауки!'}, () => { state.phase = 'done'; }),
});
Object.assign(C, {
  setBatch: (d, el) => pickBatch(d.id, el.value === '' ? null : +el.value, true),
});
