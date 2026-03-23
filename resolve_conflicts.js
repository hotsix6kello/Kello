const fs = require('fs');

function resolveCommonJson() {
  const content = fs.readFileSync('public/locales/en/common.json', 'utf8');
  let cleanContent = content
    .replace(/<<<<<<< HEAD\r?\n/g, '')
    .replace(/=======\r?\n/g, '')
    .replace(/>>>>>>> origin\/develop\r?\n/g, '');

  try {
    // If we parse the clean content, it might have duplicate keys due to Git placing HEAD's additions at top
    // and origin/develop having them at bottom. But JSON.parse handles duplicates by taking the LAST one.
    // WAIT! If we parse it, we want to KEEP the top ones (which areHEAD's and have our new fields) over the bottom ones!
    // But JSON.parse keeps the BOTTOM ones! So we would LOSE our new fields!
    
    // Instead of parsing immediately, let's reverse the key order conceptually or manually merge.
    // Since we know the fields we care about, let's inject them explicitly into the parsed JSON!
    
    // Actually, if we just want to apply our modifications to the "theirs" file:
    const theirsStr = fs.readFileSync('.git/MERGE_MSG', 'utf8'); // Just a hack, we can run git checkout --theirs directly via shell
  } catch (e) {
    console.error(e);
  }
}

function resolvePageTsx() {
  const content = fs.readFileSync('src/app/explore/page.tsx', 'utf8');
  
  let cleanContent = content
    .replace(/<<<<<<< HEAD\r?\n/g, '')
    .replace(/=======\r?\n/g, '')
    .replace(/>>>>>>> origin\/develop\r?\n/g, '');
    
  fs.writeFileSync('src/app/explore/page.tsx', cleanContent, 'utf8');
  console.log('Resolved page.tsx');
}

resolvePageTsx();
