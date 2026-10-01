(() => {
  const root = document.documentElement;
  let night = false;
  try { night = localStorage.getItem('pick-play-theme') === 'dark'; } catch {}
  function apply() {
    root.dataset.theme = night ? 'dark' : 'light';
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-checked', String(night));
      document.getElementById('themeLabel').textContent = night ? 'Night mode' : 'Light mode';
    }
  }
  apply(); // Restore before the page paints to avoid a bright flash.
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('themeToggle').addEventListener('click', () => {
      night = !night;
      apply();
      try { localStorage.setItem('pick-play-theme', night ? 'dark' : 'light'); } catch {}
    });
  });
})();
