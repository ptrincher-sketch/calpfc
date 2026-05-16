const TOKEN_KEY = 'calpfc_token';

function getToken()     { return localStorage.getItem(TOKEN_KEY); }
function saveToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function removeToken()  { localStorage.removeItem(TOKEN_KEY); }

function setLoginBtnState(username) {
  const btn = document.getElementById('nav-login');
  if (!btn) return;
  if (username) {
    btn.textContent = username;
    btn.dataset.state = 'logged';
    btn.title = 'Нажмите для выхода';
  } else {
    btn.textContent = 'Вход';
    btn.dataset.state = 'guest';
    btn.title = '';
  }
}

async function checkAuth() {
  const token = getToken();
  if (!token) { setLoginBtnState(null); return; }
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (res.ok) {
    const { username } = await res.json();
    setLoginBtnState(username);
  } else {
    removeToken();
    setLoginBtnState(null);
  }
}

function openModal()  { document.getElementById('login-modal').classList.add('open'); document.getElementById('login-username').focus(); }
function closeModal() { document.getElementById('login-modal').classList.remove('open'); document.getElementById('login-error').textContent = ''; }

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    const data = await res.json();
    saveToken(data.token);
    setLoginBtnState(data.username);
    closeModal();
    document.getElementById('login-password').value = '';
  } else {
    const err = await res.json();
    errEl.textContent = err.error || 'Ошибка входа';
  }
}

async function handleLogout() {
  const token = getToken();
  if (token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
  removeToken();
  setLoginBtnState(null);
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('nav-login').addEventListener('click', () => {
    document.getElementById('nav-login').dataset.state === 'logged' ? handleLogout() : openModal();
  });

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('login-close').addEventListener('click', closeModal);
  document.getElementById('login-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
