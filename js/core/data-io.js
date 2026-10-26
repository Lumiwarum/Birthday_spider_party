'use strict';
/* Экспорт, импорт и сброс игры */
Object.assign(A, {

  export: () => {
    const data = JSON.stringify({...state, exportedAt: new Date().toISOString()}, null, 1);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], {type:'application/json'}));
    a.download = 'spiderverse-party-' + new Date().toISOString().slice(0,16).replace(/[:T]/g,'-') + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Резервная копия сохранена (вместе с изображениями)', 'var(--green)');
  },
  import: () => { $('#fileJson').value = ''; $('#fileJson').click(); },
  reset: () => {
    openModal(`<h2 style="color:var(--red)">Сброс игры</h2><div class="warnbig">Рекомендуется сначала сделать экспорт в JSON.</div>
      <p><b>Сбросить прогресс</b> — вернуться к подготовке: RP 0, EP 2, квесты, способности, эффекты, финал и журнал обнуляются. Участники, персонажи, игры, фигурки, коробки, раскладка и фото сохранятся.</p>
      <p><b>Сбросить всё</b> — вернуть демонстрационные данные (11 игроков, 11 фигурок). Загруженные изображения будут удалены.</p>
      <div class="foot"><button class="btn ghost" data-a="closeModal">Отмена</button><button class="btn yellow" data-a="resetProgress">Сбросить прогресс</button><button class="btn red" data-a="resetAll">Сбросить всё</button></div>`, 'danger');
  },
  resetProgress: () => { closeModal(); act({type:'setup', text:'Прогресс игры сброшен'}, () => {
    const keep = {players:state.players, figures:state.figures, boxes:state.boxes, portals:state.portals, rounds:state.rounds, settings:state.settings};
    const n = freshState();
    Object.assign(n, keep, {media:state.media});
    n.players.forEach(p => Object.assign(p, {rp:START.rp, ep2:START.ep2, batch:null, prefs:null, prize:null}));
    n.rounds.forEach(r => r.games.forEach(g => { g.status = 'planned'; g.results = null; }));
    n.quests = n.players.filter(p => p.charId).map(p => newQuest(p.charId, p.id));
    n.log = [];
    state = n;
  }); toast('Прогресс сброшен', 'var(--yellow)'); },
  resetAll: () => { closeModal(); state = freshState(); undoStack = []; ui.revealed = []; ui.sel = []; save(); render(); toast('Игра сброшена к демо-данным', 'var(--yellow)'); }
});

$('#fileJson').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    let data;
    try { data = JSON.parse(fr.result); } catch(err){ return toast('Файл не является корректным JSON', 'var(--red)'); }
    if(data.app !== 'spiderverse-party' || !Array.isArray(data.players) || !Array.isArray(data.portals)) return toast('Это не файл игры «Паучья мультивселенная»', 'var(--red)');
    confirmBox('Импортировать игру?', `Текущее состояние будет заменено данными из файла (игроков: ${data.players.length}, событий: ${(data.log||[]).length}).`, 'Импортировать', true).then(ok => {
      if(!ok) return;
      delete data.exportedAt; state = migrate(data); delete state.migratedFrom; normalize(state); undoStack = []; ui.revealed = []; ui.sel = [];
      save(); render();
      const errs = integrity(); toast(errs.length ? 'Импортировано, но есть проблемы: ' + errs[0] : 'Игра импортирована', errs.length?'var(--red)':'var(--green)');
    });
  };
  fr.readAsText(file);
});
