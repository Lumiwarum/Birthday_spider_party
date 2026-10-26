'use strict';
/* Финал: заморозка → выбор батчей по RP → тайные предпочтения → распределение по правилам батча.
   Все жеребьёвки проводятся один раз и сохраняются в state.final. */
const anomalyWeight = p => Math.pow(p.rp + 3, 3); // вес жеребьёвки «Аномалии»

function freeze(){
  act(null, () => {
    if(state.phase !== 'window') fail('Заморозка доступна после открытия финального окна');
    if(pendingAction()) fail('Сначала закройте окно реакции');
    state.actions.filter(a => a.status === 'running').forEach(a => { a.status = 'done'; });
    state.effects.vouchers.filter(v => v.status === 'active').forEach(v => { v.status = 'expired'; });
    state.phase = 'frozen';
    // публичная жеребьёвка при равенстве RP — фиксируется сразу
    const tb = Object.fromEntries(state.players.map(p => [p.id, Math.random()]));
    state.final.tiebreak = tb;
    state.final.order = state.players.slice().sort((a,b) => b.rp - a.rp || tb[a.id] - tb[b.id]).map(p => p.id);
    addLog({type:'final', pub:true, text:'Мультивселенная заморожена: покупки, способности и перемещения больше невозможны'});
    const groups = {};
    state.players.forEach(p => (groups[p.rp] ||= []).push(p));
    Object.entries(groups).filter(([,g]) => g.length > 1).forEach(([rp, g]) => {
      const sorted = g.slice().sort((a,b) => tb[a.id] - tb[b.id]);
      addLog({type:'final', pub:true, text:`Жеребьёвка при равенстве ${rp} RP: ${sorted.map(p => p.name).join(' → ')}`});
    });
    addLog({type:'setup', pub:false, text:'Расположение на момент заморозки', secret:layoutText()});
    announce({kind:'final', title:'Мультивселенная заморожена', text:'Порядок выбора батчей: ' + state.final.order.map(pname).join(', ')});
  });
}
const finalOrder = () => state.final.order.length ? state.final.order.map(P).filter(Boolean) : state.players.slice().sort((a,b) => b.rp - a.rp);
const batchCount = id => state.players.filter(p => p.batch === id).length;
function finalEditable(){
  if(state.phase !== 'frozen') fail('Сначала заморозьте мультивселенную');
  if(state.final.draw) fail('Распределение уже проведено — используйте ручной откат');
}
function pickBatch(pid, bid, manual){
  act(null, () => {
    finalEditable();
    const p = P(pid), b = bid === null ? null : BATCHES[bid];
    if(b && p.batch !== b.id && batchCount(b.id) >= b.cap) fail(`${batchName(b)} заполнен`);
    p.batch = b ? b.id : null; p.prefs = null;
    addLog({type:'batch', playerId:pid, pub:true, text: b ? `${p.name} выбирает ${batchName(b)}${manual ? ' (корректировка ведущего)' : ''}` : `${p.name}: батч снят ведущим`});
  });
}
function moveInOrder(pid, d){
  act(null, () => {
    finalEditable();
    const o = state.final.order, i = o.indexOf(pid), j = i + d;
    if(i < 0 || j < 0 || j >= o.length) fail('Нельзя сдвинуть');
    [o[i], o[j]] = [o[j], o[i]];
    addLog({type:'batch', pub:true, text:`Ведущий скорректировал порядок выбора: ${pname(pid)} → позиция ${j+1}`});
  });
}
function prefsOf(p){
  const b = BATCHES[p.batch]; if(!b || b.mode === 'random') return [];
  const pr = (p.prefs || []).filter(n => b.portals.includes(n));
  return [...pr, ...b.portals.filter(n => !pr.includes(n))];
}
function movePref(pid, n, d){
  const p = P(pid), pr = prefsOf(p), i = pr.indexOf(n), j = i + d;
  if(j < 0 || j >= pr.length) return;
  act(null, () => { finalEditable(); [pr[i], pr[j]] = [pr[j], pr[i]]; p.prefs = pr; }, {label:`Предпочтения: ${p.name}`});
}

function drawFinal(){
  return act(null, () => {
    finalEditable();
    const order = finalOrder(), res = {}, draw = {b0:[], b1:[], b2:[]};
    // I «Канон»: строго по порядку RP
    const taken0 = new Set();
    for(const p of order.filter(p => p.batch === 0)){
      const pr = prefsOf(p), n = pr.find(x => !taken0.has(x));
      taken0.add(n); res[p.id] = n; draw.b0.push({pid:p.id, n, choice:pr.indexOf(n)+1});
    }
    // II «Аномалия»: последовательная взвешенная жеребьёвка, вес (RP+3)³
    let rest = order.filter(p => p.batch === 1);
    const taken1 = new Set();
    while(rest.length){
      const w = rest.map(anomalyWeight), tot = w.reduce((s,x) => s+x, 0);
      let x = Math.random() * tot, k = 0;
      while(k < w.length - 1 && x >= w[k]){ x -= w[k]; k++; }
      const p = rest[k], pr = prefsOf(p), n = pr.find(v => !taken1.has(v));
      taken1.add(n); res[p.id] = n;
      draw.b1.push({pid:p.id, n, choice:pr.indexOf(n)+1, probs:rest.map((q,i) => [q.id, w[i]/tot])});
      rest = rest.filter(q => q !== p);
    }
    // III «Коллапс»: равновероятная перестановка
    const b2 = order.filter(p => p.batch === 2), perm = shuffle(BATCHES[2].portals);
    b2.forEach((p, i) => { res[p.id] = perm[i]; draw.b2.push({pid:p.id, n:perm[i]}); });
    if(new Set(Object.values(res)).size !== Object.keys(res).length) fail('Внутренняя ошибка: номер назначен дважды');
    state.final.draw = draw; state.final.results = res;
    addLog({type:'final', pub:false, text:'Проведено распределение по батчам (ожидает подтверждения)', secret:Object.entries(res).map(([pid,n]) => `${pname(pid)} → №${n} (${figAt(n).name})`).join('; ')});
  });
}
function confirmFinal(){
  act(null, () => {
    const f = state.final;
    if(!f.draw) fail('Сначала проведите распределение');
    if(f.confirmed) fail('Уже подтверждено');
    f.confirmed = true; f.revealed = [];
    state.players.forEach(p => { const n = f.results[p.id]; p.prize = n ? figAt(n).id : null; }); // реальные данные, без маскировок
    addLog({type:'final', pub:true, text:'Финальное распределение подтверждено: ' + finalOrder().filter(p => f.results[p.id]).map(p => `${p.name} → №${f.results[p.id]}`).join(', ')});
    announce({kind:'final', title:'Распределение подтверждено', text:'Начинаем раскрытие!'});
  });
}
function unconfirmFinal(){
  act(null, () => {
    const f = state.final;
    f.confirmed = false; f.revealed = []; state.players.forEach(p => { p.prize = null; });
    addLog({type:'final', pub:true, text:'Подтверждение распределения снято ведущим'});
  });
}
