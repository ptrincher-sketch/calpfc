const form = document.getElementById('food-form');
const tbody = document.getElementById('food-tbody');

const totals = { cal: 0, p: 0, f: 0, c: 0 };
let entries = [];

form.addEventListener('submit', e => {
  e.preventDefault();

  const name   = document.getElementById('food-name').value.trim();
  const weight = parseFloat(document.getElementById('food-weight').value);
  const cal100 = parseFloat(document.getElementById('food-cal').value);
  const p100   = parseFloat(document.getElementById('food-p').value);
  const f100   = parseFloat(document.getElementById('food-f').value);
  const c100   = parseFloat(document.getElementById('food-c').value);

  const factor = weight / 100;
  const entry  = {
    id:     Date.now(),
    name,
    weight,
    cal: round(cal100 * factor),
    p:   round(p100   * factor),
    f:   round(f100   * factor),
    c:   round(c100   * factor),
  };

  entries.push(entry);
  renderTable();
  updateTotals();
  form.reset();
  document.getElementById('food-weight').value = 100;
});

function renderTable() {
  if (entries.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Список пуст — добавьте первый продукт</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${escape(e.name)}</td>
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
  entries = entries.filter(e => e.id !== id);
  renderTable();
  updateTotals();
}

function updateTotals() {
  const sum = { cal: 0, p: 0, f: 0, c: 0 };
  entries.forEach(e => { sum.cal += e.cal; sum.p += e.p; sum.f += e.f; sum.c += e.c; });
  document.getElementById('total-cal').textContent = round(sum.cal);
  document.getElementById('total-p').textContent   = round(sum.p);
  document.getElementById('total-f').textContent   = round(sum.f);
  document.getElementById('total-c').textContent   = round(sum.c);
}

function round(n) { return Math.round(n * 10) / 10; }

function escape(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
