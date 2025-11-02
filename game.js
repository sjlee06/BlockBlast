// ========================================
// 게임 밸런스 설정 (여기서 난이도 조정 가능)
// ========================================
const GAME_CONFIG = {
    // 보드 설정
    ROWS: 8,
    COLS: 8,
    INITIAL_FILLED_ROWS: 4, // 게임 시작 시 채워진 행 수

    // 색상 설정 (4~6개 권장)
    COLORS: [
        { hex: '#E74C3C', name: '빨강' },
        { hex: '#3498DB', name: '파랑' },
        { hex: '#2ECC71', name: '초록' },
        { hex: '#F39C12', name: '주황' }
    ],

    // 난이도 설정
    TURNS_PER_NEW_ROW: 1, // n턴마다 새로운 줄 추가 (1=매우 어려움, 2=어려움, 3=보통)
    POINTS_PER_BLOCK: 100, // 블록 1개당 점수

    // 구글 시트 API 설정
    // GOOGLE_SHEET_SETUP.md 가이드를 따라 URL을 설정하세요
    GOOGLE_SHEET_API_URL: 'https://script.google.com/macros/s/AKfycbzGQ6TgwYGoI_JYjlyuPfDunsG_wpDtcYdlqQ30sYjy-qrjP6YcdZjJDScsqZW_5GdN/exec', // 예: 'https://script.google.com/macros/s/YOUR_ID/exec'
    LEADERBOARD_LIMIT: 10, // 표시할 최대 리더보드 항목 수
};

// 게임 설정 (GAME_CONFIG에서 자동 추출)
const ROWS = GAME_CONFIG.ROWS;
const COLS = GAME_CONFIG.COLS;
const COLORS = GAME_CONFIG.COLORS.map(c => c.hex);
const COLOR_NAMES = GAME_CONFIG.COLORS.map(c => c.name);
const INITIAL_FILLED_ROWS = GAME_CONFIG.INITIAL_FILLED_ROWS;

// 게임 상태
let board = [];
let score = 0;
let turnCount = 0;
let gameOver = false;

// DOM 요소
const gameBoard = document.getElementById('game-board');
const currentScoreEl = document.getElementById('current-score');
const turnCountEl = document.getElementById('turn-count');
const colorButtonsContainer = document.getElementById('color-buttons');
const restartBtn = document.getElementById('restart-btn');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const highscoreForm = document.getElementById('highscore-form');
const playerNameInput = document.getElementById('player-name');
const submitScoreBtn = document.getElementById('submit-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');

// 색상 버튼 동적 생성 (더 이상 사용하지 않음)
function createColorButtons() {
    // 색상 버튼은 더 이상 사용하지 않습니다
    if (colorButtonsContainer) {
        colorButtonsContainer.style.display = 'none';
    }
}

// 게임 초기화
function initGame() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    score = 0;
    turnCount = 0;
    gameOver = false;

    // 하단 n줄에 랜덤 블록 채우기
    for (let row = ROWS - INITIAL_FILLED_ROWS; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = Math.floor(Math.random() * COLORS.length);
        }
    }

    // 색상 버튼 생성 (게임 설정에 따라)
    createColorButtons();

    updateDisplay();
    renderBoard();
    gameOverModal.classList.add('hidden');
}

// 게임 보드 렌더링
function renderBoard() {
    gameBoard.innerHTML = '';

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (board[row][col] !== null) {
                cell.classList.add('filled');
                cell.style.backgroundColor = COLORS[board[row][col]];
            }

            // 블록 클릭 이벤트 추가
            cell.addEventListener('click', () => handleCellClick(row, col));

            gameBoard.appendChild(cell);
        }
    }
}

// 화면 업데이트
function updateDisplay() {
    currentScoreEl.textContent = score;
    turnCountEl.textContent = turnCount;
}

// DFS로 인접한 같은 색상 블록 찾기
function findConnectedBlocks(startRow, startCol) {
    const color = board[startRow][startCol];
    if (color === null) return [];

    const visited = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    const connectedBlocks = [];

    // DFS 탐색
    function dfs(row, col) {
        // 범위 체크
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
        // 방문 체크
        if (visited[row][col]) return;
        // 블록 존재 및 색상 일치 체크
        if (board[row][col] !== color) return;

        visited[row][col] = true;
        connectedBlocks.push({ row, col });

        // 4방향 탐색 (상, 하, 좌, 우)
        dfs(row - 1, col); // 위
        dfs(row + 1, col); // 아래
        dfs(row, col - 1); // 왼쪽
        dfs(row, col + 1); // 오른쪽
    }

    dfs(startRow, startCol);
    return connectedBlocks;
}

