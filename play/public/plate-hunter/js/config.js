export const SAVE_KEY = 'plate-hunter:save';
export const SAVE_VERSION = 1;

export const RARITIES = [
  { id: 'common', name: 'Common', odds: 2, color: '#aab3b8', value: 2, rank: 0 },
  { id: 'uncommon', name: 'Uncommon', odds: 10, color: '#76d69a', value: 8, rank: 1 },
  { id: 'rare', name: 'Rare', odds: 50, color: '#6eb8ff', value: 35, rank: 2 },
  { id: 'very-rare', name: 'Very Rare', odds: 250, color: '#bf86ff', value: 130, rank: 3 },
  { id: 'epic', name: 'Epic', odds: 1000, color: '#ff72bc', value: 500, rank: 4 },
  { id: 'legendary', name: 'Legendary', odds: 5000, color: '#ffb44d', value: 2200, rank: 5 },
  { id: 'mythical', name: 'Mythical', odds: 25000, color: '#ff6372', value: 10000, rank: 6 },
  { id: 'impossible', name: 'Impossible', odds: 100000, color: '#fff176', value: 50000, rank: 7 }
];

export const PLATE_DESIGNS = [
  { id:'ma-beacon', region:'Massachusetts', label:'MASSACHUSETTS', subtitle:'THE SPIRIT OF AMERICA', background:'assets/plates/ma-beacon.svg', font:'Plate Grotesk, Arial, sans-serif', size:17, weight:900, spacing:'.045em', color:'#17314a', x:50, y:56, width:78, emboss:'0 1px 0 #fff8, 0 2px 1px #18304755' },
  { id:'ma-bay', region:'Massachusetts', label:'MASSACHUSETTS', subtitle:'THE BAY STATE', background:'assets/plates/ma-bay.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.055em', color:'#172e3c', x:50, y:55, width:76, emboss:'0 1px 0 #fff9, 0 2px 2px #102a3544' },
  { id:'ma-centennial', region:'Massachusetts · vintage', label:'MASS. 1960', subtitle:'CENTENNIAL SERIES', background:'assets/plates/ma-centennial.svg', font:'Georgia, serif', size:16, weight:700, spacing:'.08em', color:'#283a32', x:50, y:57, width:75, emboss:'0 1px 0 #fff8, 0 2px 1px #263c3280' },
  { id:'california', region:'California', label:'CALIFORNIA', subtitle:'GOLDEN STATE', background:'assets/plates/california.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.12em', color:'#122638', x:50, y:56, width:77, emboss:'0 1px 0 #fff9, 0 2px 1px #0c1c2c55' },
  { id:'florida', region:'Florida', label:'SUNSHINE STATE', subtitle:'FLORIDA', background:'assets/plates/florida.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.06em', color:'#213944', x:50, y:55, width:78, emboss:'0 1px 0 #fff9, 0 2px 1px #233a4555' },
  { id:'texas', region:'Texas', label:'TEXAS', subtitle:'LONE STAR COUNTRY', background:'assets/plates/texas.svg', font:'Plate Grotesk, Arial, sans-serif', size:18, weight:900, spacing:'.09em', color:'#17324e', x:50, y:55, width:77, emboss:'0 1px 0 #fff9, 0 2px 1px #172b4255' },
  { id:'new-york', region:'New York', label:'NEW YORK', subtitle:'EMPIRE STATE', background:'assets/plates/new-york.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.08em', color:'#164667', x:50, y:55, width:77, emboss:'0 1px 0 #fff9, 0 2px 1px #14375766' },
  { id:'new-hampshire', region:'New Hampshire', label:'LIVE FREE OR DIE', subtitle:'NEW HAMPSHIRE', background:'assets/plates/new-hampshire.svg', font:'Plate Grotesk, Arial, sans-serif', size:18, weight:900, spacing:'.04em', color:'#263c4b', x:50, y:56, width:79, emboss:'0 1px 0 #fff9, 0 2px 1px #263c4b55' },
  { id:'washington', region:'Washington', label:'EVERGREEN STATE', subtitle:'WASHINGTON', background:'assets/plates/washington.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.08em', color:'#244735', x:50, y:56, width:78, emboss:'0 1px 0 #fff9, 0 2px 1px #193a2855' },
  { id:'arizona', region:'Arizona', label:'GRAND CANYON STATE', subtitle:'ARIZONA', background:'assets/plates/arizona.svg', font:'Plate Grotesk, Arial, sans-serif', size:15, weight:900, spacing:'.055em', color:'#503627', x:50, y:56, width:78, emboss:'0 1px 0 #fff9, 0 2px 1px #402c2055' },
  { id:'colorado', region:'Colorado', label:'COLORADO', subtitle:'COLORFUL STATE', background:'assets/plates/colorado.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.095em', color:'#263744', x:50, y:55, width:77, emboss:'0 1px 0 #fff9, 0 2px 1px #20324055' },
  { id:'hawaii', region:'Hawaii', label:'ALOHA STATE', subtitle:'HAWAIʻI', background:'assets/plates/hawaii.svg', font:'Plate Grotesk, Arial, sans-serif', size:16, weight:900, spacing:'.1em', color:'#15534e', x:50, y:56, width:76, emboss:'0 1px 0 #fff9, 0 2px 1px #16494455' },
  { id:'euro', region:'Europe · inspired', label:'EURO SERIES', subtitle:'EUROPEAN MOTIF', background:'assets/plates/euro.svg', font:'Plate Grotesk, Arial, sans-serif', size:18, weight:800, spacing:'.17em', color:'#152b3d', x:54, y:55, width:72, emboss:'0 1px 0 #fff9, 0 2px 1px #12283c55' },
  { id:'tokyo', region:'Japan · inspired', label:'TOKYO / 東京', subtitle:'MOTOR CLUB', background:'assets/plates/tokyo.svg', font:'Plate Grotesk, Arial, sans-serif', size:17, weight:900, spacing:'.08em', color:'#28323f', x:50, y:56, width:73, emboss:'0 1px 0 #fff9, 0 2px 1px #24324055' },
  { id:'vintage', region:'United States · vintage', label:'MOTOR TOURING', subtitle:'ROAD SERIES · 1954', background:'assets/plates/vintage.svg', font:'Georgia, serif', size:17, weight:700, spacing:'.07em', color:'#463422', x:50, y:55, width:75, emboss:'0 1px 0 #fff9, 0 2px 1px #42311e88' }
].map(design => ({ aspect:2, height:15, align:'center', ...design }));

