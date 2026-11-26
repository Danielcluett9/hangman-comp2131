//COMP2132 Project
//Hangman Game


/*
=========================    GET THE ELEMENTS     ==============================
*/
const hangmanImage     = document.getElementById('hangman-image');
const wrongGuessesText = document.getElementById('wrong-guesses');
const maxGuessesText   = document.getElementById('max-guesses');
const chancesBox       = document.getElementById('chances');
const hintText         = document.getElementById('hint');
const wordDisplay      = document.getElementById('word-display');
const guessForm        = document.getElementById('guess-form');
const letterInput      = document.getElementById('letter-input');
const guessSubmit      = document.getElementById('guess-submit');
const messageText      = document.getElementById('message');
const letterButtonsBox = document.getElementById('letter-buttons');
const resultPanel      = document.getElementById('result-panel');
const resultImage      = document.getElementById('result-image');
const resultTitle      = document.getElementById('result-title');
const resultText       = document.getElementById('result-text');
const btnPlayAgain     = document.getElementById('btn-play-again');
const scoreWinsText    = document.getElementById('score-wins');
const scoreLossesText  = document.getElementById('score-losses');
const scoreStreakText  = document.getElementById('score-streak');


/*
=======================     PAGE STATE VARIABLES     ================================
*/
//relative paths only (no leading /)
const wordsFile   = 'data/words.json';
const imageFolder = 'images/';

const alphabet = 'abcdefghijklmnopqrstuvwxyz';

//regular expression: exactly one letter from a to z
const singleLetterPattern = /^[a-z]$/;

const fadeSpeed = 0.04;

let wordList = [];

let lastWord = '';


/*
=============================    OBJECTS     ===============================
*/

//the hangman game object: keeps track of one game at a time
const hangmanGame = {
    word: '',
    hint: '',
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrongGuesses: 6,
    isOver: false,

    //begin a new game using one {word, hint} entry from the JSON data
    start: function( entry ){
        this.word           = entry.word.toLowerCase();
        this.hint           = entry.hint;
        this.guessedLetters = [];
        this.wrongGuesses   = 0;
        this.isOver         = false;
    },

    //Returns true if the letter already has been guessed
    alreadyGuessed: function( letter ){
        return this.guessedLetters.includes(letter);
    },

    //record geuss true if letter is in the word
    guess: function( letter ){
        this.guessedLetters.push(letter);

        if( this.word.includes(letter) ){
            return true;
        }else{
            this.wrongGuesses++;
            return false;
        }
    },

    //the player wins when every letter of the word has been guessed
    hasWon: function(){
        //boolean flag: assume every letter is found until one is not
        let allLettersFound = true;

        for( const letter of this.word ){
            if( !this.guessedLetters.includes(letter) ){
                allLettersFound = false;
                break;
            }
        }
        return allLettersFound;
    },

    //the player loses if the hangman drawing is shown
    hasLost: function(){
        return this.wrongGuesses >= this.maxWrongGuesses;
    },

    //how many wrong guesses are left
    chancesLeft: function(){
        return this.maxWrongGuesses - this.wrongGuesses;
    }
};


// keeps track of the score across multiple games: wins, losses and current winning streak
const scoreBoard = {
    wins: 0,
    losses: 0,
    streak: 0,

    addWin: function(){
        this.wins++;
        this.streak++;
    },

    addLoss: function(){
        this.losses++;
        this.streak = 0;
    }
};


/*
============================     LOAD THE WORDs   =================================
*/
fetch(wordsFile)
    .then(function( response ){
        //a missing file is not an error for fetch, so check the status
        if( !response.ok ){
            throw new Error(`Could not load ${wordsFile} (status ${response.status})`);
        }
        //convert the JSON text into a JavaScript object
        return response.json();
    })
    .then(function( data ){
        wordList = data.words;

        createLetterButtons();
        startNewGame();
    })
    .catch(function( error ){
        console.error(error);
        hintText.textContent = 'Sorry, the words could not be loaded. Open this page with a web server (eg: Live Server).';
    });


