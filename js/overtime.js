/**
 * OVERTIME MODULE
 * Registro de horas extras con detección automática de feriados/domingos.
 * Cálculo según tarifa acordada (S/ 6.25/h normal, S/ 12.50/h domingos/feriados).
 */
const OvertimeModule = (() => {

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1; // 1-based
  let editingId    = null;

  // ---- Cálculo de pago por horas extras ----
  /**
   * Tarifa acordada fija:
   * - Normal: S/ 6.25 por hora (configurable vía config.overtimeRate)
   * - Domingo/Feriado: doble de la tarifa base (S/ 12.50 por hora)
   */
  function calcOvertimePay(hours, dateStr, config) {
    const BASE_RATE = (config && config.overtimeRate) ? parseFloat(config.overtimeRate) : 6.25;
    const special = Holidays.specialDay(dateStr);

    if (special) {
      // Domingo o feriado: doble del valor por hora
      return hours * BASE_RATE * 2;
    } else {
      // Hora extra normal: tarifa acordada
      return hours * BASE_RATE;
    }
  }

  // ---- Storage helpers ----
  function storageKey(y, m) {
    return `overtime_${y}_${String(m).padStart(2,'0')}`;
  }

  function getRecords(y, m) {
    return Storage.get(storageKey(y, m), []);
  }

  function saveRecords(y, m, records) {
    Storage.set(storageKey(y, m), records);
  }

  // ---- UI ----
  function render() {
    const records = getRecords(currentYear, currentMonth);
    const config  = Storage.get('config', {});
    const label   = document.getElementById('overtime-month-label');
    const list    = document.getElementById('overtime-list');

    label.textContent = formatMonthLabel(currentYear, currentMonth);

    if (!records.length) {
      list.innerHTML = '<p class="empty-state">Sin registros este mes.</p>';
      return;
    }

    // Ordenar por fecha desc
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

    list.innerHTML = sorted.map(r => {
      const special = Holidays.specialDay(r.date);
      const pay     = calcOvertimePay(r.hours, r.date, config);
      const badge   = special === 'holiday' ? '<span class="day-badge holiday" style="display:inline-block;padding:2px 7px;font-size:11px;border-radius:4px">Feriado</span>'
                    : special === 'sunday'  ? '<span class="day-badge sunday"  style="display:inline-block;padding:2px 7px;font-size:11px;border-radius:4px">Domingo</span>'
                    : '';
      const dateObj = new Date(r.date + 'T12:00:00');
      const dateLabel = dateObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });

      return `
        <div class="record-item">
          <div class="record-date">${dateLabel}</div>
          <div class="record-main">
            <div class="record-title">${r.hours}h extras ${badge}</div>
            ${r.note ? `<div class="record-sub">${escHtml(r.note)}</div>` : ''}
          </div>
          <div class="record-value">S/ ${pay.toFixed(2)}</div>
          <div class="record-actions">
            <button class="record-action-btn" onclick="OvertimeModule.editRecord('${r.id}')">Editar</button>
            <button class="record-action-btn del" onclick="OvertimeModule.deleteRecord('${r.id}')">Eliminar</button>
          </div>
        </div>`;
    }).join('');
  }

  function openForm(id = null) {
    editingId = id;
    const modal = document.getElementById('overtime-form-modal');
    const title = document.getElementById('overtime-form-title');
    const badge = document.getElementById('ot-day-badge');

    if (id) {
      const r = getRecords(currentYear, currentMonth).find(x => x.id === id);
      if (r) {
        document.getElementById('ot-date').value  = r.date;
        document.getElementById('ot-hours').value = r.hours;
        document.getElementById('ot-note').value  = r.note || '';
        title.textContent = 'Editar horas extras';
        updateDayBadge(r.date);
      }
    } else {
      document.getElementById('ot-date').value  = todayStr();
      document.getElementById('ot-hours').value = '';
      document.getElementById('ot-note').value  = '';
      title.textContent = 'Registrar horas extras';
      updateDayBadge(todayStr());
      badge.className = 'day-badge hidden';
    }

    modal.classList.remove('hidden');
  }

  function closeForm() {
    document.getElementById('overtime-form-modal').classList.add('hidden');
    editingId = null;
  }

  function updateDayBadge(dateStr) {
    const badge   = document.getElementById('ot-day-badge');
    const special = Holidays.specialDay(dateStr);
    if (special === 'holiday') {
      const name = Holidays.getName(dateStr);
      badge.textContent = `📅 Feriado: ${name} — Se pagará al doble (S/ 12.50/h)`;
      badge.className   = 'day-badge holiday';
    } else if (special === 'sunday') {
      badge.textContent = '📅 Domingo — Se pagará al doble (S/ 12.50/h)';
      badge.className   = 'day-badge sunday';
    } else {
      badge.className = 'day-badge hidden';
    }
  }

  function saveRecord() {
    const date  = document.getElementById('ot-date').value;
    const hours = parseFloat(document.getElementById('ot-hours').value);
    const note  = document.getElementById('ot-note').value.trim();

    if (!date)          { showToast('Ingresa una fecha'); return; }
    if (!hours || hours <= 0) { showToast('Ingresa las horas'); return; }

    const [y, m] = date.split('-').map(Number);
    let records = getRecords(y, m);

    if (editingId) {
      records = records.map(r => r.id === editingId ? { ...r, date, hours, note } : r);
    } else {
      records.push({ id: uid(), date, hours, note });
    }

    saveRecords(y, m, records);
    currentYear  = y;
    currentMonth = m;
    closeForm();
    render();
    showToast(editingId ? 'Registro actualizado' : 'Horas extras guardadas');
    Dashboard.refresh();
    CalendarModule.render();
  }

  function editRecord(id) { openForm(id); }

  function deleteRecord(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    let records = getRecords(currentYear, currentMonth).filter(r => r.id !== id);
    saveRecords(currentYear, currentMonth, records);
    render();
    showToast('Registro eliminado');
    Dashboard.refresh();
    CalendarModule.render();
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

  // ---- Public API ----
  return {
    render, openForm, closeForm, saveRecord, editRecord, deleteRecord,
    prevMonth, nextMonth,
    getRecords,      // used by other modules
    calcOvertimePay, // used by payroll
    updateDayBadge,
    init() {
      // Attach date change listener
      document.getElementById('ot-date').addEventListener('change', e => {
        updateDayBadge(e.target.value);
      });
      render();
    }
  };
})();
