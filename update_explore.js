const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/app/explore/page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const BEAUTY_STORE_ITEMS: BeautyStore\[\] = \[([\s\S]*?)\];/g, 'const getBeautyStoreItems = (tBeauty: any): BeautyStore[] => [$1];');
content = content.replace(/const DESIGNERS_BY_STORE: Record<string, BeautyDesigner\[\]> = \{([\s\S]*?)\};/g, 'const getDesignersByStore = (tBeauty: any): Record<string, BeautyDesigner[]> => ({$1});');
content = content.replace(/const PRIMARY_SERVICES_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption\[\]> = \{([\s\S]*?)\};/g, 'const getPrimaryServices = (tBeauty: any): Record<BeautyCategoryId, BeautyServiceOption[]> => ({$1});');
content = content.replace(/const ADD_ONS_BY_CATEGORY: Record<BeautyCategoryId, BeautyServiceOption\[\]> = \{([\s\S]*?)\};/g, 'const getAddOns = (tBeauty: any): Record<BeautyCategoryId, BeautyServiceOption[]> => ({$1});');

fs.writeFileSync(file, content);
console.log('Update complete');
