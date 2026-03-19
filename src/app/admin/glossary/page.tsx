'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import sharedStyles from '../admin.module.css';
import styles from './glossary.module.css';
import { supabase } from '@/lib/supabaseClient';

type Domain = 'beauty' | 'restaurant';
type TargetLocale = 'en' | 'ja' | 'zh-CN';

interface GlossaryRow {
  id: string;
  domain: Domain;
  source_locale: 'ko';
  target_locale: TargetLocale;
  source_term: string;
  target_term: string;
  priority: number;
  version: number;
  notes: string | null;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
}

interface GlossaryFormState {
  id: string | null;
  domain: Domain;
  targetLocale: TargetLocale;
  sourceTerm: string;
  targetTerm: string;
  priority: number;
  version: number;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: GlossaryFormState = {
  id: null,
  domain: 'beauty',
  targetLocale: 'en',
  sourceTerm: '',
  targetTerm: '',
  priority: 100,
  version: 1,
  notes: '',
  isActive: true,
};

const DOMAIN_OPTIONS: Domain[] = ['beauty', 'restaurant'];
const LOCALE_OPTIONS: TargetLocale[] = ['en', 'ja', 'zh-CN'];

export default function AdminGlossaryPage() {
  const router = useRouter();
  const { t } = useTranslation('translation');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<GlossaryRow[]>([]);
  const [filterDomain, setFilterDomain] = useState<Domain>('beauty');
  const [filterLocale, setFilterLocale] = useState<TargetLocale>('en');
  const [form, setForm] = useState<GlossaryFormState>(EMPTY_FORM);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchEntries('beauty', 'en');
    };

