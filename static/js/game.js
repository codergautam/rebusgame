class PuzzleGame {
    constructor() {
        this.puzzles = null;
        this.currentPuzzle = null;
        this.startTime = null;
        this.attempts = 0;
        this.timer = null;
        this.hintsRevealed = 0;
        this.revealedLetters = new Set();
        this.newAchievements = false;
        this.activeLetterSpace = null;

        this.achievements = {
            'quick_solver': { name: 'Speed Demon', description: 'Solve a puzzle in under 30 seconds', type: 'bronze' },
            'no_hints': { name: 'Pure Genius', description: 'Solve a puzzle without using hints', type: 'silver' },
            'perfect_score': { name: 'Perfect Score', description: 'Get 1000 points in a single puzzle', type: 'gold' },
            'puzzle_master': { name: 'Puzzle Master', description: 'Complete 10 puzzles', type: 'gold' },
            'persistent': { name: 'Never Give Up', description: 'Solve a puzzle after 5 attempts', type: 'bronze' }
        };

        this.loadPuzzles();
        this.setupEventListeners();
        this.checkFirstVisit();
        this.updateAchievements();
    }

    async loadPuzzles() {
        try {
            const response = await fetch('/puzzles/puzzles.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.puzzles = await response.json();

            if (window.location.pathname === '/') {
                this.handleHomePage();
            } else if (window.location.pathname === '/puzzles') {
                this.renderPuzzlesList();
            }
        } catch (error) {
            console.error('Error loading puzzles:', error);
            document.getElementById('puzzle-title').textContent = 'Error loading puzzle';
        }
    }

    setupEventListeners() {
        const letterSpaces = document.getElementById('letter-spaces');
        const hintButton = document.getElementById('hint-button');
        const nextButton = document.getElementById('next-puzzle');

        if (letterSpaces) {
            letterSpaces.addEventListener('click', (e) => {
                const clickedSpace = e.target.closest('.letter-space');
                if (clickedSpace && !clickedSpace.classList.contains('revealed')) {
                    this.setActiveLetter(clickedSpace);
                }
            });

            document.addEventListener('keydown', (e) => {
                if (!this.currentPuzzle) return;

                if (e.key === 'Enter') {
                    this.checkAnswer();
                    return;
                }

                if (e.key === 'Backspace') {
                    this.handleBackspace();
                    return;
                }

                if (e.key === ' ') {
                    this.moveToNextWord();
                    return;
                }

                if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
                    this.handleLetterInput(e.key);
                }
            });
        }

        if (hintButton) {
            hintButton.addEventListener('click', () => this.showHint());
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => this.loadNextPuzzle());
        }

        const achievementsModal = document.getElementById('achievementsModal');
        if (achievementsModal) {
            achievementsModal.addEventListener('show.bs.modal', () => {
                this.clearAchievementNotification();
            });
        }
    }

    setActiveLetter(letterSpace) {
        const allSpaces = document.querySelectorAll('.letter-space');
        allSpaces.forEach(space => space.classList.remove('active', 'focused'));

        if (letterSpace) {
            letterSpace.classList.add('active', 'focused');
            this.activeLetterSpace = letterSpace;
        }
    }

    handleLetterInput(letter) {
        if (!this.activeLetterSpace || this.activeLetterSpace.classList.contains('revealed')) {
            const emptySpace = Array.from(document.querySelectorAll('.letter-space'))
                .find(space => !space.textContent.trim() && !space.classList.contains('revealed'));

            if (emptySpace) {
                this.setActiveLetter(emptySpace);
            } else {
                return;
            }
        }

        this.activeLetterSpace.textContent = letter.toUpperCase();

        const nextSpace = Array.from(document.querySelectorAll('.letter-space'))
            .find(space =>
                !space.textContent.trim() &&
                !space.classList.contains('revealed') &&
                space !== this.activeLetterSpace
            );

        if (nextSpace) {
            this.setActiveLetter(nextSpace);
        }
    }

    handleBackspace() {
        if (!this.activeLetterSpace) {
            const lastFilledSpace = Array.from(document.querySelectorAll('.letter-space'))
                .reverse()
                .find(space =>
                    space.textContent.trim() &&
                    !space.classList.contains('revealed')
                );

            if (lastFilledSpace) {
                this.setActiveLetter(lastFilledSpace);
            }
            return;
        }

        if (this.activeLetterSpace.classList.contains('revealed')) {
            const prevSpace = Array.from(document.querySelectorAll('.letter-space'))
                .reverse()
                .find(space =>
                    !space.classList.contains('revealed') &&
                    space.textContent.trim()
                );

            if (prevSpace) {
                this.setActiveLetter(prevSpace);
            }
            return;
        }

        this.activeLetterSpace.textContent = '';

        const prevSpace = Array.from(document.querySelectorAll('.letter-space'))
            .reverse()
            .find(space =>
                space.textContent.trim() &&
                !space.classList.contains('revealed') &&
                space !== this.activeLetterSpace
            );

        if (prevSpace) {
            this.setActiveLetter(prevSpace);
        }
    }

    moveToNextWord() {
        const allSpaces = Array.from(document.querySelectorAll('.letter-space'));
        const currentIndex = allSpaces.indexOf(this.activeLetterSpace);

        if (currentIndex === -1) return;

        let nextWordStart = allSpaces
            .slice(currentIndex + 1)
            .find(space =>
                space.classList.contains('word-start') &&
                !space.classList.contains('revealed')
            );

        if (nextWordStart) {
            this.setActiveLetter(nextWordStart);
        }
    }

    checkFirstVisit() {
        if (!localStorage.getItem('hasVisited')) {
            localStorage.setItem('hasVisited', 'true');
            const tutorialModal = new bootstrap.Modal(document.getElementById('tutorialModal'));
            tutorialModal.show();
        }
    }

    handleHomePage() {
        this.updateTotalPoints();
        const urlParams = new URLSearchParams(window.location.search);
        const puzzleId = urlParams.get('id');

        if (puzzleId) {
            this.loadPuzzle(puzzleId);
        } else {
            this.loadRandomPuzzle();
        }
    }

    updateTotalPoints() {
        const scores = this.getScores();
        const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const totalPointsElements = document.querySelectorAll('#total-points, #modal-total-points');
        totalPointsElements.forEach(element => {
            element.textContent = total;
        });
    }

    showAchievementNotification() {
        const notification = document.getElementById('achievementNotification');
        if (notification) {
            notification.classList.remove('d-none');
            notification.classList.add('badge-notification');
        }
    }

    clearAchievementNotification() {
        const notification = document.getElementById('achievementNotification');
        if (notification) {
            notification.classList.add('d-none');
            notification.classList.remove('badge-notification');
            this.newAchievements = false;
        }
    }

    updateAchievements() {
        const unlockedAchievements = this.getUnlockedAchievements();
        ['badges-container', 'modal-badges-container'].forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = '';
            Object.entries(unlockedAchievements).forEach(([id, achievement]) => {
                const badge = document.createElement('div');
                badge.className = `achievement-badge ${achievement.type}`;
                badge.innerHTML = `
                    <span>${achievement.name}</span>
                    <span class="ms-2 opacity-75">${achievement.description}</span>
                `;
                container.appendChild(badge);
            });
        });
    }

    loadNextPuzzle() {
        const completed = this.getCompletedPuzzles();
        const currentId = parseInt(this.currentPuzzle.id);
        const allPuzzleIds = Object.keys(this.puzzles).map(Number).sort((a, b) => a - b);
        const currentIndex = allPuzzleIds.indexOf(currentId);

        let nextId = null;
        for (let i = currentIndex + 1; i < allPuzzleIds.length; i++) {
            if (!completed.includes(allPuzzleIds[i].toString())) {
                nextId = allPuzzleIds[i];
                break;
            }
        }

        if (nextId === null) {
            for (let i = 0; i < currentIndex; i++) {
                if (!completed.includes(allPuzzleIds[i].toString())) {
                    nextId = allPuzzleIds[i];
                    break;
                }
            }
        }

        if (nextId !== null) {
            this.loadPuzzle(nextId.toString());
        } else {
            this.showMessage('Congratulations! You\'ve completed all puzzles!', 'success');
        }
    }

    loadRandomPuzzle() {
        const completed = this.getCompletedPuzzles();
        const available = Object.keys(this.puzzles).filter(id => !completed.includes(id));

        if (available.length === 0) {
            this.showMessage('Congratulations! You\'ve completed all puzzles!', 'success');
            return;
        }

        const randomId = available[Math.floor(Math.random() * available.length)];
        this.loadPuzzle(randomId);
    }

    loadPuzzle(id) {
        this.currentPuzzle = {
            id,
            ...this.puzzles[id]
        };

        document.getElementById('puzzle-title').textContent = `Puzzle #${id}`;
        document.getElementById('puzzle-image').src = `/puzzles/${this.currentPuzzle.imgPath}`;

        this.attempts = 0;
        this.hintsRevealed = 0;
        this.revealedLetters.clear();
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;
        document.getElementById('answer-input').value = '';
        document.getElementById('feedback').classList.add('d-none');

        document.getElementById('next-puzzle').classList.add('d-none');
        document.getElementById('answer-input').disabled = false;
        document.getElementById('submit-answer').disabled = false;
        document.getElementById('hint-button').disabled = false;

        this.startTime = Date.now();
        this.startTimer();
        this.updateLetterSpaces();
        this.updateNextButtonVisibility();
        this.activeLetterSpace = null;
    }

    updateNextButtonVisibility() {
        const completed = this.getCompletedPuzzles();
        const currentId = parseInt(this.currentPuzzle.id);
        const allPuzzleIds = Object.keys(this.puzzles).map(Number).sort((a, b) => a - b);
        const currentIndex = allPuzzleIds.indexOf(currentId);

        const hasNextUncompleted = allPuzzleIds.slice(currentIndex + 1).some(id =>
            !completed.includes(id.toString())
        ) || allPuzzleIds.slice(0, currentIndex).some(id =>
            !completed.includes(id.toString())
        );

        const nextButton = document.getElementById('next-puzzle');
        if (!hasNextUncompleted) {
            nextButton.classList.add('d-none');
        }
    }

    updateLetterSpaces(fromInput = false) {
        const letterSpacesContainer = document.getElementById('letter-spaces');
        if (!this.currentPuzzle || !letterSpacesContainer) return;

        const answer = this.currentPuzzle.answer;
        let html = '';
        const words = answer.split(' ');

        words.forEach((word, wordIndex) => {
            const wordContainer = document.createElement('div');
            wordContainer.className = 'd-inline-block me-3 mb-2';

            word.split('').forEach((letter, letterIndex) => {
                const span = document.createElement('span');
                span.className = `letter-space ${letterIndex === 0 ? 'word-start' : ''}`;

                const letterKey = `${wordIndex}-${letterIndex}`;

                if ((letterIndex === 0 && this.hintsRevealed > wordIndex) ||
                    this.revealedLetters.has(letterKey)) {
                    span.textContent = letter;
                    span.classList.add('revealed');
                } else {
                    span.textContent = '_';
                }

                wordContainer.appendChild(span);
            });

            html += wordContainer.outerHTML;
        });

        letterSpacesContainer.innerHTML = html;
    }

    showHint() {
        const words = this.currentPuzzle.answer.split(' ');
        const allLetterPositions = [];

        if (this.hintsRevealed < words.length) {
            this.hintsRevealed++;
        } else {
            words.forEach((word, wordIndex) => {
                word.split('').forEach((_, letterIndex) => {
                    const letterKey = `${wordIndex}-${letterIndex}`;
                    if (letterIndex !== 0 && !this.revealedLetters.has(letterKey)) {
                        allLetterPositions.push(letterKey);
                    }
                });
            });

            if (allLetterPositions.length > 0) {
                const randomIndex = Math.floor(Math.random() * allLetterPositions.length);
                this.revealedLetters.add(allLetterPositions[randomIndex]);
            } else {
                this.showMessage('No more hints available!', 'warning');
                return;
            }
        }

        this.updateLetterSpaces();

        const currentPoints = parseInt(document.getElementById('points').textContent.split(': ')[1]);
        document.getElementById('points').textContent = `Points: ${Math.max(0, currentPoints - 50)}`;
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent =
                `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    calculatePoints() {
        const timeElapsed = (Date.now() - this.startTime) / 1000;
        const basePoints = 1000;
        const timeDeduction = Math.floor(timeElapsed / 10) * 50;
        const attemptsDeduction = this.attempts * 50;
        const hintDeduction = (this.hintsRevealed + this.revealedLetters.size) * 50;

        return Math.max(100, basePoints - timeDeduction - attemptsDeduction - hintDeduction);
    }

    checkAchievements(points, timeElapsed, hintsUsed, attempts) {
        const achievements = {};

        if (timeElapsed <= 30) {
            achievements.quick_solver = this.achievements.quick_solver;
        }
        if (hintsUsed === 0) {
            achievements.no_hints = this.achievements.no_hints;
        }
        if (points === 1000) {
            achievements.perfect_score = this.achievements.perfect_score;
        }
        if (attempts >= 5) {
            achievements.persistent = this.achievements.persistent;
        }

        const completed = this.getCompletedPuzzles();
        if (completed.length >= 10) {
            achievements.puzzle_master = this.achievements.puzzle_master;
        }

        this.saveAchievements(achievements);
        this.updateAchievements();
        if (Object.keys(achievements).length > 0) this.newAchievements = true;
        this.showAchievementNotification();
    }

    saveAchievements(newAchievements) {
        const current = JSON.parse(localStorage.getItem('achievements') || '{}');
        const updated = { ...current, ...newAchievements };
        localStorage.setItem('achievements', JSON.stringify(updated));
    }

    getUnlockedAchievements() {
        return JSON.parse(localStorage.getItem('achievements') || '{}');
    }


    checkAnswer() {
        const letterSpaces = document.querySelectorAll('.letter-space');
        const userAnswer = Array.from(letterSpaces)
            .map(space => space.textContent.trim() || '_')
            .join('');
        const correctAnswer = this.currentPuzzle.answer.toUpperCase();

        this.attempts++;
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;

        if (userAnswer.replace(/_/g, '') === correctAnswer.replace(/ /g, '')) {
            clearInterval(this.timer);
            const timeElapsed = (Date.now() - this.startTime) / 1000;
            const points = this.calculatePoints();

            this.checkAchievements(
                points,
                timeElapsed,
                this.hintsRevealed + this.revealedLetters.size,
                this.attempts
            );

            this.savePuzzleCompletion(this.currentPuzzle.id, points);
            this.showMessage(`Correct! You earned ${points} points!`, 'success');
            this.updateTotalPoints();

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            document.getElementById('next-puzzle').classList.remove('d-none');
            letterSpaces.forEach(space => {
                space.style.pointerEvents = 'none';
                if (!space.classList.contains('revealed')) {
                    space.textContent = correctAnswer[Array.from(letterSpaces).indexOf(space)];
                }
            });
            document.getElementById('hint-button').disabled = true;

            this.updateNextButtonVisibility();
        } else {
            this.showMessage('Incorrect answer, try again!', 'danger');
            letterSpaces.forEach(space => {
                if (!space.classList.contains('revealed')) {
                    space.textContent = '';
                }
            });
            this.setActiveLetter(Array.from(letterSpaces).find(space => !space.classList.contains('revealed')));
        }
    }

    showMessage(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `alert alert-${type} ${type === 'danger' ? 'feedback-wrong' : 'feedback-correct'}`;
        feedback.classList.remove('d-none');
    }

    savePuzzleCompletion(puzzleId, points) {
        const completed = this.getCompletedPuzzles();
        const scores = this.getScores();

        if (!completed.includes(puzzleId)) {
            completed.push(puzzleId);
            localStorage.setItem('completedPuzzles', JSON.stringify(completed));
        }

        scores[puzzleId] = points;
        localStorage.setItem('puzzleScores', JSON.stringify(scores));
    }

    getCompletedPuzzles() {
        return JSON.parse(localStorage.getItem('completedPuzzles') || '[]');
    }

    getScores() {
        return JSON.parse(localStorage.getItem('puzzleScores') || '{}');
    }

    renderPuzzlesList() {
        const grid = document.getElementById('puzzles-grid');
        const completed = this.getCompletedPuzzles();
        const scores = this.getScores();

        Object.entries(this.puzzles).forEach(([id, puzzle]) => {
            const isCompleted = completed.includes(id);
            const points = scores[id] || 0;

            const card = document.createElement('div');
            card.className = 'col-md-4 mb-4';
            card.innerHTML = `
                <div class="card puzzle-card ${isCompleted ? 'completed' : ''}">
                    <img src="/puzzles/${puzzle.imgPath}" class="card-img-top" alt="Puzzle ${id}">
                    <div class="card-body">
                        <h5 class="card-title">Puzzle #${id}</h5>
                        ${isCompleted ?
                `<span class="badge bg-success points">Points: ${points}</span>` :
                '<span class="badge bg-secondary points">Not completed</span>'}
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `/?id=${id}`;
            });

            grid.appendChild(card);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});