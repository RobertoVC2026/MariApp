/**
 * DASHBOARD MODULE
 * Métricas principales + gráficos de los últimos 6 meses.
 */
const Dashboard = (() => {

  const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  let chartOT = null, chartPay = null;
  let dashYear  = new Date().getFullYear();
  let dashMonth = new Date().getMonth() + 1;

  function refresh() {
    if (!document.getElementById('view-dashboard').classList.contains('active')) return;
    render();
  }

  function render() {
    const config = Storage.get('config', {});
    if (!config.salary) return;

    const now = new Date();
    const y = dashYear, m = dashMonth;
    document.getElementById('dash-month-label').textContent = formatMonthLabel(y, m);

    // Horas extras del mes seleccionado
    const otMonth = OvertimeModule.getRecords(y, m).reduce((s, r) => s + r.hours, 0);

    // Horas extras del año
    let otYear = 0;
    for (let mo = 1; mo <= 12; mo++) {
      otYear += OvertimeModule.getRecords(y, mo).reduce((s, r) => s + r.hours, 0);
    }

    // Total pagado del año (solo meses con payroll calculado)
    let totalYear = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const pr = PayrollModule.getPayrollRecord(y, mo);
      if (pr && pr.total) totalYear += pr.total;
    }

    // Vacaciones
    const vacPending = VacationsModule.calcPending();

    // Antigüedad
    let seniority = '—';
    if (config.startDate) {
      const start = new Date(config.startDate + 'T00:00:00');
      const diffMs = now - start;
      const yrs = Math.floor(diffMs / (365.25 * 86400000));
      const mos = Math.floor((diffMs % (365.25 * 86400000)) / (30.44 * 86400000));
      seniority = yrs > 0 ? `${yrs} año${yrs>1?'s':''} ${mos > 0 ? `y ${mos} mes${mos>1?'es':''}` : ''}` : `${mos} mes${mos>1?'es':''}`;
    }

    // Próxima gratificación
    const cm = now.getMonth() + 1;
    const nextGrat = cm <= 7 ? `Julio ${now.getFullYear()}` : `Diciembre ${now.getFullYear()}`;

    document.getElementById('stat-overtime-month').textContent  = `${otMonth} h`;
    document.getElementById('stat-overtime-year').textContent   = `${otYear} h`;
    document.getElementById('stat-total-year').textContent      = `S/ ${totalYear.toFixed(0)}`;
    document.getElementById('stat-vacations-pending').textContent = `${vacPending} días`;
    document.getElementById('stat-seniority').textContent       = seniority;
    document.getElementById('stat-next-bonus').textContent      = nextGrat;

    renderCharts(y, m);
  }

  function renderCharts(y, m) {
    // Last 6 months of overtime
    const labels6 = [], dataOT = [], dataPay = [];
    for (let i = 5; i >= 0; i--) {
      let mo = m - i; let yr = y;
      if (mo < 1) { mo += 12; yr--; }
      labels6.push(`${MONTH_SHORT[mo-1]} ${yr}`);
      dataOT.push(OvertimeModule.getRecords(yr, mo).reduce((s, r) => s + r.hours, 0));
      const pr = PayrollModule.getPayrollRecord(yr, mo);
      dataPay.push(pr && pr.total ? pr.total : 0);
    }

    const ctx1 = document.getElementById('chart-overtime').getContext('2d');
    const ctx2 = document.getElementById('chart-payments').getContext('2d');

    if (chartOT) chartOT.destroy();
    if (chartPay) chartPay.destroy();

    const sharedOpts = {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.parsed.y } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#A0A09C' } },
        y: { grid: { color: '#F3F3F1' }, ticks: { font: { size: 11, family: 'Inter' }, color: '#A0A09C' }, beginAtZero: true }
      }
    };

    chartOT = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: labels6,
        datasets: [{ data: dataOT, backgroundColor: '#EBF1FD', borderColor: '#2F6FED', borderWidth: 2, borderRadius: 6 }]
      },
      options: { ...sharedOpts, plugins: { ...sharedOpts.plugins, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} h` } } } }
    });

    chartPay = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: labels6,
        datasets: [{
          data: dataPay,
          borderColor: '#2F6FED',
          backgroundColor: 'rgba(47,111,237,.08)',
          borderWidth: 2,
          pointBackgroundColor: '#2F6FED',
          pointRadius: 4,
          fill: true,
          tension: 0.3
        }]
      },
      options: { ...sharedOpts, plugins: { ...sharedOpts.plugins, tooltip: { callbacks: { label: ctx => `S/ ${ctx.parsed.y.toFixed(2)}` } } } }
    });
  }

  function prevMonth() {
    dashMonth--;
    if (dashMonth < 1) { dashMonth = 12; dashYear--; }
    render();
  }
  function nextMonth() {
    dashMonth++;
    if (dashMonth > 12) { dashMonth = 1; dashYear++; }
    render();
  }

  return {
    refresh, render, prevMonth, nextMonth,
    init() { render(); }
  };
})();
