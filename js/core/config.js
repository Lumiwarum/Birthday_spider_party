'use strict';
/* Константы игры: батчи, фигурки, квесты, награды, раунды, типы событий */
const SCHEMA = 2;
const LS = {state:'sv-party-state-v1', ui:'sv-party-ui-v1', undo:'sv-party-undo-v1'};
const PORTALS = 11;
const ALL_PORTALS = Array.from({length:PORTALS}, (_, i) => i + 1);
const UNDO_LIMIT = 40;

// mode — правило финального распределения внутри батча
const BATCHES = [
  {id:0, name:'Батч I',   title:'Канон',                   roman:'I',   portals:[1,2,3,4], cap:4, color:'#2ec5ff', mode:'rank'},
  {id:1, name:'Батч II',  title:'Аномалия',                roman:'II',  portals:[5,6,7,8], cap:4, color:'#ff3ea5', mode:'weighted'},
  {id:2, name:'Батч III', title:'Коллапс мультивселенной', roman:'III', portals:[9,10,11], cap:3, color:'#ffe14d', mode:'random'},
];
const batchOf = n => BATCHES.find(b => b.portals.includes(n));
const batchName = b => `${b.name} «${b.title}»`;

/* Экономика. EP хранится в половинках: ep2 = EP × 2 (шаг 0,5 EP без ошибок округления) */
const START = {rp:0, ep2:4};
const PLACE_REWARDS = [{rp:5, ep2:3}, {rp:3, ep2:4}, {rp:2, ep2:5}, {rp:1, ep2:6}]; // 1-е, 2-е, 3-е, остальные
const QUEST_REWARD = {rp:3, ep2:6};
const MILES_REWARD = {rp:2, ep2:4};    // Майлз за выполнение взятого квеста
const MILES_VICTIM_EP2 = 2;             // жертве кражи сразу +1 EP
const MAYDAY_LIMIT2 = 10;   // общий лимит повторов «Мэйдэй!» — 5 EP
const VOUCHER_MAX2 = 6;     // ваучер Сан-Спайдер — способность до 3 EP
const TEA_MAX = 3;          // «Чайная церемония» — не более +3 EP
const DUEL_CHARGES = 2;

const PHASES = {
  setup:  'Подготовка',
  rounds: 'Игровые раунды',
  window: 'Финальное окно способностей',
  frozen: 'Мультивселенная заморожена',
  done:   'Вечеринка завершена',
};
const ROUND_TEMPLATES = [
  {id:'r1', name:'Раунд 1', title:'Jackbox',      optional:false, games:['Jackbox: игра 1', 'Jackbox: игра 2', 'Jackbox: игра 3']},
  {id:'r2', name:'Раунд 2', title:'«Шляпа»',      optional:false, games:['«Шляпа»']},
  {id:'r3', name:'Раунд 3', title:'«Своя игра»',  optional:true,  games:['«Своя игра»']},
];

// [имя, англ. имя, цвет, личный квест]
const DEFAULT_FIGURES = [
  ['Павитр Прабхакар','Spider-Man India','#ff8a00','Лично приготовить чай и предложить его другому гостю'],
  ['Человек-паук-оборотень','Werewolf Spider-Man','#b56cff','Завыть так, чтобы минимум двое других гостей завыли вместе'],
  ['Веб-Слингер','Web-Slinger','#e0a458','Вызвать другого гостя на дуэль и победить'],
  ['Хоби Браун','Spider-Punk','#ff2e63','Убедить минимум двух гостей послушать песню группы «Король и Шут»'],
  ['Майлз Моралес','Miles Morales','#ff3b30','Украсть незавершённый квест другого участника, отдав ему взамен квест Бродяги'],
  ['Питер Б. Паркер','Peter B. Parker','#3a86ff','Убедить согласного гостя говорить как младенец в течение полного игрового раунда'],
  ['Бродяга','Miles G. Morales / Prowler','#9d4edd','Говорить преимущественно на иностранном языке в течение полного раунда'],
  ['Киборг Женщина-паук','Cyborg Spider-Woman','#00f5d4','Принести чайник и вскипятить воду'],
  ['Спайдер-Байт','Spider-Byte','#00bbf9','Убедить другого гостя сыграть в цифровую игру'],
  ['Гвен Стейси','Gwen Stacy','#ff5fa2','Убедить оппонента помочь ей во время любой игры'],
  ['Сан-Спайдер','Sun-Spider','#ffd60a','Тайно помочь двум другим гостям выполнить их квесты'],
];
const MILES = 'fig5', PROWLER = 'fig7', SUN = 'fig11';
const CONDITIONS = {perfect:'Идеальная', light:'Слегка помята', heavy:'Заметно помята'};

// pub: видно ли событие в демонстрации по умолчанию (запись может переопределить)
const EVENT_TYPES = {
  rp:       {label:'RP',          chip:'pink',   pub:true},
  ep:       {label:'EP',          chip:'blue',   pub:true},
  reward:   {label:'Награды',     chip:'pink',   pub:true},
  quest:    {label:'Квест',       chip:'green',  pub:false},
  action:   {label:'Действие',    chip:'yellow', pub:true},
  reaction: {label:'Реакция',     chip:'red',    pub:true},
  move:     {label:'Перемещение', chip:'violet', pub:true},
  info:     {label:'Разведка',    chip:'blue',   pub:false},
  round:    {label:'Раунд',       chip:'red',    pub:true},
  batch:    {label:'Батч',        chip:'blue',   pub:true},
  final:    {label:'Финал',       chip:'red',    pub:true},
  player:   {label:'Участники',   chip:'',       pub:true},
  setup:    {label:'Ведущий',     chip:'',       pub:false},
  system:   {label:'Система',     chip:'',       pub:false},
  // типы из сохранений схемы 1
  buy:      {label:'Покупка',     chip:'yellow', pub:false},
  stage:    {label:'Этап',        chip:'red',    pub:true},
};
const COLORS = ['#ff2e4d','#ff3ea5','#8a3ffc','#2ec5ff','#3dff9a','#ffe14d','#ff8a00','#00f5d4','#c77dff','#f72585','#4cc9f0','#ffd60a'];
const DEMO_NAMES = ['Толя','Арам','Никита','Женя','Паша','Кирилл','Глеб','Степан','Саша','Батраз','Миша'];
const OLD_DEMO_NAMES = ['Аня','Борис','Вика','Гоша','Даша','Егор','Женя','Зоя','Илья','Кира','Лёва'];
