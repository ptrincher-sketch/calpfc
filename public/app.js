// ---- state ----
const entries = [];
let dbFoods = [];  // справочник из БД

// ---- autocomplete ----
const nameInput = document.getElementById('food-name');
const acList    = document.getElementById('autocomplete-list');

async function loadDbFoods() {
  try {
    const res = await fetch('/api/foods');
    dbFoods = await res.json();
  } catch { dbFoods = []; }
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
    } catch { /* offline — не критично */ }
  }

  const factor = weight / 100;
  entries.push({
    id: Date.now(),
    name, weight,
    cal: round(cal100 * factor),
    p:   round(p100   * factor),
    f:   round(f100   * factor),
    c:   round(c100   * factor),
  });

  renderTable();
  updateTotals();
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
      <td>${e.cal}</td>
      <td>${e.p}</td>
      <td>${e.f}</td>
      <td>${e.c}</td>
      <td><button class="del-btn" onclick="remove(${e.id})">✕</button></td>
    </tr>
  `).join('');
}

function remove(id) {
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) entries.splice(idx, 1);
  renderTable();
  updateTotals();
}

function updateTotals() {
  const s = { cal: 0, p: 0, f: 0, c: 0 };
  entries.forEach(e => { s.cal += e.cal; s.p += e.p; s.f += e.f; s.c += e.c; });
  document.getElementById('total-cal').textContent = round(s.cal);
  document.getElementById('total-p').textContent   = round(s.p);
  document.getElementById('total-f').textContent   = round(s.f);
  document.getElementById('total-c').textContent   = round(s.c);
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
