/**
 * PAYROLL MODULE
 * Liquidacióm mensual: sueldo, horas extras, bonos, gratificación.
 */
const PayrollModule = (() => {

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;
  let lastResult   = null; // cache para reporte

  function storageKey(y, m) {
    return `payroll_${y}_${String(m).padStart(2,'0')}`;
  }

  function getPayrollRecord(y, m) {
    return Storage.get(storageKey(y, m), null);
  }

  function render() {
    document.getElementById('payroll-month-label').textContent = formatMonthLabel(currentYear, currentMonth);
    // Solo oculta el resultado si no hay cálculo reciente (evita que real-time lo oculte)
    if (!lastResult) document.getElementById('payroll-result').classList.add('hidden');

    // Status bar
    const record = getPayrollRecord(currentYear, currentMonth);
    const bar    = document.getElementById('payroll-status-bar');
    if (record && record.paid) {
      bar.className = 'status-bar paid';
      bar.innerHTML = `✅ Pagado el ${fmtDateTime(record.paidAt)}`;
    } else if (record) {
      bar.className = 'status-bar pending';
      bar.innerHTML = `⏳ Calculado — Pendiente de pago`;
    } else {
      bar.className = 'status-bar';
    }
  }

  function calculate() {
    const config = Storage.get('config', {});
    if (!config.salary) { showToast('Configura el sueldo primero'); return; }

    const y = currentYear;
    const m = currentMonth;

    const salary      = parseFloat(config.salary);
    // Tarifa hora extra acordada: S/ 6.25 fija (configurable vía config.overtimeRate)
    const overtimeRate = parseFloat(config.overtimeRate) || 6.25;

    // Horas extras
    const otRecords   = OvertimeModule.getRecords(y, m);
    const totalOtHours = otRecords.reduce((s, r) => s + r.hours, 0);
    const totalOtPay   = otRecords.reduce((s, r) => s + OvertimeModule.calcOvertimePay(r.hours, r.date, config), 0);

    // Bonos
    const bonusTotal  = BonusesModule.getTotalForMonth(y, m);

    // Gratificación (julio = m7, diciembre = m12)
    const isGratMonth = m === 7 || m === 12;
    const gratAmount  = isGratMonth ? parseFloat(config.bonusValue || salary) : 0;

    const total = salary + totalOtPay + bonusTotal + gratAmount;

    lastResult = { y, m, salary, overtimeRate, totalOtHours, totalOtPay, bonusTotal, isGratMonth, gratAmount, total };

    // Render result
    document.getElementById('pr-base').textContent       = `S/ ${salary.toFixed(2)}`;
    document.getElementById('pr-hour-value').textContent = `S/ ${overtimeRate.toFixed(2)}`;
    document.getElementById('pr-ot-hours').textContent   = totalOtHours;
    document.getElementById('pr-ot-pay').textContent     = `S/ ${totalOtPay.toFixed(2)}`;
    document.getElementById('pr-total').textContent      = `S/ ${total.toFixed(2)}`;

    const bonSec = document.getElementById('pr-bonuses-section');
    const bonEl  = document.getElementById('pr-bonuses');
    if (bonusTotal > 0) {
      bonEl.textContent = `S/ ${bonusTotal.toFixed(2)}`;
      bonSec.classList.remove('hidden');
    } else {
      bonSec.classList.add('hidden');
    }

    const gratSec = document.getElementById('pr-gratification-section');
    const gratEl  = document.getElementById('pr-gratification');
    if (isGratMonth) {
      gratEl.textContent = `S/ ${gratAmount.toFixed(2)}`;
      gratSec.classList.remove('hidden');
    } else {
      gratSec.classList.add('hidden');
    }

    document.getElementById('payroll-result').classList.remove('hidden');

    // Save calculation
    const existing = getPayrollRecord(y, m) || {};
    Storage.set(storageKey(y, m), { ...existing, ...lastResult, calculatedAt: new Date().toISOString() });

    // Update history
    HistoryModule.render();
    Dashboard.refresh();
  }

  function markPaid() {
    if (!lastResult) { showToast('Calcula primero la remuneración'); return; }
    const record = Storage.get(storageKey(lastResult.y, lastResult.m), {});
    Storage.set(storageKey(lastResult.y, lastResult.m), {
      ...record,
      paid: true,
      paidAt: new Date().toISOString()
    });
    render();
    showToast('✅ Mes marcado como pagado');
    HistoryModule.render();
    Dashboard.refresh();
  }

  function shareReport() {
    if (!lastResult) { showToast('Calcula primero la remuneración'); return; }
    const config = Storage.get('config', {});
    const { y, m, salary, overtimeRate, totalOtHours, totalOtPay, bonusTotal, isGratMonth, gratAmount, total } = lastResult;
    const monthLabel = formatMonthLabel(y, m);

    // OT detail lines
    const otRecords = OvertimeModule.getRecords(y, m);
    const otDetail = otRecords.length
      ? otRecords.map(r => {
          const special = Holidays.specialDay(r.date);
          const tag = special === 'holiday' ? ' (Feriado)' : special === 'sunday' ? ' (Domingo)' : '';
          const pay = OvertimeModule.calcOvertimePay(r.hours, r.date, config);
          const d = new Date(r.date + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          return `<div class="report-row" style="padding:4px 0;font-size:12px">
            <span style="color:#6B6B67">${d} — ${r.hours}h${tag}</span>
            <span>S/ ${pay.toFixed(2)}</span></div>`;
        }).join('')
      : '';

    document.getElementById('report-content').innerHTML = `
      <div class="report-card">
        <div class="report-header">
          <div class="app-logo" style="margin:0 auto 8px;width:36px;height:36px;background:#2F6FED;color:white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">H</div>
          <h3>${escHtml(config.name || '—')}</h3>
          <p>${monthLabel}</p>
        </div>
        <div class="report-row"><span>Sueldo base</span><span>S/ ${salary.toFixed(2)}</span></div>
        <div class="report-row"><span>Valor hora extra</span><span>S/ ${overtimeRate.toFixed(2)}</span></div>
        <div class="report-row"><span>Horas extras (${totalOtHours}h)</span><span>S/ ${totalOtPay.toFixed(2)}</span></div>
        ${otDetail}
        ${bonusTotal > 0 ? `<div class="report-row"><span>Bonos</span><span>S/ ${bonusTotal.toFixed(2)}</span></div>` : ''}
        ${isGratMonth  ? `<div class="report-row"><span>Gratificación</span><span>S/ ${gratAmount.toFixed(2)}</span></div>` : ''}
        <div class="report-row total"><span>TOTAL</span><span>S/ ${total.toFixed(2)}</span></div>
        <div class="report-footer">Generado con Hogar · ${new Date().toLocaleDateString('es-PE')}</div>
      </div>`;

    document.getElementById('report-modal').classList.remove('hidden');
  }

  async function captureReport() {
    try {
      const el = document.getElementById('report-content');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const link = document.createElement('a');
      link.download = `reporte-${formatMonthLabel(lastResult.y, lastResult.m).replace(' ', '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Imagen guardada');
    } catch (e) {
      showToast('Error al generar imagen');
    }
  }

  async function shareNative() {
    try {
      const el = document.getElementById('report-content');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff' });
      canvas.toBlob(async blob => {
        if (navigator.share && navigator.canShare({ files: [new File([blob], 'reporte.png', { type: 'image/png' })] })) {
          await navigator.share({
            title: 'Reporte de remuneración',
            files: [new File([blob], 'reporte.png', { type: 'image/png' })]
          });
        } else {
          captureReport();
        }
      }, 'image/png');
    } catch { captureReport(); }
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    lastResult = null;
    render();
  }
  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    lastResult = null;
    render();
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return {
    render, calculate, markPaid, shareReport, captureReport, shareNative,
    prevMonth, nextMonth, getPayrollRecord,
    init() { render(); }
  };
})();
