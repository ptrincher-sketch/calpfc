// ---- state ----
let allFoods     = [];   // список блюд
let catalogFoods = [];   // продукты из справочника
let ingredients  = [];   // [{food, percent}]
let sortCol   = 'name';
let sortDir   = 'asc';
let editId    = null;
let editSource = null;

// ---- DOM ----
const catForm        = document.getElementById('catalog-form');
const catNameInput   = document.getElementById('cat-name');
const catNameError   = document.getElementById('cat-name-error');
const submitBtn      = document.getElementById('catalog-submit-btn');
const cancelBtn      = document.getElementById('catalog-cancel-btn');
const formTitle      = document.getElementById('form-title');
const catAcList      = document.getElementById('cat-ac-list');
const productSearch  = document.getElementById('dish-product-search');
const productAc      = document.getElementById('dish-product-ac');
const ingredientsList = document.getElementById('dish-ingredients');
const percentHint    = document.getElementById('dish-percent-hint');

const API = '/api/dishes';

// ======================================================
// АВТОДОПОЛНЕНИЕ НАЗВАНИЯ БЛЮДА
// ======================================================
function showCatDropdown(list) {
  catAcList.innerHTML = '';
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
      catAcList.innerHTML = '';
      editSource = 'pencil';
      catNameError.textContent = '';
      enterEditMode(f, true);
    });
    box.appendChild(item);
  });
  catAcList.appendChild(box);
}

catNameInput.addEventListener('focus', () => {
  const q = catNameInput.value.trim().toLowerCase();
  const matches = q ? allFoods.filter(f => f.name.toLowerCase().includes(q)) : allFoods;
  showCatDropdown(matches.slice(0, 8));
});

document.addEventListener('click', e => {
  if (!catNameInput.contains(e.target)) catAcList.innerHTML = '';
  if (!productSearch.contains(e.target)) productAc.innerHTML = '';
});

// ======================================================
// ВЫБОР ПРОДУКТА ДЛЯ СОСТАВА (строгий)
// ======================================================
let productSelected = false;

function showProductDropdown(list) {
  productAc.innerHTML = '';
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
      productSelected = true;
      productAc.innerHTML = '';
      productSearch.value = '';
      addIngredient(f);
    });
    box.appendChild(item);
  });
  productAc.appendChild(box);
}

productSearch.addEventListener('focus', () => {
  productSelected = false;
  const q = productSearch.value.trim().toLowerCase();
  const used = new Set(ingredients.map(i => i.food.id));
  const list = (q
    ? catalogFoods.filter(f => f.name.toLowerCase().includes(q))
    : catalogFoods
  ).filter(f => !used.has(f.id)).slice(0, 8);
  showProductDropdown(list);
});

productSearch.addEventListener('input', () => {
  productSelected = false;
  const q = productSearch.value.trim().toLowerCase();
  const used = new Set(ingredients.map(i => i.food.id));
  const list = (q
    ? catalogFoods.filter(f => f.name.toLowerCase().includes(q))
    : catalogFoods
  ).filter(f => !used.has(f.id)).slice(0, 8);
  showProductDropdown(list);
});

productSearch.addEventListener('blur', () => {
  setTimeout(() => { if (!productSelected) productSearch.value = ''; }, 150);
});

// ======================================================
// СОСТАВ БЛЮДА
// ======================================================
function addIngredient(food) {
  if (ingredients.some(i => i.food.id === food.id)) return;
  ingredients.push({ food, percent: 0 });
  renderIngredients();
  recalcKBJU();
}

function removeIngredient(id) {
  ingredients = ingredients.filter(i => i.food.id !== id);
  renderIngredients();
  recalcKBJU();
}

function renderIngredients() {
  if (!ingredients.length) {
    ingredientsList.innerHTML = '';
    percentHint.textContent = '';
    return;
  }
  ingredientsList.innerHTML = ingredients.map(ing => `
    <div class="ingredient-row" data-id="${ing.food.id}">
      <span class="ingredient-name">${esc(ing.food.name)}</span>
      <div class="ingredient-right">
        <input type="number" min="0" max="100" step="1"
          class="ingredient-percent" data-id="${ing.food.id}"
          value="${ing.percent || ''}" placeholder="0" />
        <span class="ingredient-pct-label">%</span>
        <button type="button" class="del-btn ingredient-del" data-id="${ing.food.id}">✕</button>
      </div>
    </div>
  `).join('');

  ingredientsList.querySelectorAll('.ingredient-percent').forEach(input => {
    input.addEventListener('input', () => {
      const ing = ingredients.find(i => i.food.id === parseInt(input.dataset.id));
      if (ing) { ing.percent = parseFloat(input.value) || 0; recalcKBJU(); updatePercentHint(); }
    });
  });
  ingredientsList.querySelectorAll('.ingredient-del').forEach(btn => {
    btn.addEventListener('click', () => removeIngredient(parseInt(btn.dataset.id)));
  });
  updatePercentHint();
}

