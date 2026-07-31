/**
 * STORAGE MODULE
 * Abstraction over LocalStorage.
 * In the future, swap the internals for Firebase/Supabase
 * without touching any other module.
 */
const Storage = (() => {
  const PREFIX = 'hogar_';

  function key(k) { return PREFIX + k; }

  return {
    get(k, fallback = null) {
      try {
        const raw = localStorage.getItem(key(k));
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(key(k), JSON.stringify(v)); return true; }
      catch { return false; }
    },
    remove(k) { localStorage.removeItem(key(k)); },
    clear() {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    },
    // Export all app data as JSON
    exportAll() {
      const data = {};
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => {
          try { data[k.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(k)); }
          catch { data[k.replace(PREFIX, '')] = localStorage.getItem(k); }
        });
      return data;
    }
  };
})();
