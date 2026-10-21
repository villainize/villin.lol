const screens = [...document.querySelectorAll('.screen')];
const content = document.querySelector('#game-content');
let activeCleanup = () => {};

function showScreen(id) {
  if(window.birthdayLocked?.())id='countdown';
  screens.forEach(screen => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle('active', active);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelector('#open-letter').addEventListener('click', () => {
  const letter=window.GraceLetterSettings.read().opening;
  document.querySelector('#letter-title').textContent=letter.title;
  const card=document.querySelector('.letter-card');
  card.querySelectorAll(':scope > p:not(.signoff)').forEach(p=>p.remove());
  const message=document.createElement('p');message.textContent=letter.text;message.style.whiteSpace='pre-wrap';
  card.querySelector('.signoff').before(message);card.querySelector('.signoff').textContent=letter.signoff;
  showScreen('letter');
});
document.querySelector('#to-games').addEventListener('click', () => showScreen('games'));
document.querySelector('#back-games').addEventListener('click', () => {
  activeCleanup();
  showScreen('games');
});
document.querySelectorAll('.game-card').forEach(card => card.addEventListener('click', () => startGame(card.dataset.game)));

function panel(kicker, title, help, inner) {
  content.innerHTML = `<div class="game-panel"><div class="eyebrow">${kicker}</div><h2>${title}</h2><p class="game-help">${help}</p>${inner}</div>`;
}

function startGame(name) {
  if(window.birthdayLocked?.()){showScreen('countdown');return;}
  activeCleanup();
  activeCleanup = () => {};
  document.querySelector('#play').classList.toggle('wide-puzzle', name === 'puzzle');
  document.querySelector('#play').classList.toggle('art-board', name === 'path');
  document.querySelector('#play').classList.toggle('art-letter', name === 'letters');
  showScreen('play');
  if (name === 'puzzle') puzzleGame();
  if (name === 'path') pathGame();
  if (name === 'letters') letterGame();
}

function finishGame(title, message) {
  activeCleanup();
  activeCleanup = () => {};
  panel('A LITTLE CREDIT · MADE WITH LOVE FOR GRACE', '', '',
    '<div class="credits-note">Birthday adventure made especially for Grace, with love. <span aria-hidden="true">♡</span></div><button class="button primary" id="credits-home">Choose another game <span>→</span></button>');
  content.querySelector('.game-panel h2').textContent=title;
  const note=content.querySelector('.game-help');note.textContent=message;note.style.whiteSpace='pre-wrap';
  content.querySelector('#credits-home').addEventListener('click', () => showScreen('games'));
}

const puzzleScenes = [
  { name: 'Puzzle 1', src: './images/puzzles/puzzle1.png' },
  { name: 'Puzzle 2', src: './images/puzzles/puzzle2.png' },
  { name: 'Puzzle 3', src: './images/puzzles/puzzle3.png' },
  { name: 'Puzzle 4', src: './images/puzzles/puzzle4.png' }
];

// The advanced jigsaw player is implemented in jigsaw-player.js.

// The illustrated board game is implemented in birthday-board.js.



// The illustrated letter hunt and quiz are implemented in letter-game.js.
