/**
 * STORAGE MODULE — Supabase backend
 * Datos compartidos en tiempo real entre todos los dispositivos.
 * API síncrona (get/set) respaldada por cache en memoria.
 * Storage.init() debe llamarse una vez antes de App.init().
 */
const Storage = (() => {

  const SUPABASE_URL  = 'https://zlhznmbrhsctjigdtnny.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaHpubWJyaHNjdGppZ2R0bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MzU4MjEsImV4cCI6MjEwMTExMTgyMX0.K1mSNibj94sQphi2zCXuBSIbEKyDTESmRQPtOXRd-PE';
  const TABLE         = 'app_data';

  let _db      = null;   // Supabase client
  let _cache   = {};     // copia en memoria de todos los datos
  let _cbs     = [];     // callbacks para actualizaciones en tiempo real

  // ── init ────────────────────────────────────────────────────────────────────
  async function init() {
    try {
      _db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

      // 1. Cargar todos los datos existentes en cache
      const { data, error } = await _db.from(TABLE).select('key, value');
      if (error) throw error;
      (data || []).forEach(row => { _cache[row.key] = row.value; });

      // 2. Suscribir a cambios en tiempo real
      _db.channel('app_data_sync')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: TABLE },
          payload => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              _cache[payload.new.key] = payload.new.value;
            } else if (payload.eventType === 'DELETE') {
              delete _cache[payload.old.key];
            }
            _cbs.forEach(cb => cb(payload.new?.key || payload.old?.key));
          }
        )
        .subscribe();

      console.log('[Storage] Supabase listo. Claves cargadas:', Object.keys(_cache).length);
    } catch (err) {
      console.error('[Storage] Error al inicializar Supabase:', err);
      // Fallback: usar localStorage si Supabase falla
      _db = null;
      _loadFromLocalStorage();
    }
  }

  function _loadFromLocalStorage() {
    const PREFIX = 'hogar_';
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => {
        try { _cache[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k)); }
        catch { _cache[k.replace(PREFIX, '')] = localStorage.getItem(k); }
      });
    console.log('[Storage] Usando localStorage como fallback.');
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  function get(k, fallback = null) {
    return _cache[k] !== undefined ? _cache[k] : fallback;
  }

  function set(k, v) {
    _cache[k] = v;
    if (_db) {
      // Fire-and-forget: no bloquea la UI
      _db.from(TABLE)
        .upsert({ key: k, value: v, updated_at: new Date().toISOString() },
                 { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error('[Storage] Error al guardar', k, error);
        });
    } else {
      // Fallback localStorage
      try { localStorage.setItem('hogar_' + k, JSON.stringify(v)); } catch {}
    }
    return true;
  }

  function remove(k) {
    delete _cache[k];
    if (_db) {
      _db.from(TABLE).delete().eq('key', k)
        .then(({ error }) => { if (error) console.error('[Storage] Error al eliminar', k, error); });
    } else {
      localStorage.removeItem('hogar_' + k);
    }
  }

  function clear() {
    _cache = {};
    if (_db) {
      _db.from(TABLE).delete().neq('key', '__never__')
        .then(({ error }) => { if (error) console.error('[Storage] Error al limpiar', error); });
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith('hogar_'))
        .forEach(k => localStorage.removeItem(k));
    }
  }

  function exportAll() {
    return { ..._cache };
  }

  /** Registrar callback para re-renderizar cuando otro dispositivo hace un cambio */
  function onUpdate(cb) {
    _cbs.push(cb);
  }

  return { init, get, set, remove, clear, exportAll, onUpdate };
})();
