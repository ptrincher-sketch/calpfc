let allFoods  = [];
let sortCol   = 'name';
let sortDir   = 'asc';
let editId    = null;    // id редактируемого продукта
let editSource = null;   // 'pencil' | 'name'

const catForm      = document.getElementById('catalog-form');
const catNameInput = document.getElementById('cat-name');
const catNameError = document.getElementById('cat-name-error');
const submitBtn    = document.getElementById('catalog-submit-btn');
const cancelBtn    = document.getElementById('catalog-cancel-btn');
const formTitle    = document.getElementById('form-title');

const catAcList = document.getElementById('cat-ac-list');

// ---- autocomplete dropdown ----
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
      catNameInput.focus();
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
});

// ---- edit mode helpers ----
function enterEditMode(food, fillName) {
  editId = food.id;
  if (fillName) catNameInput.value = food.name;
  document.getElementById('cat-cal').value = food.calories;
  document.getElementById('cat-p').value   = parseFloat(food.protein).toFixed(1);
  document.getElementById('cat-f').value   = parseFloat(food.fat).toFixed(1);
  document.getElementById('cat-c').value   = parseFloat(food.carbs).toFixed(1);
  submitBtn.textContent    = 'Изменить';
  submitBtn.disabled       = false;
  cancelBtn.style.display  = '';
  formTitle.textContent    = 'Редактировать продукт';
}

function exitEditMode(resetForm) {
  editId     = null;
  editSource = null;
  catNameError.textContent = '';
  submitBtn.textContent    = 'Добавить в справочник';
  submitBtn.disabled       = false;
  cancelBtn.style.display  = 'none';
  formTitle.textContent    = 'Добавить продукт';
  if (resetForm) catForm.reset();
}

cancelBtn.addEventListener('click', () => exitEditMode(true));

// ---- name uniqueness check + dropdown filter ----
catNameInput.addEventListener('input', () => {
  const val = catNameInput.value.trim().toLowerCase();

  // обновляем дропдаун
  const matches = val ? allFoods.filter(f => f.name.toLowerCase().includes(val)) : allFoods;
  showCatDropdown(matches.filter(f => f.id !== editId).slice(0, 8));

  if (!val) {
    catNameError.textContent = '';
    submitBtn.disabled = false;
    if (editSource === 'name') exitEditMode(false);
    return;
  }

  // Ищем совпадение среди всех, кроме текущего редактируемого
  const duplicate = allFoods.find(f => f.name.toLowerCase() === val && f.id !== editId);

  if (duplicate) {
    catNameError.textContent = 'Продукт с таким названием уже есть в справочнике';

    if (editSource === 'pencil') {
      // При редактировании через карандаш нельзя переименовать в уже существующее
      submitBtn.disabled = true;
    } else {
      // Переключаемся на редактирование найденного дубликата
      editSource = 'name';
      editId     = duplicate.id;
      document.getElementById('cat-cal').value = duplicate.calories;
      document.getElementById('cat-p').value   = parseFloat(duplicate.protein).toFixed(1);
      document.getElementById('cat-f').value   = parseFloat(duplicate.fat).toFixed(1);
      document.getElementById('cat-c').value   = parseFloat(duplicate.carbs).toFixed(1);
      submitBtn.textContent   = 'Изменить';
      submitBtn.disabled      = false;
      cancelBtn.style.display = '';
      formTitle.textContent   = 'Редактировать продукт';
    }
  } else {
    // Нет дубликата среди других продуктов
    catNameError.textContent = '';
    submitBtn.disabled = false;

    if (editSource === 'name') {
      // Проверяем: название ещё совпадает с тем, что мы редактировали?
      const editFood = allFoods.find(f => f.id === editId);
      if (!editFood || editFood.name.toLowerCase() !== val) {
        // Название сменилось → выходим из режима редактирования
        exitEditMode(false);
        submitBtn.textContent = 'Добавить в справочник';
      }
      // иначе остаёмся в режиме редактирования (имя совпадает с редактируемым)
    }
  }
});

// ---- form submit ----
catForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name     = catNameInput.value.trim();
  const calories = parseFloat(document.getElementById('cat-cal').value) || 0;
  const protein  = parseFloat(document.getElementById('cat-p').value)   || 0;
  const fat      = parseFloat(document.getElementById('cat-f').value)   || 0;
  const carbs    = parseFloat(document.getElementById('cat-c').value)   || 0;
  if (!name) return;

  try {
    if (editId !== null) {
      const res = await apiPut(`/api/foods/${editId}`, { name, calories, protein, fat, carbs });
      if (res.ok) { toast('Продукт обновлён'); exitEditMode(true); loadCatalog(); }
      else toast('Ошибка при обновлении');
    } else {
      const res = await apiPost('/api/foods', { name, calories, protein, fat, carbs });
      if (res.ok) { catForm.reset(); toast('Продукт добавлен в справочник'); loadCatalog(); }
      else toast('Ошибка при добавлении');
    }
  } catch {
    toast('Ошибка соединения');
  }
});

// ---- sorting ----
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

// ---- render ----
function renderTable() {
  const admin = getCurrentUser()?.username === 'admin';
  const tbody = document.getElementById('catalog-tbody');

  syncCreatorColumn(document.querySelector('.catalog-table thead tr'), admin);

  const cols = admin ? 8 : 7;

  if (!allFoods.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${cols}">Справочник пуст — добавьте продукты</td></tr>`;
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
      <td>${parseFloat(f.protein).toFixed(1)}</td>
      <td>${parseFloat(f.fat).toFixed(1)}</td>
      <td>${parseFloat(f.carbs).toFixed(1)}</td>
      ${admin ? `<td class="col-creator">${esc(f.created_by_username || '—')}</td>` : ''}
      <td class="row-actions">
        <button class="edit-btn" title="Редактировать" onclick="editFood(${f.id})">✏</button>
        <button class="del-btn"  title="Удалить"       onclick="deleteFood(${f.id}, this)">✕</button>
      </td>
    </tr>
  `).join('');
}

// ---- load ----
async function loadCatalog() {
  const tbody = document.getElementById('catalog-tbody');
  try {
    const res = await apiGet('/api/foods');
    allFoods  = await res.json();
    document.getElementById('count').textContent = allFoods.length;
    renderTable();
    updateSortIndicators();
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Ошибка загрузки данных</td></tr>';
  }
}

// ---- edit via pencil ----
function editFood(id) {
  const food = allFoods.find(f => f.id === id);
  if (!food) return;
  editSource = 'pencil';
  catNameError.textContent = '';
  enterEditMode(food, true);
  catNameInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- delete ----
async function deleteFood(id, btn) {
  btn.disabled = true;
  try {
    await apiDel(`/api/foods/${id}`);
    if (editId === id) exitEditMode(true);
    loadCatalog();
    toast('Продукт удалён');
  } catch {
    btn.disabled = false;
  }
}

window.addEventListener('calpfc:auth-change', () => loadCatalog());
