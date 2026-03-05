import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const STEPS = {
  scraping: 1, scraped: 1,
  translating: 2, translated: 2,
  screenshots: 3, screenshot: 3, screenshots_done: 3,
  generating: 4, done: 4,
};

export default function App() {
  const [form, setForm] = useState({
    articleUrl: '',
    language: 'en',
  });
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const eventsEndRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRunning(true);
    setEvents([]);
    setProgress(0);
    setDownloadUrl(null);
    setError('');
    setCurrentStep(1);

    try {
      const { data } = await axios.post(`${API}/api/localize`, {
        articleUrl: form.articleUrl,
        languages: [form.language],
      });
      const { jobId } = data;

      const es = new EventSource(`${API}/api/stream/${jobId}`);
      esRef.current = es;

      es.addEventListener('progress', (e) => {
        const ev = JSON.parse(e.data);
        setProgress(Math.round(ev.progress || 0));
        if (STEPS[ev.step]) setCurrentStep(STEPS[ev.step]);
        setEvents(prev => [...prev, { type: 'progress', ...ev }]);
      });

      es.addEventListener('complete', (e) => {
        const ev = JSON.parse(e.data);
        setDownloadUrl(`${API}${ev.downloadUrl}`);
        setProgress(100);
        setCurrentStep(4);
        setRunning(false);
        es.close();
      });

      es.addEventListener('error', (e) => {
        let msg = 'Неизвестная ошибка';
        try { msg = JSON.parse(e.data).message; } catch (_) {}
        setError(msg);
        setRunning(false);
        es.close();
      });

      es.onerror = () => {
        if (running) {
          setError('Соединение с сервером прервано');
          setRunning(false);
        }
      };
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setRunning(false);
    }
  };

  const handleStop = () => {
    if (esRef.current) esRef.current.close();
    setRunning(false);
    setError('Отменено пользователем');
  };

  const stepLabels = [
    { n: 1, icon: '🔍', label: 'Парсинг статьи' },
    { n: 2, icon: '🌐', label: 'Перевод текста' },
    { n: 3, icon: '📸', label: 'Скриншоты портала' },
    { n: 4, icon: '📦', label: 'Генерация файлов' },
  ];

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={s.logoIcon}>⚡</span>
            <div>
              <div style={s.logoTitle}>Bitrix24 Localizer</div>
              <div style={s.logoSub}>Автоматическая локализация статей helpdesk</div>
            </div>
          </div>
          <div style={s.badge}>Claude Vision · Computer Use</div>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.grid}>
          {/* LEFT: Form */}
          <div style={s.leftCol}>
            <form onSubmit={handleSubmit} style={s.card}>
              <div style={s.cardTitle}>Параметры локализации</div>

              {/* Article URL */}
              <div style={s.field}>
                <label style={s.label}>URL статьи на helpdesk.bitrix24.ru</label>
                <input
                  style={s.input}
                  type="url"
                  placeholder="https://helpdesk.bitrix24.ru/open/..."
                  value={form.articleUrl}
                  onChange={e => setForm(f => ({ ...f, articleUrl: e.target.value }))}
                  required
                  disabled={running}
                />
              </div>

              {/* Language Selection */}
              <div style={s.field}>
                <label style={s.label}>Язык перевода</label>
                <div style={s.langGrid}>
                  {LANGUAGES.map(lang => {
                    const selected = form.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        style={{ ...s.langBtn, ...(selected ? s.langBtnSelected : {}) }}
                        onClick={() => !running && setForm(f => ({ ...f, language: lang.code }))}
                        disabled={running}
                      >
                        <span style={{ fontSize: 18 }}>{lang.flag}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{lang.label}</span>
                        {selected && <span style={s.checkMark}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              {!running ? (
                <button type="submit" style={s.submitBtn}>
                  ✨ Запустить локализацию
                </button>
              ) : (
                <button type="button" style={s.stopBtn} onClick={handleStop}>
                  ⏹ Остановить
                </button>
              )}
            </form>

            {/* How it works */}
            <div style={{ ...s.card, marginTop: 16 }}>
              <div style={{ ...s.cardTitle, fontSize: 13 }}>Как это работает</div>
              <div style={s.howList}>
                {[
                  ['🔍', 'Парсит HTML статьи с helpdesk.bitrix24.ru'],
                  ['🌐', 'Claude переводит текст на выбранный язык'],
                  ['📸', 'Claude Computer Use воспроизводит каждый скрин на западном портале'],
                  ['📦', 'Создаёт ZIP с переведёнными HTML и скринами портала'],
                ].map(([icon, text], i) => (
                  <div key={i} style={s.howItem}>
                    <span style={s.howIcon}>{icon}</span>
                    <span style={s.howText}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Progress + Download */}
          <div style={s.rightCol}>
            <div style={s.card}>
              <div style={s.cardTitle}>Прогресс</div>

              <div style={s.stepsRow}>
                {stepLabels.map(step => {
                  const done = currentStep > step.n;
                  const active = currentStep === step.n && running;
                  return (
                    <div key={step.n} style={s.stepItem}>
                      <div style={{
                        ...s.stepCircle,
                        ...(done ? s.stepDone : active ? s.stepActive : {}),
                      }}>
                        {done ? '✓' : step.icon}
                      </div>
                      <div style={{
                        ...s.stepLabel,
                        color: done ? '#22c55e' : active ? '#60a5fa' : '#4b5563',
                      }}>
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(running || progress > 0) && (
                <div style={s.progressWrap}>
                  <div style={s.progressBar}>
                    <div style={{ ...s.progressFill, width: `${progress}%` }} />
                  </div>
                  <div style={s.progressPct}>{progress}%</div>
                </div>
              )}

              <div style={s.logWrap}>
                {events.length === 0 && !running && !downloadUrl && !error && (
                  <div style={s.logEmpty}>Запустите локализацию, чтобы увидеть прогресс</div>
                )}
                {events.map((ev, i) => (
                  <div key={i} style={{
                    ...s.logItem,
                    ...(ev.step === 'warn' ? s.logWarn : {}),
                  }}>
                    {ev.message}
                  </div>
                ))}
                <div ref={eventsEndRef} />
              </div>
            </div>

            {error && (
              <div style={s.errorBox}>
                <strong>Ошибка:</strong> {error}
              </div>
            )}

            {downloadUrl && (
              <div style={s.downloadCard}>
                <div style={s.downloadIcon}>🎉</div>
                <div style={s.downloadTitle}>Локализация завершена!</div>
                <div style={s.downloadSub}>
                  {LANGUAGES.find(l => l.code === form.language)?.flag}{' '}
                  {LANGUAGES.find(l => l.code === form.language)?.label}
                </div>
                <a href={downloadUrl} download="localized-articles.zip" style={s.downloadBtn}>
                  ⬇️ Скачать ZIP архив
                </a>
                <button
                  style={s.newBtn}
                  onClick={() => {
                    setDownloadUrl(null);
                    setEvents([]);
                    setProgress(0);
                    setCurrentStep(0);
                    setError('');
                  }}
                >
                  Новая локализация
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#0f1117',
    color: '#e2e8f0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '0 24px',
  },
  headerInner: {
    maxWidth: 1200, margin: '0 auto', height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontSize: 18, fontWeight: 700, color: '#f8fafc' },
  logoSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  badge: {
    fontSize: 12, padding: '4px 12px',
    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: 20, color: '#a5b4fc', fontWeight: 600,
  },
  main: { maxWidth: 1200, margin: '0 auto', padding: '28px 24px' },
  grid: {
    display: 'grid', gridTemplateColumns: '420px 1fr',
    gap: 20, alignItems: 'start',
  },
  leftCol: {},
  rightCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: '24px',
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 20, letterSpacing: '-0.2px' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 7 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9,
    padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  },
  langGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  langBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 6px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    cursor: 'pointer', color: '#94a3b8', position: 'relative',
  },
  langBtnSelected: {
    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: '#c7d2fe',
  },
  checkMark: { position: 'absolute', top: 4, right: 6, fontSize: 10, color: '#818cf8', fontWeight: 700 },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none', borderRadius: 10, color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4,
    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
  },
  stopBtn: {
    width: '100%', padding: '13px',
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 10, color: '#f87171', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: 4,
  },
  howList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 },
  howItem: { display: 'flex', alignItems: 'center', gap: 10 },
  howIcon: { fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 },
  howText: { fontSize: 13, color: '#64748b', lineHeight: 1.4 },
  stepsRow: { display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 80, flex: 1 },
  stepCircle: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: '#4b5563',
  },
  stepDone: { background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.5)', color: '#22c55e', fontWeight: 700 },
  stepActive: { background: 'rgba(96,165,250,0.15)', border: '2px solid rgba(96,165,250,0.5)', color: '#60a5fa' },
  stepLabel: { fontSize: 11, textAlign: 'center', lineHeight: 1.3, fontWeight: 500 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBar: { flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4, transition: 'width 0.4s ease' },
  progressPct: { fontSize: 13, fontWeight: 700, color: '#818cf8', minWidth: 36 },
  logWrap: { maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  logEmpty: { color: '#374151', fontSize: 13, textAlign: 'center', padding: '32px 0' },
  logItem: { fontSize: 13, color: '#94a3b8', padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', lineHeight: 1.5, wordBreak: 'break-word' },
  logWarn: { color: '#fbbf24', background: 'rgba(251,191,36,0.06)' },
  errorBox: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 20px', color: '#f87171', fontSize: 14 },
  downloadCard: { background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 16, padding: 28, textAlign: 'center' },
  downloadIcon: { fontSize: 48, marginBottom: 12 },
  downloadTitle: { fontSize: 20, fontWeight: 700, color: '#f0fdf4', marginBottom: 6 },
  downloadSub: { fontSize: 14, color: '#86efac', marginBottom: 24 },
  downloadBtn: { display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', marginBottom: 14 },
  newBtn: { display: 'block', margin: '0 auto', padding: '8px 20px', background: 'transparent', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#86efac', fontSize: 13, cursor: 'pointer' },
};
