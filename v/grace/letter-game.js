// Display the five panels from the supplied artwork without redrawing them.
const LETTER_ART='images/letters/letter-game.png';
const LETTER_PANELS={hunt:[0,0,926,561],found:[937,0,599,561],open:[0,575,511,449],quiz:[522,575,497,449],result:[1030,575,506,449]};

function letterGame(){
  let alive=true,unlocked=false,current=0,score=0;
  activeCleanup=()=>{alive=false;};
  const checked=new Set();
  // Personalize these notes; their order matches the envelopes in the artwork.
  const settings=window.GraceLetterSettings.read();
  const sweetNotes=settings.notes;
  const quizQuestions=settings.questions;
  const envelopes=[
    [153,180,115,66],[278,178,113,59],[385,209,107,60],[512,205,121,64],
    [642,225,112,63],[770,249,120,72],[34,231,116,61],[143,265,117,61],
    [238,229,119,65],[10,309,122,68],[79,347,145,91],[244,309,135,88],
    [391,274,123,68],[538,284,127,75],[687,313,130,79],[91,449,151,86],
    [248,399,143,80],[410,346,148,86],[573,376,137,88],
    [258,484,156,77],[720,405,145,88],[649,484,153,77],
    [437,435,184,113]
  ];
  function scene(kind,title,help){
    if(!alive)return null;
    const [x,y,w,h]=LETTER_PANELS[kind];
    panel('GAME 03 · A LITTLE BIRTHDAY MYSTERY',title,help,`
      <div class="letter-art-game"><div class="letter-stage letter-stage-${kind}" style="--scene-ratio:${w/h}">
        <svg viewBox="${x} ${y} ${w} ${h}" aria-hidden="true" focusable="false"><image href="${LETTER_ART}" width="1536" height="1024"/></svg>
        <div class="letter-controls"></div>
      </div><p class="letter-feedback" role="status"></p><div class="letter-actions"></div></div>`);
    return content.querySelector('.letter-art-game');
  }
  function region(game,label,box,callback,className='letter-art-button'){
    const button=document.createElement('button');button.type='button';button.className=className;button.setAttribute('aria-label',label);
    const stage=game.querySelector('.letter-stage'),kind=[...stage.classList].find(c=>c.startsWith('letter-stage-')).slice(13);
    const [sx,sy,w,h]=LETTER_PANELS[kind];
    const [x,y,bw,bh]=box;Object.assign(button.style,{left:`${(x-sx)/w*100}%`,top:`${(y-sy)/h*100}%`,width:`${bw/w*100}%`,height:`${bh/h*100}%`});
    button.addEventListener('click',()=>{if(alive)callback(button);});game.querySelector('.letter-controls').append(button);return button;
  }
  function action(game,label,callback){const b=document.createElement('button');b.type='button';b.className='button primary';b.textContent=label;b.addEventListener('click',()=>{if(alive)callback();});game.querySelector('.letter-actions').append(b);return b;}
  function hunt(){
    unlocked=false;checked.clear();
    const specialEnvelope=Math.floor(Math.random()*envelopes.length);
    const game=scene('hunt','Find the Right Letter',`${envelopes.length} sweet letters to explore. One holds the key to your quiz.`);
    const stage=game.querySelector('.letter-stage');
    const seal=document.createElement('span');seal.className='letter-heart-cover';seal.textContent='\u2665';seal.setAttribute('aria-hidden','true');stage.append(seal);
    const hint=document.createElement('span');hint.className='letter-hunt-hint';hint.textContent='Every letter holds a little love!';hint.setAttribute('aria-hidden','true');stage.append(hint);
    const note=document.createElement('dialog');note.className='letter-note-dialog';
    const heading=document.createElement('h3');heading.textContent='A little love for Grace';
    const message=document.createElement('p');
    const reminder=document.createElement('p');reminder.className='letter-note-reminder';reminder.textContent='A sweet note just for you. Keep looking for the letter that unlocks your quiz!';
    const close=document.createElement('button');close.type='button';close.className='button primary';close.textContent='Keep looking';close.addEventListener('click',()=>note.close());
    note.append(heading,message,reminder,close);game.append(note);
    const feedback=game.querySelector('.letter-feedback');feedback.textContent='Pick an envelope to look inside.';
    envelopes.forEach((box,i)=>region(game,`Envelope ${i+1}`,box,button=>{
      if(unlocked)return;
      if(i===specialEnvelope){unlocked=true;found();return;}
      checked.add(i);button.classList.add('letter-checked');button.setAttribute('aria-label',`Envelope ${i+1}: read your sweet note again`);
      message.textContent=sweetNotes[i];note.showModal();
      feedback.textContent=`${checked.size} of ${envelopes.length} letters opened. You can reread any sweet note.`;
    },'letter-envelope'));
  }
  function found(){
    const game=scene('found','You found it!','There is a special little surprise inside your letter.');
    region(game,'Open the letter',[1122,478,263,64],openLetter);
    game.querySelector('.letter-feedback').textContent='Tap “Open the Letter” in the picture.';
  }
  function openLetter(){
    const game=scene('open','A letter for Grace','Your ten-question birthday quiz is ready.');
    region(game,'Start quiz',[155,876,246,61],startQuiz);
    game.querySelector('.letter-feedback').textContent='Tap “Start Quiz” when you are ready.';
  }
  function startQuiz(){if(!unlocked)return;current=0;score=0;question();}
  function question(){
    if(!alive||!unlocked)return;
    if(current===10){results();return;}
    const item=quizQuestions[current];
    const game=scene('quiz','A little birthday quiz','Choose one answer for each of the ten questions.');
    const stage=game.querySelector('.letter-stage');
    const counter=document.createElement('span');counter.className='letter-question-counter';counter.textContent=`Question ${current+1} / 10`;stage.append(counter);
    const title=document.createElement('div');title.className='letter-question-text';title.textContent=item.q;stage.append(title);
    const choices=item.a.map((answer,index)=>({answer,correct:index===item.correct}));
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    let answered=false;
    choices.forEach((choice,i)=>{
      const button=region(game,`${'ABCD'[i]}. ${choice.answer}`,[778,741+i*52,207,47],()=>{
        if(answered)return;answered=true;
        if(choice.correct)score++;
        game.querySelectorAll('.letter-answer').forEach((el,index)=>{el.disabled=true;if(choices[index].correct)el.classList.add('answer-correct');});
        if(!choice.correct)button.classList.add('answer-wrong');
        game.querySelector('.letter-feedback').textContent=choice.correct?'That is right!':'Good try! The correct answer is highlighted.';
        action(game,current===9?'See your result':'Next question',()=>{current++;question();}).focus({preventScroll:true});
      },'letter-answer');
      const badge=document.createElement('span');badge.className='letter-answer-badge';badge.textContent='ABCD'[i];
      const text=document.createElement('span');text.textContent=choice.answer;button.append(badge,text);
    });
    game.querySelector('.letter-feedback').textContent=`Question ${current+1} of 10`;
  }
  function results(){
    const game=scene('result','Quiz complete!','A little celebration, just for you, Grace.');
    const total=document.createElement('span');total.className='letter-result-score';total.textContent=`${score} / 10`;total.setAttribute('aria-label',`${score} out of 10 correct`);game.querySelector('.letter-stage').append(total);
    region(game,'Try the quiz again',[1090,915,198,64],startQuiz);
    region(game,'Next: birthday credits',[1307,914,185,66],()=>finishGame('Quiz complete!',`You answered ${score} out of 10 questions correctly. A special letter and a birthday adventure made with love for you, Grace.`));
    game.querySelector('.letter-feedback').textContent=`You answered ${score} out of 10 correctly. Tap “Next” to read your birthday credits.`;
  }
  hunt();
}

if(location.hash==='#letters')startGame('letters');
