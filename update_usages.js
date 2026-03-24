const fs = require('fs');
let code = fs.readFileSync('src/app/explore/page.tsx', 'utf8');

// The marker where our definitions completed:
const marker = 'const [currentCity, setCurrentCity] = useState<CityId>(\'seoul\');';
const splitIndex = code.indexOf(marker);

if (splitIndex !== -1) {
  let part1 = code.slice(0, splitIndex);
  let part2 = code.slice(splitIndex);

  // In part2 (the rest of the component), replace constants with translated ones
  part2 = part2.replace(/(?<!return )BEAUTY_STORE_ITEMS/g, 'translatedStores');
  part2 = part2.replace(/DESIGNERS_BY_STORE/g, 'translatedDesignersByStore');
  part2 = part2.replace(/PRIMARY_SERVICES_BY_CATEGORY/g, 'translatedPrimaryServices');
  part2 = part2.replace(/ADD_ONS_BY_CATEGORY/g, 'translatedAddOns');

  fs.writeFileSync('src/app/explore/page.tsx', part1 + part2);
  console.log('Update complete');
} else {
  console.log('Marker not found');
}
