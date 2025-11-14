// frontend/js/fetchWrap.js
async function fetchJson(url, opts = {}) {
  opts.headers = opts.headers || {};
  const lang = localStorage.getItem('lang') || (window.I18n && I18n.getLanguage && I18n.getLanguage()) || 'zh';
  opts.headers['Accept-Language'] = lang;
  opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
  const res = await fetch(url, opts);
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch(e) { body = {status: 'error', message: res.statusText}; }
    throw body;
  }
  return res.json();
}