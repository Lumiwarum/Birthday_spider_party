'use strict';
/* Публичные объявления для гостей. Показываются один раз поверх экрана демонстрации (окно гостей
   или это же окно в режиме демонстрации). Кнопка «Показать гостям» повторно отправляет последнее объявление. */
// показываем только объявления новее последнего увиденного: после ручного отката список «старее» — ничего не всплывает
let annQueue = [], annShowing = null, annSeenT = 0, guestWin = null;
function initAnnouncements(){ annSeenT = Math.max(Date.now(), ...state.announcements.map(a => a.t)); }
function pullAnnouncements(){
  const fresh = state.announcements.filter(a => a.t > annSeenT);
  if(!fresh.length) return;
  annSeenT = Math.max(...fresh.map(a => a.t));
  if(isDemo()) fresh.forEach(showAnnouncement);
}
function showAnnouncement(a){
  if(annShowing){ annQueue.push(a); return; }
  annShowing = a;
  const el = document.createElement('div');
  el.className = 'ann-bg'; el.id = 'ann';
  el.innerHTML = `<div class="ann ann-${a.kind}">${annBody(a)}<div class="ann-hint">нажмите, чтобы закрыть</div></div>`;
  el.addEventListener('click', hideAnnouncement);
  document.body.appendChild(el);
  if(a.portals && a.anim){ ui.warp = a.portals; ui.anim = a.anim; if(ui.screen === 'portals') render(); }
  if(a.kind !== 'leak' && a.kind !== 'reward') el._t = setTimeout(hideAnnouncement, state.settings.reduceMotion ? 6000 : 8000);
}
function hideAnnouncement(){
  const el = $('#ann'); if(el){ clearTimeout(el._t); el.remove(); }
  annShowing = null;
  if(annQueue.length) showAnnouncement(annQueue.shift());
}
function miniBoard(a){
  const hit = new Set(a.portals || []);
  return `<div class="mini">${ALL_PORTALS.map(n => `<span class="mp ${hit.has(n) ? 'hit anim-' + (a.anim || 'swap') : ''}" style="--c:${batchOf(n).color}">${n}</span>`).join('')}</div>`;
}
function annBody(a){
  const head = (k, c) => kicker(k, c);
  switch(a.kind){
    case 'declare': return `${head('Объявлено действие','yellow')}<h1>${esc(a.title)}</h1><p>${esc(a.text)}</p><div class="ann-timer"></div>`;
    case 'cancel':  return `<div class="stamp-x">ОТМЕНЕНО</div><h1>${esc(a.title)}</h1><p>${esc(a.text)}</p>`;
    case 'move':    return `${head('Перемещение','pink')}<h1>${esc(a.title)}</h1><p>${esc(a.text)}</p>${miniBoard(a)}`;
    case 'expose':  return `${head('Публичное разоблачение · один раз','red')}<div class="ann-num">${esc(a.title)}</div><h1 class="glitch" data-text="${esc(a.text)}">${esc(a.text)}</h1><p class="small">Запомните — больше это не покажут.</p>`;
    case 'reward':  return `${head('Итоги игры','pink')}<h1>${esc(a.title)}</h1><table class="t"><tbody>${a.rows.map(r => `<tr><td><b>${r.place}</b></td><td>${esc(r.name)}</td><td style="color:var(--pink)">+${r.rp} RP</td><td style="color:var(--blue)">+${esc(r.ep)} EP</td></tr>`).join('')}</tbody></table>`;
    default:        return `${head(a.kind === 'round' ? 'Раунд' : a.kind === 'final' ? 'Финал' : 'Событие', a.kind === 'final' ? 'violet' : 'green')}<h1>${esc(a.title)}</h1><p>${esc(a.text || '')}</p>${a.portals ? miniBoard(a) : ''}`;
  }
}
Object.assign(A, {
  annLast: () => {
    const l = state.announcements; if(!l.length) return toast('Объявлений пока нет');
    // копия с новым временем: окно гостей получит её через localStorage и покажет поверх экрана
    state.announcements.push({...l[l.length-1], id:uid('an'), t:Date.now()});
    save();
    if(isDemo()) pullAnnouncements();
    else toast(guestWin && !guestWin.closed ? 'Объявление отправлено на экран гостей' : 'Отправлено. Если экран гостей не открыт — «Данные» → «Открыть экран гостей»', 'var(--green)');
  },
});