    void init();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.domain === filterDomain && entry.target_locale === filterLocale);
  }, [entries, filterDomain, filterLocale]);

  async function fetchEntries(domain = filterDomain, locale = filterLocale) {
    setLoading(true);

    const { data } = await supabase
      .from('translation_glossary')
      .select('*')
      .eq('domain', domain)
      .eq('target_locale', locale)
      .order('priority', { ascending: true })
      .order('source_term', { ascending: true });

    setEntries((data as GlossaryRow[] | null) ?? []);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      domain: filterDomain,
      targetLocale: filterLocale,
    });
  }

  async function handleSave() {
    if (!form.sourceTerm.trim() || !form.targetTerm.trim()) {
      return;
    }

    setSaving(true);

    await supabase.from('translation_glossary').upsert({
      id: form.id ?? undefined,
      domain: form.domain,
      source_locale: 'ko',
      target_locale: form.targetLocale,
      source_term: form.sourceTerm.trim(),
      target_term: form.targetTerm.trim(),
      priority: form.priority,
      version: form.version,
      notes: form.notes.trim() || null,
      is_active: form.isActive,
      updated_by: userEmail || null,
      updated_at: new Date().toISOString(),
    });

    await fetchEntries(form.domain, form.targetLocale);
    setFilterDomain(form.domain);
    setFilterLocale(form.targetLocale);
    resetForm();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setSaving(true);
    await supabase.from('translation_glossary').delete().eq('id', id);
    await fetchEntries();
    if (form.id === id) {
      resetForm();
    }
    setSaving(false);
  }

  async function handleToggleActive(entry: GlossaryRow) {
    setSaving(true);
    await supabase
      .from('translation_glossary')
      .update({
        is_active: !entry.is_active,
        updated_by: userEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id);

    await fetchEntries();
    setSaving(false);
  }

  if (isAdmin === null || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #0f766e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('glossary.admin_only')}</h1>
        <button className={styles.primaryBtn} onClick={() => router.push('/admin')}>/admin</button>
      </div>
    );
  }

  return (
    <div className={sharedStyles.container}>
      <header className={sharedStyles.header}>
        <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--foreground)' }}>
          ←
        </button>
        <h1 className={sharedStyles.headerTitle}>{t('glossary.title')}</h1>
        <span className={sharedStyles.adminBadge}>ADMIN</span>
      </header>

      <div className={sharedStyles.content}>
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <h2 className={styles.sectionTitle}>
              {form.id ? t('glossary.editing') : t('glossary.create')}
            </h2>
            <p className={styles.sectionDesc}>{t('glossary.helper')}</p>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>{t('glossary.domain')}</label>
                <select
                  className={styles.select}
                  value={form.domain}
                  onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value as Domain }))}
                >
                  {DOMAIN_OPTIONS.map((domain) => (
                    <option key={domain} value={domain}>
                      {t(`glossary.domains.${domain}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>{t('glossary.target_locale')}</label>
                <select
                  className={styles.select}
                  value={form.targetLocale}
                  onChange={(event) => setForm((current) => ({ ...current, targetLocale: event.target.value as TargetLocale }))}
                >
                  {LOCALE_OPTIONS.map((locale) => (
                    <option key={locale} value={locale}>
                      {t(`glossary.locales.${locale}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>{t('glossary.source_term')}</label>
                <input
                  className={styles.input}
                  value={form.sourceTerm}
                  onChange={(event) => setForm((current) => ({ ...current, sourceTerm: event.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>{t('glossary.target_term')}</label>
                <input
                  className={styles.input}
                  value={form.targetTerm}
                  onChange={(event) => setForm((current) => ({ ...current, targetTerm: event.target.value }))}
                />
              </div>

              <div className={styles.filterRow}>
                <div className={styles.field}>
                  <label>{t('glossary.priority')}</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) || 0 }))}
                  />
                </div>

                <div className={styles.field}>
                  <label>{t('glossary.version')}</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.version}
                    onChange={(event) => setForm((current) => ({ ...current, version: Number(event.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>{t('glossary.notes')}</label>
                <textarea
                  className={styles.textarea}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                {form.isActive ? t('glossary.active') : t('glossary.inactive')}
              </label>
            </div>

            <div className={styles.formActions}>
              <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
                {t('glossary.save')}
              </button>
              <button className={styles.ghostBtn} onClick={resetForm} disabled={saving}>
                {t('glossary.create')}
              </button>
            </div>
          </section>

          <section className={styles.listCard}>
            <h2 className={styles.sectionTitle}>{t('glossary.subtitle')}</h2>
            <div className={styles.filterRow}>
              <div className={styles.field}>
                <label>{t('glossary.domain')}</label>
                <select
                  className={styles.select}
                  value={filterDomain}
                  onChange={async (event) => {
                    const nextDomain = event.target.value as Domain;
                    setFilterDomain(nextDomain);
                    await fetchEntries(nextDomain, filterLocale);
                  }}
                >
                  {DOMAIN_OPTIONS.map((domain) => (
                    <option key={domain} value={domain}>
                      {t(`glossary.domains.${domain}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>{t('glossary.target_locale')}</label>
                <select
                  className={styles.select}
                  value={filterLocale}
                  onChange={async (event) => {
                    const nextLocale = event.target.value as TargetLocale;
                    setFilterLocale(nextLocale);
                    await fetchEntries(filterDomain, nextLocale);
                  }}
                >
                  {LOCALE_OPTIONS.map((locale) => (
                    <option key={locale} value={locale}>
                      {t(`glossary.locales.${locale}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className={styles.empty}>{t('glossary.empty')}</div>
            ) : (
              <div className={styles.entryList}>
                {filteredEntries.map((entry) => (
                  <article key={entry.id} className={styles.entryCard}>
                    <div className={styles.entryHeader}>
                      <span className={`${styles.pill} ${styles.pillLocale}`}>{t(`glossary.locales.${entry.target_locale}`)}</span>
                      <span className={`${styles.pill} ${entry.is_active ? styles.pillActive : styles.pillInactive}`}>
                        {entry.is_active ? t('glossary.active') : t('glossary.inactive')}
                      </span>
                    </div>
                    <div className={styles.termRow}>
                      <div className={styles.termSource}>{entry.source_term}</div>
                      <div className={styles.termTarget}>{entry.target_term}</div>
                    </div>
                    <div className={styles.metaRow}>
                      <span>{t(`glossary.domains.${entry.domain}`)}</span>
                      <span>P{entry.priority}</span>
                      <span>v{entry.version}</span>
                    </div>
                    {entry.notes && <p className={styles.sectionDesc}>{entry.notes}</p>}
                    <div className={styles.entryActions}>
                      <button
                        className={styles.secondaryBtn}
                        onClick={() => setForm({
                          id: entry.id,
                          domain: entry.domain,
                          targetLocale: entry.target_locale,
                          sourceTerm: entry.source_term,
                          targetTerm: entry.target_term,
                          priority: entry.priority,
                          version: entry.version,
                          notes: entry.notes ?? '',
                          isActive: entry.is_active,
                        })}
                      >
                        {t('glossary.editing')}
                      </button>
                      <button className={styles.ghostBtn} onClick={() => void handleToggleActive(entry)}>
                        {entry.is_active ? t('glossary.inactive') : t('glossary.active')}
                      </button>
                      <button className={styles.dangerBtn} onClick={() => void handleDelete(entry.id)}>
                        {t('glossary.delete')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
