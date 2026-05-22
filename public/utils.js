function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initSharedUI() {
  const p = window.location.pathname;
  const isRoot    = p === '/' || p.endsWith('index.html');
  const isCatalog = p.includes('catalog');
  const isDishes  = p.includes('dishes');

  const sidebar = document.getElementById('sidebar-root');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-logo">CalPFC</div>
      <nav>
        <a href="/"            class="nav-item ${isRoot    ? 'active' : ''}">Дневник</a>
        <a href="/catalog.html" class="nav-item ${isCatalog ? 'active' : ''}">Продукты</a>
        <a href="/dishes.html"  class="nav-item ${isDishes  ? 'active' : ''}">Блюда</a>
      </nav>`;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="login-modal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header"><span>Вход</span></div>
        <form id="login-form">
          <label>Логин<input type="text" id="login-username" autocomplete="username" placeholder="admin" /></label>
          <label>Пароль<input type="password" id="login-password" autocomplete="current-password" placeholder="••••••••" /></label>
          <span id="login-error" class="field-error"></span>
          <div class="form-actions"><button type="submit" class="btn-primary">Войти</button></div>
        </form>
        <p class="modal-switch">Нет аккаунта? <button type="button" class="modal-link" id="goto-register">Зарегистрироваться</button></p>
      </div>
    </div>
    <div id="register-modal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header"><span>Регистрация</span></div>
        <form id="register-form">
          <label>Логин<input type="text" id="reg-username" autocomplete="username" placeholder="Минимум 3 символа" /></label>
          <label>Пароль<input type="password" id="reg-password" autocomplete="new-password" placeholder="Минимум 6 символов" /></label>
          <label>Повторите пароль<input type="password" id="reg-password2" autocomplete="new-password" placeholder="••••••••" /></label>
          <span id="reg-error" class="field-error"></span>
          <div class="form-actions"><button type="submit" class="btn-primary">Зарегистрироваться</button></div>
        </form>
        <p class="modal-switch">Уже есть аккаунт? <button type="button" class="modal-link" id="goto-login">Войти</button></p>
      </div>
    </div>`);
}

function syncCreatorColumn(theadRow, isAdmin) {
  const existing = theadRow.querySelector('[data-col="creator"]');
  if (isAdmin && !existing) {
    const th = document.createElement('th');
    th.dataset.col = 'creator';
    th.textContent = 'Добавил';
    theadRow.insertBefore(th, theadRow.lastElementChild);
  } else if (!isAdmin && existing) {
    existing.remove();
  }
}

document.addEventListener('DOMContentLoaded', initSharedUI);
