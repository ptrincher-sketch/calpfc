function getStepFromCursor(raw, cursor) {
  const dotIdx = raw.indexOf('.');
  if (cursor <= 0) {
    const intLen = dotIdx >= 0 ? dotIdx : raw.length;
    return Math.pow(10, Math.max(0, intLen - 1));
  }
  if (dotIdx < 0) {
    return Math.pow(10, Math.max(0, raw.length - cursor));
  }
  if (cursor <= dotIdx) {
    return Math.pow(10, dotIdx - cursor);
  }
  const charLeft = raw[cursor - 1];
  if (charLeft === '.') return 0.1;
  return Math.pow(10, -(cursor - 1 - dotIdx));
}

function stepMacroInput(input, dir) {
  const raw = input.value.replace(',', '.').trim() || '0';
  const isFocused = document.activeElement === input;
  const cursor = isFocused ? (input.selectionStart ?? raw.length) : raw.length;
  const step = isFocused ? getStepFromCursor(raw, cursor) : 1;
  const newNum = Math.max(0, Math.round(((parseFloat(raw) || 0) + dir * step) * 1e9) / 1e9);
  const decimals = step < 1 ? Math.max(1, Math.ceil(-Math.log10(step))) : 1;
  input.value = newNum.toFixed(decimals);
  if (isFocused) {
    const pos = Math.min(cursor, input.value.length);
    input.setSelectionRange(pos, pos);
  }
}

function initMacroInputs(root) {
  (root || document).querySelectorAll('input[data-macro]').forEach(input => {
    if (input.dataset.macroInit) return;
    input.dataset.macroInit = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'macro-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const spinners = document.createElement('div');
    spinners.className = 'macro-spinners';
    [['▲', 1], ['▼', -1]].forEach(([arrow, dir]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.className = dir === 1 ? 'macro-up' : 'macro-dn';
      btn.textContent = arrow;
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        stepMacroInput(input, dir);
      });
      spinners.appendChild(btn);
    });
    wrapper.appendChild(spinners);

    input.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      stepMacroInput(input, e.key === 'ArrowUp' ? 1 : -1);
    });

    input.addEventListener('blur', () => {
      const v = parseFloat(input.value.replace(',', '.'));
      input.value = isNaN(v) ? '0.0' : Math.max(0, v).toFixed(1);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => initMacroInputs());
