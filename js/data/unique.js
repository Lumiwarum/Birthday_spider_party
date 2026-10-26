'use strict';
/* Уникальные способности персонажей. Открываются выполнением квеста, чей origin = fig.
   uses — сколько раз за игру (по решению ведущего: 1, если в правилах не сказано иное).
   passive — не объявляется как действие (свой интерфейс на экране «Способности»).
   reaction — применяется только в окне реакции. cancelable:false — исполняется сразу. */
const UNIQUE = [
  {id:'tea', fig:'fig1', name:'Чайная церемония', icon:'star', passive:true,
    desc:`За каждого другого игрока, выпившего чай Павитра, +1 EP. Максимум +${TEA_MAX} EP, каждый гость учитывается один раз.`},

  {id:'moon', fig:'fig2', name:'Ложное полнолуние', icon:'eye', uses:1, cancelable:true,
    desc:'Фигурка получает ложную личность до конца игры. Маскировка следует за фигуркой. Первый «Поиск аномалии» по её настоящему имени покажет портал подставной фигурки.',
    fields:[{key:'mode', type:'select', label:'Как выбрать цель', options:[['fig','Фигурка по имени'],['portal','Портал по номеру']]},
      {key:'fig', type:'figure', label:'Настоящая фигурка', show:t => t.mode !== 'portal'},
      {key:'portal', type:'portal', label:'Портал', show:t => t.mode === 'portal'},
      {key:'fake', type:'figure', label:'Ложная личность'}],
    validate(t){
      if(t.mode === 'portal' ? !t.portal : !t.fig) return 'Выберите цель';
      if(!t.fake) return 'Выберите ложную личность';
      if(t.mode !== 'portal' && t.fig === t.fake) return 'Ложная личность должна отличаться от настоящей';
      return null;
    },
    execute(t){
      const real = t.mode === 'portal' ? figAt(+t.portal).id : t.fig;
      if(real === t.fake) fail(`В портале №${t.portal} находится «${figName(real)}» — она не может выдавать себя за саму себя`);
      if(state.effects.disguises.some(d => d.figId === real)) fail(`«${figName(real)}» уже замаскирована`);
      state.effects.disguises.push({figId:real, fakeId:t.fake, searchSpoofUsed:false, t:Date.now()});
      return {logType:'action', publicText:'Ложное полнолуние: одна из фигурок получила ложную личность', host:`«${figName(real)}» выдаёт себя за «${figName(t.fake)}» (сейчас в портале №${portalOfFig(real)})`,
        announce:{kind:'effect', title:'Ложное полнолуние', text:'В мультивселенной появился двойник…', anim:'moon'}};
    }},

  {id:'duel', fig:'fig3', name:'Дуэлянт', icon:'shield', reaction:true, charges:DUEL_CHARGES,
    desc:`${DUEL_CHARGES} заряда. В окне реакции вызвать владельца действия на «камень-ножницы-бумагу»: победа отменяет действие. Заряд тратится на попытку. Не действует на «Утечку данных».`},

  {id:'anarchy', fig:'fig4', name:'Анархия', icon:'star', uses:1, cancelable:true,
    desc:'Внутри каждого выбранного батча фигурки случайно перемешиваются. Между батчами ничего не переходит, защищённые порталы стоят на месте.',
    fields:[{key:'batches', type:'batches', label:'Батчи'}],
    validate: t => (t.batches || []).length ? null : 'Выберите хотя бы один батч',
    execute(t){
      const parts = [], all = [], host = [];
      for(const id of t.batches.map(Number).sort()){
        const b = BATCHES[id], ns = freePortals(b.portals);
        const perm = ns.length > 1 ? shuffleFree(ns) : [0];
        parts.push(`${b.name}: №${ns.join(', №')}`); all.push(...ns);
        host.push(`${b.name}: ${flowText(permPairs(ns, perm)) || 'без изменений'}`);
      }
      const txt = 'Анархия! Перемешаны ' + parts.join('; ');
      return {logType:'move', publicText:txt, host:host.join('; '), announce:{kind:'move', title:'Анархия', text:txt, portals:all, anim:'shuffle'}, portals:all, anim:'shuffle'};
    }},

  {id:'invis', fig:'fig5', name:'Невидимость', icon:'eyeoff', uses:1, cancelable:true,
    desc:'Выбранная фигурка до конца игры скрыта от обычных проверок: сканирования показывают «Не распознано», поиск не находит. «Акробат» и «Азартный игрок» видят реальность.',
    fields:[{key:'fig', type:'figure', label:'Фигурка'}],
    validate: t => t.fig ? null : 'Выберите фигурку',
    execute(t){
      if(state.effects.invisible.includes(t.fig)) fail('Фигурка уже невидима');
      state.effects.invisible.push(t.fig);
      return {logType:'action', publicText:'Невидимость: одна из фигурок исчезла с радаров', host:`Скрыта «${figName(t.fig)}» (сейчас в портале №${portalOfFig(t.fig)})`,
        announce:{kind:'effect', title:'Невидимость', text:'Одна из фигурок исчезла с радаров', anim:'invis'}};
    }},

  {id:'mayday', fig:'fig6', name:'Мэйдэй!', icon:'users', passive:true,
    desc:`Пара с игроком-«младенцем». Каждый может один раз бесплатно повторить покупную способность, которую использовал другой. Суммарная стоимость повторов — не более ${fmtEP(MAYDAY_LIMIT2)} EP.`},

  {id:'earth42', fig:'fig7', name:'Земля-42', icon:'swap', uses:1, cancelable:true,
    desc:'Выберите целевой батч и два портала вне его. Приложение случайно выберет две позиции внутри батча и проведёт два обмена.',
    fields:[{key:'batch', type:'batch', label:'Целевой батч'}, {key:'portals', type:'portals', count:2, free:true, outBatch:'batch', label:'Порталы вне батча'}],
    validate(t){
      if(t.batch === undefined || t.batch === '') return 'Выберите целевой батч';
      const e = distinct(t.portals, 2); if(e) return e;
      const b = BATCHES[+t.batch], ns = t.portals.map(Number);
      if(ns.some(n => b.portals.includes(n))) return 'Оба портала должны быть вне целевого батча';
      requireFree(ns);
      if(freePortals(b.portals).length < 2) return 'В целевом батче меньше двух незащищённых позиций';
      return null;
    },
    execute(t){
      const b = BATCHES[+t.batch], outs = t.portals.map(Number);
      const ins = pickN(freePortals(b.portals), 2);
      outs.forEach((n, i) => swapPortals(n, ins[i]));
      const pairs = outs.map((n, i) => [n, ins[i]]);
      const txt = `Земля-42: ${pairs.map(([a,c]) => `№${a} ⇄ №${c}`).join(', ')}`;
      return {logType:'move', random:{ins}, publicText:txt, host:'Новая раскладка: ' + layoutText(), announce:{kind:'move', title:'Земля-42', text:txt, portals:pairs.flat(), anim:'prowler', pairs}, portals:pairs.flat(), anim:'prowler'};
    }},

  {id:'stab', fig:'fig8', name:'Стабилизатор', icon:'lock', uses:1, cancelable:true,
    desc:'Выбранный портал до конца текущего раунда нельзя перемещать никакими способностями.',
    fields:[{key:'portal', type:'portal', label:'Портал'}],
    validate: t => !t.portal ? 'Выберите портал' : isProtected(+t.portal) ? 'Портал уже защищён' : null,
    execute(t){
      const n = +t.portal;
      state.effects.protections.push({portal:n, round:state.roundSerial, label:roundLabel(), t:Date.now()});
      const txt = `Стабилизатор: портал №${n} защищён до конца раунда (${roundLabel()})`;
      return {logType:'action', publicText:txt, announce:{kind:'effect', title:'Стабилизатор', text:txt, portals:[n], anim:'shield'}, portals:[n], anim:'shield'};
    }},

  {id:'leak', fig:'fig9', name:'Утечка данных', icon:'list', uses:Infinity, cancelable:false,
    desc:'В любой момент открыть отдельную вкладку с таблицей: фигурка, её квест и способность. Мгновенно и неотменяемо, повторять можно без ограничений.',
    fields:[],
    execute: () => ({logType:'action', publicText:'Утечка данных: таблица квестов опубликована', openTab:'leak', announce:{kind:'effect', title:'Утечка данных', text:'Таблица всех личных квестов опубликована'}})},

  {id:'home', fig:'fig10', name:'Возвращение домой', icon:'cycle', uses:1, cancelable:true,
    desc:'Выберите фигурку: если она не в своём первоначальном портале, содержимое первоначального и текущего порталов меняется местами.',
    fields:[{key:'fig', type:'figure', label:'Фигурка'}],
    validate(t){
      if(!t.fig) return 'Выберите фигурку';
      const h = homeOf(t.fig), c = portalOfFig(t.fig);
      if(h !== c) requireFree([h, c]);
      return null;
    },
    execute(t){
      const h = homeOf(t.fig), c = portalOfFig(t.fig);
      if(h === c) return {logType:'move', publicText:'Возвращение домой: фигурка уже дома — расположение не изменилось', host:`«${figName(t.fig)}» уже в портале №${h}`,
        announce:{kind:'effect', title:'Возвращение домой', text:'Фигурка уже дома', anim:'home'}};
      swapPortals(h, c);
      const txt = `Возвращение домой: №${c} ⇄ №${h}`;
      return {logType:'move', publicText:txt, host:`«${figName(t.fig)}» вернулась в №${h}; «${figAt(c).name}» ушла в №${c}`,
        announce:{kind:'move', title:'Возвращение домой', text:txt, portals:[h,c], anim:'home', pairs:[[c,h]]}, portals:[h,c], anim:'home'};
    }},

  {id:'neighbor', fig:'fig11', name:'Дружелюбный сосед', icon:'users', uses:1, cancelable:true,
    desc:`Двое выбранных участников получают по ваучеру и хранят его у себя. В любой момент до заморозки Сан-Спайдер может применить ваучер с разрешения его держателя: одно бесплатное применение покупной способности до ${fmtEP(VOUCHER_MAX2)} EP.`,
    fields:[{key:'p1', type:'player', others:true, label:'Первый участник'}, {key:'p2', type:'player', others:true, label:'Второй участник'}],
    validate: (t, ctx) => !t.p1 || !t.p2 ? 'Выберите двух участников' : t.p1 === t.p2 ? 'Участники должны быть разными' : [t.p1,t.p2].includes(ctx.actor.id) ? 'Нельзя выбрать себя' : null,
    execute(t, ctx){
      [t.p1, t.p2].forEach(pid => state.effects.vouchers.push({id:uid('v'), holder:pid, owner:ctx.actor.id, status:'active', t:Date.now()}));
      const txt = `Дружелюбный сосед: ваучеры получили ${pname(t.p1)} и ${pname(t.p2)}`;
      return {logType:'action', publicText:txt, announce:{kind:'effect', title:'Дружелюбный сосед', text:txt}};
    }},
];
const UNIQUE_BY_FIG = Object.fromEntries(UNIQUE.map(u => [u.fig, u]));
const ABILITY = Object.fromEntries([...SHOP.map(a => ({...a, kind:'shop'})), ...UNIQUE.map(u => ({...u, kind:'unique'}))].map(a => [a.id, a]));
