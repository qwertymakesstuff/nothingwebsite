// GAMEPLAY STARTING DATA — not geography. Geography (shapes, borders, ISO codes, sovereignty, area) lives in
// world.js and data/regions/, generated from Natural Earth. Everything here is the game's starting position.
//
// NATIONS: [capital, population (millions), GDP (US$ billions), government, active military (thousands)]
//   Rounded mid-2020s public estimates; governments are the game's own simplified classification.
//   Territories are not listed: they use Natural Earth's 2019 population/GDP estimates (see core/db.js).
// Derived at runtime in core/db.js and shown as game values: stability, infrastructure, military strength.

export const GOV = {
  dem: 'Democracy', mon: 'Constitutional monarchy', abs: 'Absolute monarchy', one: 'One-party state',
  aut: 'Authoritarian republic', jun: 'Military junta', theo: 'Theocratic republic', ter: 'Territory',
};

export const NATIONS = {
  AFG: ["Kabul", 41, 17, 'theo', 150], AGO: ["Luanda", 37, 85, 'aut', 107], ALB: ["Tirana", 2.8, 23, 'dem', 7],
  AND: ["Andorra la Vella", 0.08, 3.7, 'mon', 0], ARE: ["Abu Dhabi", 10, 510, 'abs', 63],
  ARG: ["Buenos Aires", 46, 640, 'dem', 72], ARM: ["Yerevan", 3, 24, 'dem', 43],
  ATG: ["St. John's", 0.094, 2, 'mon', 0.2], AUS: ["Canberra", 27, 1700, 'mon', 58],
  AUT: ["Vienna", 9.1, 520, 'dem', 23], AZE: ["Baku", 10, 72, 'aut', 65], BDI: ["Gitega", 13, 3, 'aut', 30],
  BEL: ["Brussels", 11.8, 630, 'mon', 25], BEN: ["Porto-Novo", 14, 20, 'dem', 12],
  BFA: ["Ouagadougou", 23, 20, 'jun', 11], BGD: ["Dhaka", 173, 450, 'dem', 163], BGR: ["Sofia", 6.4, 100, 'dem', 37],
  BHR: ["Manama", 1.5, 47, 'abs', 8], BHS: ["Nassau", 0.4, 14, 'mon', 1.6], BIH: ["Sarajevo", 3.2, 28, 'dem', 10],
  BLR: ["Minsk", 9.2, 72, 'aut', 48], BLZ: ["Belmopan", 0.4, 3, 'mon', 2], BOL: ["Sucre", 12, 46, 'dem', 34],
  BRA: ["Brasília", 216, 2200, 'dem', 366], BRB: ["Bridgetown", 0.28, 6.4, 'dem', 0.6],
  BRN: ["Bandar Seri Begawan", 0.45, 15, 'abs', 7], BTN: ["Thimphu", 0.8, 3, 'mon', 8],
  BWA: ["Gaborone", 2.6, 19, 'dem', 9], CAF: ["Bangui", 5.7, 3, 'aut', 9], CAN: ["Ottawa", 40, 2150, 'mon', 68],
  CHE: ["Bern", 8.8, 880, 'dem', 20], CHL: ["Santiago", 19.6, 335, 'dem', 77],
  CHN: ["Beijing", 1410, 18500, 'one', 2035], CIV: ["Yamoussoukro", 29, 79, 'dem', 27],
  CMR: ["Yaoundé", 28, 48, 'aut', 40], COD: ["Kinshasa", 102, 67, 'aut', 134], COG: ["Brazzaville", 6, 15, 'aut', 10],
  COL: ["Bogotá", 52, 365, 'dem', 293], COM: ["Moroni", 0.85, 1.3, 'aut', 0.5], CPV: ["Praia", 0.6, 2.6, 'dem', 1],
  CRI: ["San José", 5.2, 86, 'dem', 0], CUB: ["Havana", 11, 107, 'one', 49],
  CYN: ["North Nicosia", 0.38, 4.5, 'dem', 9], CYP: ["Nicosia", 0.9, 33, 'dem', 12],
  CZE: ["Prague", 10.9, 330, 'dem', 27], DEU: ["Berlin", 84, 4450, 'dem', 181], DJI: ["Djibouti", 1.1, 4, 'aut', 10],
  DMA: ["Roseau", 0.07, 0.65, 'dem', 0], DNK: ["Copenhagen", 5.9, 400, 'mon', 15],
  DOM: ["Santo Domingo", 11.3, 120, 'dem', 56], DZA: ["Algiers", 46, 260, 'aut', 140],
  ECU: ["Quito", 18, 120, 'dem', 41], EGY: ["Cairo", 113, 400, 'aut', 438], ERI: ["Asmara", 3.7, 2.3, 'one', 200],
  ESP: ["Madrid", 48, 1600, 'mon', 133], EST: ["Tallinn", 1.4, 41, 'dem', 7],
  ETH: ["Addis Ababa", 127, 160, 'aut', 140], FIN: ["Helsinki", 5.6, 300, 'dem', 24], FJI: ["Suva", 0.9, 5.5, 'dem', 4],
  FRA: ["Paris", 68, 3050, 'dem', 203], FSM: ["Palikir", 0.115, 0.46, 'dem', 0], GAB: ["Libreville", 2.4, 21, 'jun', 5],
  GBR: ["London", 68, 3350, 'mon', 141], GEO: ["Tbilisi", 3.7, 30, 'dem', 21], GHA: ["Accra", 34, 76, 'dem', 16],
  GIN: ["Conakry", 14, 23, 'jun', 10], GMB: ["Banjul", 2.8, 2.3, 'dem', 1], GNB: ["Bissau", 2.1, 2, 'aut', 4],
  GNQ: ["Malabo", 1.7, 12, 'aut', 2], GRC: ["Athens", 10.4, 240, 'dem', 143],
  GRD: ["St. George's", 0.125, 1.3, 'mon', 0], GTM: ["Guatemala City", 18, 104, 'dem', 18],
  GUY: ["Georgetown", 0.8, 17, 'dem', 3], HND: ["Tegucigalpa", 10.6, 34, 'dem', 15],
  HRV: ["Zagreb", 3.9, 82, 'dem', 15], HTI: ["Port-au-Prince", 11.7, 20, 'aut', 1],
  HUN: ["Budapest", 9.6, 210, 'aut', 32], IDN: ["Jakarta", 278, 1370, 'dem', 400],
  IND: ["New Delhi", 1430, 3700, 'dem', 1475], IRL: ["Dublin", 5.3, 550, 'dem', 8],
  IRN: ["Tehran", 89, 400, 'theo', 610], IRQ: ["Baghdad", 45, 250, 'dem', 193], ISL: ["Reykjavík", 0.39, 31, 'dem', 0],
  ISR: ["Jerusalem", 9.8, 510, 'dem', 170], ITA: ["Rome", 59, 2250, 'dem', 165], JAM: ["Kingston", 2.8, 19, 'mon', 6],
  JOR: ["Amman", 11.3, 51, 'mon', 100], JPN: ["Tokyo", 124, 4200, 'mon', 247], KAZ: ["Astana", 20, 260, 'aut', 39],
  KEN: ["Nairobi", 55, 108, 'dem', 24], KGZ: ["Bishkek", 7, 14, 'aut', 11], KHM: ["Phnom Penh", 17, 32, 'aut', 124],
  KIR: ["South Tarawa", 0.13, 0.28, 'dem', 0], KNA: ["Basseterre", 0.047, 1.1, 'mon', 0.3],
  KOR: ["Seoul", 51.7, 1710, 'dem', 500], KOS: ["Pristina", 1.7, 10, 'dem', 3],
  KWT: ["Kuwait City", 4.3, 160, 'mon', 17], LAO: ["Vientiane", 7.6, 15, 'one', 29],
  LBN: ["Beirut", 5.4, 18, 'dem', 60], LBR: ["Monrovia", 5.4, 4.3, 'dem', 2], LBY: ["Tripoli", 6.9, 50, 'aut', 32],
  LCA: ["Castries", 0.18, 2.5, 'mon', 0], LIE: ["Vaduz", 0.04, 7.4, 'mon', 0], LKA: ["Colombo", 22, 84, 'dem', 255],
  LSO: ["Maseru", 2.3, 2.3, 'mon', 2], LTU: ["Vilnius", 2.9, 78, 'dem', 23], LUX: ["Luxembourg", 0.67, 86, 'mon', 1],
  LVA: ["Riga", 1.9, 43, 'dem', 7], MAR: ["Rabat", 37, 140, 'mon', 196], MCO: ["Monaco", 0.039, 8.8, 'mon', 0],
  MDA: ["Chișinău", 2.5, 17, 'dem', 5], MDG: ["Antananarivo", 30, 16, 'dem', 13], MDV: ["Malé", 0.52, 6.6, 'dem', 4],
  MEX: ["Mexico City", 129, 1790, 'dem', 236], MHL: ["Majuro", 0.04, 0.28, 'dem', 0],
  MKD: ["Skopje", 1.8, 15, 'dem', 8], MLI: ["Bamako", 23, 21, 'jun', 21], MLT: ["Valletta", 0.54, 22, 'dem', 2],
  MMR: ["Naypyidaw", 54, 65, 'jun', 150], MNE: ["Podgorica", 0.62, 7.4, 'dem', 2],
  MNG: ["Ulaanbaatar", 3.4, 20, 'dem', 10], MOZ: ["Maputo", 34, 21, 'aut', 11], MRT: ["Nouakchott", 4.9, 10, 'aut', 16],
  MUS: ["Port Louis", 1.26, 14.6, 'dem', 0], MWI: ["Lilongwe", 21, 13, 'dem', 11],
  MYS: ["Kuala Lumpur", 34, 400, 'mon', 113], NAM: ["Windhoek", 2.6, 13, 'dem', 10], NER: ["Niamey", 27, 17, 'jun', 33],
  NGA: ["Abuja", 224, 250, 'dem', 143], NIC: ["Managua", 6.9, 17, 'aut', 12], NLD: ["Amsterdam", 17.9, 1100, 'mon', 33],
  NOR: ["Oslo", 5.5, 485, 'mon', 25], NPL: ["Kathmandu", 30, 41, 'dem', 96], NRU: ["Yaren", 0.013, 0.15, 'dem', 0],
  NZL: ["Wellington", 5.2, 250, 'mon', 9], OMN: ["Muscat", 4.6, 105, 'abs', 43],
  PAK: ["Islamabad", 240, 340, 'dem', 654], PAN: ["Panama City", 4.5, 83, 'dem', 0], PER: ["Lima", 34, 265, 'dem', 81],
  PHL: ["Manila", 117, 440, 'dem', 150], PLW: ["Ngerulmud", 0.018, 0.28, 'dem', 0],
  PNG: ["Port Moresby", 10.3, 31, 'mon', 4], POL: ["Warsaw", 37.6, 840, 'dem', 202],
  PRK: ["Pyongyang", 26, 30, 'one', 1280], PRT: ["Lisbon", 10.4, 290, 'dem', 25], PRY: ["Asunción", 6.9, 43, 'dem', 14],
  PSE: ["Ramallah", 5.4, 17, 'aut', 0], QAT: ["Doha", 2.7, 220, 'abs', 17], ROU: ["Bucharest", 19, 350, 'dem', 72],
  RUS: ["Moscow", 144, 2000, 'aut', 1320], RWA: ["Kigali", 14, 14, 'aut', 33], SAU: ["Riyadh", 36, 1100, 'abs', 257],
  SDN: ["Khartoum", 48, 30, 'jun', 100], SEN: ["Dakar", 18, 31, 'dem', 14], SGP: ["Singapore", 5.9, 500, 'dem', 51],
  SLB: ["Honiara", 0.74, 1.6, 'mon', 0], SLE: ["Freetown", 8.8, 4, 'dem', 9], SLV: ["San Salvador", 6.3, 34, 'aut', 25],
  SMR: ["San Marino", 0.034, 2, 'dem', 0], SOL: ["Hargeisa", 5.7, 3, 'dem', 13], SOM: ["Mogadishu", 18, 11, 'aut', 20],
  SRB: ["Belgrade", 6.6, 75, 'dem', 28], SSD: ["Juba", 11, 6, 'aut', 185], STP: ["São Tomé", 0.23, 0.68, 'dem', 0.3],
  SUR: ["Paramaribo", 0.62, 3.6, 'dem', 2], SVK: ["Bratislava", 5.4, 130, 'dem', 17],
  SVN: ["Ljubljana", 2.1, 68, 'dem', 7], SWE: ["Stockholm", 10.5, 590, 'mon', 24], SWZ: ["Mbabane", 1.2, 4.7, 'abs', 3],
  SYC: ["Victoria", 0.1, 2.1, 'dem', 0.4], SYR: ["Damascus", 23, 9, 'aut', 100], TCD: ["N'Djamena", 18, 13, 'jun', 33],
  TGO: ["Lomé", 9.3, 9, 'aut', 9], THA: ["Bangkok", 71.8, 515, 'mon', 361], TJK: ["Dushanbe", 10, 12, 'aut', 9],
  TKM: ["Ashgabat", 6.5, 60, 'aut', 37], TLS: ["Dili", 1.4, 2, 'dem', 2], TON: ["Nuku'alofa", 0.1, 0.5, 'mon', 0.6],
  TTO: ["Port of Spain", 1.5, 28, 'dem', 5], TUN: ["Tunis", 12.4, 49, 'aut', 36], TUR: ["Ankara", 85, 1100, 'aut', 355],
  TUV: ["Funafuti", 0.011, 0.06, 'dem', 0], TWN: ["Taipei", 23.4, 790, 'dem', 169], TZA: ["Dodoma", 67, 79, 'aut', 27],
  UGA: ["Kampala", 48, 49, 'aut', 45], UKR: ["Kyiv", 37, 180, 'dem', 900], URY: ["Montevideo", 3.4, 77, 'dem', 21],
  USA: ["Washington, D.C.", 335, 27700, 'dem', 1330], UZB: ["Tashkent", 36, 90, 'aut', 48],
  VAT: ["Vatican City", 0.0008, 0.3, 'abs', 0.135], VCT: ["Kingstown", 0.1, 1.1, 'mon', 0],
  VEN: ["Caracas", 28, 92, 'aut', 123], VNM: ["Hanoi", 100, 430, 'one', 482], VUT: ["Port Vila", 0.33, 1.1, 'dem', 0],
  WSM: ["Apia", 0.22, 0.94, 'dem', 0], YEM: ["Sana'a", 34, 21, 'aut', 40], ZAF: ["Pretoria", 61, 380, 'dem', 74],
  ZMB: ["Lusaka", 20.6, 28, 'dem', 15], ZWE: ["Harare", 16.7, 28, 'aut', 29],
};

