'use strict';
/* Жизненный цикл действия: объявление → окно реакции → исполнение или отмена.
   decl = {abilityId, actorId, via:'ep'|'voucher'|'repeat'|'unique', voucherId, instanceId, role, targets}
   Статусы: pending (окно реакции) → done | running (интерактивное) | cancelled | failed */
function checkAbility(ab, t, ctx){
  try { return ab.validate ? ab.validate(t || {}, ctx) : null; }
  catch(e){ if(e instanceof GameError) return e.message; throw e; }
}
const roundCount = (abId, pid) => state.actions.filter(a => a.abilityId === abId && a.round === state.roundSerial && (!pid || a.actor === pid)).length;
function limitError(ab, pid){
  const l = ab.limits || {};
  if(l.perPlayer && roundCount(ab.id, pid) >= l.perPlayer) return `«${ab.name}»: не более ${l.perPlayer} покупки на игрока за раунд`;
  if(l.total && roundCount(ab.id) >= l.total) return `«${ab.name}»: лимит ${l.total} покупок всеми игроками за раунд исчерпан`;
  return null;
}
function phaseError(){
  if(state.phase === 'setup') return 'Игра ещё не началась: начните вечеринку на панели';
  if(isFrozen()) return 'Мультивселенная заморожена: покупки, способности и перемещения запрещены';
  return null;
}
const usesLeft = inst => { const ab = ABILITY[inst.type]; return ab.reaction ? inst.charges : (ab.uses ?? 1) - inst.uses; };

/* «Мэйдэй!»: что может повторить участник пары */
const maydayMember = (inst, role) => role === 'owner' ? inst.owner : inst.data.baby;
const maydaySpent = inst => ['owner','baby'].reduce((s, r) => s + (inst.data.used[r]?.price || 0), 0);
function maydaySources(inst, role){
  const partner = maydayMember(inst, role === 'owner' ? 'baby' : 'owner');
  if(!partner) return [];
  const ids = state.actions.filter(a => a.actor === partner && ['done','running'].includes(a.status) && ABILITY[a.abilityId]?.kind === 'shop' && a.abilityId !== 'glitch').map(a => a.abilityId);
  return [...new Set(ids)];
}

function declCost(decl){ const ab = ABILITY[decl.abilityId]; return decl.via === 'ep' ? ab.price : 0; }
function preflight(decl){
  const e = phaseError(); if(e) return e;
  if(pendingAction()) return 'Сначала закройте текущее окно реакции';
  const ab = ABILITY[decl.abilityId];
  if(!ab || ab.passive || ab.reaction || ab.reactionOnly) return 'Эту способность нельзя объявить отдельно';
  const actor = P(decl.actorId); if(!actor) return 'Выберите игрока';
  if(decl.via === 'ep'){
    if(ab.kind !== 'shop') return 'Это не покупная способность';
    if(actor.ep2 < ab.price) return `Недостаточно EP: нужно ${epText(ab.price)}, у игрока ${epText(actor.ep2)}`;
  } else if(decl.via === 'voucher'){
    const v = state.effects.vouchers.find(x => x.id === decl.voucherId);
    if(!v || v.status !== 'active' || v.owner !== actor.id) return 'Ваучер недоступен';
    if(ab.kind !== 'shop' || ab.price > VOUCHER_MAX2) return `Ваучер покрывает покупную способность до ${epText(VOUCHER_MAX2)}`;
    if(!decl.consent) return `Нужно публичное разрешение держателя ваучера (${pname(v.holder)})`;
  } else if(decl.via === 'repeat'){
    const inst = instance(decl.instanceId);
    if(!inst || inst.type !== 'mayday') return 'Нет пары «Мэйдэй!»';
    if(!inst.data.baby) return 'Сначала назначьте партнёра-«младенца»';
    if(maydayMember(inst, decl.role) !== actor.id) return 'Повтор делает участник пары';
    if(inst.data.used[decl.role]) return 'Этот участник пары уже использовал свой повтор';
    if(!maydaySources(inst, decl.role).includes(ab.id)) return 'Партнёр ещё не использовал эту способность';
    if(maydaySpent(inst) + ab.price > MAYDAY_LIMIT2) return `Превышен общий лимит повторов ${epText(MAYDAY_LIMIT2)}: осталось ${epText(MAYDAY_LIMIT2 - maydaySpent(inst))}`;
  } else if(decl.via === 'unique'){
    const inst = instance(decl.instanceId);
    if(!inst || inst.owner !== actor.id || inst.type !== ab.id) return 'Способность не открыта у этого игрока';
    if(usesLeft(inst) <= 0) return `«${ab.name}» уже использована`;
  } else return 'Неизвестный способ оплаты';
  if(ab.kind === 'shop'){ const l = limitError(ab, actor.id); if(l) return l; }
  return checkAbility(ab, decl.targets, {actor, via:decl.via});
}

