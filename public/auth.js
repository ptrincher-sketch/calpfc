const TOKEN_KEY = 'calpfc_token';
const USER_KEY  = 'calpfc_user';

function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function saveToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
function removeToken() { localStorage.removeItem(TOKEN_KEY); }

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
function saveUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function removeUser() { localStorage.removeItem(USER_KEY); }

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

function openLoginModal() {
  document.getElementById('register-modal').classList.remove('open');
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-username').focus();
}

function openRegisterModal() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('register-modal').classList.add('open');
  document.getElementById('reg-error').textContent = '';
  document.getElementById('reg-username').focus();
}

function closeAuthModals() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('register-modal').classList.remove('open');
}

async function checkAuth() {
  const token = getToken();
  if (!token) {
    setLoginBtnState(null);
    removeUser();
    openLoginModal();
    return;
  }
  const res = await apiGet('/api/auth/me');
  if (res.ok) {
    const data = await res.json();
    setLoginBtnState(data.username);
    saveUser({ id: data.id, username: data.username });
    closeAuthModals();
    window.dispatchEvent(new CustomEvent('calpfc:auth-change'));
  } else {
    removeToken();
    removeUser();
    setLoginBtnState(null);
    openLoginModal();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';
  const res = await apiPost('/api/auth/login', { username, password });
  if (res.ok) {
    const data = await res.json();
    saveToken(data.token);
    saveUser({ id: data.user_id, username: data.username });
    setLoginBtnState(data.username);
    closeAuthModals();
    document.getElementById('login-password').value = '';
    window.dispatchEvent(new CustomEvent('calpfc:auth-change'));
  } else {
    const err = await res.json();
    errEl.textContent = err.error || 'Ошибка входа';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username  = document.getElementById('reg-username').value.trim();
  const password  = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const errEl     = document.getElementById('reg-error');
  errEl.textContent = '';

  if (password !== password2) {
    errEl.textContent = 'Пароли не совпадают';
    return;
  }

  const res = await apiPost('/api/auth/register', { username, password });
  if (res.ok) {
    const data = await res.json();
    saveToken(data.token);
    saveUser({ id: data.user_id, username: data.username });
    setLoginBtnState(data.username);
    closeAuthModals();
    document.getElementById('reg-username').value  = '';
    document.getElementById('reg-password').value  = '';
    document.getElementById('reg-password2').value = '';
    window.dispatchEvent(new CustomEvent('calpfc:auth-change'));
  } else {
    const err = await res.json();
    errEl.textContent = err.error || 'Ошибка регистрации';
  }
}

async function handleLogout() {
  const token = getToken();
  await apiPost('/api/auth/logout');
  removeToken();
  removeUser();
  setLoginBtnState(null);
  openLoginModal();
  window.dispatchEvent(new CustomEvent('calpfc:auth-change'));
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();

  document.getElementById('nav-login').addEventListener('click', () => {
    if (document.getElementById('nav-login').dataset.state === 'logged') handleLogout();
  });

  document.getElementById('goto-register').addEventListener('click', openRegisterModal);
  document.getElementById('goto-login').addEventListener('click', openLoginModal);

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
});