// Main towns of the inhabited territories (the rest show no capital).
export const TERRITORY_CAPITALS = {
  ABW: 'Oranjestad', AIA: 'The Valley', ALA: 'Mariehamn', ASM: 'Pago Pago', BMU: 'Hamilton', COK: 'Avarua', CUW: 'Willemstad',
  CYM: 'George Town', ESH: 'Laayoune', FLK: 'Stanley', FRO: 'Tórshavn', GGY: 'Saint Peter Port', GRL: 'Nuuk', GUM: 'Hagåtña',
  HKG: 'Hong Kong', IMN: 'Douglas', JEY: 'Saint Helier', MAC: 'Macau', MNP: 'Saipan', MSR: 'Brades', NCL: 'Nouméa',
  NFK: 'Kingston', NIU: 'Alofi', PCN: 'Adamstown', PRI: 'San Juan', PYF: 'Papeete', SHN: 'Jamestown', SPM: 'Saint-Pierre',
  SXM: 'Philipsburg', TCA: 'Cockburn Town', VGB: 'Road Town', VIR: 'Charlotte Amalie', WLF: 'Mata-Utu', BLM: 'Gustavia', MAF: 'Marigot',
};

// Notable producers of each strategic resource (approximate, from public production rankings).
export const RESOURCES = {
  oil: ['SAU', 'USA', 'RUS', 'CAN', 'IRQ', 'CHN', 'ARE', 'IRN', 'BRA', 'KWT', 'NOR', 'KAZ', 'MEX', 'NGA', 'QAT', 'LBY', 'DZA', 'AGO', 'GUY', 'VEN', 'OMN', 'COL', 'AZE', 'EGY', 'MYS', 'ECU', 'GBR', 'ARG'],
  gas: ['USA', 'RUS', 'IRN', 'CHN', 'CAN', 'QAT', 'AUS', 'NOR', 'SAU', 'DZA', 'TKM', 'MYS', 'EGY', 'IDN', 'UZB', 'ARE', 'NGA', 'ARG', 'OMN', 'AZE', 'TTO'],
  coal: ['CHN', 'IND', 'IDN', 'USA', 'AUS', 'RUS', 'ZAF', 'KAZ', 'DEU', 'POL', 'TUR', 'COL', 'MNG', 'VNM'],
  iron: ['AUS', 'BRA', 'CHN', 'IND', 'RUS', 'ZAF', 'UKR', 'CAN', 'IRN', 'KAZ', 'SWE', 'CHL', 'MRT', 'PER'],
  copper: ['CHL', 'PER', 'COD', 'CHN', 'USA', 'AUS', 'RUS', 'ZMB', 'MEX', 'KAZ', 'IDN', 'CAN', 'POL', 'MNG'],
  gold: ['CHN', 'AUS', 'RUS', 'CAN', 'USA', 'GHA', 'PER', 'MEX', 'KAZ', 'UZB', 'ZAF', 'IDN', 'BRA', 'MLI', 'SDN', 'BFA', 'PNG'],
  uranium: ['KAZ', 'CAN', 'NAM', 'AUS', 'UZB', 'RUS', 'NER', 'CHN', 'IND', 'ZAF', 'UKR'],
  rareEarths: ['CHN', 'USA', 'MMR', 'AUS', 'THA', 'VNM', 'IND', 'RUS', 'MDG', 'BRA'],
  grain: ['CHN', 'USA', 'IND', 'RUS', 'BRA', 'ARG', 'UKR', 'IDN', 'FRA', 'CAN', 'BGD', 'VNM', 'PAK', 'DEU', 'AUS', 'TUR', 'THA', 'KAZ', 'POL', 'MEX', 'ROU', 'EGY', 'NGA'],
  timber: ['USA', 'RUS', 'CHN', 'BRA', 'CAN', 'IND', 'SWE', 'IDN', 'FIN', 'DEU', 'COD', 'CHL', 'POL', 'NZL', 'MYS'],
  fish: ['CHN', 'IDN', 'PER', 'IND', 'RUS', 'USA', 'VNM', 'JPN', 'NOR', 'CHL', 'PHL', 'BGD', 'MMR', 'KOR', 'THA', 'MAR', 'ISL'],
};
export const RESOURCE_LABELS = { oil: 'Oil', gas: 'Natural gas', coal: 'Coal', iron: 'Iron ore', copper: 'Copper', gold: 'Gold', uranium: 'Uranium', rareEarths: 'Rare earths', grain: 'Grain', timber: 'Timber', fish: 'Fisheries' };

// Starting stability penalty for countries in active conflict or deep crisis (the game's own judgement).
export const CRISIS = {
  AFG: -25, SYR: -30, YEM: -35, SDN: -35, SSD: -30, SOM: -25, MLI: -20, BFA: -20, NER: -15, HTI: -30, MMR: -25, LBY: -20,
  COD: -20, CAF: -25, ETH: -15, UKR: -10, LBN: -15, IRQ: -10, VEN: -15, NGA: -10, MOZ: -10, CMR: -10, TCD: -10, PSE: -25,
};

// Quick-pick starts shown on the nation picker.
export const FEATURED = ['USA', 'CHN', 'RUS', 'DEU', 'IND', 'BRA', 'JPN', 'GBR', 'FRA', 'TUR'];
