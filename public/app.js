// ---- state ----
let entries  = [];
let dbFoods  = [];
let diarySortCol = 'created_at';
let diarySortDir = 'asc';

// ---- diary date controls ----
const diaryDate     = document.getElementById('diary-date');
const diaryAllDates = document.getElementById('diary-all-dates');
diaryDate.value = new Date().toISOString().slice(0, 10);

diaryDate.addEventListener('change', loadDiary);
diaryAllDates.addEventListener('change', () => {
  diaryDate.disabled = diaryAllDates.checked;
  loadDiary();
});

// ---- autocomplete ----
const nameInput = document.getElementById('food-name');
const acList    = document.getElementById('autocomplete-list');

async function loadDbFoods() {
  try {
    const res = await apiGet('/api/foods');
    dbFoods = await res.json();
  } catch { dbFoods = []; }
}

async function loadDiary() {
  const token = getToken();
  if (!token) {
    entries = [];
    renderUnauth();
    updateTotals();
    return;
  }
  const url = diaryAllDates.checked
    ? '/api/diary?all=1'
    : `/api/diary?date=${diaryDate.value}`;
  try {
    const res = await apiGet(url);
    if (res.status === 401) { entries = []; renderUnauth(); updateTotals(); return; }
    entries = await res.json();
  } catch { entries = []; }
  renderTable();
  updateTotals();
}

function showDropdown(list) {
  acList.innerHTML = '';
  if (!list.length) return;

  const box = document.createElement('div');
  box.className = 'ac-box';

  list.forEach(f => {
    const item = document.createElement('div');
    item.className = 'ac-item';
    item.textContent = f.name;
    item.addEventListener('mouseenter', () => item.classList.add('ac-item--hover'));
    item.addEventListener('mouseleave', () => item.classList.remove('ac-item--hover'));
    item.addEventListener('mousedown', () => {
      nameInput.value = f.name;
      document.getElementById('food-cal').value = f.calories;
      document.getElementById('food-p').value   = parseFloat(f.protein).toFixed(1);
      document.getElementById('food-f').value   = parseFloat(f.fat).toFixed(1);
      document.getElementById('food-c').value   = parseFloat(f.carbs).toFixed(1);
      acList.innerHTML = '';
    });
    box.appendChild(item);
  });

  acList.appendChild(box);
}

nameInput.addEventListener('focus', () => {
  const q = nameInput.value.trim().toLowerCase();
  const matches = q
    ? dbFoods.filter(f => f.name.toLowerCase().includes(q))
    : dbFoods;
  showDropdown(matches.slice(0, 8));
});

nameInput.addEventListener('input', () => {
  const q = nameInput.value.trim().toLowerCase();
  const matches = q
    ? dbFoods.filter(f => f.name.toLowerCase().includes(q))
    : dbFoods;
  showDropdown(matches.slice(0, 8));
});

document.addEventListener('click', e => {
  if (!nameInput.contains(e.target)) acList.innerHTML = '';
});

// ---- form ----
const form  = document.getElementById('food-form');
const tbody = document.getElementById('food-tbody');

form.addEventListener('submit', async e => {
  e.preventDefault();

  const name   = nameInput.value.trim();
  const weight = parseFloat(document.getElementById('food-weight').value) || 100;
  const cal100 = parseFloat(document.getElementById('food-cal').value)    || 0;
  const p100   = parseFloat(document.getElementById('food-p').value)      || 0;
  const f100   = parseFloat(document.getElementById('food-f').value)      || 0;
  const c100   = parseFloat(document.getElementById('food-c').value)      || 0;

  // Сохраняем в справочник если продукт новый
  const exists = dbFoods.some(f => f.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    try {
      const res = await apiPost('/api/foods', { name, calories: cal100, protein: p100, fat: f100, carbs: c100 });
      if (res.ok) {
        const saved = await res.json();
        dbFoods.push(saved);
        toast('Продукт сохранён в справочник');
      }
    } catch { /* offline */ }
  }

  const factor = weight / 100;
  const entry = {
    name, weight,
    calories: round(cal100 * factor),
    protein:  round(p100   * factor),
    fat:      round(f100   * factor),
    carbs:    round(c100   * factor),
  };

  try {
    const res = await apiPost('/api/diary', entry);
    if (res.status === 401) { toast('Необходимо войти в систему'); return; }
    if (res.ok) {
      const saved = await res.json();
      entries.push(saved);
      renderTable();
      updateTotals();
    }
  } catch { toast('Ошибка сохранения в дневник'); }

  form.reset();
  document.getElementById('food-weight').value = 100;
});

