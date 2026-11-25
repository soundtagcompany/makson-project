// Shared rules; in online rooms only the server executes actions and rolls dice.
export const COLORS=['#785039','#72a9b6','#b7748b','#c97c35','#b94434','#c4ac45','#4b8262','#435574'];
export const PIECES=['Самокат','Унитаз','Губы','Тун Тун Тун Сахур','Ключ','Подкова'];
export const PLAYER_COLORS=['#b34b35','#387988','#a48b2e','#795783','#45875d','#ce7950'];
const street=(name,price,group,rent,build)=>({name,price,group,rent,build,type:'street'});
const rail=name=>({name,price:200,type:'rail'}),util=name=>({name,price:150,type:'utility'});
export const BOARD=[
 {
  "name": "СТАРТ",
  "type": "start"
 },
 {
  "name": "Шаурмичная",
  "price": 60,
  "group": 0,
  "rent": [
   2,
   10,
   30,
   90,
   160,
   250
  ],
  "build": 50,
  "type": "street"
 },
 {
  "name": "Госуслуги",
  "type": "chest"
 },
 {
  "name": "Ларек с фруктами",
  "price": 60,
  "group": 0,
  "rent": [
   4,
   20,
   60,
   180,
   320,
   450
  ],
  "build": 50,
  "type": "street"
 },
 {
  "name": "Утильсбор",
  "type": "tax",
  "amount": 200
 },
 {
  "name": "Верхний Ларс",
  "price": 200,
  "type": "rail"
 },
 {
  "name": "Бургер кинг",
  "price": 100,
  "group": 1,
  "rent": [
   6,
   30,
   90,
   270,
   400,
   550
  ],
  "build": 50,
  "type": "street"
 },
 {
  "name": "Телеграм",
  "type": "chance"
 },
 {
  "name": "Вкусно — и точка",
  "price": 100,
  "group": 1,
  "rent": [
   6,
   30,
   90,
   270,
   400,
   550
  ],
  "build": 50,
  "type": "street"
 },
 {
  "name": "Жизньмарт",
  "price": 120,
  "group": 1,
  "rent": [
   8,
   40,
   100,
   300,
   450,
   600
  ],
  "build": 50,
  "type": "street"
 },
 {
  "name": "СИЗО",
  "type": "jail"
 },
 {
  "name": "Пятерочка",
  "price": 140,
  "group": 2,
  "rent": [
   10,
   50,
   150,
   450,
   625,
   750
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "Мосэнерго",
  "price": 150,
  "type": "utility"
 },
 {
  "name": "Магнит",
  "price": 140,
  "group": 2,
  "rent": [
   10,
   50,
   150,
   450,
   625,
   750
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "Кировский",
  "price": 160,
  "group": 2,
  "rent": [
   12,
   60,
   180,
   500,
   700,
   900
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "Кольцово",
  "price": 200,
  "type": "rail"
 },
 {
  "name": "Avito",
  "price": 180,
  "group": 3,
  "rent": [
   14,
   70,
   200,
   550,
   750,
   950
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "Госуслуги",
  "type": "chest"
 },
 {
  "name": "Ozon",
  "price": 180,
  "group": 3,
  "rent": [
   14,
   70,
   200,
   550,
   750,
   950
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "Wildberries",
  "price": 200,
  "group": 3,
  "rent": [
   16,
   80,
   220,
   600,
   800,
   1000
  ],
  "build": 100,
  "type": "street"
 },
 {
  "name": "ДУБАЙ",
  "type": "parking"
 },
 {
  "name": "Rutube",
  "price": 220,
  "group": 4,
  "rent": [
   18,
   90,
   250,
   700,
   875,
   1050
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "Телеграм",
  "type": "chance"
 },
 {
  "name": "VK",
  "price": 220,
  "group": 4,
  "rent": [
   18,
   90,
   250,
   700,
   875,
   1050
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "Сбер",
  "price": 240,
  "group": 4,
  "rent": [
   20,
   100,
   300,
   750,
   925,
   1100
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "Внуково",
  "price": 200,
  "type": "rail"
 },
 {
  "name": "Яндекс",
  "price": 260,
  "group": 5,
  "rent": [
   22,
   110,
   330,
   800,
   975,
   1150
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "Роскосмос",
  "price": 260,
  "group": 5,
  "rent": [
   22,
   110,
   330,
   800,
   975,
   1150
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "Домашний интернет",
  "price": 150,
  "type": "utility"
 },
 {
  "name": "Газпром",
  "price": 280,
  "group": 5,
  "rent": [
   24,
   120,
   360,
   850,
   1025,
   1200
  ],
  "build": 150,
  "type": "street"
 },
 {
  "name": "ДОНОС",
  "type": "gojail"
 },
 {
  "name": "Китай город",
  "price": 300,
  "group": 6,
  "rent": [
   26,
   130,
   390,
   900,
   1100,
   1275
  ],
  "build": 200,
  "type": "street"
 },
 {
  "name": "Рублёвка",
  "price": 300,
  "group": 6,
  "rent": [
   26,
   130,
   390,
   900,
   1100,
   1275
  ],
  "build": 200,
  "type": "street"
 },
 {
  "name": "Госуслуги",
  "type": "chest"
 },
 {
  "name": "Москва-Сити",
  "price": 320,
  "group": 6,
  "rent": [
   28,
   150,
   450,
   1000,
   1200,
   1400
  ],
  "build": 200,
  "type": "street"
 },
 {
  "name": "Шереметьево",
  "price": 200,
  "type": "rail"
 },
 {
  "name": "Телеграм",
  "type": "chance"
 },
 {
  "name": "Аквадискотека",
  "price": 350,
  "group": 7,
  "rent": [
   35,
   175,
   500,
   1100,
   1300,
   1500
  ],
  "build": 200,
  "type": "street"
 },
 {
  "name": "Сверхприбыль",
  "type": "tax",
  "amount": 100
 },
 {
  "name": "Апарт-отель",
  "price": 400,
  "group": 7,
  "rent": [
   50,
   200,
   600,
   1400,
   1700,
   2000
  ],
  "build": 200,
  "type": "street"
 }
];
// Fictional satirical events. One visible outcome per card, no hidden rules.
export const CARDS={
 "chance": [
  [
   "ОСВОЕНИЕ БЮДЖЕТА",
   "Вы украли деньги на ремонт дороги. Теперь вам выделили ещё $200, чтобы выяснить, почему её не отремонтировали. Возвращайтесь на старт, следствие ведёте вы.",
   {
    "move": 0
   }
  ],
  [
   "НЕ ПОДОШЁЛ РАЗМЕР",
   "Заказали на WB гроб. Дед не влез. Поддержка предложила убрать наполнитель. Езжайте в пункт выдачи объяснять, что наполнитель — это дед.",
   {
    "move": 19
   }
  ],
  [
   "ОТДЫХ НА ПЕРВОЙ ЛИНИИ",
   "Рейс задержали до утра. Вы заняли место у розетки, обложились чемоданами и сдаёте соседям удлинитель. Отправляйтесь в ближайший аэропорт. Вылет пока не обещают.",
   {
    "nearest": "rail"
   }
  ],
  [
   "ОТОПИТЕЛЬНЫЙ СЕЗОН",
   "В котельной закончилось топливо. Теперь жгут ваши жалобы на холодные батареи. Езжайте в коммунальную контору: на эту зиму вас попросили писать побольше.",
   {
    "nearest": "utility"
   }
  ],
  [
   "СЕМЕЙНЫЙ ЧАТ",
   "Рассказали политический анекдот в семейном чате. Мама поставила 😂, батя — подпись под протоколом.",
   {
    "jail": true
   }
  ],
  [
   "АДВОКАТ ПО ЗНАКОМСТВУ",
   "Ваш адвокат вошёл к судье без стука и назвал его «пап». Сохраните карточку.",
   {
    "release": true
   }
  ],
  [
   "ОБЛОМКИ СЕРВИСА",
   "Ночью во дворе что-то упало. Управляйка прислала счёт за вывоз крупногабаритного мусора, замену окон и внеплановое проветривание. Оплатите ремонт своих объектов.",
   {
    "repair": [
     25,
     100
    ]
   }
  ],
  [
   "ПОКА ОТКРЫТО",
   "По телевизору сказали, что границы никто закрывать не собирается. Вы решили не ждать опровержения. Отправляйтесь на Верхний Ларс.",
   {
    "move": 5
   }
  ],
  [
   "КОМФОРТ МИНУС",
   "Заказали такси «Комфорт». Водитель увидел вас, запер двери и сдал назад. Отойдите на три клетки, человеку страшно.",
   {
    "back": 3
   }
  ],
  [
   "СКРОМНЫЙ АПАРТ-ОТЕЛЬ",
   "Сняли скромный номер у моря. Внутри — золотой ёршик, снаружи — бесполётная зона. Хозяин просит всем говорить, что это апарт-отель. Заселяйтесь.",
   {
    "move": 39
   }
  ],
  [
   "ИМПОРТОЗАМЕСТИЛИ",
   "На китайском массажёре стёрли иероглифы и написали «Перун». Теперь он патриотически ебашит по пояснице на $150 дороже. Прибыль ваша.",
   {
    "cash": 150
   }
  ],
  [
   "ПОЛНЫЙ БАК",
   "Решили залить полный бак. Пока кассир считал, жена успела написать: «Мы же на эти деньги ребёнку зубы делаем». Заплатите $50. Молочные всё равно выпадут.",
   {
    "cash": -50
   }
  ],
  [
   "ДОВОЛЬНЫЙ ПАЦИЕНТ",
   "Сыграли довольного пациента в рекламе клиники за $50. Настоящего тоже хотели снять, но реаниматолог не разрешил отключать его от розетки.",
   {
    "cash": 50
   }
  ],
  [
   "ВЫЛЕТ ПО ГОТОВНОСТИ",
   "В аэропорту объявили задержку из-за неопознанного объекта. Опознанные объекты с билетами третий час сидят на полу. Присоединяйтесь в ближайшем транспортном узле.",
   {
    "nearest": "rail"
   }
  ],
  [
   "МЁРТВАЯ ДУША",
   "Вас оформили мёртвой душой в администрации. Зарплату получили впервые за жизнь. Постарайтесь не оживать до пятницы.",
   {
    "cash": 100
   }
  ],
  [
   "ОБИДЕЛИ ЭКОНОМИСТА",
   "Таксист всю дорогу объяснял, как поднять экономику. Спросили, почему тогда он возит вас за копейки. Экономист высадил вас нахуй. Езжайте в Яндекс жаловаться.",
   {
    "move": 26
   }
  ]
 ],
 "chest": [
  [
   "ДЕД ОПЯТЬ ПОДВЁЛ",
   "Ваш бизнес обанкротился, но вы успели переписать его на покойного деда. Дед снова подвёл семью. Начинайте с нуля.",
   {
    "move": 0
   }
  ],
  [
   "ПОСМЕРТНАЯ ВЫПЛАТА",
   "Госуслуги объявили вас умершим и начислили $200. Жена уже выбирает памятник. Вы пока выбираете пиво.",
   {
    "cash": 200
   }
  ],
  [
   "ПОДОЗРИТЕЛЬНО СВОИ ДЕНЬГИ",
   "Банк заблокировал ваши деньги до выяснения, откуда они. За разблокировку просит $50. Эти списали без вопросов: теперь деньги их, значит, честные.",
   {
    "cash": -50
   }
  ],
  [
   "ЛИШНЯЯ УРНА",
   "На участке спросили, в какую урну выбросить мусор. Председатель услышал слово «бюллетень», хотя вы его не произносили. Объясните недоразумение в СИЗО.",
   {
    "jail": true
   }
  ],
  [
   "НАДЕВАЛОСЬ ОДИН РАЗ",
   "Продали свадебное платье за $50. В объявлении: «Надевалось один раз, по пьяни. Возможен обмен на услуги адвоката».",
   {
    "cash": 50
   }
  ],
  [
   "ОШИБОЧКА ВЫШЛА",
   "Выяснилось, что вы племянник прокурора. Следователь сам поправил вам воротник и удалил фото, где вы с ломом. Сохраните карточку бесплатного выхода из СИЗО.",
   {
    "release": true
   }
  ],
  [
   "КАПРЕМОНТ",
   "Подрядчик снял крышу, получил аванс и съебался. Дождь теперь идёт по всем этажам: проект «Доступная среда». Оплатите ремонт своих объектов.",
   {
    "repair": [
     40,
     115
    ]
   }
  ],
  [
   "СЧАСТЛИВЫЙ НОВОСЁЛ",
   "За $10 сыграли жильца нового дома перед комиссией. Дом — баннер, дверь нарисована. Ипотеку, сука, уже одобрили.",
   {
    "cash": 10
   }
  ],
  [
   "СЕМЕЙНЫЕ ЦЕННОСТИ",
   "Дед оставил вам $100, брату — квартиру, сестре — машину. Даже с того света старый хрен продолжает вас троллить.",
   {
    "cash": 100
   }
  ],
  [
   "ПРИЁМ ЧЕРЕЗ ПОЛГОДА",
   "Бесплатный кардиолог принимает через полгода. За $100 тот же врач принимает сейчас.",
   {
    "cash": -100
   }
  ],
  [
   "КУРС ПО ФИНАНСАМ",
   "Купили за $50 курс «Как перестать быть лохом». В архиве лежит ваша квитанция.",
   {
    "cash": -50
   }
  ],
  [
   "СБОЙ В СИСТЕМЕ",
   "Налоговая вернула $20. Вы позвонили уточнить, не ошибка ли это. На том конце тоже ахуели.",
   {
    "cash": 20
   }
  ],
  [
   "НЕДВИЖИМОСТЬ ИЗМЕНИЛАСЬ",
   "Дом сгорел. Страховая отказала: в договоре указано «жильё», а у вас теперь «участок». После суда дали $100 на лопату.",
   {
    "cash": 100
   }
  ],
  [
   "КАДРЫ РЕШАЮТ",
   "Получили $100 за трудоустройство племянника в Гос. Думу. Читать он не умеет, зато подпись выучил. Ему сразу дали отдел образования.",
   {
    "cash": 100
   }
  ],
  [
   "ВСЁ ДЛЯ НАРОДА",
   "Продали чиновнику за $25 его же портрет. Наценку назвали уважением, доставку — народной поддержкой. Всё оплатил из бюджета.",
   {
    "cash": 25
   }
  ],
  [
   "МАССОВКА",
   "Получили $50 за участие в митинге против продажных людей. Деньги выдавали за сценой, чтобы не портить кадр.",
   {
    "cash": 50
   }
  ]
 ]
};
const fail=m=>{throw new Error(m);};
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
export function groupCells(group){return BOARD.map((c,i)=>c.group===group?i:-1).filter(i=>i>=0);}
export function ownsGroup(s,id,group){return groupCells(group).every(i=>s.assets[i].owner===id);}
export function rent(s,index,dice=7){const c=BOARD[index],a=s.assets[index];if(!c.price||a.owner===null||a.mortgaged)return 0;
 if(c.type==='street')return c.rent[a.level]*(a.level===0&&ownsGroup(s,a.owner,c.group)?2:1);
 const count=BOARD.filter((b,i)=>b.type===c.type&&s.assets[i].owner===a.owner).length;
 return c.type==='rail'?25*2**(count-1):dice*(count===2?10:4);
}
export function buildingStock(s){return {houses:32-s.assets.reduce((n,a)=>n+(a.level<5?a.level:0),0),hotels:12-s.assets.filter(a=>a.level===5).length};}
function shuffled(n,random){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function createGame(players,random=Math.random){if(players.length<2||players.length>6)fail('Нужно от двух до шести игроков.');return {players:players.map((p,i)=>({id:p.id??i,name:String(p.name||`Игрок ${i+1}`).slice(0,22),piece:p.piece??i,bot:!!p.bot,cash:1500,pos:0,jail:0,jailed:false,release:[],out:false})),assets:BOARD.map(()=>({owner:null,level:0,mortgaged:false})),turn:0,phase:'roll',dice:[1,1],doubles:0,extra:false,round:1,revision:0,log:[{text:'Игра началась. Частная собственность — до первого звонка.',id:0}],decks:{chance:shuffled(16,random),chest:shuffled(16,random)},drawn:null,auction:null,trade:null,trades:[],moneyEvents:[],debt:null,winner:null,animation:null};}
function log(s,text){s.log.push({text,id:(s.log.at(-1)?.id||0)+1});s.log=s.log.slice(-50);}
function transfer(s,from,to,amount,reason){
 if(!amount)return;if(from!==null)player(s,from).cash-=amount;if(to!==null)player(s,to).cash+=amount;
 s.moneyEvents??=[];s.moneyEvents.push({id:(s.moneyEvents.at(-1)?.id||0)+1,from,to,amount,reason});s.moneyEvents=s.moneyEvents.slice(-64);
}
function proposal(s,from,to,label){s.proposalEvents??=[];s.proposalEvents.push({id:(s.proposalEvents.at(-1)?.id||0)+1,from,to,label});s.proposalEvents=s.proposalEvents.slice(-32);}
function player(s,id){return s.players.find(p=>p.id===id)||fail('Игрок не найден.');}
function jail(s,p){const from=p.pos;s.arrival={id:s.revision+1,player:p.id,from,to:10,title:from===30?'ДОНОС':'В СИЗО',text:from===30?'На вас написали донос. Отправляйтесь в СИЗО. Без $200.':s.doubles===3?'Три дубля подряд. Отправляйтесь в СИЗО. Без $200.':'Вас отправляют в СИЗО. Без $200.'};if(s.animation?.player===p.id)s.animation.jailTo=10;else s.animation={id:s.revision+1,player:p.id,from,to:10,steps:0};p.pos=10;p.jailed=true;p.jail=0;s.extra=false;s.doubles=0;s.phase='end';log(s,`${p.name} отправляется в СИЗО. Без $200.`);}
function pay(s,p,amount,to=null){if(!amount){s.phase='end';return;}if(p.cash<amount){s.debt={player:p.id,to,amount};s.phase='debt';log(s,`${p.name}: долг $${amount}. Можно снизить уровни или заложить активы.`);return;}transfer(s,p.id,to,amount,to===null?'ПЛАТЁЖ В БАНК':'АРЕНДА / ДОЛГ');s.phase='end';log(s,`${p.name} платит $${amount}${to!==null?' → '+player(s,to).name:' в банк'}.`);}
function drawCard(s,type){const index=s.decks[type].shift();if(index===undefined)fail('Колода временно пуста.');const [title,text,effect]=CARDS[type][index];s.drawn={id:s.revision+1,type,index,title,text,effect};s.phase='card';}
function land(s,p){const c=BOARD[p.pos],a=s.assets[p.pos];s.selected=p.pos;
 if(c.price){if(a.owner===null)s.phase='buy';else if(a.owner!==p.id)pay(s,p,rent(s,p.pos,s.dice[0]+s.dice[1]),a.owner);else s.phase='end';}
 else if(c.type==='gojail')jail(s,p);else if(c.type==='tax')pay(s,p,c.amount);else if(c.type==='chance'||c.type==='chest')drawCard(s,c.type);else s.phase='end';
}
function move(s,p,steps){const from=p.pos;const wraps=steps>0&&from+steps>=40;p.pos=(from+steps+40)%40;if(wraps){transfer(s,null,p.id,200,'ПРОХОД СТАРТА');log(s,`${p.name}: СТАРТ, +$200.`);}s.animation={id:s.revision+1,player:p.id,from,to:p.pos,steps};land(s,p);}
function next(s){s.drawn=null;s.debt=null;s.auction=null;if(s.players.filter(p=>!p.out).length===1){s.phase='finished';s.winner=s.players.find(p=>!p.out).id;return;}if(!s.extra||s.players[s.turn].out){do{s.turn=(s.turn+1)%s.players.length;if(s.turn===0)s.round++;}while(s.players[s.turn].out);s.doubles=0;}s.extra=false;s.phase='roll';}
function auction(s,index,now=Date.now()){s.phase='auction';s.auction={id:s.revision+1,index,bid:0,leader:null,passed:[],deadline:now+5000};log(s,`Аукцион: ${BOARD[index].name}. Участвуют все.`);}
function finishAuction(s,expired=false,now=Date.now()){const a=s.auction,eligible=s.players.filter(p=>!p.out&&!a.passed.includes(p.id));if(a.leader!==null&&(expired||eligible.every(p=>p.id===a.leader))){const p=player(s,a.leader);transfer(s,p.id,null,a.bid,'АУКЦИОН · '+BOARD[a.index].name);s.assets[a.index].owner=p.id;log(s,`${p.name} забирает ${BOARD[a.index].name} за $${a.bid}.`);}else if(!expired&&eligible.length)return;else log(s,'Никто не купил объект. Он остаётся в банке.');s.auction=null;if(s.bankAuctions?.length)auction(s,s.bankAuctions.shift(),now);else if(s.players[s.turn].out)next(s);else s.phase='end';}
function management(s,p){if(p.out)fail('Вы уже банкрот.');if(s.phase==='auction'||s.phase==='finished')fail('Дождитесь завершения торгов.');}
function validAsset(s,p,index){if(!Number.isInteger(index)||!BOARD[index]?.price||s.assets[index].owner!==p.id)fail('Это не ваш объект.');return s.assets[index];}
function tradeAssets(s,p,ids){if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length>28)fail('Неверный список имущества.');for(const i of ids){validAsset(s,p,i);const c=BOARD[i];if(c.type==='street'&&groupCells(c.group).some(j=>s.assets[j].level))fail('Перед обменом снизьте уровни всей цветовой группы.');}}
function tradeResult(s,t,status){const labels={accepted:'ОБМЕН ПРИНЯТ',rejected:'ОБМЕН ОТКЛОНЁН',cancelled:'ОБМЕН ОТОЗВАН',replaced:'ЗАМЕНЁН НОВЫМ',expired:'ОБМЕН УСТАРЕЛ'};s.tradeHistory??=[];s.tradeHistory.push({...t,status,round:s.round,resultId:s.revision+1});s.tradeHistory=s.tradeHistory.slice(-32);proposal(s,t.from,t.to,labels[status]);log(s,labels[status]+': '+player(s,t.from).name+' → '+player(s,t.to).name);}
function completeTrade(s,id,offer){const t=s.trades.find(t=>offer===undefined?t.to===id:t.id===offer);if(!t||t.to!==id)fail('Это предложение не вам.');const a=player(s,t.from),b=player(s,t.to);management(s,a);management(s,b);if(a.out||b.out)fail('Игрок выбыл.');tradeAssets(s,a,t.give);tradeAssets(s,b,t.take);const feeA=t.take.reduce((n,i)=>n+(s.assets[i].mortgaged?Math.ceil(BOARD[i].price*.05):0),0),feeB=t.give.reduce((n,i)=>n+(s.assets[i].mortgaged?Math.ceil(BOARD[i].price*.05):0),0);if(a.cash-t.cashGive+t.cashTake<feeA||b.cash-t.cashTake+t.cashGive<feeB)fail('Не хватает денег на сделку и проценты по залогу.');transfer(s,a.id,b.id,t.cashGive,'ОБМЕН');transfer(s,b.id,a.id,t.cashTake,'ОБМЕН');transfer(s,a.id,null,feeA,'ПРОЦЕНТ ПО ЗАЛОГУ');transfer(s,b.id,null,feeB,'ПРОЦЕНТ ПО ЗАЛОГУ');for(const i of t.give)s.assets[i].owner=b.id;for(const i of t.take)s.assets[i].owner=a.id;log(s,`${a.name} и ${b.name} заключили сделку.`);tradeResult(s,t,'accepted');s.trades=s.trades.filter(o=>o.id!==t.id);}
export function act(input,id,action,random=Math.random,now=Date.now()){const s=structuredClone(input),p=player(s,id),current=s.players[s.turn];if(p.out||s.phase==='finished')fail('Партия для вас закончена.');const kind=action.kind;if(['roll','card','settle','jailPay','jailCard','bankrupt'].includes(kind))s.animation=null;delete s.loans;delete s.loanOffer;s.trades??=s.trade?[{...s.trade,id:s.revision}]:[];s.trade=null;
 if(['roll','buy','decline','end','card','jailPay','jailCard'].includes(kind)&&current.id!==id)fail('Сейчас не ваш ход.');
 if(['roll','buy','decline','card','jailPay','jailCard','settle'].includes(kind)&&now<(s.actionReadyAt||0))fail('Дождитесь завершения движения фигурки.');
 if(kind==='roll'){
  if(s.phase!=='roll')fail('Сначала завершите действие.');s.dice=[1+Math.floor(random()*6),1+Math.floor(random()*6)];const same=s.dice[0]===s.dice[1],sum=s.dice[0]+s.dice[1];log(s,`${p.name}: ${s.dice[0]} + ${s.dice[1]}.`);
  if(p.jailed){p.jail++;if(same){p.jailed=false;p.jail=0;s.extra=false;move(s,p,sum);}else if(p.jail>=3){if(p.cash>=50){transfer(s,p.id,null,50,'ВЫХОД ИЗ СИЗО');p.jailed=false;p.jail=0;move(s,p,sum);}else{s.debt={player:id,to:null,amount:50,jailMove:sum};s.phase='debt';}}else{s.phase='end';s.extra=false;}}
  else {s.extra=same;s.doubles=same?s.doubles+1:0;if(s.doubles===3)jail(s,p);else move(s,p,sum);}
 }else if(kind==='buy'){if(s.phase!=='buy')fail('Сейчас нечего покупать.');const c=BOARD[p.pos];if(p.cash<c.price)fail('Недостаточно денег. Можно заложить имущество или открыть аукцион.');transfer(s,p.id,null,c.price,'ПОКУПКА · '+c.name);s.assets[p.pos].owner=id;s.phase='end';log(s,`${p.name} покупает ${c.name} за $${c.price}.`);
 }else if(kind==='decline'){if(s.phase!=='buy')fail('Нет объекта для аукциона.');auction(s,p.pos,now);
 }else if(kind==='bid'){const a=s.auction;if(s.phase!=='auction'||!a||a.passed.includes(id))fail('Вы не участвуете в торгах.');if(now>=a.deadline)fail('Время аукциона истекло.');if(action.auctionId!==undefined&&action.auctionId!==a.id)fail('Этот аукцион уже закрыт.');let amount=action.amount;if(action.increment!==undefined){if(!Number.isInteger(action.increment)||action.increment<1||action.increment>100)fail('Прибавка — от $1 до $100.');amount=a.bid+action.increment;}if(!money(amount)||amount<=a.bid||amount>p.cash)fail('Ставка должна быть выше текущей и в пределах вашего баланса.');a.bid=amount;a.leader=id;a.deadline=now+5000;finishAuction(s,false,now);
 }else if(kind==='pass'){if(s.phase!=='auction'||!s.auction)fail('Аукцион не идёт.');if(s.auction.leader===id)fail('Ваша ставка лидирует.');if(!s.auction.passed.includes(id))s.auction.passed.push(id);finishAuction(s,false,now);
 }else if(kind==='end'){if(s.phase!=='end')fail('Сначала завершите действие.');next(s);
 }else if(kind==='card'){
  if(s.phase!=='card'||!s.drawn)fail('Нет карточки.');const d=s.drawn,e=d.effect;log(s,`${p.name}: ${d.title}.`);s.drawn=null;if(e.release){p.release.push({type:d.type,index:d.index});s.phase='end';}else{s.decks[d.type].push(d.index);if(e.jail)jail(s,p);else if(e.cash!==undefined){if(e.cash>=0){transfer(s,null,p.id,e.cash,d.title);s.phase='end';log(s,`${p.name}: +$${e.cash}.`);}else pay(s,p,-e.cash);}else if(e.repair){const amount=s.assets.reduce((n,a)=>n+(a.owner===id?(a.level===5?e.repair[1]:a.level*e.repair[0]):0),0);pay(s,p,amount);}else if(e.back)move(s,p,-e.back);else {let target=e.move;if(e.nearest)target=Array.from({length:40},(_,i)=>(p.pos+i+1)%40).find(i=>BOARD[i].type===e.nearest);move(s,p,(target-p.pos+40)%40||40);}}
 }else if(kind==='jailPay'||kind==='jailCard'){if(s.phase!=='roll'||!p.jailed)fail('Вы не в СИЗО.');if(kind==='jailPay'){if(p.cash<50)fail('Нужно $50.');transfer(s,p.id,null,50,'ВЫХОД ИЗ СИЗО');}else{const c=p.release.shift();if(!c)fail('Нет карточки «Связи».');s.decks[c.type].push(c.index);}p.jailed=false;p.jail=0;log(s,`${p.name} выходит из СИЗО.`);
 }else if(['build','sell','sellGroup','mortgage','redeem'].includes(kind)){
  management(s,p);const i=action.index,a=validAsset(s,p,i),c=BOARD[i],group=c.type==='street'?groupCells(c.group):[],stock=buildingStock(s);
  if(kind==='build'){if(s.debt?.player===id)fail('Сначала погасите долг.');if(c.type!=='street'||!ownsGroup(s,id,c.group)||group.some(j=>s.assets[j].mortgaged))fail('Нужен весь цвет без залогов.');if(a.level>=5||a.level>Math.min(...group.map(j=>s.assets[j].level)))fail('Повышайте уровни равномерно.');if(p.cash<c.build)fail('Не хватает денег.');if(a.level===4?stock.hotels<1:stock.houses<1)fail('В резерве закончились жетоны улучшений.');transfer(s,p.id,null,c.build,'ПОВЫШЕНИЕ УРОВНЯ · '+c.name);a.level++;log(s,`${p.name}: уровень ${a.level} · ${c.name}.`);
  }else if(kind==='sell'){if(!a.level||a.level<Math.max(...group.map(j=>s.assets[j].level)))fail('Снижайте уровни равномерно.');if(a.level===5&&stock.houses<4)fail('Не хватает жетонов для снижения с 5 уровня. Можно обнулить всю группу.');a.level--;transfer(s,null,p.id,c.build/2,'СНИЖЕНИЕ УРОВНЯ');
  }else if(kind==='sellGroup'){if(!group.length)fail('Здесь нет уровней улучшения.');for(const j of group){transfer(s,null,p.id,s.assets[j].level*BOARD[j].build/2,'СБРОС УРОВНЕЙ');s.assets[j].level=0;}
  }else if(kind==='mortgage'){if(a.mortgaged||group.some(j=>s.assets[j].level))fail('Обнулите уровни группы. Уже заложенный актив повторно не заложить.');a.mortgaged=true;transfer(s,null,p.id,c.price/2,'ЗАЛОГ · '+c.name);log(s,`${p.name} закладывает ${c.name}.`);
  }else {const cost=Math.ceil(c.price*.55);if(!a.mortgaged||p.cash<cost)fail('Нет залога или недостаточно денег.');transfer(s,p.id,null,cost,'ВЫКУП · '+c.name);a.mortgaged=false;}

 }else if(kind==='settle'){const d=s.debt;if(!d||d.player!==id||p.cash<d.amount)fail('Пока не хватает денег на погашение долга.');s.debt=null;pay(s,p,d.amount,d.to);if(d.jailMove){p.jailed=false;p.jail=0;move(s,p,d.jailMove);}
 }else if(kind==='bankrupt'){
  const d=s.debt;if(!d||d.player!==id)fail('Банкротство доступно при непогашенном долге.');const available=p.cash+s.assets.reduce((n,a,i)=>n+(a.owner===id?(a.mortgaged?0:BOARD[i].price/2)+a.level*(BOARD[i].build||0)/2:0),0);if(available>=d.amount)fail('Имущества хватает для погашения долга. Снизьте уровни и оформите залог.');p.out=true;const recipient=d.to!==null?player(s,d.to):null;s.bankAuctions=[];let liquidation=0;for(let i=0;i<40;i++){const a=s.assets[i];if(a.owner!==id)continue;liquidation+=a.level*(BOARD[i].build||0)/2;a.level=0;if(recipient)a.owner=recipient.id;else{a.owner=null;a.mortgaged=false;s.bankAuctions.push(i);}}
  transfer(s,null,p.id,liquidation,'ЛИКВИДАЦИЯ УЛУЧШЕНИЙ');transfer(s,p.id,recipient?.id??null,p.cash,'БАНКРОТСТВО');if(recipient){recipient.release.push(...p.release);}else for(const c of p.release)s.decks[c.type].push(c.index);p.release=[];p.cash=0;s.debt=null;s.trades=s.trades.filter(t=>t.from!==id&&t.to!==id);s.extra=false;
  log(s,`${p.name} — банкрот.`);if(s.players.filter(p=>!p.out).length===1){s.bankAuctions=[];next(s);}else if(s.bankAuctions.length)auction(s,s.bankAuctions.shift(),now);else next(s);
 }else if(kind==='offer'){
  management(s,p);const other=player(s,action.to);if(other.id===id||other.out)fail('Выберите другого игрока.');tradeAssets(s,p,action.give);tradeAssets(s,other,action.take);if(!money(action.cashGive)||!money(action.cashTake)||action.cashGive>p.cash||action.cashTake>other.cash)fail('Проверьте суммы.');if(!action.give.length&&!action.take.length&&!action.cashGive&&!action.cashTake)fail('Пустая сделка.');for(const old of s.trades.filter(t=>t.from===id))tradeResult(s,old,'replaced');if(p.bot){s.botTradeRounds??={};s.botTradeRounds[id]=s.round;}s.trades=s.trades.filter(t=>t.from!==id);s.trades.push({id:s.revision+1,from:id,to:other.id,give:action.give,take:action.take,cashGive:action.cashGive,cashTake:action.cashTake});proposal(s,id,other.id,'ПРЕДЛАГАЕТ ОБМЕН');log(s,`${p.name} предлагает обмен → ${other.name}.`);
 }else if(kind==='accept'){completeTrade(s,id,action.offer);
 }else if(kind==='reject'){const t=s.trades.find(t=>action.offer===undefined?[t.from,t.to].includes(id):t.id===action.offer);if(!t||![t.from,t.to].includes(id))fail('Нет предложения для вас.');tradeResult(s,t,id===t.from?'cancelled':'rejected');s.trades=s.trades.filter(o=>o.id!==t.id);
 }else fail('Неизвестное действие.');
 for(const t of [...s.trades])if(t.give.some(i=>s.assets[i].owner!==t.from)||t.take.some(i=>s.assets[i].owner!==t.to)){tradeResult(s,t,'expired');s.trades=s.trades.filter(o=>o.id!==t.id);}
 const terminal=s.phase==='end';
 const changedMove=s.animation&&s.animation.id!==input.animation?.id;
 const movement=changedMove?Math.max(500,Math.min(1500,Math.abs(s.animation.steps||6)*110))+(s.animation.jailTo&&s.animation.to!==10?1050:0):0;
 if(['roll','buy','decline','card','settle','bankrupt'].includes(kind)||terminal){
  const duration=(kind==='roll'?1200:0)+movement+(terminal?450:100);
  s.actionReadyAt=now+duration;
  s.presentation={player:current.id,index:s.selected??current.pos,until:s.actionReadyAt};
 }
 if(terminal)next(s);
 s.revision++;s.lastAction={id:s.revision,kind,player:id,index:Number.isInteger(action.index)?action.index:p.pos};return s;
}
// Compare only the facts the player acted on; unrelated trades must not cancel clicks.
export function actionContext(s,id,a){
 const p=s.players.find(p=>p.id===id),kind=a.kind;
 const assets=ids=>ids.map(i=>[i,s.assets[i]??null]);
 let context;
 if(['bid','pass'].includes(kind))context=[s.auction?.id??null];
 else if(['build','sell','sellGroup','mortgage','redeem'].includes(kind)){
  const c=BOARD[a.index];context=assets(c?.type==='street'?groupCells(c.group):[a.index]);
 }else if(kind==='offer')context=[a.to,assets([...(a.give||[]),...(a.take||[])])];
 else if(['accept','reject'].includes(kind)){
  const t=(s.trades||[]).find(t=>a.offer===undefined?(kind==='accept'?t.to===id:[t.from,t.to].includes(id)):t.id===a.offer);
  context=[t??null,t?assets([...t.give,...t.take]):null];
 }else if(['settle','bankrupt'].includes(kind))context=[s.round,s.debt,s.actionReadyAt];
 else context=[s.round,s.turn,s.phase,p?.pos,p?.jailed,p?.jail,s.doubles,s.drawn?.id,s.actionReadyAt];
 return JSON.stringify([s.gameId??null,id,kind,context]);
}
export function publicGame(s){const copy=structuredClone(s);delete copy.decks;return copy;}

// Old saved games may be waiting on the removed End Turn / loan controls.
export function resumeGame(input){const s=structuredClone(input);delete s.loans;delete s.loanOffer;if(s.phase==='end')next(s);if(s.auction&&!Number.isFinite(s.auction.deadline))s.auction.deadline=Date.now()+5000;return s;}

// Only the server/local game clock closes lots; clients never choose the winner.
export function expireAuction(input,now=Date.now()){
 if(input.phase!=='auction'||!input.auction||now<input.auction.deadline)return input;
 const s=structuredClone(input),id=s.auction.index,current=s.players[s.turn];finishAuction(s,true,now);
 if(s.phase==='end'){s.actionReadyAt=now+450;s.presentation={player:current.id,index:id,until:s.actionReadyAt};next(s);}
 s.revision++;s.lastAction={id:s.revision,kind:'auction-close',player:current.id,index:id};return s;
}
