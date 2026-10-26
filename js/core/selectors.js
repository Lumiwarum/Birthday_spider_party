'use strict';
/* ---------- selectors ---------- */
const isDemo = () => ui.mode === 'demo';
const P = id => state.players.find(p => p.id === id);
const F = id => state.figures.find(f => f.id === id);
const B = id => state.boxes.find(b => b.id === id);
const Q = id => state.quests.find(q => q.id === id);
const boxOfFig = fid => state.boxes.find(b => b.figureId === fid);
const portalOfBox = bid => state.portals.indexOf(bid) + 1;
// реальное содержимое и расположение (без маскировок)
const figAt = n => { const b = B(state.portals[n-1]); return b ? F(b.figureId) : null; };
const portalOfFig = fid => { const b = boxOfFig(fid); return b ? portalOfBox(b.id) : 0; };
const homeOf = fid => state.home ? state.home[fid] : portalOfFig(fid);
const figName = fid => F(fid)?.name || '?';
const pname = id => P(id)?.name || '?';

function ranking(){
  const order = state.players.map((p,i) => ({p,i})).sort((a,b) => b.p.rp - a.p.rp || a.i - b.i).map(x => x.p);
  let place = 0, prev = null;
  return order.map((p,i) => { if(p.rp !== prev){ place = i+1; prev = p.rp; } return {p, place}; });
}

/* персонажи, квесты, способности */
const charOf = p => p && p.charId ? F(p.charId) : null;
const questsOf = pid => state.quests.filter(q => q.holder === pid);
const openQuestOf = pid => questsOf(pid).find(q => q.status === 'open');
const instancesOf = pid => state.abilities.filter(a => a.owner === pid);
const instance = id => state.abilities.find(a => a.id === id);
const playerByChar = fid => state.players.find(p => p.charId === fid);
const vouchersOf = pid => state.effects.vouchers.filter(v => v.owner === pid);   // ваучеры, которые может применить Сан-Спайдер
const vouchersHeldBy = pid => state.effects.vouchers.filter(v => v.holder === pid);

/* фазы */
const canPlay = () => state.phase === 'rounds' || state.phase === 'window';
const isFrozen = () => state.phase === 'frozen' || state.phase === 'done';
const currentRound = () => state.phase === 'rounds' ? state.rounds[state.roundIdx] : null;
function roundLabel(){
  if(state.phase === 'rounds'){ const r = currentRound(); return `${r.name}: ${r.title}`; }
  return PHASES[state.phase];
}

/* защита Киборга действует до конца раунда, в котором поставлена (переносится в финальное окно) */
const protectionAt = n => state.effects.protections.find(p => p.portal === n && p.round === state.roundSerial);
const isProtected = n => !!protectionAt(n);
const freePortals = list => list.filter(n => !isProtected(n));
const pendingAction = () => state.pendingId ? state.actions.find(a => a.id === state.pendingId) : null;

function integrity(){
  const errs = [], ids = state.boxes.map(b=>b.id);
  if(state.portals.length !== PORTALS) errs.push('Порталов не ' + PORTALS);
  if(new Set(state.portals).size !== state.portals.length) errs.push('Одна коробка стоит в нескольких порталах');
  state.portals.forEach((b,i) => { if(!ids.includes(b)) errs.push('Портал №'+(i+1)+': неизвестная коробка'); });
  const figs = state.boxes.map(b=>b.figureId);
  if(new Set(figs).size !== figs.length) errs.push('Одна фигурка привязана к нескольким коробкам');
  state.figures.forEach(f => { if(!figs.includes(f.id)) errs.push('Фигурка без коробки: ' + f.name); });
  const chars = state.players.map(p => p.charId).filter(Boolean);
  if(new Set(chars).size !== chars.length) errs.push('Один персонаж назначен нескольким участникам');
  state.players.forEach(p => { if(!Number.isInteger(p.ep2)) errs.push(p.name + ': некорректный баланс EP'); });
  state.quests.forEach(q => { if(!P(q.holder)) errs.push('Квест без владельца: ' + figName(q.origin)); });
  const res = Object.values(state.final.results || {});
  if(new Set(res).size !== res.length) errs.push('Финал: один портал назначен нескольким игрокам');
  return errs;
}