// 셀 클릭 핸들러
function handleCellClick(row, col) {
    if (gameOver) return;

    // 빈 칸 클릭 시 무시
    if (board[row][col] === null) return;

    // 인접한 같은 색상 블록 찾기
    const blocksToDestroy = findConnectedBlocks(row, col);

    // 인접한 블록이 없으면 (혼자 있는 블록) 아무 동작도 하지 않음
    if (blocksToDestroy.length <= 1) {
        return;
    }

    // 블록 파괴 애니메이션
    blocksToDestroy.forEach(({ row, col }) => {
        const cellIndex = row * COLS + col;
        const cell = gameBoard.children[cellIndex];
        cell.classList.add('destroyed');
    });

    // 애니메이션 후 블록 제거 및 중력 적용
    setTimeout(() => {
        // 블록 제거
        blocksToDestroy.forEach(({ row, col }) => {
            board[row][col] = null;
        });

        // 중력 적용
        applyGravity();

        // 스코어 업데이트
        const destroyedCount = blocksToDestroy.length;
        score += destroyedCount * GAME_CONFIG.POINTS_PER_BLOCK;

        // 턴 증가
        turnCount++;

        // n턴마다 새로운 블록 추가
        if (turnCount % GAME_CONFIG.TURNS_PER_NEW_ROW === 0) {
            const isGameOver = addNewRow();

            // 게임 오버면 화면 업데이트 후 종료
            if (isGameOver) {
                updateDisplay();
                renderBoard();
                return;
            }
        }

        updateDisplay();
        renderBoard();
    }, 500);
}

// 중력 적용 (각 열에서 빈 칸을 위로 올림)
function applyGravity() {
    for (let col = 0; col < COLS; col++) {
        // 각 열의 블록들을 아래부터 모으기
        const blocks = [];
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] !== null) {
                blocks.push(board[row][col]);
            }
        }

        // 열을 다시 채우기 (아래부터)
        for (let row = ROWS - 1; row >= 0; row--) {
            const blockIndex = ROWS - 1 - row;
            if (blockIndex < blocks.length) {
                board[row][col] = blocks[blockIndex];
            } else {
                board[row][col] = null;
            }
        }
    }
}

// 중력 적용 함수 제거 (더 이상 사용하지 않음)

// 새로운 줄 추가 (아래에서 위로 밀어올림)
function addNewRow() {
    // 게임 오버 체크: 어느 한 열이라도 맨 위 줄에 블록이 있으면 게임 오버
    for (let col = 0; col < COLS; col++) {
        if (board[0][col] !== null) {
            // 맨 위 줄(1번째)에 블록이 있는 상태에서 새 줄을 추가하면 게임 오버
            endGame();
            return true; // 게임 오버 발생
        }
    }

    // 모든 블록을 한 칸 위로 이동
    for (let row = 0; row < ROWS - 1; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = board[row + 1][col];
        }
    }

    // 맨 아래 줄에 새로운 랜덤 블록 추가
    for (let col = 0; col < COLS; col++) {
        board[ROWS - 1][col] = Math.floor(Math.random() * COLORS.length);
    }

    return false; // 게임 계속
}

// 게임 오버 체크 함수 제거 (addNewRow에서 직접 체크)

// 게임 종료
function endGame() {
    gameOver = true;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove('hidden');

    // 닉네임 입력창과 리더보드 로딩을 병렬로 처리
    if (GAME_CONFIG.GOOGLE_SHEET_API_URL) {
        // 하이스코어 체크 (즉시 실행, 리더보드 로딩과 무관)
        checkHighScore();
        // 리더보드 로드 (백그라운드에서 실행)
        loadLeaderboard();
    } else {
        leaderboardList.innerHTML = '<p class="error-message">구글 시트 API가 설정되지 않았습니다.<br>GOOGLE_SHEET_SETUP.md를 참고하세요.</p>';
    }
}

// ========================================
// 구글 시트 리더보드 기능
// ========================================

// 리더보드 캐시 (5초 동안 유효)
let leaderboardCache = null;
let leaderboardCacheTime = 0;
const CACHE_DURATION = 5000; // 5초

// 타임아웃 래퍼 함수
function fetchWithTimeout(url, timeout = 3000) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('요청 시간 초과')), timeout)
        )
    ]);
}