/*
=======================     EVENTS   ============================
*/

//the input box: guess when the form is submitted
guessForm.addEventListener('submit', function( event ){

    //there is no server side script, never send the form
    event.preventDefault();

    //treat upper and lower case letters the same
    const letter = letterInput.value.trim().toLowerCase();

    //clear the box ready for the next letter
    letterInput.value = '';
    letterInput.focus();

    //validate the input before making a guess
    if( letter === '' ){
        showMessage('Please type a letter first.', 'warning');
    }else if( !singleLetterPattern.test(letter) ){
        showMessage(`"${letter}" is not a letter. Use A to Z only.`, 'warning');
    }else if( hangmanGame.alreadyGuessed(letter) ){
        showMessage(`You already guessed "${letter.toUpperCase()}". Try another letter.`, 'warning');
    }else{
        makeGuess(letter);
    }
});

//play again: reset everything and start a new game
btnPlayAgain.addEventListener('click', startNewGame);


/*
========================    FUNCTIONS   ==============================
*/

//build one button for each letter of the alphabet
function createLetterButtons(){

    let buttonsHTML = '';

    for( const letter of alphabet ){
        buttonsHTML += `<button class="letter-btn" data-letter="${letter}">${letter.toUpperCase()}</button>`;
    }

    letterButtonsBox.innerHTML = buttonsHTML;

    //clicking a letter button makes a guess with that letter
    const letterButtons = document.querySelectorAll('.letter-btn');

    letterButtons.forEach(function( button ){
        button.addEventListener('click', function(){
            makeGuess( this.getAttribute('data-letter') );
        });
    });
}

//pick a random {word, hint} entry, never the same word twice in a row
function getRandomEntry(){

    let entry;

    do{
        const randomIndex = Math.floor(Math.random() * wordList.length);
        entry = wordList[randomIndex];
    }while( entry.word === lastWord && wordList.length > 1 );

    lastWord = entry.word;
    return entry;
}

//reset everything and begin a new game
function startNewGame(){

    hangmanGame.start( getRandomEntry() );

    //hide the result panel from the last game
    resultPanel.classList.add('hidden');

    //enable every letter button and remove the correct/wrong colours
    const letterButtons = document.querySelectorAll('.letter-btn');

    letterButtons.forEach(function( button ){
        button.disabled = false;
        button.classList.remove('correct', 'wrong');
    });

    //enable the input box
    letterInput.disabled = false;
    guessSubmit.disabled = false;
    letterInput.value    = '';

    //show the new hint, the empty word and the empty gallows
    hintText.textContent       = hangmanGame.hint;
    maxGuessesText.textContent = hangmanGame.maxWrongGuesses;
    showMessage(`The word has ${hangmanGame.word.length} letters. Good luck!`, 'info');

    updateWordDisplay();
    updateHangman();

    fadeIn(wordDisplay);
    letterInput.focus();
}

//check one letter against the word and update the page
function makeGuess( letter ){

    //once a game is over no more guesses are allowed
    //(the buttons are disabled too, this is a second safety check)
    if( hangmanGame.isOver || hangmanGame.alreadyGuessed(letter) ){
        return;
    }

    const isCorrect = hangmanGame.guess(letter);

    //disable this letter so it cannot be chosen again this game
    const button = document.querySelector(`.letter-btn[data-letter="${letter}"]`);
    button.disabled = true;

    if( isCorrect ){
        button.classList.add('correct');
        showMessage(`Yes! "${letter.toUpperCase()}" is in the word.`, 'good');
        updateWordDisplay();
    }else{
        button.classList.add('wrong');
        showMessage(`Sorry, there is no "${letter.toUpperCase()}". ${hangmanGame.chancesLeft()} chances left.`, 'bad');
        updateHangman();
    }

    //is the game over?
    if( hangmanGame.hasWon() ){
        endGame(true);
    }else if( hangmanGame.hasLost() ){
        endGame(false);
    }
}

