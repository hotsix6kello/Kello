import styles from '../../home.module.css';

interface HomeBookingSectionProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (id: any) => void;
  input: string;
  onInputChange: (val: string) => void;
  onInputClear: () => void;
  onStart: () => void;
  days: number;
  onDaysChange: (val: number) => void;
  onStartBooking: () => void;
  showSuggestions: boolean;
  suggestions: any[];
  onSelectPlace: (place: any) => void;
  selectedOption: any;
  t: (key: any, options?: any) => any;
}

export default function HomeBookingSection({
  categories,
  selectedCategory,
  onSelectCategory,
  input,
  onInputChange,
  onInputClear,
  onStart,
  days,
  onDaysChange,
  onStartBooking,
  showSuggestions,
  suggestions,
  onSelectPlace,
  selectedOption,
  t
}: HomeBookingSectionProps) {
  return (
    <section className={styles.bookingShell}>
      <div className={styles.bookingCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>{t('home_beauty.booking.step')}</span>
          <h2 className={styles.sectionTitle}>{t('home_beauty.booking.title')}</h2>
          <p className={styles.sectionDescription}>
            {t('home_beauty.booking.description')}
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((option) => {
            const isActive = selectedCategory === option.id;

            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.categoryButton} ${isActive ? styles.categoryButtonActive : ''}`}
                onClick={() => onSelectCategory(option.id)}
              >
                <span className={styles.categoryCode}>{option.code}</span>
                <span className={styles.categoryLabel}>{t(`home_beauty.categories.${option.id}.label`)}</span>
                <span className={styles.categoryNote}>{t(`home_beauty.categories.${option.id}.note`)}</span>
              </button>
            );
          })}
        </div>

        <section className={styles.inputSection}>
          <div className={styles.inputLabel}>{t('home.input_label')}</div>
          <div className={styles.inputWrap}>
            <span className={styles.inputIcon}>📍</span>
            <input
              className={styles.inputField}
              placeholder={t('explore_page.search_placeholders.beauty')}
              value={input}
              onChange={e => onInputChange(e.target.value)}
            />
            {input && <button className={styles.inputClear} onClick={onInputClear}>✕</button>}

            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map((p, idx) => (
                  <div key={idx} className={styles.suggestionItem} onClick={() => onSelectPlace(p)}>
                    <div className={styles.suggestText}>
                      <div className={styles.suggestName}>{p.title}</div>
                      <div className={styles.suggestSub}>{p.area}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.daysSliderSection}>
            <div className={styles.daysSliderInfo}>
              <span className={styles.daysLabel}>{t('home.days_label')}</span>
              <span className={styles.daysValue}>{days}{t('common.day_unit')}</span>
            </div>
            <div className={styles.sliderContainer}>
              <input
                type="range"
                min="1"
                max="7"
                value={days}
                onChange={(e) => onDaysChange(parseInt(e.target.value))}
                className={styles.daysRangeInput}
              />
            </div>
          </div>
        </section>

        <div className={styles.selectionPanel}>
          <span className={styles.selectionEyebrow}>{t('home_beauty.selection.eyebrow')}</span>
          {selectedOption ? (
            <div className={styles.selectionRow}>
              <div>
                <h3 className={styles.selectionTitle}>
                  {t(`home_beauty.categories.${selectedOption.id}.label`)}
                </h3>
                <p className={styles.selectionDescription}>
                  {t(`home_beauty.categories.${selectedOption.id}.summary`)}
                </p>
              </div>
              <div className={styles.selectionTagRow}>
                <span className={styles.selectionTag}>{t('home_beauty.selection.tags.mobile')}</span>
                <span className={styles.selectionTag}>{t('home_beauty.selection.tags.comparison')}</span>
                <span className={styles.selectionTag}>{t('home_beauty.selection.tags.inquiry')}</span>
              </div>
            </div>
          ) : (
            <div className={styles.selectionEmpty}>
              {t('home_beauty.selection.empty')}
            </div>
          )}
        </div>

        <div className={styles.ctaSection}>
          <p className={styles.ctaHint}>
            {t('home_beauty.cta.hint')}
          </p>
          <button
            className={styles.mainCtaBtn}
            type="button"
            disabled={!selectedCategory}
            onClick={onStartBooking}
          >
            {t('home_beauty.cta.button')}
          </button>
        </div>
      </div>
    </section>
  );
}
