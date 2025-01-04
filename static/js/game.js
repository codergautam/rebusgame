class PuzzleGame {
    constructor() {
        this.puzzles = null;
        this.currentPuzzle = null;
        this.startTime = null;
        this.attempts = 0;
        this.timer = null;
        
        this.loadPuzzles();
        this.setupEventListeners();
    }

    async loadPuzzles() {
        try {
            const response = await fetch('/puzzles/puzzles.json');
            this.puzzles = await response.json();
            
            if (window.location.pathname === '/') {
                this.handleHomePage();
            } else if (window.location.pathname === '/puzzles') {
                this.renderPuzzlesList();
            }
        } catch (error) {
            console.error('Error loading puzzles:', error);
        }
    }

    setupEventListeners() {
        const submitButton = document.getElementById('submit-answer');
        const answerInput = document.getElementById('answer-input');
        
        if (submitButton && answerInput) {
            submitButton.addEventListener('click', () => this.checkAnswer());
            answerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.checkAnswer();
            });
        }
    }

    handleHomePage() {
        const urlParams = new URLSearchParams(window.location.search);
        const puzzleId = urlParams.get('id');
        
        if (puzzleId) {
            this.loadPuzzle(puzzleId);
        } else {
            this.loadRandomPuzzle();
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
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;
        
        this.startTime = Date.now();
        this.startTimer();
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
        const attemptsDeduction = this.attempts * 100;
        
        return Math.max(100, basePoints - timeDeduction - attemptsDeduction);
    }

    checkAnswer() {
        const input = document.getElementById('answer-input');
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = this.currentPuzzle.answer.toLowerCase();
        
        this.attempts++;
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;
        
        if (userAnswer === correctAnswer) {
            clearInterval(this.timer);
            const points = this.calculatePoints();
            this.savePuzzleCompletion(this.currentPuzzle.id, points);
            this.showMessage(`Correct! You earned ${points} points!`, 'success');
            setTimeout(() => window.location.href = '/', 2000);
        } else {
            this.showMessage('Incorrect answer, try again!', 'danger');
            input.value = '';
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

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});
