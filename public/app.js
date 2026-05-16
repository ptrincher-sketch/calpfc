// ---- state ----
let entries = [];
let dbFoods = [];

// ---- autocomplete ----
const nameInput = document.getElementById('food-name');
const acList    = document.getElementById('autocomplete-list');

async function loadDbFoods() {
  try {
    const res = await fetch('/api/foods');
    dbFoods = await res.json();
  } catch { dbFoods = []; }
}

async function loadDiary() {
  try {
    const res = await fetch('/api/diary');
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
      document.getElementById('food-p').value   = f.protein;
      document.getElementById('food-f').value   = f.fat;
      document.getElementById('food-c').value   = f.carbs;
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
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, calories: cal100, protein: p100, fat: f100, carbs: c100 }),
      });
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
    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
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

function renderTable() {
  if (!entries.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Список пуст — добавьте первый продукт</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${esc(e.name)}</td>
      <td>${e.weight} г</td>
      <td>${e.calories}</td>
      <td>${e.protein}</td>
      <td>${e.fat}</td>
      <td>${e.carbs}</td>
      <td><button class="del-btn" onclick="remove(${e.id})">✕</button></td>
    </tr>
  `).join('');
}

async function remove(id) {
  try {
    await fetch(`/api/diary/${id}`, { method: 'DELETE' });
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
  document.getElementById('total-p').textContent   = round(s.protein);
  document.getElementById('total-f').textContent   = round(s.fat);
  document.getElementById('total-c').textContent   = round(s.carbs);
}

// ---- helpers ----
function round(n) { return Math.round(n * 10) / 10; }

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ---- init ----
loadDbFoods();
loadDiary();
