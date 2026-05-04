/* i18n.js — shared language engine for NSB Retreat */
const I18N = {
  supported: ['en','es','pt','fr','de','it'],
  current: 'en',
  _translationsKey: 'TRANSLATIONS',

  /* Pass an optional translationsVarName to use a different global (e.g. 'GUIDE_TRANSLATIONS') */
  init(translationsVarName) {
    if (translationsVarName) this._translationsKey = translationsVarName;
    const saved = localStorage.getItem('nsb_lang');
    const browser = (navigator.language || '').slice(0,2).toLowerCase();
    const lang = saved || (this.supported.includes(browser) ? browser : 'en');
    this.setLang(lang, false);
  },

  setLang(lang, save = true) {
    if (!this.supported.includes(lang)) lang = 'en';
    this.current = lang;
    if (save) localStorage.setItem('nsb_lang', lang);
    document.documentElement.lang = lang;
    this._apply();
    this._updateUI();
  },

  _apply() {
    const src = (typeof window !== 'undefined' && window[this._translationsKey]) ||
                (typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS : {});
    const t = (src[this.current]) || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t[el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const v = t[el.dataset.i18nHtml];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = t[el.dataset.i18nPlaceholder];
      if (v !== undefined) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = t[el.dataset.i18nAria];
      if (v !== undefined) el.setAttribute('aria-label', v);
    });
  },

  _updateUI() {
    document.querySelectorAll('[data-lang-option]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.langOption === this.current);
    });
    document.querySelectorAll('.lang-current-code').forEach(el => {
      el.textContent = this.current.toUpperCase();
    });
  }
};
