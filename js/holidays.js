/**
 * HOLIDAYS MODULE
 * Feriados nacionales del Perú (inamovibles + cálculo de Semana Santa).
 * El usuario puede agregar, editar o eliminar desde Configuración.
 */
const Holidays = (() => {

  // Feriados fijos (MM-DD)
  const FIXED = [
    { md: '01-01', name: 'Año Nuevo' },
    { md: '05-01', name: 'Día del Trabajo' },
    { md: '06-29', name: 'San Pedro y San Pablo' },
    { md: '07-28', name: 'Fiestas Patrias' },
    { md: '07-29', name: 'Fiestas Patrias' },
    { md: '08-30', name: 'Santa Rosa de Lima' },
    { md: '10-08', name: 'Combate de Angamos' },
    { md: '11-01', name: 'Todos los Santos' },
    { md: '12-08', name: 'Inmaculada Concepción' },
    { md: '12-09', name: 'Batalla de Ayacucho' },
    { md: '12-25', name: 'Navidad' },
  ];

  /**
   * Algoritmo de Meeus/Jones/Butcher para calcular Domingo de Pascua.
   * Retorna { month (1-based), day }
   */
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day   = ((h + l - 7 * m + 114) % 31) + 1;
    return { month, day };
  }

  /** Genera feriados móviles (Semana Santa) para un año dado */
  function mobileHolidays(year) {
    const easter = easterSunday(year);
    const easterDate = new Date(year, easter.month - 1, easter.day);

    const jueves = new Date(easterDate); jueves.setDate(jueves.getDate() - 3);
    const viernes = new Date(easterDate); viernes.setDate(viernes.getDate() - 2);

    function fmt(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    return [
      { date: fmt(jueves),  name: 'Jueves Santo' },
      { date: fmt(viernes), name: 'Viernes Santo' },
    ];
  }

  /** Retorna todos los feriados de un año (fijos + móviles + custom) */
  function forYear(year) {
    // Fijos
    const fixed = FIXED.map(f => ({
      date: `${year}-${f.md}`,
      name: f.name,
      fixed: true,
    }));

    // Móviles (Semana Santa)
    const mobile = mobileHolidays(year).map(h => ({ ...h, fixed: true }));

    // Custom (guardados por el usuario)
    const custom = Storage.get('holidays_custom', []);

    return [...fixed, ...mobile, ...custom];
  }

  /** Verifica si una fecha (YYYY-MM-DD) es feriado */
  function isHoliday(dateStr) {
    const year = parseInt(dateStr.split('-')[0]);
    return forYear(year).some(h => h.date === dateStr);
  }

  /** Obtiene el nombre del feriado, o null */
  function getName(dateStr) {
    const year = parseInt(dateStr.split('-')[0]);
    const found = forYear(year).find(h => h.date === dateStr);
    return found ? found.name : null;
  }

  /** Verifica si una fecha es domingo */
  function isSunday(dateStr) {
    return new Date(dateStr + 'T12:00:00').getDay() === 0;
  }

  /** Tipo de día especial: 'holiday', 'sunday', o null */
  function specialDay(dateStr) {
    if (isHoliday(dateStr)) return 'holiday';
    if (isSunday(dateStr))  return 'sunday';
    return null;
  }

  // ---- CRUD custom holidays ----
  function addCustom(date, name) {
    const list = Storage.get('holidays_custom', []);
    if (!list.find(h => h.date === date)) {
      list.push({ date, name, fixed: false });
      list.sort((a, b) => a.date.localeCompare(b.date));
      Storage.set('holidays_custom', list);
    }
  }

  function removeCustom(date) {
    const list = Storage.get('holidays_custom', []).filter(h => h.date !== date);
    Storage.set('holidays_custom', list);
  }

  function getCustom() {
    return Storage.get('holidays_custom', []);
  }

  return { forYear, isHoliday, isSunday, specialDay, getName, addCustom, removeCustom, getCustom };
})();
