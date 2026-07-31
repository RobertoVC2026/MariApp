/**
 * CALENDAR MODULE
 * Calendario mensual con indicadores de horas extras, feriados y domingos.
 */
const CalendarModule = (() => {

  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1;

  const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function render() {
    const label = document.getElementById('calendar-month-label');
    label.textContent = `${MONTH_NAMES[currentMonth-1]} ${currentYear}`;

    const otRecords  = OvertimeModule.getRecords(currentYear, currentMonth);
    const otByDate   = {};
    otRecords.forEach(r => { otByDate[r.date] = (otByDate[r.date] || 0) + r.hours; });

    const holidays   = Holidays.forYear(currentYear);
    const holidayMap = {};
    holidays.forEach(h => { holidayMap[h.date] = h.name; });

    const today      = todayStr();
    const firstDay   = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    let cells = '';

    // Header
    const header = DAY_NAMES.map(d => `<div class="cal-header-cell">${d}</div>`).join('');

    // Blanks from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells += `<div class="cal-cell other-month"><div class="cal-day-num">${prevMonthDays - i}</div></div>`;
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr  = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday  = dateStr === today;
      const isHol    = holidayMap[dateStr];
      const isSun    = new Date(dateStr + 'T12:00:00').getDay() === 0;
      const ot       = otByDate[dateStr];

      let cls = 'cal-cell';
      if (isToday) cls += ' today';
      if (isHol)   cls += ' is-holiday';
      if (isSun)   cls += ' is-sunday';
      if (ot)      cls += ' has-ot';

      cells += `
        <div class="${cls}" onclick="CalendarModule.openDay('${dateStr}')">
          <div class="cal-day-num">${d}</div>
          ${ot ? `<div class="cal-ot-badge">+${ot}h</div>` : ''}
          ${isHol ? `<div class="cal-holiday-name">${isHol}</div>` : ''}
        </div>`;
    }

    // Fill remaining cells
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 1; i <= totalCells - firstDay - daysInMonth; i++) {
      cells += `<div class="cal-cell other-month"><div class="cal-day-num">${i}</div></div>`;
    }

    document.getElementById('calendar-grid').innerHTML = `
      <div class="cal-header">${header}</div>
      <div class="cal-body">${cells}</div>`;
  }

  function openDay(dateStr) {
    const otRecords = OvertimeModule.getRecords(currentYear, currentMonth).filter(r => r.date === dateStr);
    if (otRecords.length) {
      // Open edit for the first record
      App.navigate('overtime');
      OvertimeModule.openForm(otRecords[0].id);
    } else {
      // Open new record for this date
      App.navigate('overtime');
      OvertimeModule.openForm();
      document.getElementById('ot-date').value = dateStr;
      OvertimeModule.updateDayBadge(dateStr);
    }
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

  return {
    render, openDay, prevMonth, nextMonth,
    init() { render(); }
  };
})();
