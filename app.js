import { animals } from './animals.js';

const $ = (selector) => document.querySelector(selector);
const els = {
  count: $('#pageCount'), category: $('#categoryChip'), photo: $('#animalPhoto'), fallback: $('#photoFallback'),
  name: $('#animalName'), translation: $('#animalTranslation'), speak: $('#speakButton'), photoTap: $('#photoTapTarget'),
  previous: $('#previousButton'), next: $('#nextButton'), parentHotspot: $('.parent-hint'), parentModal: $('#parentModal'),
  challengeForm: $('#challengeForm'), challengeCopy: $('#challengeCopy'), challengeAnswer: $('#challengeAnswer'),
  challengeError: $('#challengeError'), modalClose: $('#modalClose'), settingsModal: $('#settingsModal'),
  settingsClose: $('#settingsClose'), backToCards: $('#backToCardsButton'), autoSpeak: $('#autoSpeakToggle'),
  animalSounds: $('#animalSoundsToggle'), cacheStatus: $('#cacheStatus'), cacheProgressBar: $('#cacheProgressBar'),
  downloadPhotos: $('#downloadPhotosButton'), resetSettings: $('#resetSettingsButton'), toast: $('#toast'),
  creditsButton: $('#creditsButton'), creditsModal: $('#creditsModal'), creditsClose: $('#creditsClose'),
  creditsList: $('#creditsList'), creditsBack: $('#creditsBackButton')
};

const DEFAULTS = { autoSpeak: false, mode: 'sequential', language: 'both', animalSounds: false };
const SETTINGS_KEY = 'little-wild-settings-v1';
const CACHE_NAME = 'little-wild-release-v6';
const READY_NOTICE_KEY = 'little-wild-ready-notice-v6';
let settings = loadSettings();
let currentIndex = 0;
let history = [];
let currentChallenge = 0;
let pressTimer = 0;
let toastTimer = 0;
let renderId = 0;
let speechTimer = 0;
let pendingUtterance = null;
let speechRequest = 0;
let creditsLoaded = false;

function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 2100);
}
function speakCurrent() {
  const animal = animals[currentIndex];
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    showToast('这台设备暂不支持语音发音');
    return;
  }
  const request = ++speechRequest;
  window.clearTimeout(speechTimer);
  window.speechSynthesis.cancel();
  els.speak.classList.remove('is-speaking');
  const utterance = new SpeechSynthesisUtterance(animal.en);
  utterance.lang = 'en-US';
  utterance.rate = 0.76;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang?.toLowerCase() === 'en-us') || null;
  utterance.onstart = () => { if (request === speechRequest) els.speak.classList.add('is-speaking'); };
  utterance.onend = utterance.onerror = () => { if (request === speechRequest) els.speak.classList.remove('is-speaking'); };
  pendingUtterance = utterance;
  // iOS can finish cancel() asynchronously; only the latest rapid tap is queued.
  speechTimer = window.setTimeout(() => {
    if (request !== speechRequest || pendingUtterance !== utterance) return;
    window.speechSynthesis.speak(utterance);
    pendingUtterance = null;
  }, 70);
}