export const SPECIAL_REGISTRATIONS = [
  { registration:'A001AAA', rarity:'impossible', odds:100000, label:'The perfect bookend' },
  { registration:'0000001', rarity:'mythical', odds:72000, label:'First in line' },
  { registration:'7777777', rarity:'mythical', odds:65000, label:'Seven heaven' },
  { registration:'1234321', rarity:'legendary', odds:30000, label:'Mirror run' },
  { registration:'9999999', rarity:'legendary', odds:28000, label:'All nines' },
  { registration:'ZZZ999', rarity:'epic', odds:18000, label:'End of the alphabet' },
  { registration:'AAAAAAA', rarity:'epic', odds:15000, label:'All letters' },
  { registration:'000000', rarity:'epic', odds:14000, label:'Zero hour' },
  { registration:'AAA000', rarity:'very-rare', odds:8000, label:'Letter / number split' }
];

export const UPGRADE_CONFIG = {
  luck: { name:'Better Luck', description:'Nudge each rarity check up to 1.8×. The rarest tiers stay rare.', costs:[250,700,1700,3600,7000,12500,22000,38000,60000,90000] },
  speed: { name:'Spin Speed', description:'Shorten the reveal animation.', costs:[120,300,650,1300,2600,5000,9000,15000,24000,36000] },
  bulk: { name:'Bulk Spins', description:'Unlock multi-spin: 5× at level 1, 10× at level 2.', costs:[900,4200] },
  collector: { name:'Collector Bonus', description:'Earn more when selling plates.', costs:[180,440,900,1700,3000,5000,8500,13500,21000,32000] },
  streak: { name:'Lucky Streak', description:'Every 25 consecutive spins, get a bonus spin.', costs:[300,800,1800,3600,6800] }
};

export const ACHIEVEMENTS = [
  { id:'first-spin', name:'First Spin', description:'Roll your first plate.', reward:10, test:s=>s.stats.totalSpins>=1 },
  { id:'first-rare', name:'Something Blue', description:'Discover a Rare plate or better.', reward:50, test:s=>s.stats.highestRarity>=2 },
  { id:'first-legendary', name:'Gold Standard', description:'Discover a Legendary plate.', reward:350, test:s=>s.stats.highestRarity>=5 },
  { id:'first-mythical', name:'Myth in Metal', description:'Discover a Mythical plate.', reward:1500, test:s=>s.stats.highestRarity>=6 },
  { id:'first-impossible', name:'No Way', description:'Discover an Impossible plate.', reward:8000, test:s=>s.stats.highestRarity>=7 },
  { id:'spins-100', name:'Road Regular', description:'Spin 100 times.', reward:120, test:s=>s.stats.totalSpins>=100 },
  { id:'spins-1000', name:'Road Veteran', description:'Spin 1,000 times.', reward:1000, test:s=>s.stats.totalSpins>=1000 },
  { id:'spins-10000', name:'The Long Haul', description:'Spin 10,000 times.', reward:10000, test:s=>s.stats.totalSpins>=10000 },
  { id:'unique-100', name:'Full Binder', description:'Collect 100 unique registrations.', reward:650, test:s=>Object.keys(s.collection).length>=100 },
  { id:'unique-500', name:'Plate Archivist', description:'Collect 500 unique registrations.', reward:4500, test:s=>Object.keys(s.collection).length>=500 },
  { id:'ma-collection', name:'Bay State Binder', description:'Find a plate in all three Massachusetts designs.', reward:250, test:s=>PLATE_DESIGNS.filter(d=>d.region==='Massachusetts').every(d=>Object.values(s.collection).some(p=>p.designId===d.id)) },
  { id:'collector-10', name:'Little Hoard', description:'Collect 10 unique plates.', reward:60, test:s=>Object.keys(s.collection).length>=10 },
  { id:'collector-50', name:'Big Binder', description:'Collect 50 unique plates.', reward:250, test:s=>Object.keys(s.collection).length>=50 }
];

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r=>[r.id,r]));
export const DESIGN_BY_ID = Object.fromEntries(PLATE_DESIGNS.map(d=>[d.id,d]));
export const SPECIAL_BY_REGISTRATION = Object.fromEntries(SPECIAL_REGISTRATIONS.map(s=>[s.registration,s]));
