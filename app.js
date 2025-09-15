(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const startScreen = $('#screen-start');
  const sessionScreen = $('#screen-session');
  const exercisesTA = $('#exercises');
  const startBtn = $('#startBtn');
  const clearBtn = $('#clearBtn');
  const nextBtn = $('#nextBtn');
  const resetBtn = $('#resetBtn');
  const mmEl = $('#mm');
  const ssEl = $('#ss');
  const exerciseText = $('#exerciseText');
  const statusEl = $('#status');
  const installBtn = $('#installBtn');

  const STORAGE_KEY = 'fitness_randomizer_exercises_v1';
  const SESSION_MS = 5 * 60 * 1000; // 5 minutes

  // Default list
  const DEFAULT_LIST = [
    'Push-ups',
    'Squats',
    'Lunges',
    'Plank',
    'Burpees',
    'Mountain climbers',
    'Jumping jacks',
    'High knees',
    'Tricep dips',
    'Bicycle crunches',
    'Glute bridges',
    'Russian twists'
  ];

  // State
  let order = [];          // shuffled items for current block
  let orderIdx = 0;        // pointer into order
  let endAt = 0;           // timestamp when session ends
  let tickTimer = null;    // setInterval handle
  let beforeInstallEvent = null;

  function loadExercises() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const text = saved ? saved : DEFAULT_LIST.join('\n');
    exercisesTA.value = text;
  }

  function saveExercises() {
    localStorage.setItem(STORAGE_KEY, exercisesTA.value);
  }

  function parseExercises() {
    const list = exercisesTA.value
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    // dedupe while preserving order
    const seen = new Set();
    const unique = [];
    for (const x of list) {
      const k = x.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(x);
      }
    }
    return unique;
  }

  function shuffle(arr) {
    // Fisher–Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    mmEl.textContent = String(m).padStart(2, '0');
    ssEl.textContent = String(s).padStart(2, '0');
  }

  function showScreen(which) {
    if (which === 'start') {
      startScreen.classList.add('active');
      sessionScreen.classList.remove('active');
    } else {
      startScreen.classList.remove('active');
      sessionScreen.classList.add('active');
    }
  }

  function nextExercise() {
    if (orderIdx >= order.length) {
      exerciseText.textContent = 'All exercises shown — wait for the timer to finish.';
      nextBtn.disabled = true;
      statusEl.textContent = '';
      return;
    }
    const ex = order[orderIdx++];
    exerciseText.textContent = ex;
    exerciseText.parentElement.focus();
    statusEl.textContent = `${order.length - orderIdx} remaining in this block`;
    if (orderIdx >= order.length) {
      nextBtn.disabled = true;
    }
  }

  function startSession() {
    const exs = parseExercises();
    if (exs.length === 0) {
      alert('Please enter at least one exercise.');
      return;
    }
    saveExercises();
    order = shuffle([...exs]);
    orderIdx = 0;
    nextBtn.disabled = false;
    endAt = Date.now() + SESSION_MS;
    formatTime(SESSION_MS);
    showScreen('session');
    nextExercise();

    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const remaining = endAt - Date.now();
      formatTime(remaining);
      if (remaining <= 0) {
        endSession(true);
      }
    }, 250);
  }

  function endSession(fromTimer = false) {
    clearInterval(tickTimer);
    tickTimer = null;
    order = [];
    orderIdx = 0;
    endAt = 0;
    exerciseText.textContent = '—';
    statusEl.textContent = '';
    showScreen('start');
    if (fromTimer) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  // Events
  startBtn.addEventListener('click', startSession);
  clearBtn.addEventListener('click', () => { exercisesTA.value = ''; exercisesTA.focus(); });
  nextBtn.addEventListener('click', nextExercise);
  resetBtn.addEventListener('click', () => endSession(false));
  exercisesTA.addEventListener('change', saveExercises);

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    beforeInstallEvent = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if (!beforeInstallEvent) return;
    installBtn.disabled = true;
    await beforeInstallEvent.prompt();
    await beforeInstallEvent.userChoice;
    beforeInstallEvent = null;
    installBtn.hidden = true;
    installBtn.disabled = false;
  });

  // Init
  loadExercises();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
  }
})();