function renderUnauth() {
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Войдите, чтобы вести дневник</td></tr>';
}

function syncDateColumn(theadRow, show) {
  const existing = theadRow.querySelector('[data-col="date"]');
  if (show && !existing) {
    const th = document.createElement('th');
    th.dataset.col = 'date';
    th.style.cursor = 'pointer';
    th.textContent = 'Дата';
    th.addEventListener('click', () => onDiarySort('date'));
    theadRow.insertBefore(th, theadRow.firstElementChild);
  } else if (!show && existing) {
    existing.remove();
  }
}

function onDiarySort(col) {
  diarySortDir = (diarySortCol === col && diarySortDir === 'asc') ? 'desc' : 'asc';
  diarySortCol = col;
  renderTable();
  updateDiarySortIndicators();
}

function updateDiarySortIndicators() {
  document.querySelectorAll('#food-table th[data-col]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === diarySortCol) th.classList.add(diarySortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

function renderTable() {
  const admin = getCurrentUser()?.username === 'admin';
  const showDate = diaryAllDates.checked && admin;
  const theadRow = document.querySelector('#food-table thead tr');
  syncDateColumn(theadRow, showDate);
  syncCreatorColumn(theadRow, admin);

  const colField = diarySortCol === 'creator' ? 'created_by_username' : diarySortCol;
  const sorted = [...entries].sort((a, b) => {
    const av = a[colField] ?? '', bv = b[colField] ?? '';
    const cmp = typeof av === 'string' ? av.localeCompare(bv, 'ru') : (av - bv);
    return diarySortDir === 'asc' ? cmp : -cmp;
  });

  const cols = [7, admin ? 1 : 0, showDate ? 1 : 0].reduce((a, b) => a + b);
  if (!sorted.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">Список пуст — добавьте первый продукт</td></tr>`;
    updateDiarySortIndicators();
    return;
  }
  tbody.innerHTML = sorted.map(e => `
    <tr>
      ${showDate ? `<td class="col-date">${fmtDate(e.date)}</td>` : ''}
      <td>${esc(e.name)}</td>
      <td>${e.weight} г</td>
      <td>${e.calories}</td>
      <td>${parseFloat(e.protein).toFixed(1)}</td>
      <td>${parseFloat(e.fat).toFixed(1)}</td>
      <td>${parseFloat(e.carbs).toFixed(1)}</td>
      ${admin ? `<td class="col-creator">${esc(e.created_by_username || '—')}</td>` : ''}
      <td><button class="del-btn" onclick="remove(${e.id})">✕</button></td>
    </tr>
  `).join('');
  updateDiarySortIndicators();
}

async function remove(id) {
  try {
    await apiDel(`/api/diary/${id}`);
    entries = entries.filter(e => e.id !== id);
    renderTable();
    updateTotals();
  } catch { toast('Ошибка удаления'); }
}

function updateTotals() {
  const s = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  entries.forEach(e => {
    s.calories += parseFloat(e.calories) || 0;
    s.protein  += parseFloat(e.protein)  || 0;
    s.fat      += parseFloat(e.fat)      || 0;
    s.carbs    += parseFloat(e.carbs)    || 0;
  });
  document.getElementById('total-cal').textContent = round(s.calories);
  document.getElementById('total-p').textContent   = s.protein.toFixed(1);
  document.getElementById('total-f').textContent   = s.fat.toFixed(1);
  document.getElementById('total-c').textContent   = s.carbs.toFixed(1);
}

// ---- helpers ----
function round(n) { return Math.round(n * 10) / 10; }
function fmtDate(d) { if (!d) return '—'; const [y,m,day] = d.slice(0,10).split('-'); return `${day}.${m}.${y}`; }

// ---- init ----
document.querySelectorAll('#food-table th[data-col]').forEach(th => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => onDiarySort(th.dataset.col));
});

window.addEventListener('calpfc:auth-change', () => { loadDbFoods(); loadDiary(); });
