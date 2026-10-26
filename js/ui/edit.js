'use strict';
/* Общий обработчик редактирования полей фигурок, коробок и игроков */
const FIELD_NAMES = {name:'имя', nameEn:'англ. имя', desc:'описание', quest:'квест', label:'метка', condition:'упаковка', recognizable:'узнаваемость', notes:'заметки', color:'цвет', hint:'подсказка'};
Object.assign(C, {
  edit: (d, el) => {
    const o = d.kind==='figure'?F(d.id):d.kind==='box'?B(d.id):P(d.id); if(!o) return;
    const v = el.type==='checkbox' ? el.checked : el.value;
    if(o[d.field] === v) return;
    const who = o.name || o.label;
    const type = d.kind==='player' && d.field==='quest' ? 'quest' : 'setup';
    let text = `${who}: изменено поле «${FIELD_NAMES[d.field]||d.field}»`;
    if(d.field==='condition') text = `${o.label}: упаковка — ${CONDITIONS[v]}`;
    if(d.field==='recognizable') text = `${o.label}: ${v?'отмечена как узнаваемая':'снята отметка узнаваемости'}`;
    act({type, text, playerId: d.kind==='player'?o.id:null}, () => { o[d.field] = v; }, {render: d.rr==='1'});
  }
});
