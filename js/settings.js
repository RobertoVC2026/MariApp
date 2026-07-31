/**
 * HISTORY MODULE
 */
const HistoryModule = (() => {

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function render() {
    const list = document.getElementById('history-list');
    const y    = new Date().getFullYear();
    const items = [];

    // Scan all months of current + previous year
    for (let yr = y; yr >= y - 2; yr--) {
      for (let m = 12; m >= 1; m--) {
        const pr = PayrollModule.getPayrollRecord(yr, m);
        if (pr && pr.total) {
          items.push({ yr, m, pr });
        }
      }
    }

    if (!items.length) {
      list.innerHTML = '<p class="empty-state">Sin historial registrado. Calcula la primera liquidación para verla aquí.</p>';
      return;
    }

    list.innerHTML = items.map(({ yr, m, pr }) => `
      <div class="history-item" onclick="HistoryModule.openMonth(${yr}, ${m})">
        <div>
          <div class="history-month">${MONTH_NAMES[m-1]} ${yr}</div>
          <div class="history-sub">
            ${pr.totalOtHours ? `${pr.totalOtHours}h extras` : 'Sin horas extras'}
            ${pr.isGratMonth ? ' · Gratificación' : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="history-total">S/ ${pr.total.toFixed(2)}</span>
          <span class="history-badge ${pr.paid ? 'paid' : 'pending'}">${pr.paid ? '✅ Pagado' : '⏳ Pendiente'}</span>
        </div>
      </div>`).join('');
  }

  function openMonth(y, m) {
    // Navigate to payroll and set month
    App.navigate('payroll');
    PayrollModule['currentYear']  = y;  // expose via closure not ideal; use init instead
    PayrollModule['currentMonth'] = m;
    PayrollModule.render();
    // Auto-calculate
    setTimeout(() => PayrollModule.calculate(), 50);
  }

  return { render, openMonth, init() { render(); } };
})();

/**
 * SETTINGS MODULE
 */
const SettingsModule = (() => {

  function load() {
    const config = Storage.get('config', {});
    document.getElementById('cfg-name').value           = config.name || '';
    document.getElementById('cfg-start-date').value    = config.startDate || '';
    document.getElementById('cfg-salary').value         = config.salary || '';
    document.getElementById('cfg-hours-day').value      = config.hoursPerDay || 8;
    document.getElementById('cfg-hours-week').value     = config.hoursPerWeek || 48;
    document.getElementById('cfg-vacations-taken').value = config.vacationsTaken || 0;
    document.getElementById('cfg-bonus-value').value    = config.bonusValue || '';
    renderHolidays();
  }

  function save() {
    const config = {
      name:           document.getElementById('cfg-name').value.trim(),
      startDate:      document.getElementById('cfg-start-date').value,
      salary:         parseFloat(document.getElementById('cfg-salary').value),
      hoursPerDay:    parseFloat(document.getElementById('cfg-hours-day').value),
      hoursPerWeek:   parseFloat(document.getElementById('cfg-hours-week').value),
      vacationsTaken: parseFloat(document.getElementById('cfg-vacations-taken').value || 0),
      bonusValue:     parseFloat(document.getElementById('cfg-bonus-value').value) || null,
    };
    if (!config.name) { showToast('Ingresa el nombre'); return; }
    if (!config.salary || config.salary <= 0) { showToast('Ingresa el sueldo'); return; }

    Storage.set('config', config);
    document.getElementById('nav-worker-name').textContent = config.name;
    showToast('Configuración guardada');
    Dashboard.refresh();
    VacationsModule.render();
  }

  function renderHolidays() {
    const custom = Holidays.getCustom();
    const all    = Holidays.forYear(new Date().getFullYear())
      .sort((a, b) => a.date.localeCompare(b.date));

    document.getElementById('holidays-list').innerHTML = all.map(h => `
      <div class="holiday-item">
        <span class="holiday-item-date">${fmtDate(h.date)}</span>
        <span class="holiday-item-name">${escHtml(h.name)}</span>
        ${!h.fixed ? `<button class="holiday-item-del" onclick="SettingsModule.removeHoliday('${h.date}')">Eliminar</button>` : ''}
      </div>`).join('');
  }

  function addHoliday() {
    const date = document.getElementById('new-holiday-date').value;
    const name = document.getElementById('new-holiday-name').value.trim();
    if (!date || !name) { showToast('Ingresa fecha y nombre'); return; }
    Holidays.addCustom(date, name);
    document.getElementById('new-holiday-date').value = '';
    document.getElementById('new-holiday-name').value = '';
    renderHolidays();
    showToast('Feriado agregado');
  }

  function removeHoliday(date) {
    Holidays.removeCustom(date);
    renderHolidays();
    showToast('Feriado eliminado');
  }

  function exportData() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `hogar-backup-${todayStr()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast('Datos exportados');
  }

  function resetApp() {
    if (!confirm('¿Reiniciar toda la aplicación? Se perderán TODOS los datos.')) return;
    if (!confirm('Esta acción es irreversible. ¿Confirmas?')) return;
    Storage.clear();
    location.reload();
  }

  function fmtDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  return {
    load, save, addHoliday, removeHoliday, exportData, resetApp,
    init() { load(); }
  };
})();
