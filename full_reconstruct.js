/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const filePath = 'c:\\Users\\KumA\\Desktop\\Kello\\src\\app\\explore\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We will reconstruct the middle section from scratch to be 100% sure.
// We need to find where MyExplorePage starts and where isBeautyExplore return ends.

const startMarker = "const beautyCategoryLabel = beautyCategoryFilter";
const endMarker = "  return ("; // Global return start
const restOfFileMarker = "      <ExploreHeader";

const startIndex = content.indexOf(startMarker);
const restOfFileIndex = content.indexOf(restOfFileMarker, startIndex);

if (startIndex !== -1 && restOfFileIndex !== -1) {
    const headerPart = content.slice(0, startIndex);
    // Keep all the logic before the return
    const logicEndMarker = "if (isBeautyExplore) {";
    const logicEndIndex = content.indexOf(logicEndMarker, startIndex);
    
    if (logicEndIndex !== -1) {
        const logicPart = content.slice(startIndex, logicEndIndex);
        
        const uiPart = `  if (isBeautyExplore) {
    return (
      <div className={styles.beautyExplorePage}>
        <BeautyExploreTopBar title={beautyCategoryLabel} />
        <section className={styles.beautyHero}>
          <span className={styles.beautyEyebrow}>{tBeauty('hero_eyebrow')}</span>
          <div className={styles.beautyHeaderRow}>
            <div>
              <h1 className={styles.beautyTitle}>
                {tBeauty('hero_title', { category: beautyCategoryLabel })}
              </h1>
              <p className={styles.beautySubtitle}>
                {tBeauty('hero_subtitle')}
              </p>
            </div>
            <div className={styles.beautyCategoryBadgeWrap}>
              <span className={styles.beautyCategoryBadgeCode}>{beautyCategoryBadge}</span>
              <span className={styles.beautyCategoryBadgeLabel}>
                {beautyCategoryFilter ? beautyCategoryLabels[beautyCategoryFilter].english : 'Beauty'}
              </span>
            </div>
          </div>
          <p className={styles.beautyDescription}>{beautyDescription}</p>
          {!beautyCategoryFilter ? (
            <BeautyRegionTabs
              regions={beautyRegions}
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
            />
          ) : (
            <div className={styles.beautyBookingEmpty}>
              <p className={styles.beautyBookingEmptyText}>
                {tBeauty('hero_no_region_avail')}
              </p>
            </div>
          )}

          {selectedBeautyStore ? (
            <section className={styles.beautySelectionNotice}>
              <strong className={styles.beautySelectionTitle}>{selectedBeautyStoreName ?? selectedBeautyStore.name}</strong>
              <div className={styles.beautySelectionMeta}>
                <span className={styles.beautySelectionCategory}>
                  {selectedBeautyCategory ? beautyCategoryLabels[selectedBeautyCategory].label : tBeauty('category_all')}
                </span>
                <span className={styles.beautySelectionRating}>
                  ★ {selectedBeautyStore.rating} ({selectedBeautyStore.reviewCount})
                </span>
              </div>
            </section>
          ) : null}

          {!selectedBeautyStoreId || !selectedBeautyStore ? (
            <div className={styles.beautyBookingEmpty}>
              <p className={styles.beautyBookingEmptyTitle}>{tBeauty('booking_empty_title')}</p>
              <p className={styles.beautyBookingEmptyText}>
                {tBeauty('booking_empty_desc')}
              </p>
            </div>
          ) : !selectedBeautyAvailability ? (
            <div className={styles.beautyBookingEmpty}>
              <p className={styles.beautyBookingEmptyTitle}>{tBeauty('booking_not_found_title')}</p>
              <p className={styles.beautyBookingEmptyText}>
                {tBeauty('booking_not_found_desc')}
              </p>
            </div>
          ) : (
            <div className={styles.beautyBookingLayout}>
              <div className={styles.beautyBookingBlock}>
                <h3 className={styles.beautyBookingBlockTitle}>{tBeauty('booking_date_label')}</h3>
                <div className="mt-4">
                  <CalendarDatePicker 
                    selectedDate={selectedBeautyDate ? parseISO(selectedBeautyDate) : undefined}
                    onDateChange={(date) => {
                      if (date) {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        handleBeautyDateSelect(dateKey);
                      } else {
                        setSelectedBeautyDate(null);
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.beautyBookingBlock}>
                <h3 className={styles.beautyBookingBlockTitle}>{tBeauty('booking_time_label')}</h3>
                {!selectedBeautyDate ? (
                  <div className={styles.beautyBookingInlineEmpty}>{tBeauty('booking_no_time_wait')}</div>
                ) : selectedBeautySlots.length > 0 ? (
                  <div className={styles.beautyTimeSlotGrid}>
                    {selectedBeautySlots.map((slot) => {
                      const isActive = selectedBeautyTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          className={\\\`\${styles.beautyTimeSlot} \${isActive ? styles.beautyTimeSlotActive : ''}\\\`}
                          aria-pressed={isActive}
                          onClick={() => {
                            setSelectedBeautyTime(slot);
                            clearSubmittedBooking();
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.beautyBookingInlineEmpty}>
                    {tBeauty('booking_no_slots')}
                  </div>
                )}
              </div>

              <div className={styles.beautyBookingSummary}>
                <div className={styles.beautySummaryList}>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{tBeauty('summary_category')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyCategoryLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{tBeauty('summary_store')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyStoreName ?? tBeauty('label_service_default')}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{tBeauty('summary_region')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyRegionLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{tBeauty('summary_date')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyDateLabel}</strong>
                  </div>
                  <div className={styles.beautySummaryItem}>
                    <span className={styles.beautySummaryLabel}>{tBeauty('summary_time')}</span>
                    <strong className={styles.beautySummaryValue}>{selectedBeautyTime ?? tBeauty('label_service_default')}</strong>
                  </div>
                </div>
                <p className={styles.beautyBookingHint}>
                  {tBeauty('summary_hint')}
                </p>
                <button
                  type="button"
                  className={styles.beautyBookingCta}
                  disabled={!selectedBeautyDate || !selectedBeautyTime}
                  aria-label={tBeauty('summary_btn')}
                  onClick={handleBeautyBookingContinue}
                >
                  {tBeauty('summary_btn')}
                </button>
              </div>
            </div>
          )}
        </section>

        <section ref={confirmSectionRef} className={styles.beautyConfirmPanel}>
          <div className={styles.beautyConfirmHeader}>
            <div>
              <h2 className={styles.beautyConfirmTitle}>{tBeauty('confirm_title')}</h2>
              <p className={styles.beautyConfirmDescription}>
                {tBeauty('confirm_desc')}
              </p>
            </div>
          </div>
`;
        
        // We need to keep the original content from line 1845 (Step 845) onwards until the global return.
        // Wait! My middlePart reconstruction already has some of it.
        // I'll grab the REST of the isBeautyExplore block from the current file.
        const confirmContentStart = "{submittedBooking ? (";
        const confirmContentIndex = content.indexOf(confirmContentStart, logicEndIndex);
        
        if (confirmContentIndex !== -1) {
            const footerPartIndex = content.indexOf("return (", restOfFileIndex);
            const remainingIsBeautyExplorePart = content.slice(confirmContentIndex, footerPartIndex);
            
            const finalContent = headerPart + logicPart + uiPart + "\n          " + remainingIsBeautyExplorePart + "      </div>\n    );\n  }\n\n" + content.slice(footerPartIndex);
            fs.writeFileSync(filePath, finalContent, 'utf8');
            console.log('RECONSTRUCTION COMPLETE.');
        } else {
            console.log('Confirm content start not found.');
        }
    } else {
        console.log('Logic end marker not found.');
    }
} else {
    console.log('Global markers not found.');
}
