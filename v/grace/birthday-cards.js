// Edit these sample messages, or use "Write your messages" below the game.
// Optional: image is a local image path; move is the number of bonus spaces.
window.GRACE_CARD_DECKS = {
  fact: [
    { title: 'A little reminder', text: 'You make ordinary days feel special. I hope today makes you feel just as loved.', hearts: 1 },
    { title: 'My favorite thing', text: 'Getting to share little moments with you is one of my favorite things.', hearts: 1 },
    { title: 'Made for you', text: 'Every part of this birthday adventure was made with you in mind.', hearts: 1 },
    { title: 'Just being you', text: 'You do not have to do anything extraordinary to make my day better. Just being you is enough.', hearts: 1 }
  ],
  surprise: [
    { title: 'A pocket full of love', text: 'Surprise! Two little hearts for someone who deserves a whole collection.', hearts: 2 },
    { title: 'A tiny garden', text: 'A little birthday garden, just for you. Here is a picture to keep along the way.', hearts: 1, image: 'images/puzzles/garden-flowers.svg' },
    { title: 'A happy little detour', text: 'The blossoms have a surprise for you: move ahead two spaces!', hearts: 1, move: 2 },
    { title: 'Your birthday wish', text: 'Make a wish. I hope the year ahead brings you so many reasons to smile.', hearts: 1 }
  ],
  event: [
    { title: 'Birthday picnic', text: 'A picnic is waiting under the cherry blossoms. Take a heart and enjoy this little moment.', hearts: 1 },
    { title: 'The lantern shortcut', text: 'Follow the glowing lanterns! Move ahead two spaces on your birthday adventure.', move: 2 },
    { title: 'A cake break', text: 'There is always time for cake on your birthday. This slice comes with a little extra love.', hearts: 1, image: 'images/puzzles/birthday-cake.svg' },
    { title: 'A moment to celebrate', text: 'Today is for celebrating you, and all the little things that make you wonderful.', hearts: 1 }
  ]
};

window.GRACE_DATE_CARD = {
  title: 'A little letter just for you',
  text: 'Dear Grace,\n\nI wanted to save this little moment just for us. Every day is brighter with you in my life. I hope your birthday reminds you how loved, wonderful, and special you are to me.\n\nHere is to more little adventures together.\n\nHappy birthday!\n\nWith all my love,',
  hearts: 2,
  secretLetter: true
};