//show the guessed letters in their positions, blanks for the rest
//when revealAll is true (game lost) the missed letters are shown too
function updateWordDisplay( revealAll ){

    let wordHTML = '';

    for( const letter of hangmanGame.word )
    {
        if( hangmanGame.guessedLetters.includes(letter) )
        {
            wordHTML += `<span class="letter-slot found">${letter}</span>`;
        }else if( revealAll ) 
        {
            wordHTML += `<span class="letter-slot missed">${letter}</span>`;
        }else
        {
            wordHTML += '<span class="letter-slot">&nbsp;</span>';
        }
    }

    wordDisplay.innerHTML = wordHTML;
}

//show the hangman image that matches the number of wrong guesses
function updateHangman()
{
    const wrongGuesses = hangmanGame.wrongGuesses;

    hangmanImage.src = `${imageFolder}hangman-${wrongGuesses}.png`;
    hangmanImage.alt = `Hangman drawing, ${wrongGuesses} of ${hangmanGame.maxWrongGuesses} wrong guesses`;
    wrongGuessesText.textContent = wrongGuesses;
    let chancesHTML = '';

    for( let i = 1; i <= hangmanGame.maxWrongGuesses; i++ )
    {
        if( i <= wrongGuesses )
        {
            chancesHTML += '<span class="chance used">&times;</span>';
        }else
        {
            chancesHTML += '<span class="chance">&nbsp;</span>';
        }
    }
    chancesBox.innerHTML = chancesHTML;

    if( wrongGuesses > 0 )
    {
        fadeIn(hangmanImage);
    }
}

function endGame( playerWon )
    {
    hangmanGame.isOver = true;
    const letterButtons = document.querySelectorAll('.letter-btn');
    
    letterButtons.forEach(function( button )
{
        button.disabled = true;
    });

    letterInput.disabled = true;
    guessSubmit.disabled = true;
    const secretWord = hangmanGame.word.toUpperCase();

    if( playerWon )
    {
        scoreBoard.addWin();
        resultPanel.classList.remove('lost');
        resultPanel.classList.add('won');
        resultTitle.textContent = 'You Won!';
        resultText.innerHTML    = `You guessed <strong>${secretWord}</strong> with ${hangmanGame.wrongGuesses} wrong guesses.`;
        showMessage('Well done!', 'good');
    }else
    {
        scoreBoard.addLoss();

        updateWordDisplay(true);

        resultPanel.classList.remove('won');
        resultPanel.classList.add('lost');
        resultTitle.textContent = 'You Lost!';
        resultText.innerHTML    = `The word was <strong>${secretWord}</strong>.`;
        showMessage('Game over.', 'bad');
    }

    resultImage.src = hangmanImage.src;
    resultImage.alt = hangmanImage.alt;

    updateScoreBoard();

    resultPanel.classList.remove('hidden');
    fadeIn(resultPanel);
    btnPlayAgain.focus();
}

//update the wins, losses and streak numbers
function updateScoreBoard()
{
    scoreWinsText.textContent   = scoreBoard.wins;
    scoreLossesText.textContent = scoreBoard.losses;
    scoreStreakText.textContent = scoreBoard.streak;
}

//show a message under the input box
//type is 'info', 'good', 'bad' or 'warning' and matches a CSS class
function showMessage( text, type )
{
    messageText.textContent = text;
    messageText.className   = `message ${type}`;
}

//animation: fade an element in from invisible to fully visible
function fadeIn( element ){

    let opacity = 0;
    element.style.opacity = opacity;

    function fadeStep()
    {
        opacity = opacity + fadeSpeed;

        if( opacity >= 1 )
        {
            element.style.opacity = 1;
        }else
        {
            element.style.opacity = opacity;
            requestAnimationFrame(fadeStep);
        }
    }

    requestAnimationFrame(fadeStep);
}
