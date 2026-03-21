const fs = require('fs');
const filePath = 'c:\\Users\\KumA\\Desktop\\Kello\\src\\app\\explore\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted part is inside AddToPlanModal.
const corruptedStart = "      <AddToPlanModal\n        isOpen={isAddToPlanOpen}";
const corruptedEnd = "        itemTitle={selectedItemForPlan?.title || ''}\n      />";

// I need to find the REAL end of the file too.
// The file should end with:
//       {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}
//     </div>
//   );
// }

const correctAddToPlan = `      <AddToPlanModal
        isOpen={isAddToPlanOpen}
        onClose={() => setIsAddToPlanOpen(false)}
        onSelectDay={handleAddToPlan}
        itemTitle={selectedItemForPlan?.title || ''}
      />`;

const searchStart = content.indexOf(corruptedStart);
const searchEnd = content.lastIndexOf(corruptedEnd);

if (searchStart !== -1 && searchEnd !== -1) {
    const before = content.slice(0, searchStart);
    const after = content.slice(searchEnd + corruptedEnd.length);
    
    // Check if "after" contains another return or stuff that shouldn't be there.
    // Actually, I'll just trim "after" to the last "}" if it has extra junk.
    const lastClosingBrace = after.lastIndexOf("}");
    const trimmedAfter = after.slice(0, lastClosingBrace + 1);
    
    // Wait, I need to make sure I don't delete the toastMessage part.
    const toastPart = `\n\n      {toastMessage ? <div className={styles.toast}>{toastMessage}</div> : null}\n    </div>\n  );\n}`;
    
    fs.writeFileSync(filePath, before + correctAddToPlan + toastPart, 'utf8');
    console.log('Sanitization complete.');
} else {
    console.log('Markers not found.');
}
