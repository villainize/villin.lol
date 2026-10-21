(() => {
const key='grace-letter-quiz-v1';
const notes=[
    'Grace, you make ordinary days feel special.',
    'Your smile is one of my favorite things.',
    'The world is a little brighter with you in it.',
    'You deserve a day full of all your favorite things.',
    'Every little memory with you means so much to me.',
    'I hope today makes you feel as loved as you are.',
    'You have such a beautiful, kind heart.',
    'Being around you is a reason to smile.',
    'Here is a tiny paper hug, just for you.',
    'You make the little moments worth remembering.',
    'May your birthday wishes turn into wonderful memories.',
    'You deserve kindness, happiness, and an extra slice of cake.',
    'There is nobody quite like you, Grace.',
    'Thank you for being your lovely self.',
    'I am so glad I get to celebrate you.',
    'You bring so much warmth to the people around you.',
    'A little reminder: you are appreciated more than you know.',
    'I hope this next year brings you a thousand reasons to smile.',
    'You are my favorite reason to make something special.',
    'Some days need a little magic. You bring your own.',
    'If this letter could hold a hug, it would be a big one.',
    'Here is to more laughter and happy memories together.',
    'Happy birthday, Grace. You are so very loved.'
  ];
const questions = [
  { q: 'Who is this birthday adventure for?', a: ['Grace', 'A dragon', 'The mail carrier', 'A penguin'], correct: 0 },
  { q: 'What is a classic birthday treat?', a: ['Birthday cake', 'A paper clip', 'Plain lettuce', 'A shoe'], correct: 0 },
  { q: 'What do people often make before blowing out candles?', a: ['A wish', 'A sandwich', 'A phone call', 'A snowball'], correct: 0 },
  { q: 'Which one is a party decoration?', a: ['A balloon', 'A shovel', 'A toaster', 'A rain boot'], correct: 0 },
  { q: 'What do you say to someone on their birthday?', a: ['Happy birthday!', 'Good luck with taxes!', 'See you next winter!', 'Please be quiet!'], correct: 0 },
  { q: 'Which is a lovely way to celebrate?', a: ['Spend time with people you love', 'Do extra chores', 'Cancel the cake', 'Forget the party'], correct: 0 },
  { q: 'What might be tucked inside a birthday card?', a: ['A kind note', 'A house key', 'A spoon', 'A sock'], correct: 0 },
  { q: 'What do candles do on a birthday cake?', a: ['Glow while you make a wish', 'Sing by themselves', 'Turn into balloons', 'Dance the tango'], correct: 0 },
  { q: 'What is the best thing to give Grace today?', a: ['Lots of love', 'A broken umbrella', 'A math test', 'A muddy boot'], correct: 0 },
  { q: 'One last time: who deserves the happiest birthday?', a: ['Grace!', 'The birthday cake', 'A houseplant', 'A mailbox'], correct: 0 }
];
const defaults=()=>({notes:[...notes],questions:structuredClone(questions),opening:{title:'Dear Grace,',text:'Happy birthday to someone who makes the world a little brighter just by being in it. I hope today brings you all the laughter, love, and lovely little surprises you deserve.\n\nHere\u2019s a tiny birthday adventure made just for you. Pick a game, have some fun, and remember how very loved you are.',signoff:'Wishing you the happiest day, \u2661'},puzzleLetter:{title:'Every piece belongs together.',text:'All 150 pieces connected. A birthday picture made with love, just for you, Grace.'}});
function valid(c){return c && Array.isArray(c.notes) && c.notes.length===23 && c.notes.every(n=>typeof n==='string'&&n.trim()) && Array.isArray(c.questions)&&c.questions.length===10&&c.questions.every(q=>typeof q.q==='string'&&q.q.trim()&&Array.isArray(q.a)&&q.a.length===4&&q.a.every(a=>typeof a==='string'&&a.trim())&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);}
function read(){const fresh=defaults();try{const c=JSON.parse(localStorage.getItem(key));if(!valid(c))return fresh;for(const section of ['opening','puzzleLetter'])for(const field of Object.keys(fresh[section]))if(typeof c[section]?.[field]==='string')fresh[section][field]=c[section][field];return {...c,opening:fresh.opening,puzzleLetter:fresh.puzzleLetter};}catch{return fresh;}}
window.GraceLetterSettings={key,defaults,read,valid};
})();