function updatePercentHint() {
  const total = ingredients.reduce((s, i) => s + i.percent, 0);
  const diff  = Math.round((total - 100) * 10) / 10;
  if (!ingredients.length || total === 0) {
    percentHint.textContent = '';
  } else if (Math.abs(diff) < 0.05) {
    percentHint.style.color = '#22c55e';
    percentHint.textContent = 'Сумма: 100% ✓';
  } else {
    percentHint.style.color = '#f97316';
    percentHint.textContent = `Сумма: ${Math.round(total * 10) / 10}% (${diff > 0 ? '+' : ''}${diff} от 100%)`;
  }
}

function recalcKBJU() {
  if (!ingredients.length) return;
  let cal = 0, p = 0, f = 0, c = 0;
  ingredients.forEach(ing => {
    const k = ing.percent / 100;
    cal += ing.food.calories * k;
    p   += ing.food.protein  * k;
    f   += ing.food.fat      * k;
    c   += ing.food.carbs    * k;
  });
  const r = n => Math.round(n * 10) / 10;
  document.getElementById('cat-cal').value = r(cal) || '';
  document.getElementById('cat-p').value   = r(p)   || '';
  document.getElementById('cat-f').value   = r(f)   || '';
  document.getElementById('cat-c').value   = r(c)   || '';
}

function clearIngredients() {
  ingredients = [];
  renderIngredients();
}

// Загружаем состав блюда из БД
async function loadDishIngredients(dishId) {
  ingredients = [];
  try {
    const res = await fetch(`${API}/${dishId}/ingredients`);
    if (res.ok) {
      const data = await res.json();
      ingredients = data.map(item => ({
        food: {
          id:       item.food_id,
          name:     item.food_name,
          calories: parseFloat(item.calories),
          protein:  parseFloat(item.protein),
          fat:      parseFloat(item.fat),
          carbs:    parseFloat(item.carbs),
        },
        percent: parseFloat(item.percent),
      }));
    }
  } catch { /* ignore */ }
  renderIngredients();
}

// ======================================================
// РЕЖИМ РЕДАКТИРОВАНИЯ
// ======================================================
async function enterEditMode(food, fillName) {
  editId = food.id;
  if (fillName) catNameInput.value = food.name;
  document.getElementById('cat-cal').value = food.calories;
  document.getElementById('cat-p').value   = food.protein;
  document.getElementById('cat-f').value   = food.fat;
  document.getElementById('cat-c').value   = food.carbs;
  submitBtn.textContent   = 'Изменить';
  submitBtn.disabled      = false;
  cancelBtn.style.display = '';
  formTitle.textContent   = 'Редактировать блюдо';
  await loadDishIngredients(food.id);
}

function exitEditMode(resetForm) {
  editId     = null;
  editSource = null;
  catNameError.textContent = '';
  submitBtn.textContent    = 'Добавить блюдо';
  submitBtn.disabled       = false;
  cancelBtn.style.display  = 'none';
  formTitle.textContent    = 'Добавить блюдо';
  if (resetForm) { catForm.reset(); clearIngredients(); }
}

cancelBtn.addEventListener('click', () => exitEditMode(true));

