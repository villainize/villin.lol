(() => {
  function route(points){return Object.fromEntries(points.map(([x,y,type],i)=>[i===0?'start':i===points.length-1?'goal':`n${i}`,{x,y,w:74,h:65,type,next:i===points.length-1?[]:[i===points.length-2?'goal':`n${i+1}`]}]));}
  function decks(theme){
    const concert=theme==='concert';
    const messages=concert?{
      fact:['You make my heart sing, Grace. Every day with you deserves its own soundtrack.','Your smile could light up this whole concert.','My favorite kind of duet is laughing with you.'],
      surprise:['Backstage pass! Take two extra steps toward your birthday encore.','The crowd is cheering for you. Here are three hearts from your biggest fan.','Your favorite song is playing. Keep this little moment just for yourself.'],
      event:['An encore just for Grace! Follow the music two spaces ahead.','Glow sticks up! You deserve to be celebrated tonight.','The spotlight finds you. Make a birthday wish before the next song.']
    }:{
      fact:['You are loved deeper than this ocean, Grace.','Even the little sharks came to celebrate your birthday.','Every adventure with you is a treasure worth keeping.'],
      surprise:['A friendly shark gives you a lift! Swim ahead two spaces.','You found a treasure chest with three little hearts inside.','A message in a bottle says: you make my world a happier place.'],
      event:['Catch a sparkling wave and move two spaces closer to the shore.','The lagoon is throwing you a birthday party. Collect two hearts!','A wish upon a seashell: may your next year be full of lovely surprises.']
    };
    return Object.fromEntries(Object.entries(messages).map(([kind,texts])=>[kind,texts.map((text,i)=>({title:(concert?'Starlight':'Ocean')+' '+({fact:'note',surprise:'surprise',event:'adventure'}[kind])+' '+(i+1),text,hearts:kind==='surprise'&&i===1?3:2,move:kind!=='fact'&&i===0?2:0}))]));
  }
  window.GRACE_MAPS=[
    {id:'blossom',name:'Cherry Blossom Birthday',art:'images/board/birthday-table.png',width:1312,height:1199,key:'grace-birthday-card-messages-v1',defaults:()=>({date:{...window.GRACE_DATE_CARD},decks:structuredClone(window.GRACE_CARD_DECKS)})},
    {id:'concert',name:'Starlight Concert',art:'images/board/starlight-concert.png',width:992,height:793,key:'grace-board-concert-v1',defaults:()=>({date:{...window.GRACE_DATE_CARD},decks:decks('concert')}),
      nodes:route([[120,175,'start'],[195,265,'event'],[86,350,'heart'],[130,435,'fact'],[215,509,'flower'],[324,520,'event'],[425,505,'heart'],[504,440,'event'],[611,475,'heart'],[720,472,'fact'],[890,463,'goal']]),
      pawn:'images/board/grace-miku-pawn.png',pawnAlt:'Grace holding Miku',pawnWidth:8,
      tokens:[[711,709,56,65],[779,714,60,64],[850,701,65,71],[923,681,57,77]],
      crops:{fact:[207,590,160,174],surprise:[376,590,159,174],event:[545,590,161,174],dieOne:[714,616,80,91],dieTwo:[794,628,78,90]},
      rest:'A quiet moment between songs. Your next birthday encore is waiting.',reward:'Your birthday encore: you make my heart sing, Grace!'},
    {id:'ocean',name:'Shark Lagoon Adventure',art:'images/board/shark-lagoon.png',width:991,height:793,key:'grace-board-ocean-v1',defaults:()=>({date:{...window.GRACE_DATE_CARD},decks:decks('ocean')}),
      nodes:route([[129,163,'start'],[238,139,'flower'],[276,106,'paw'],[332,92,'heart'],[399,110,'fact'],[469,135,'paw'],[536,139,'paw'],[581,102,'paw'],[602,66,'flower'],[657,49,'paw'],[752,52,'event'],[874,181,'paw'],[885,233,'heart'],[848,287,'event'],[756,337,'paw'],[680,324,'heart'],[657,280,'flower'],[621,248,'paw'],[548,252,'heart'],[494,311,'paw'],[413,327,'heart'],[333,294,'fact'],[272,259,'paw'],[205,256,'heart'],[137,300,'flower'],[95,359,'paw'],[115,423,'event'],[187,476,'paw'],[257,505,'flower'],[350,502,'surprise'],[435,508,'paw'],[510,517,'paw'],[586,506,'event'],[663,475,'heart'],[731,452,'paw'],[857,495,'goal']]),
      pawn:'images/board/grace-shark-pawn.png',pawnAlt:'Grace holding her shark',pawnWidth:8,
      tokens:[[711,718,64,61],[777,719,61,60],[840,701,64,66],[907,677,68,72]],
      crops:{fact:[219,591,162,173],surprise:[389,591,153,173],event:[551,590,155,174],dieOne:[713,619,79,91],dieTwo:[791,632,74,87]},
      rest:'A peaceful pause by the lagoon. Another little treasure is waiting ahead.',reward:'Your ocean treasure: you are loved deeper than the sea, Grace!'}
  ];
  const concert=window.GRACE_MAPS[1].nodes;
  concert.start.next.push('upper1');concert.start.routes=['Follow the dance floor','Take the spotlight trail'];
  const upper=[[257,210,'event'],[296,151,'surprise'],[381,88,'heart'],[472,96,'event'],[563,112,'fact'],[656,90,'heart'],[738,144,'event'],[830,188,'heart'],[891,265,'flower'],[840,337,'event']];
  upper.forEach(([x,y,type],i)=>concert[`upper${i+1}`]={x,y,w:75,h:65,type,next:[i===upper.length-1?'goal':`upper${i+2}`]});
  concert.n1.next.push('bridge1');concert.n1.routes=['Visit the front row','Take the backstage shortcut'];
  concert.bridge1={x:282,y:351,w:75,h:65,type:'event',next:['bridge2']};
  concert.bridge2={x:394,y:391,w:75,h:65,type:'surprise',next:['n7']};
})();
