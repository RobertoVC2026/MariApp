/**
 * BONUSES MODULE
 * Registro y gestión de bonos extraordinarios.
 */
const BonusesModule = (() => {

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;

  function storageKey(y, m) {
    return `bonuses_${y}_${String(m).padStart(2,'0')}`;
  }

  function getRecords(y, m) {
    return Storage.get(storageKey(y, m), []);
  }

  function getTotalForMonth(y, m) {
    return getRecords(y, m).reduce((sum, r) => sum + r.amount, 0);
  }

  function render() {
    const records = getRecords(currentYear, currentMonth);
    const list    = document.getElementById('bonuses-list');
    document.getElementById('bonuses-month-label').textContent = formatMonthLabel(currentYear, currentMonth);

    if (!records.length) {
      list.innerHTML = '<p class="empty-state">Sin bonos registrados este mes.</p>';
      return;
    }

    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    list.innerHTML = sorted.map(r => `
      <div class="record-item">
        <div class="record-date">${fmtDate(r.date)}</div>
        <div class="record-main">
          <div class="record-title">${escHtml(r.concept)}</div>
        </div>
        <div class="record-value">S/ ${r.amount.toFixed(2)}</div>
        <div class="record-actions">
          <button class="record-action-btn del" onclick="BonusesModule.deleteRecord('${r.id}')">Eliminar</button>
        </div>
      </div>`).join('');
  }

  function openForm() {
    document.getElementById('bonus-date').value    = todayStr();
    document.getElementById('bonus-concept').value = '';
    document.getElementById('bonus-amount').value  = '';
    document.getElementById('bonuses-form-modal').classList.remove('hidden');
  }

  function closeForm() {
    document.getElementById('bonuses-form-modal').classList.add('hidden');
  }

  function saveRecord() {
    const date    = document.getElementById('bonus-date').value;
    const concept = document.getElementById('bonus-concept').value.trim();
    const amount  = parseFloat(document.getElementById('bonus-amount').value);

    if (!date)    { showToast('Ingresa una fecha'); return; }
    if (!concept) { showToast('Ingresa el concepto'); return; }
    if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }

    const [y, m] = date.split('-').map(Number);
    const records = getRecords(y, m);
    records.push({ id: uid(), date, concept, amount });
    Storage.set(storageKey(y, m), records);
    currentYear  = y;
    currentMonth = m;
    closeForm();
    render();
    showToast('Bono registrado');
    Dashboard.refresh();
  }

  function deleteRecord(id) {
    if (!confirm('¿Eliminar este bono?')) return;
    const records = getRecords(currentYear, currentMonth).filter(r => r.id !== id);
    Storage.set(storageKey(currentYear, currentMonth), records);
    render();
    showToast('Bono eliminado');
    Dashboard.refresh();
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    render();
  }
  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    render();
  }

  function fmtDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  return {
    render, openForm, closeForm, saveRecord, deleteRecord,
    prevMonth, nextMonth, getRecords, getTotalForMonth,
    init() { render(); }
  };
})();
