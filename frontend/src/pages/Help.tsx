import { useState } from 'react';
import { useLang } from '../App';

export default function Help() {
  const { t } = useLang();
  const [activeSection, setActiveSection] = useState(0);
  const [openItem, setOpenItem] = useState<number | null>(null);

  const helpSections = t.help.sections;
  const section = helpSections[activeSection];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{t.help.title}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t.help.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 'fit-content' }}>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
            {t.help.topics}
          </div>
          <nav className="p-2 space-y-0.5">
            {helpSections.map((s, idx) => (
              <button key={idx} onClick={() => { setActiveSection(idx); setOpenItem(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: activeSection === idx ? 'var(--brand-light)' : 'transparent',
                  color: activeSection === idx ? 'var(--brand-text)' : 'var(--sidebar-text)',
                  borderLeft: activeSection === idx ? '2px solid var(--brand)' : '2px solid transparent',
                  minHeight: '44px', fontFamily: 'inherit', border: 'none', cursor: 'pointer',
                }}>
                <span className="text-base w-5 text-center flex-shrink-0">{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <span className="text-2xl">{section.icon}</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{section.title}</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--brand-light)', color: 'var(--brand-text)' }}>
              {section.items.length} {t.help.topics_count}
            </span>
          </div>

          <div className="p-4 space-y-2">
            {section.items.map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button onClick={() => setOpenItem(openItem === idx ? null : idx)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between transition-colors"
                  style={{ background: openItem === idx ? 'var(--brand-light)' : 'var(--surface)', fontFamily: 'inherit', cursor: 'pointer', border: 'none', minHeight: '48px' }}>
                  <span className="font-medium text-sm pr-4" style={{ color: openItem === idx ? 'var(--brand-text)' : 'var(--text)' }}>{item.q}</span>
                  <span className="flex-shrink-0 text-xs font-bold" style={{ color: 'var(--muted)' }}>{openItem === idx ? '▲' : '▼'}</span>
                </button>
                {openItem === idx && (
                  <div className="px-4 py-3" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl px-5 py-3 text-xs flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
        <span>{t.help.footer}</span>
        <span>{helpSections.reduce((s, c) => s + c.items.length, 0)} {t.help.topics_count} · {helpSections.length} {t.help.sections_count}</span>
      </div>
    </div>
  );
}