function targetsText(ab, t){
  t = t || {};
  return (ab.fields || []).filter(f => !f.show || f.show(t)).map(f => {
    const v = t[f.key];
    switch(f.type){
      case 'figure':    return v ? `${f.label}: ${figName(v)}` : '';
      case 'portal':    return v ? `${f.label}: №${v}` : '';
      case 'portals':   return v ? `${f.label}: №${v.filter(Boolean).join(', №')}` : '';
      case 'batch':     return v !== undefined && v !== '' ? `${f.label}: ${batchName(BATCHES[+v])}` : '';
      case 'batches':   return v && v.length ? `${f.label}: ${v.map(i => BATCHES[+i].name).join(', ')}` : '';
      case 'number':    return `${f.label}: ${v}`;
      case 'direction': return v === 'back' ? 'назад' : 'вперёд';
      case 'player':    return v ? `${f.label}: ${pname(v)}` : '';
      case 'check':     return `${f.label}: ${v ? 'да' : 'нет'}`;
      case 'select':    return (f.options.find(o => o[0] === (v || f.options[0][0])) || [])[1] || '';
      case 'statements':return (v || []).filter(statementComplete).map((s,i) => `${i+1}) ${statementText(s)}`).join(' ');
    }
    return '';
  }).filter(Boolean).join('; ');
}
const viaText = (a) => a.via === 'voucher' ? ` (ваучер ${pname(state.effects.vouchers.find(v => v.id === a.voucherId)?.holder)}, с разрешения держателя)`
  : a.via === 'repeat' ? ' (бесплатный повтор «Мэйдэй!»)' : a.via === 'ep' ? ` за ${epText(a.price)}` : '';

function declare(decl){
  let created = null;
  const ok = act(null, () => {
    const err = preflight(decl); if(err) fail(err);
    const ab = ABILITY[decl.abilityId], actor = P(decl.actorId);
    const a = {id:uid('a'), abilityId:ab.id, actor:actor.id, via:decl.via, price:declCost(decl), voucherId:decl.voucherId || null, instanceId:decl.instanceId || null, role:decl.role || null,
      targets:clone(decl.targets || {}), status:'pending', reactions:[], queue:[], round:state.roundSerial, t:Date.now(), result:null};
    if(decl.via === 'ep') actor.ep2 -= ab.price;
    if(decl.via === 'voucher'){ const v = state.effects.vouchers.find(x => x.id === decl.voucherId); v.status = 'used'; v.abilityId = ab.id; v.actionId = a.id; }
    if(decl.via === 'repeat'){ const inst = instance(decl.instanceId); inst.data.used[decl.role] = {abilityId:ab.id, price:ab.price, actionId:a.id}; }
    if(decl.via === 'unique') instance(decl.instanceId).uses++;
    state.actions.push(a);
    addLog({type:'action', playerId:actor.id, pub:true, text:`${actor.name} объявляет «${ab.name}»${viaText(a)}`, secret: targetsText(ab, a.targets)});
    if(ab.cancelable === false) executeAction(a);
    else { state.pendingId = a.id; announce({kind:'declare', title:`${actor.name}: «${ab.name}»`, text:'Окно реакции открыто'}); }
    created = a;
  });
  if(!ok) return null;
  closeModal();
  if(created.result?.openTab === 'leak') openLeakTab();
  if(created.status === 'pending'){ ui.screen = 'reactions'; saveUi(); render(); }
  else showResult(created.id);
  return created;
}