function currentAnimal() { return animals[currentIndex]; }
function render({ announce = false } = {}) {
  const animal = currentAnimal();
  const thisRender = ++renderId;
  els.count.textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(animals.length).padStart(2, '0')}`;
  els.category.textContent = animal.category;
  els.name.textContent = animal.en;
  els.translation.textContent = animal.zh;
  els.translation.classList.toggle('is-hidden', settings.language === 'en');
  els.photo.alt = `${animal.en}（${animal.zh}）`;
  els.fallback.textContent = animal.emoji;
  els.photo.classList.remove('is-visible');
  els.fallback.hidden = false;
  els.photo.onload = () => {
    if (thisRender === renderId) {
      els.photo.classList.add('is-visible');
      els.fallback.hidden = true;
    }
  };
  els.photo.onerror = () => {
    if (thisRender === renderId) {
      els.photo.classList.remove('is-visible');
      els.fallback.hidden = false;
    }
  };
  els.photo.src = new URL(`./assets/animals/${animal.id}.webp`, import.meta.url).href;
  if (els.photo.complete && els.photo.naturalWidth) {
    els.photo.classList.add('is-visible');
    els.fallback.hidden = true;
  }
  if (announce || settings.autoSpeak) speakCurrent();
}

function move(direction) {
  if (settings.mode === 'random' && direction > 0) {
    let next = currentIndex;
    while (animals.length > 1 && next === currentIndex) next = Math.floor(Math.random() * animals.length);
    history.push(currentIndex);
    currentIndex = next;
  } else if (settings.mode === 'random' && direction < 0 && history.length) {
    currentIndex = history.pop();
  } else {
    currentIndex = (currentIndex + direction + animals.length) % animals.length;
  }
  render({ announce: settings.autoSpeak });
}

function challenge() {
  const a = 7 + Math.floor(Math.random() * 8);
  const b = 3 + Math.floor(Math.random() * 8);
  currentChallenge = a + b;
  els.challengeCopy.textContent = `成人验证：${a} + ${b} = ?`;
  els.challengeAnswer.value = '';
  els.challengeError.textContent = '';
  els.parentModal.hidden = false;
  window.setTimeout(() => els.challengeAnswer.focus(), 80);
}
function startHold(event) {
  if (event.type === 'pointerdown' && event.button !== 0) return;
  event.preventDefault();
  els.parentHotspot.classList.add('is-holding');
  pressTimer = window.setTimeout(() => {
    els.parentHotspot.classList.remove('is-holding');
    challenge();
  }, 3000);
}
function cancelHold() {
  window.clearTimeout(pressTimer);
  els.parentHotspot.classList.remove('is-holding');
}
els.parentHotspot.addEventListener('pointerdown', startHold);
['pointerup', 'pointerleave', 'pointercancel', 'contextmenu'].forEach((event) => els.parentHotspot.addEventListener(event, cancelHold));
els.parentHotspot.addEventListener('touchstart', (event) => { if (event.cancelable) event.preventDefault(); }, { passive: false });

els.challengeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (Number(els.challengeAnswer.value) === currentChallenge) {
    els.parentModal.hidden = true;
    els.settingsModal.hidden = false;
    updateSettingsView();
  } else {
    els.challengeError.textContent = '答案不对，再试一次。';
    els.challengeAnswer.value = '';
    els.challengeAnswer.focus();
  }
});
els.modalClose.addEventListener('click', () => { els.parentModal.hidden = true; });
els.settingsClose.addEventListener('click', closeSettings);
els.backToCards.addEventListener('click', closeSettings);
function closeSettings() { els.settingsModal.hidden = true; render(); }
els.speak.addEventListener('click', speakCurrent);
els.photoTap.addEventListener('click', speakCurrent);
els.previous.addEventListener('click', () => move(-1));
els.next.addEventListener('click', () => move(1));
els.autoSpeak.addEventListener('change', () => { settings.autoSpeak = els.autoSpeak.checked; saveSettings(); });
els.animalSounds.addEventListener('change', () => {
  settings.animalSounds = els.animalSounds.checked;
  saveSettings();
  showToast(settings.animalSounds ? '动物叫声正在准备中' : '动物叫声已关闭');
});
document.querySelectorAll('.mode-button').forEach((button) => button.addEventListener('click', () => {
  settings.mode = button.dataset.mode;
  history = [];
  saveSettings();
  updateSettingsView();
}));
document.querySelectorAll('.language-button').forEach((button) => button.addEventListener('click', () => {
  settings.language = button.dataset.language;
  saveSettings();
  updateSettingsView();
  render();
}));
function updateSettingsView() {
  els.autoSpeak.checked = settings.autoSpeak;
  els.animalSounds.checked = settings.animalSounds;
  document.querySelectorAll('.mode-button').forEach((button) => button.classList.toggle('is-selected', button.dataset.mode === settings.mode));
  document.querySelectorAll('.language-button').forEach((button) => button.classList.toggle('is-selected', button.dataset.language === settings.language));
  updateCacheStatus();
}
els.resetSettings.addEventListener('click', () => {
  settings = { ...DEFAULTS };
  saveSettings();
  updateSettingsView();
  render();
  showToast('设置已恢复默认');
});

let startX = 0;
let startY = 0;
let startTarget = null;
const stage = $('#photoStage');
stage.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  startX = touch.clientX; startY = touch.clientY; startTarget = event.target;
}, { passive: true });
stage.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  if (Math.abs(dx) > 48 && Math.abs(dy) < 70) {
    event.preventDefault();
    move(dx < 0 ? 1 : -1);
  } else if (startTarget === stage || startTarget === els.photo) {
    speakCurrent();
  }
}, { passive: false });
let pointerX = 0;
let pointerY = 0;
stage.addEventListener('pointerdown', (event) => { pointerX = event.clientX; pointerY = event.clientY; });
stage.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch') return;
  const dx = event.clientX - pointerX;
  const dy = event.clientY - pointerY;
  if (Math.abs(dx) > 55 && Math.abs(dy) < 70) move(dx < 0 ? 1 : -1);
});
window.addEventListener('keydown', (event) => {
  if (!els.settingsModal.hidden || !els.parentModal.hidden) return;
  if (event.key === 'ArrowRight') move(1);
  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === ' ' || event.key === 'Enter') { if (event.target === document.body) { event.preventDefault(); speakCurrent(); } }
});

async function updateCacheStatus(notify = false) {
  try {
    await navigator.serviceWorker.ready;
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const base = new URL('./assets/animals/', import.meta.url).pathname;
    const count = keys.filter((request) => new URL(request.url).pathname.startsWith(base) && request.url.endsWith('.webp')).length;
    els.cacheProgressBar.style.width = `${Math.round(count / animals.length * 100)}%`;
    if (count === animals.length) {
      els.cacheStatus.textContent = '80 / 80 动物已准备完成';
      if (notify && !localStorage.getItem(READY_NOTICE_KEY)) {
        localStorage.setItem(READY_NOTICE_KEY, 'shown');
        showToast('80 / 80 动物已准备完成');
      }
    } else {
      els.cacheStatus.textContent = `正在准备离线资源 ${count} / ${animals.length}`;
    }
    return count;
  } catch {
    els.cacheStatus.textContent = '请在联网状态下打开一次以准备离线资源';
    els.cacheProgressBar.style.width = '0%';
    return 0;
  }
}

async function renderCredits() {
  if (creditsLoaded) return;
  els.creditsList.replaceChildren();
  try {
    const response = await fetch('./credits.json');
    if (!response.ok) throw new Error('credits file missing');
    const data = await response.json();
    for (const credit of data.items || []) {
      const row = document.createElement('article');
      row.className = 'credit-row';
      const heading = document.createElement('div');
      heading.className = 'credit-heading';
      const title = document.createElement('strong');
      title.textContent = `${credit.animal_name} · ${animals.find((animal) => animal.id === credit.animal_id)?.zh || ''}`;
      const license = document.createElement('span');
      license.textContent = credit.license;
      heading.append(title, license);
      const author = document.createElement('p');
      author.textContent = `作者：${credit.author || '页面未标明'}；上传者：${credit.uploader || '页面未标明'}`;
      const attribution = document.createElement('p');
      attribution.textContent = `署名：${credit.attribution}`;
      const source = document.createElement('p');
      source.className = 'credit-source';
      const sourceUrl = String(credit.source_page || '').replace(/^https?:\/\//, '').replace(/\./g, ' [dot] ');
      source.textContent = `来源页：${credit.source_title}（${sourceUrl}）`;
      const terms = document.createElement('p');
      const licenseUrl = String(credit.license_url || '').replace(/^https?:\/\//, '').replace(/\./g, ' [dot] ');
      terms.textContent = `许可：${credit.license}；许可全文：${licenseUrl || '详见来源页信息'}；图片已裁切并转换为 WebP。`;
      row.append(heading, author, attribution, source, terms);
      els.creditsList.append(row);
    }
    creditsLoaded = true;
  } catch {
    const message = document.createElement('p');
    message.textContent = '版权记录暂时无法读取。请保持联网后重试。';
    els.creditsList.append(message);
  }
}

els.downloadPhotos.addEventListener('click', () => window.location.reload());
els.creditsButton.addEventListener('click', async () => {
  els.settingsModal.hidden = true;
  els.creditsModal.hidden = false;
  await renderCredits();
});
function closeCredits() {
  els.creditsModal.hidden = true;
  els.settingsModal.hidden = false;
}
els.creditsClose.addEventListener('click', closeCredits);
els.creditsBack.addEventListener('click', closeCredits);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      await updateCacheStatus(true);
    } catch {
      els.cacheStatus.textContent = '离线准备需要在 Safari 安全网页中打开';
    }
  });
}
render();
updateSettingsView();
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => updateCacheStatus(true));
