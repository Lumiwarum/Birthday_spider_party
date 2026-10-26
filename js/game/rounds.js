'use strict';
/* Раунды и игры. Награды — за каждую отдельную игру; лимиты «раз в раунд» и защита Киборга
   привязаны к state.roundSerial, который растёт при переходе к следующему раунду. */

// место с учётом ничьих (схема 1-1-3): игрок не может быть выше, чем 1 + число игроков с лучшим местом
function effectivePlace(sel, all){
  const better = all.filter(x => x < sel).length;
  return Math.max(sel, better + 1);
}
const rewardForPlace = eff => PLACE_REWARDS[Math.min(eff, 4) - 1];
function rewardPreview(places){
  const all = Object.values(places).filter(x => x > 0);
  return Object.fromEntries(Object.entries(places).filter(([,x]) => x > 0).map(([pid, x]) => { const eff = effectivePlace(x, all); return [pid, {sel:x, eff, ...rewardForPlace(eff)}]; }));
}

function startParty(){
  act(null, () => {
    if(state.phase !== 'setup') fail('Вечеринка уже идёт');
    const errs = integrity(); if(errs.length) fail('Исправьте ошибки целостности: ' + errs[0]);
    state.home = Object.fromEntries(state.figures.map(f => [f.id, portalOfFig(f.id)]));
    state.phase = 'rounds';
    state.roundIdx = state.rounds.findIndex(r => r.enabled);
    state.roundSerial = 1;
    addLog({type:'round', pub:true, text:`Вечеринка началась! ${state.rounds[state.roundIdx].name}: ${state.rounds[state.roundIdx].title}`});
    addLog({type:'setup', pub:false, text:'Первоначальное расположение зафиксировано', secret:layoutText()});
    addLog({type:'setup', pub:false, text:'Стартовая раздача гостей по порталам', secret:state.players.filter(p => p.startPortal).sort((a,b) => a.startPortal - b.startPortal).map(p => `№${p.startPortal} — ${p.name} (${figName(p.charId)})`).join('; ')});
    announce({kind:'round', title:'Вечеринка началась!', text:`${state.rounds[state.roundIdx].name}: ${state.rounds[state.roundIdx].title}`});
  });
}
function addGame(roundId, name){
  act(null, () => {
    const r = state.rounds.find(x => x.id === roundId);
    if(!name.trim()) fail('Введите название игры');
    if(isFrozen()) fail('Игра завершена');
    r.games.push(newGame(name.trim()));
    addLog({type:'round', pub:true, text:`${r.name}: добавлена игра «${name.trim()}»`});
  });
}
function setGameStatus(gameId, status){
  act(null, () => {
    const {r, g} = findGame(gameId);
    if(g.status === 'done') fail('Награды за игру уже начислены — используйте ручной откат');
    g.status = status;
    addLog({type:'round', pub:true, text:`${r.name}: игра «${g.name}» ${status === 'skipped' ? 'пропущена' : 'возвращена в план'}`});
  });
}
function findGame(gameId){
  for(const r of state.rounds){ const g = r.games.find(x => x.id === gameId); if(g) return {r, g}; }
  fail('Игра не найдена');
}
function awardGame(gameId, places){
  return act(null, () => {
    const {r, g} = findGame(gameId);
    if(state.phase !== 'rounds' || currentRound() !== r) fail('Награды начисляются только за игры текущего раунда');
    if(g.status === 'done') fail('Награды за эту игру уже начислены');
    const prev = rewardPreview(places);
    if(!Object.keys(prev).length) fail('Отметьте места хотя бы для одного участника');
    for(const [pid, x] of Object.entries(prev)){
      const p = P(pid); p.rp += x.rp; p.ep2 += x.ep2;
      addLog({type:'reward', playerId:pid, pub:true, text:`${p.name}: ${x.eff}-е место в «${g.name}» — +${x.rp} RP, +${fmtEP(x.ep2)} EP`});
    }
    g.status = 'done'; g.results = prev;
    addLog({type:'round', pub:true, text:`Итоги «${g.name}» записаны`});
    announce({kind:'reward', title:`Итоги: ${g.name}`, rows:Object.entries(prev).sort((a,b) => a[1].eff - b[1].eff).map(([pid,x]) => ({name:pname(pid), place:x.eff, rp:x.rp, ep:fmtEP(x.ep2)}))});
  });
}
function toggleRound(roundId){
  act(null, () => {
    const i = state.rounds.findIndex(r => r.id === roundId), r = state.rounds[i];
    if(!r.optional) fail('Этот раунд обязательный');
    if(state.phase !== 'setup' && (state.phase !== 'rounds' || i <= state.roundIdx)) fail('Раунд уже начался или прошёл');
    r.enabled = !r.enabled;
    addLog({type:'round', pub:true, text:`${r.name} «${r.title}» ${r.enabled ? 'включён' : 'выключен'}`});
  });
}
const nextEnabledRound = () => { let i = state.roundIdx + 1; while(i < state.rounds.length && !state.rounds[i].enabled) i++; return i < state.rounds.length ? i : -1; };
function nextRound(){
  act(null, () => {
    if(state.phase !== 'rounds') fail('Сейчас не идут раунды');
    if(pendingAction()) fail('Сначала закройте окно реакции');
    const r = currentRound();
    if(r.games.some(g => g.status === 'planned')) fail('Завершите или пропустите все игры текущего раунда');
    const i = nextEnabledRound(), old = state.roundSerial;
    state.roundSerial++;
    if(i >= 0){
      state.roundIdx = i;
      const n = state.rounds[i];
      addLog({type:'round', pub:true, text:`Начался ${n.name}: ${n.title}. Лимиты «раз в раунд» и защита Киборга обновлены`});
      announce({kind:'round', title:`${n.name}: ${n.title}`, text:'Новый раунд — лимиты обновлены'});
    } else {
      state.phase = 'window';
      // по решению ведущего: лимиты сбрасываются, но защита Киборга последнего раунда продолжает действовать
      state.effects.protections.filter(p => p.round === old).forEach(p => { p.round = state.roundSerial; });
      addLog({type:'round', pub:true, text:'Открыто финальное окно способностей и магазина. Лимиты «раз в раунд» обновлены'});
      announce({kind:'round', title:'Финальное окно', text:'Последний шанс использовать способности и магазин'});
    }
  });
}