function executeAction(a){
  const ab = ABILITY[a.abilityId], actor = P(a.actor), ctx = {actor, action:a};
  let r = null, failed = checkAbility(ab, a.targets, ctx);
  if(!failed){
    try { r = ab.execute(a.targets, ctx) || {}; }
    catch(e){ if(!(e instanceof GameError)) throw e; failed = e.message; }
  }
  if(failed){
    a.status = 'failed'; a.result = {failed};
    addLog({type:'action', playerId:actor.id, pub:true, text:`«${ab.name}» (${actor.name}) не выполнено — цель недопустима`, secret:failed});
    return;
  }
  a.status = r.interactive ? 'running' : 'done';
  a.result = {private:r.private || [], host:r.host || '', publicText:r.publicText || '', random:r.random || null, interactive:r.interactive || null, claims:r.claims || null, portals:r.portals || null, anim:r.anim || null};
  addLog({type:r.logType || 'action', playerId:actor.id, pub:true, text:r.publicText || `${actor.name}: «${ab.name}» выполнено`,
    secret:[a.result.private.length ? `Игроку: ${a.result.private.join('; ')}` : '', a.result.host].filter(Boolean).join(' · ')});
  if(r.announce) announce(r.announce);
  if(r.openTab) a.result.openTab = r.openTab;
  if(r.portals) { ui.warp = r.portals; ui.anim = r.anim || 'swap'; }
}

