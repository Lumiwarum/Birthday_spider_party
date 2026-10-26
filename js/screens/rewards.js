'use strict';
/* ---------- 7. Награды: раунды, игры, результаты ---------- */
const GAME_STATUS = {planned:['в плане','yellow'], done:['итоги записаны','green'], skipped:['пропущена','']};
function viewRewards(){
  const host = !isDemo();
  return `<div class="screen-h"><div>${kicker('Награды','pink')}<h1>Раунды и игры</h1><div class="sub">Награды — за каждую отдельную игру: 1-е место 5 RP / 1,5 EP · 2-е 3 / 2 · 3-е 2 / 2,5 · остальные 1 / 3. При ничьей оба получают высшее место, следующее место пропускается (1-1-3).</div></div></div>
  ${state.rounds.map((r, i) => {
    const cur = state.phase === 'rounds' && state.roundIdx === i;
    const past = state.phase !== 'setup' && (state.phase !== 'rounds' || i < state.roundIdx);
    return `<section class="panel round ${cur ? 'cur' : ''} ${r.enabled ? '' : 'off'}" style="margin-bottom:16px">
      <h2>${esc(r.name)}: ${esc(r.title)} ${cur ? chip('идёт сейчас','red') : past && r.enabled ? chip('завершён','') : !r.enabled ? chip('выключен','') : chip('впереди','blue')}
        <span class="spacer"></span>${host && r.optional ? `<button class="btn sm ghost" data-a="toggleRound" data-id="${r.id}">${r.enabled ? 'Выключить раунд' : 'Включить раунд'}</button>` : ''}</h2>
      ${r.enabled ? `<table class="t"><tbody>${r.games.map(g => { const [t,c] = GAME_STATUS[g.status]; return `<tr><td><b>${esc(g.name)}</b></td><td>${chip(t,c)}</td>
        <td class="small muted">${g.results ? Object.entries(g.results).sort((a,b)=>a[1].eff-b[1].eff).slice(0,3).map(([pid,x]) => `${x.eff}. ${esc(pname(pid))}`).join(' · ') : ''}</td>
        <td style="text-align:right">${host && cur && g.status === 'planned' ? `<button class="btn sm pink" data-a="awardOpen" data-id="${g.id}">Записать итоги</button> <button class="btn sm ghost" data-a="gameSkip" data-id="${g.id}">Пропустить</button>` : ''}
          ${host && cur && g.status === 'skipped' ? `<button class="btn sm ghost" data-a="gameUnskip" data-id="${g.id}">Вернуть</button>` : ''}</td></tr>`; }).join('')}</tbody></table>
      ${host && !isFrozen() && (cur || state.phase === 'setup' || !past) ? `<div class="row" style="margin-top:10px"><input type="text" id="ng-${r.id}" placeholder="Название новой игры" style="max-width:280px"><button class="btn sm" data-a="gameAdd" data-id="${r.id}">+ Добавить игру</button></div>` : ''}` : ''}
    </section>`;
  }).join('')}`;
}
let awardDraft = null;
function awardModal(){
  const {gameId, places} = awardDraft, {g} = findGame(gameId);
  const prev = rewardPreview(places);
  const opts = [[0,'не участвовал'],[1,'1-е'],[2,'2-е'],[3,'3-е'],[4,'остальные']];
  openModal(`<h2>Итоги: ${esc(g.name)}</h2><p class="muted small">Отметьте места. Ничьи — одинаковое место у нескольких участников; места ниже сдвинутся автоматически.</p>
    <table class="t"><thead><tr><th>Участник</th><th>Место</th><th>Итог</th><th>RP</th><th>EP</th></tr></thead><tbody>
    ${state.players.map(p => { const x = prev[p.id]; return `<tr><td><span class="row">${avatar(p,26)} ${esc(p.name)}</span></td>
      <td><div class="seg">${opts.map(([v,t]) => `<button class="${(places[p.id]||0)===v?'on':''}" data-a="awardSet" data-p="${p.id}" data-v="${v}">${t}</button>`).join('')}</div></td>
      <td>${x ? (x.eff !== x.sel ? `<b style="color:var(--yellow)">${x.eff}-е</b>` : `${x.eff}-е`) : '—'}</td><td>${x ? '+' + x.rp : ''}</td><td>${x ? '+' + fmtEP(x.ep2) : ''}</td></tr>`; }).join('')}
    </tbody></table>
    <div class="foot"><button class="btn ghost" data-a="awardAllOther">Всем «остальные»</button><span class="spacer"></span><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn pink lg" data-a="awardGo">Начислить одной операцией</button></div>`, 'wide');
}
Object.assign(A, {
  toggleRound: d => toggleRound(d.id),
  gameAdd: d => addGame(d.id, $('#ng-' + d.id).value),
  gameSkip: d => setGameStatus(d.id, 'skipped'),
  gameUnskip: d => setGameStatus(d.id, 'planned'),
  awardOpen: d => { awardDraft = {gameId:d.id, places:{}}; awardModal(); },
  awardSet: d => { awardDraft.places[d.p] = +d.v; awardModal(); },
  awardAllOther: () => { state.players.forEach(p => { if(!awardDraft.places[p.id]) awardDraft.places[p.id] = 4; }); awardModal(); },
  awardGo: () => { if(awardGame(awardDraft.gameId, awardDraft.places)) closeModal(); },
});
