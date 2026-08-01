/**
 * APP.JS — Controlador principal
 * Navegación, configuración inicial, utilidades globales.
 */

// ============================================================
// UTILS (globales, accesibles por todos los módulos)
// ============================================================

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatMonthLabel(y, m) {
  const NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${NAMES[m-1]} ${y}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

let _toastTimer = null;
function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ============================================================
// APP CONTROLLER
// ============================================================
const App = (() => {

  const VIEWS = ['dashboard','overtime','calendar','vacations','bonuses','payroll','history','settings'];
  let currentView = 'dashboard';

  function init() {
    const config = Storage.get('config', null);
    if (!config || !config.name) {
      showSetup();
    } else {
      showApp(config);
    }
  }

  function showSetup() {
    document.getElementById('setup-overlay').classList.remove('hidden');
    // Set today as default start date
    document.getElementById('setup-start-date').value = todayStr();
  }

  function saveSetup() {
    const name           = document.getElementById('setup-name').value.trim();
    const startDate      = document.getElementById('setup-start-date').value;
    const salary         = parseFloat(document.getElementById('setup-salary').value);
    const hoursPerDay    = parseFloat(document.getElementById('setup-hours-day').value) || 8;
    const hoursPerWeek   = parseFloat(document.getElementById('setup-hours-week').value) || 48;
    const vacationsTaken = parseFloat(document.getElementById('setup-vacations-taken').value) || 0;
    const bonusValueRaw  = document.getElementById('setup-bonus-value').value;
    const bonusValue     = bonusValueRaw ? parseFloat(bonusValueRaw) : null;

    if (!name)                { showToast('Ingresa el nombre'); return; }
    if (!startDate)           { showToast('Ingresa la fecha de inicio'); return; }
    if (!salary || salary<=0) { showToast('Ingresa el sueldo'); return; }

    const config = { name, startDate, salary, hoursPerDay, hoursPerWeek, vacationsTaken, bonusValue };
    Storage.set('config', config);
    document.getElementById('setup-overlay').classList.add('hidden');
    showApp(config);
  }

  function showApp(config) {
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('nav-worker-name').textContent = config.name;

    // Seniority badge
    if (config.startDate) {
      const start = new Date(config.startDate + 'T00:00:00');
      const yrs   = Math.floor((new Date() - start) / (365.25 * 86400000));
      const badge = yrs > 0 ? `${yrs} año${yrs>1?'s':''}` : 'Nuevo ingreso';
      document.getElementById('nav-worker-seniority').textContent = badge;
    }

    // Init all modules
    OvertimeModule.init();
    VacationsModule.init();
    BonusesModule.init();
    PayrollModule.init();
    CalendarModule.init();
    Dashboard.init();
    HistoryModule.init();
    SettingsModule.init();

    navigate('dashboard');
  }

  function navigate(view) {
    if (!VIEWS.includes(view)) return;

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');

    // Update nav items (sidebar + bottom)
    document.querySelectorAll('[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    currentView = view;

    // Re-render on navigate
    if (view === 'dashboard')  Dashboard.render();
    if (view === 'overtime')   OvertimeModule.render();
    if (view === 'calendar')   CalendarModule.render();
    if (view === 'vacations')  VacationsModule.render();
    if (view === 'bonuses')    BonusesModule.render();
    if (view === 'payroll')    PayrollModule.render();
    if (view === 'history')    HistoryModule.render();
    if (view === 'settings')   SettingsModule.load();

    // Scroll to top
    document.getElementById('main-content').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // Dashboard month nav
  function dashPrevMonth() { Dashboard.prevMonth(); }
  function dashNextMonth() { Dashboard.nextMonth(); }

  return { init, saveSetup, navigate, dashPrevMonth, dashNextMonth, currentView: () => currentView };
})();

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar spinner mientras carga Supabase
  const splash = document.getElementById('loading-splash');
  if (splash) splash.classList.remove('hidden');

  await Storage.init();

  if (splash) splash.classList.add('hidden');

  App.init();

  // Re-renderizar vista actual cuando otro dispositivo hace cambios
  Storage.onUpdate(() => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    const v = App.currentView();
    if (v === 'dashboard')  Dashboard.render();
    else if (v === 'overtime')   OvertimeModule.render();
    else if (v === 'calendar')   CalendarModule.render();
    else if (v === 'vacations')  VacationsModule.render();
    else if (v === 'bonuses')    BonusesModule.render();
    else if (v === 'payroll')    PayrollModule.render();
    else if (v === 'history')    HistoryModule.render();
  });
});