/* ---------- окно реакции ---------- */
function cancelAction(a, reason){
  const ab = ABILITY[a.abilityId];
  a.status = 'cancelled'; a.cancelReason = reason; state.pendingId = null;
  const paid = a.via === 'ep' ? ` (оплата ${epText(a.price)} от ${pname(a.actor)} не возвращается)` : a.via === 'voucher' ? ' (ваучер израсходован)' : a.via === 'repeat' ? ' (повтор израсходован)' : '';
  addLog({type:'reaction', playerId:a.actor, pub:true, text:`«${ab.name}» игрока ${pname(a.actor)} отменено: ${reason}${paid}`});
  announce({kind:'cancel', title:'Действие отменено!', text:`«${ab.name}» — ${reason}`});
}
function glitchError(a, reactorId, voucherId){
  const ab = a && ABILITY[a.abilityId], r = P(reactorId);
  if(!a || a.status !== 'pending') return 'Окно реакции уже закрыто';
  if(ab.kind !== 'shop') return '«Сбой канона» отменяет только покупные способности';
  if(!r) return 'Выберите игрока';
  if(r.id === a.actor) return 'Нельзя отменить собственное действие';
  if(voucherId){
    const v = state.effects.vouchers.find(x => x.id === voucherId);
    if(!v || v.status !== 'active' || v.owner !== r.id) return 'Ваучер недоступен';
  } else if(r.ep2 < ABILITY.glitch.price) return `Недостаточно EP: нужно ${epText(ABILITY.glitch.price)}, у ${r.name} ${epText(r.ep2)}`;
  return null;
}
function reactGlitch(actionId, reactorId, voucherId){
  return act(null, () => {
    const a = state.actions.find(x => x.id === actionId);
    const err = glitchError(a, reactorId, voucherId); if(err) fail(err);
    const r = P(reactorId);
    if(voucherId){ const v = state.effects.vouchers.find(x => x.id === voucherId); v.status = 'used'; v.abilityId = 'glitch'; v.actionId = a.id; }
    else r.ep2 -= ABILITY.glitch.price;
    a.reactions.push({type:'glitch', by:r.id, pay:voucherId ? 'voucher' : 'ep', ok:true, t:Date.now()});
    a.queue = a.queue.filter(x => x !== r.id);
    state.actions.push({id:uid('a'), abilityId:'glitch', actor:r.id, via:voucherId ? 'voucher' : 'ep', price:voucherId ? 0 : ABILITY.glitch.price, voucherId:voucherId || null,
      targets:{action:a.id}, status:'done', reactions:[], queue:[], round:state.roundSerial, t:Date.now(), result:null});
    cancelAction(a, `«Сбой канона» от ${r.name} (${voucherId ? `по ваучеру ${pname(state.effects.vouchers.find(x => x.id === voucherId).holder)} с разрешения держателя` : '−' + epText(ABILITY.glitch.price)}, не возвращаются)`);
  });
}
function duelError(a, inst){
  if(!a || a.status !== 'pending') return 'Окно реакции уже закрыто';
  if(!inst || inst.type !== 'duel') return 'Нет способности «Дуэлянт»';
  if(inst.owner === a.actor) return 'Нельзя вызвать на дуэль самого себя';
  if(inst.charges <= 0) return 'Заряды «Дуэлянта» закончились';
  if(ABILITY[a.abilityId].cancelable === false) return 'Это действие нельзя отменить';
  return null;
}
function reactDuel(actionId, instId, won){
  return act(null, () => {
    const a = state.actions.find(x => x.id === actionId), inst = instance(instId);
    const err = duelError(a, inst); if(err) fail(err);
    inst.charges--;
    const by = P(inst.owner);
    a.reactions.push({type:'duel', by:by.id, ok:won, t:Date.now()});
    a.queue = a.queue.filter(x => x !== by.id);
    if(won) cancelAction(a, `${by.name} побеждает в дуэли (заряд израсходован, осталось ${inst.charges})`);
    else addLog({type:'reaction', playerId:by.id, pub:true, text:`${by.name} проигрывает дуэль ${pname(a.actor)} — «${ABILITY[a.abilityId].name}» продолжается (заряд израсходован, осталось ${inst.charges})`});
  });
}
function closeReactions(actionId){
  let a = null;
  const ok = act(null, () => {
    a = state.actions.find(x => x.id === actionId);
    if(!a || a.status !== 'pending') fail('Окно реакции уже закрыто');
    state.pendingId = null;
    executeAction(a);
  });
  if(ok) showResult(a.id);
}
// ручная корректировка ведущего (не игровая отмена): можно вернуть оплату
function hostCancel(actionId, refund){
  return act(null, () => {
    const a = state.actions.find(x => x.id === actionId);
    if(!a || a.status !== 'pending') fail('Окно реакции уже закрыто');
    if(refund){
      if(a.via === 'ep') P(a.actor).ep2 += a.price;
      if(a.via === 'voucher'){ const v = state.effects.vouchers.find(x => x.id === a.voucherId); if(v){ v.status = 'active'; delete v.abilityId; delete v.actionId; } }
      if(a.via === 'repeat'){ const inst = instance(a.instanceId); if(inst) inst.data.used[a.role] = null; }
      if(a.via === 'unique'){ const inst = instance(a.instanceId); if(inst) inst.uses--; }
    }
    a.status = 'cancelled'; a.cancelReason = 'решение ведущего'; state.pendingId = null;
    addLog({type:'setup', playerId:a.actor, pub:false, text:`Ведущий снял «${ABILITY[a.abilityId].name}» игрока ${pname(a.actor)}${refund ? ' с возвратом оплаты' : ''}`});
  });
}

/* ---------- «Азартный игрок» ---------- */
function gamblerClaim(actionId, portal, fig){
  let ok = null;
  act(null, () => {
    const a = state.actions.find(x => x.id === actionId);
    if(!a || a.status !== 'running') fail('Серия уже завершена');
    if(!portal || !fig) fail('Выберите портал и фигурку');
    ok = figAt(+portal).id === fig; // реальность, маскировки игнорируются
    a.result.claims.push({portal:+portal, fig, ok});
    if(!ok) a.status = 'done';
    addLog({type:'info', playerId:a.actor, pub:false, text:`${pname(a.actor)}: «Азартный игрок», утверждение ${a.result.claims.length} — ${ok ? 'верно' : 'неверно, серия завершена'}`, secret:`№${portal} — ${figName(fig)}`});
  });
  return ok;
}
function gamblerStop(actionId){
  act(null, () => {
    const a = state.actions.find(x => x.id === actionId);
    if(!a || a.status !== 'running') fail('Серия уже завершена');
    a.status = 'done';
    addLog({type:'info', playerId:a.actor, pub:false, text:`${pname(a.actor)}: «Азартный игрок» — серия завершена добровольно (${a.result.claims.filter(c=>c.ok).length} верных)`});
  });
}