// ======================================================
// ПРОВЕРКА УНИКАЛЬНОСТИ + ДРОПДАУН НАЗВАНИЯ
// ======================================================
catNameInput.addEventListener('input', () => {
  const val = catNameInput.value.trim().toLowerCase();

  const matches = val ? allFoods.filter(f => f.name.toLowerCase().includes(val)) : allFoods;
  showCatDropdown(matches.filter(f => f.id !== editId).slice(0, 8));

  if (!val) {
    catNameError.textContent = '';
    submitBtn.disabled = false;
    if (editSource === 'name') exitEditMode(false);
    return;
  }

  const duplicate = allFoods.find(f => f.name.toLowerCase() === val && f.id !== editId);

  if (duplicate) {
    catNameError.textContent = 'Блюдо с таким названием уже есть в справочнике';
    if (editSource === 'pencil') {
      submitBtn.disabled = true;
    } else {
      editSource = 'name';
      // enterEditMode загрузит состав асинхронно
      enterEditMode(duplicate, false);
    }
  } else {
    catNameError.textContent = '';
    submitBtn.disabled = false;
    if (editSource === 'name') {
      const editFood = allFoods.find(f => f.id === editId);
      if (!editFood || editFood.name.toLowerCase() !== val) {
        exitEditMode(false);
        submitBtn.textContent = 'Добавить блюдо';
      }
    }
  }
});

// ======================================================
// ОТПРАВКА ФОРМЫ
// ======================================================
catForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name     = catNameInput.value.trim();
  const calories = parseFloat(document.getElementById('cat-cal').value) || 0;
  const protein  = parseFloat(document.getElementById('cat-p').value)   || 0;
  const fat      = parseFloat(document.getElementById('cat-f').value)   || 0;
  const carbs    = parseFloat(document.getElementById('cat-c').value)   || 0;
  if (!name) return;

  const ings = ingredients.map(i => ({ food_id: i.food.id, percent: i.percent }));

  try {
    if (editId !== null) {
      const res = await fetch(`${API}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, calories, protein, fat, carbs, ingredients: ings }),
      });
      if (res.ok) { toast('Блюдо обновлено'); exitEditMode(true); loadCatalog(); }
      else toast('Ошибка при обновлении');
    } else {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, calories, protein, fat, carbs, ingredients: ings }),
      });
      if (res.ok) { exitEditMode(true); toast('Блюдо добавлено'); loadCatalog(); }
      else toast('Ошибка при добавлении');
    }
  } catch { toast('Ошибка соединения'); }
});

// ======================================================
// СОРТИРОВКА
// ======================================================
document.querySelectorAll('th[data-col]').forEach(th => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    sortDir = (sortCol === col && sortDir === 'asc') ? 'desc' : 'asc';
    sortCol = col;
    renderTable();
    updateSortIndicators();
  });
});

function updateSortIndicators() {
  document.querySelectorAll('th[data-col]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortCol) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

// ======================================================
// ТАБЛИЦА БЛЮД
// ======================================================
function renderTable() {
  const tbody = document.getElementById('catalog-tbody');
  if (!allFoods.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Список пуст — добавьте первое блюдо</td></tr>';
    return;
  }
  const sorted = [...allFoods].sort((a, b) => {
    const av = a[sortCol], bv = b[sortCol];
    const cmp = typeof av === 'string' ? av.localeCompare(bv, 'ru') : (av - bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  tbody.innerHTML = sorted.map((f, i) => `
    <tr>
      <td><span class="badge">${i + 1}</span></td>
      <td>${esc(f.name)}</td>
      <td>${f.calories}</td>
      <td>${f.protein}</td>
      <td>${f.fat}</td>
      <td>${f.carbs}</td>
      <td class="row-actions">
        <button class="edit-btn" title="Редактировать" onclick="editFood(${f.id})">✏</button>
        <button class="del-btn"  title="Удалить"       onclick="deleteFood(${f.id}, this)">✕</button>
      </td>
    </tr>
  `).join('');
}

async function loadCatalog() {
  const tbody = document.getElementById('catalog-tbody');
  try {
    const res = await fetch(API);
    allFoods  = await res.json();
    document.getElementById('count').textContent = allFoods.length;
    renderTable();
    updateSortIndicators();
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Ошибка загрузки данных</td></tr>';
  }
}

async function loadCatalogFoods() {
  try {
    const res = await fetch('/api/foods');
    catalogFoods = await res.json();
  } catch { catalogFoods = []; }
}

function editFood(id) {
  const food = allFoods.find(f => f.id === id);
  if (!food) return;
  editSource = 'pencil';
  catNameError.textContent = '';
  enterEditMode(food, true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteFood(id, btn) {
  btn.disabled = true;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (editId === id) exitEditMode(true);
    loadCatalog();
    toast('Блюдо удалено');
  } catch { btn.disabled = false; }
}

// ======================================================
// УТИЛИТЫ
// ======================================================
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
loadCatalog();
loadCatalogFoods();