// 리더보드 로드
async function loadLeaderboard() {
    if (!GAME_CONFIG.GOOGLE_SHEET_API_URL) {
        leaderboardList.innerHTML = '<p class="error-message">구글 시트 API가 설정되지 않았습니다.<br>GOOGLE_SHEET_SETUP.md를 참고하세요.</p>';
        return;
    }

    leaderboardList.innerHTML = '<p class="loading">로딩 중...</p>';

    // 캐시 확인 (5초 이내)
    const now = Date.now();
    if (leaderboardCache && (now - leaderboardCacheTime) < CACHE_DURATION) {
        if (leaderboardCache.scores && leaderboardCache.scores.length > 0) {
            renderLeaderboard(leaderboardCache.scores);
        } else {
            leaderboardList.innerHTML = '<p class="loading">아직 기록이 없습니다.</p>';
        }
        return;
    }

    try {
        const response = await fetchWithTimeout(
            `${GAME_CONFIG.GOOGLE_SHEET_API_URL}?limit=${GAME_CONFIG.LEADERBOARD_LIMIT}`,
            10000 // 10초 타임아웃
        );
        const data = await response.json();

        // 캐시 저장
        leaderboardCache = data;
        leaderboardCacheTime = now;

        if (data.scores && data.scores.length > 0) {
            renderLeaderboard(data.scores);
        } else {
            leaderboardList.innerHTML = '<p class="loading">아직 기록이 없습니다.</p>';
        }
    } catch (error) {
        console.error('리더보드 로드 실패:', error);
        leaderboardList.innerHTML = '<p class="error-message">리더보드를 불러올 수 없습니다.<br><small>연결이 느리거나 서버가 응답하지 않습니다.</small></p>';
    }
}

// 리더보드 렌더링
function renderLeaderboard(scores) {
    leaderboardList.innerHTML = '';

    scores.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';

        // 1~3위 특별 스타일
        if (index === 0) item.classList.add('top-1');
        else if (index === 1) item.classList.add('top-2');
        else if (index === 2) item.classList.add('top-3');

        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `#${index + 1}`;

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = entry.name;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'player-score';
        scoreSpan.textContent = entry.score.toLocaleString();

        item.appendChild(rank);
        item.appendChild(name);
        item.appendChild(scoreSpan);

        leaderboardList.appendChild(item);
    });
}

// 하이스코어 체크 (10위 안에 들었는지)
async function checkHighScore() {
    if (!GAME_CONFIG.GOOGLE_SHEET_API_URL) return;

    // 캐시된 데이터가 있으면 바로 사용
    const now = Date.now();
    if (leaderboardCache && (now - leaderboardCacheTime) < CACHE_DURATION) {
        const data = leaderboardCache;
        if (!data.scores || data.scores.length < GAME_CONFIG.LEADERBOARD_LIMIT ||
            score > data.scores[data.scores.length - 1].score) {
            highscoreForm.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetchWithTimeout(
            `${GAME_CONFIG.GOOGLE_SHEET_API_URL}?limit=${GAME_CONFIG.LEADERBOARD_LIMIT}`,
            10000 // 10초 타임아웃
        );
        const data = await response.json();

        // 캐시 저장 (loadLeaderboard와 공유)
        leaderboardCache = data;
        leaderboardCacheTime = now;

        // 리더보드가 비어있거나, 10개 미만이거나, 현재 점수가 10위보다 높으면 폼 표시
        if (!data.scores || data.scores.length < GAME_CONFIG.LEADERBOARD_LIMIT ||
            score > data.scores[data.scores.length - 1].score) {
            highscoreForm.classList.remove('hidden');
        }
    } catch (error) {
        console.error('하이스코어 체크 실패:', error);
        // 에러 시에도 폼 표시 (사용자가 등록할 기회를 제공)
        highscoreForm.classList.remove('hidden');
    }
}

// 점수 제출
async function submitScore() {
    const playerName = playerNameInput.value.trim().toUpperCase();

    // 유효성 검사
    if (!playerName) {
        alert('이름을 입력해주세요!');
        return;
    }

    if (!/^[A-Z0-9]+$/.test(playerName)) {
        alert('영어와 숫자만 입력 가능합니다!');
        return;
    }

    if (playerName.length > 8) {
        alert('이름은 최대 8자까지 입력 가능합니다!');
        return;
    }

    // 버튼 비활성화
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = '등록 중...';

    try {
        await fetch(GAME_CONFIG.GOOGLE_SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS 우회
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: playerName,
                score: score
            })
        });

        // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
        alert('🎉 점수가 등록되었습니다!');
        highscoreForm.classList.add('hidden');

        // 캐시 무효화
        leaderboardCache = null;
        leaderboardCacheTime = 0;

        // 리더보드 새로고침 (약간의 지연 후)
        setTimeout(() => {
            loadLeaderboard();
        }, 1000);

    } catch (error) {
        console.error('점수 제출 실패:', error);
        alert('점수 등록에 실패했습니다. 다시 시도해주세요.');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = '등록하기';
    }
}

// 이름 입력 필드 영어/숫자만 허용
playerNameInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
});

// 엔터키로 제출
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitScore();
    }
});

// 제출 버튼 이벤트
submitScoreBtn.addEventListener('click', submitScore);

restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);

// 게임 시작
initGame();
