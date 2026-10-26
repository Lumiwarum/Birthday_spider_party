'use strict';
/* ---------- 10. Настройки и данные ---------- */
function viewData(){
  const errs = integrity();
  let size = 0; try { size = (localStorage.getItem(LS.state) || '').length; } catch(e){}
  return `<div class="screen-h"><div>${kicker('Только ведущий','violet')}<h1>Настройки и данные</h1><div class="sub">Схема данных v${state.schema}. Всё сохраняется автоматически в этом браузере (${Math.round(size/1024)} КБ).</div></div></div>
  <div class="grid g2">
    <section class="panel"><h2>Экран для гостей</h2>
      <p class="muted small">Откройте второе окно на телевизоре или проекторе: оно всегда в режиме демонстрации, обновляется само и показывает публичные объявления и анимации.</p>
      <button class="btn lg green" data-a="openGuest">Открыть экран гостей</button>
      <label class="check" style="margin-top:14px;display:flex"><input type="checkbox" data-c="reduceMotion" ${state.settings.reduceMotion ? 'checked' : ''}> Уменьшить анимации</label>
    </section>
    <section class="panel"><h2>Проверка состояния</h2>
      ${errs.length ? `<div class="warnbig">${errs.map(esc).join('<br>')}</div>` : '<p style="color:var(--green)"><b>✓ Все 11 порталов содержат 11 уникальных фигурок; балансы и связи корректны.</b></p>'}
      <p class="small muted">Фаза: ${esc(PHASES[state.phase])} · раунд-счётчик лимитов: ${state.roundSerial} · действий: ${state.actions.length} · событий: ${state.log.length}</p>
    </section>
    <section class="panel"><h2>Резервная копия</h2>
      <p class="muted small">JSON включает всё состояние, журнал, результаты жеребьёвок и изображения.</p>
      <div class="row"><button class="btn green" data-a="export">${ICONS.download.replace('<svg','<svg width="16" height="16"')} Экспорт JSON</button><button class="btn" data-a="import">${ICONS.upload.replace('<svg','<svg width="16" height="16"')} Импорт JSON</button></div>
    </section>
    <section class="panel"><h2>Сброс</h2>
      <p class="muted small">Перед сбросом сделайте экспорт.</p><button class="btn red" data-a="reset">${ICONS.reset.replace('<svg','<svg width="16" height="16"')} Сброс игры…</button>
    </section>
  </div>`;
}
Object.assign(A, {
  openGuest: () => { guestWin = window.open(location.pathname + location.search + '#guest', 'sv-guest'); if(!guestWin) toast('Браузер заблокировал окно — разрешите всплывающие окна', 'var(--red)'); },
});
Object.assign(C, {
  reduceMotion: (d, el) => act({type:'setup', pub:false, text:`Уменьшение анимаций: ${el.checked ? 'вкл' : 'выкл'}`}, () => { state.settings.reduceMotion = el.checked; }),
});
