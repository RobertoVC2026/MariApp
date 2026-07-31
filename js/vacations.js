/**
 * VACATIONS MODULE
 * Calcula vacaciones generadas, tomadas y pendientes.
 * Perú: 30 días por año de servicio (Ley 27671).
 */
const VacationsModule = (() => {

  function calcGenerated() {
    const config = Storage.get('config', {});
    if (!config.startDate) return 0;
    const start = new Date(config.startDate + 'T00:00:00');
    const today = new Date();
    const months = (today.getFullYear() - start.getFullYear()) * 12
                 + (today.getMonth() - start.getMonth());
    // 30 días por año = 2.5 días por mes
    return parseFloat((Math.max(0, months) * 2.5).toFixed(1));
  }

  function calcTaken() {
    const config  = Storage.get('config', {});
    const initial = parseFloat(config.vacationsTaken || 0);
    const records = Storage.get('vacations_records', []);
    const fromRecords = records.reduce((sum, r) => sum + r.days, 0);
    return initial + fromRecords;
  }

  function calcPending() {
    return parseFloat((calcGenerated() - calcTaken()).toFixed(1));
  }

  function render() {
    const records  = Storage.get('vacations_records', []);
    const list     = document.getElementById('vacations-list');
    const gen      = calcGenerated();
    const taken    = calcTaken();
    const pending  = calcPending();

    document.getElementById('vac-generated').textContent = `${gen} días`;
    document.getElementById('vac-taken').textContent     = `${taken} días`;
    document.getElementById('vac-pending').textContent   = `${pending} días`;

    if (!records.length) {
      list.innerHTML = '<p class="empty-state">Sin registros de vacaciones.</p>';
      return;
    }

    const sorted = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
    list.innerHTML = sorted.map(r => `
      <div class="record-item">
        <div class="record-date">${fmtDate(r.startDate)}</div>
        <div class="record-main">
          <div class="record-title">${r.days} días de vacaciones</div>
          <div class="record-sub">Hasta ${fmtDate(r.endDate)}</div>
        </div>
        <div class="record-actions">
          <button class="record-action-btn del" onclick="VacationsModule.deleteRecord('${r.id}')">Eliminar</button>
        </div>
      </div>`).join('');
  }

  function openForm() {
    document.getElementById('vac-start').value = '';
    document.getElementById('vac-end').value   = '';
    document.getElementById('vac-days-preview').classList.add('hidden');
    document.getElementById('vacations-form-modal').classList.remove('hidden');

    // Listeners for preview
    ['vac-start','vac-end'].forEach(id => {
      document.getElementById(id).onchange = updatePreview;
    });
  }

  function updatePreview() {
    const s = document.getElementById('vac-start').value;
    const e = document.getElementById('vac-end').value;
    const preview = document.getElementById('vac-days-preview');
    if (s && e && e >= s) {
      const days = calcDays(s, e);
      preview.textContent = `${days} días de vacaciones`;
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }

  function closeForm() {
    document.getElementById('vacations-form-modal').classList.add('hidden');
  }

  function saveRecord() {
    const startDate = document.getElementById('vac-start').value;
    const endDate   = document.getElementById('vac-end').value;

    if (!startDate || !endDate) { showToast('Ingresa las fechas'); return; }
    if (endDate < startDate)    { showToast('La fecha fin debe ser posterior al inicio'); return; }

    const days = calcDays(startDate, endDate);
    const pending = calcPending();

    if (days > pending) {
      showToast(`Solo tienes ${pending} días disponibles`);
      return;
    }

    const records = Storage.get('vacations_records', []);
    records.push({ id: uid(), startDate, endDate, days });
    Storage.set('vacations_records', records);
    closeForm();
    render();
    showToast('Vacaciones registradas');
    Dashboard.refresh();
  }

  function deleteRecord(id) {
    if (!confirm('¿Eliminar este registro de vacaciones?')) return;
    const records = Storage.get('vacations_records', []).filter(r => r.id !== id);
    Storage.set('vacations_records', records);
    render();
    showToast('Registro eliminado');
    Dashboard.refresh();
  }

  function calcDays(start, end) {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end   + 'T00:00:00');
    return Math.round((e - s) / 86400000) + 1;
  }

  function fmtDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return {
    render, openForm, closeForm, saveRecord, deleteRecord,
    calcPending, calcGenerated, calcTaken,
    init() { render(); }
  };
})();
