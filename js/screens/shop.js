'use strict';
/* ---------- 4. Магазин ---------- */
function limitText(a){
  const l = a.limits || {}, parts = [];
  if(l.perPlayer) parts.push(`одна покупка на игрока за раунд` + (state.phase !== 'setup' ? '' : ''));
  if(l.total) parts.push(`не более ${l.total} покупок всеми за раунд (сейчас ${roundCount(a.id)})`);
  if(a.reactionOnly) parts.push('только в окне реакции');
  return parts.join('; ') || 'нет';
}
function viewShop(){
  const host = !isDemo(), err = phaseError();
  return `
  <div class="screen-h"><div>${kicker('Магазин','yellow')}<h1>Магазин способностей</h1><div class="sub">EP списываются при объявлении. Затем открывается окно реакции; при отмене EP не возвращаются. Эффект выполняется только после закрытия окна.</div></div></div>
  ${err && host ? `<div class="warnbig" style="margin-bottom:16px">${esc(err)}</div>` : ''}
  ${SHOP_CATEGORIES.map(c => `<section class="cat" style="--c:${c.color}"><div class="cat-h"><span class="ic">${ICONS[c.icon]}</span><h2>${c.name}</h2></div>
    <div class="acards">${SHOP.filter(a => a.cat === c.id).map(a => abilityCard(ABILITY[a.id], c, host && !err)).join('')}</div></section>`).join('')}`;
}
function abilityCard(a, c, can){
  return `<div class="acard" style="--c:${c.color}">
    <div class="row"><span class="aic">${ICONS[a.icon]||ICONS.star}</span><div><b>${esc(a.name)}</b><div class="small muted">${c.name}</div></div></div>
    <div class="small">${esc(a.desc)}</div>
    <div class="lim">Ограничения: ${esc(limitText(a))}</div>
    <div class="row"><span class="price">${fmtEP(a.price)} EP</span><span class="spacer"></span>
      ${can && !a.reactionOnly ? `<button class="btn sm yellow" data-a="buy" data-id="${a.id}">Купить</button>` : a.reactionOnly ? '<span class="chip">в окне реакции</span>' : ''}</div>
  </div>`;
}
Object.assign(A, {
  buy: d => openActionForm({abilityId:d.id, via:'ep', actorId:''}),
});
