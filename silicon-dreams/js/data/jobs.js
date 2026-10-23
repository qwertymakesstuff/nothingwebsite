// Job content: customer tiers, build briefs, the customer machines that come in for repair, and
// fault definitions with the symptoms customers describe. The generator in core/jobs.js combines
// them. Text uses {name} for the customer's first name.

export const TIERS = [
  { tier: 1, label: 'Neighbourhood', level: 1, rep: 0 },
  { tier: 2, label: 'Small business', level: 2, rep: 15 },
  { tier: 3, label: 'Enthusiasts', level: 3, rep: 30 },
  { tier: 4, label: 'Premium clients', level: 4, rep: 45, needs: 'showroom' },
  { tier: 5, label: 'Specialist contracts', level: 5, rep: 60, needs: 'cert' },
];

// build briefs: requirements are checked by core/jobs.js checkJob()
export const BUILDS = [
  { id: 'office', tier: 1, title: 'Office desktop', budget: [600, 720], days: [3, 4], req: { cpuMark: 3800, ramGB: 8, storageGB: 240, ssd: true, os: 'lumen' },
    text: ['I need a reliable computer for emails, spreadsheets and video calls. Nothing fancy, but it has to be quick to start up.', 'Something for the home office. Fast boot, quiet-ish, and it must run Lumen OS.'] },
  { id: 'student', tier: 1, title: 'Student PC', budget: [620, 720], days: [3, 5], req: { cpuMark: 5000, gpuMark: 600, ramGB: 16, storageGB: 500, ssd: true },
    text: ['I need something for coding assignments and the odd light game. Any OS is fine — I can live with Fernix.', 'Lots of browser tabs, a code editor and maybe some indie games.'] },
  { id: 'budget', tier: 1, title: 'Budget build', budget: [540, 600], days: [3, 5], req: { cpuMark: 4000, gpuMark: 1000, ramGB: 8, storageGB: 240, partsCap: 470 }, strict: true,
    text: ['I have exactly this much and not a cent more. It just has to run my accounting software and some old games. Second-hand parts are fine.'] },
  { id: 'esports', tier: 1, title: 'Entry gaming PC', budget: [980, 1100], days: [3, 5], req: { cpuMark: 5000, gpuMark: 4000, ramGB: 16, storageGB: 500, ssd: true, os: 'lumen' },
    text: ['I want to play the popular online shooters at high frame rates. Lumen OS, please — my games need it.'] },
  { id: 'gaming', tier: 2, title: 'Gaming PC', budget: [1400, 1600], days: [4, 6], req: { cpuMark: 7000, gpuMark: 6000, ramGB: 16, storageGB: 1000, ssd: true, os: 'lumen', maxTemp: 85 },
    text: ['A proper gaming rig for new releases at high settings. It shouldn\'t cook itself in summer either.'] },
  { id: 'quiet', tier: 2, title: 'Silent studio PC', budget: [950, 1100], days: [4, 6], req: { cpuMark: 6000, ramGB: 32, storageGB: 1000, ssd: true, maxNoise: 30, maxTemp: 85 },
    text: ['I record vocals and acoustic guitar. The microphone picks up every fan, so it has to be nearly silent under load — 30 dB at most.'] },
  { id: 'render', tier: 2, title: 'Rendering workstation', budget: [1050, 1250], days: [4, 6], req: { cpuMark: 8000, ramGB: 32, storageGB: 1000, ssd: true, maxTemp: 85 },
    text: ['I render architecture models overnight. All cores, all night, and it must not throttle.'] },
  { id: 'highend', tier: 3, title: 'High-end gaming PC', budget: [2200, 2500], days: [5, 7], req: { cpuMark: 9500, gpuMark: 8000, ramGB: 32, storageGB: 1000, ssd: true, os: 'lumen', maxTemp: 82, newOnly: true }, highEnd: true,
    text: ['Max settings, high refresh rate, new parts only. Keep the CPU under 82°C — I\'ll be checking.'] },
  { id: 'sff', tier: 3, title: 'Small form factor gaming PC', budget: [1500, 1700], days: [5, 7], req: { cpuMark: 8000, gpuMark: 5500, ramGB: 32, storageGB: 1000, ssd: true, form: 'ITX', maxTemp: 88 }, highEnd: true,
    text: ['It has to fit under the TV: Mini-ITX in a small case, but still a real gaming machine.'] },
  { id: 'workstation', tier: 3, title: '3D workstation', budget: [2600, 3000], days: [5, 7], req: { cpuMark: 12000, gpuMark: 6000, ramGB: 64, storageGB: 2000, ssd: true, os: 'harbor', maxTemp: 85, newOnly: true }, highEnd: true,
    text: ['Simulation and 3D work in Harbor OS Workstation. Lots of memory, a fast NVMe and sustained all-core performance.'] },
  { id: 'flagship', tier: 4, title: 'Flagship no-compromise build', budget: [4600, 5300], days: [6, 8], req: { cpuMark: 12500, gpuMark: 13000, ramGB: 64, storageGB: 2000, ssd: true, os: 'lumen', maxTemp: 85, maxNoise: 44, newOnly: true }, highEnd: true,
    text: ['The fastest thing you can build. Price is secondary, but keep it from howling — I sit right next to it.'] },
  { id: 'studio', tier: 4, title: 'Producer\'s silent workstation', budget: [1900, 2150], days: [6, 8], req: { cpuMark: 10000, ramGB: 64, storageGB: 2000, ssd: true, maxNoise: 28, maxTemp: 85, newOnly: true }, highEnd: true,
    text: ['A quiet beast for the studio: big sample libraries, many plugins, and under 28 dB.'] },
];

// customer machines (part ids); `era` decides what kinds of faults make sense
export const MACHINES = [
  { id: 'old-office', label: 'ageing office tower', era: 'old', spec: { case: 'case-boxwell-mini', motherboard: 'mb-tessera-h11m', cpu: 'cpu-arc-k3-6100', cooler: 'cool-breeze-65', ram: ['ram-mw-4-2400', 'ram-mw-4-2400'], storage: ['sto-strata-500'], psu: 'psu-volt-350', fans: ['fan-zp-breeze120'] }, os: 'os-lumen-7' },
  { id: 'family', label: 'family desktop', era: 'old', spec: { case: 'case-boxwell-mini', motherboard: 'mb-tessera-t450m', cpu: 'cpu-arc-k5-8400', cooler: 'cool-breeze-65', ram: ['ram-mw-8-2666', 'ram-mw-8-2666'], storage: ['sto-pebble-240', 'sto-strata-500'], psu: 'psu-volt-450', fans: ['fan-zp-breeze120'] }, os: 'os-lumen-home' },
  { id: 'old-gamer', label: 'older gaming PC', era: 'old', spec: { case: 'case-boxwell-towerm', motherboard: 'mb-tessera-z900', cpu: 'cpu-arc-k7-9700', cooler: 'cool-fl-classic92', ram: ['ram-qs-8-3200', 'ram-qs-8-3200'], storage: ['sto-pebble-240', 'sto-strata-2t'], psu: 'psu-volt-550', gpu: 'gpu-nr-1660', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'] }, os: 'os-lumen-home' },
  { id: 'budget-gamer', label: 'budget gaming PC', era: 'mid', spec: { case: 'case-boxwell-towerm', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-3600', cooler: 'cool-breeze-65', ram: ['ram-qs-8-3200', 'ram-qs-8-3200'], storage: ['sto-dv-swift-500'], psu: 'psu-volt-550', gpu: 'gpu-cf-6600', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'] }, os: 'os-lumen-home' },
  { id: 'apu-box', label: 'compact home PC', era: 'mid', spec: { case: 'case-boxwell-mini', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-5600g', cooler: 'cool-breeze-65', ram: ['ram-mw-8-2666', 'ram-mw-8-2666'], storage: ['sto-pebble-1t'], psu: 'psu-volt-450', fans: ['fan-zp-breeze120'] }, os: 'os-lumen-home' },
  { id: 'mid-gamer', label: 'mid-range gaming PC', era: 'mid', spec: { case: 'case-nw-airflow', motherboard: 'mb-ostrava-b66', cpu: 'cpu-arc-k5-1260', cooler: 'cool-fl-tower120', ram: ['ram-qs-16-3600', 'ram-qs-16-3600'], storage: ['sto-dv-swift-1t'], psu: 'psu-amp-650', gpu: 'gpu-nr-3060', fans: ['fan-zp-breeze120', 'fan-zp-breeze120', 'fan-zp-breeze120'] }, os: 'os-lumen-home' },
  { id: 'work-tower', label: 'office workstation', era: 'mid', spec: { case: 'case-hush-studio', motherboard: 'mb-pinewood-b55', cpu: 'cpu-vx-h7-5800x', cooler: 'cool-fl-tower120', ram: ['ram-qs-16-3600', 'ram-qs-16-3600'], storage: ['sto-dv-swift-1t', 'sto-strata-2t'], psu: 'psu-amp-650', gpu: 'gpu-nr-1660', fans: ['fan-zp-quiet120', 'fan-zp-quiet120'] }, os: 'os-lumen-pro' },
  { id: 'enthusiast', label: 'enthusiast gaming rig', era: 'new', spec: { case: 'case-nw-airflow', motherboard: 'mb-pinewood-b65', cpu: 'cpu-vx-h7-7800x', cooler: 'cool-gl-hydro240', ram: ['ram-qs-16-6000', 'ram-qs-16-6000'], storage: ['sto-dv-hyper-2t'], psu: 'psu-amp-750', gpu: 'gpu-nr-4070', fans: ['fan-zp-storm120', 'fan-zp-storm120', 'fan-zp-storm120'] }, os: 'os-lumen-home', bios: { xmp: true } },
  { id: 'creator', label: 'creator workstation', era: 'new', spec: { case: 'case-monolith', motherboard: 'mb-ostrava-z79', cpu: 'cpu-arc-k9-1390', cooler: 'cool-gl-hydro360', ram: ['ram-qs-32-6400', 'ram-qs-32-6400'], storage: ['sto-dv-hyper-2t', 'sto-strata-2t'], psu: 'psu-amp-1000', gpu: 'gpu-cf-7900', fans: ['fan-zp-silent140', 'fan-zp-silent140', 'fan-zp-silent140', 'fan-zp-silent140'] }, os: 'os-lumen-pro', bios: { xmp: true } },
];

// faults a customer machine can come in with. `needs` = machine features the fault requires.
export const FAULT_DEFS = {
  psu_dead: { tier: 1, symptom: ['It won\'t turn on at all. No lights, no fans, nothing.', 'Yesterday there was a pop and a smell, and now it\'s completely dead.'], label: 'Dead power supply' },
  psu_unstable: { tier: 1, needs: ['gpu'], symptom: ['It switches itself off when I play games. Browsing is fine.', 'Random shutdowns, always when it\'s working hard.'], label: 'Failing power supply' },
  ram_errors: { tier: 1, symptom: ['It crashes to a blue error screen at random, sometimes twice an hour.', 'Programs keep crashing and files I save come back corrupted.'], label: 'Faulty memory stick' },
  disk_failing: { tier: 1, symptom: ['It has become unbearably slow and there\'s a clicking sound from inside.', 'Takes ten minutes to start and files sometimes won\'t open.'], label: 'Failing drive' },
  gpu_artifacts: { tier: 1, needs: ['gpu'], symptom: ['In games I get flickering coloured blocks, then the game crashes.', 'Weird pixel garbage on the screen and then it freezes.'], label: 'Failing graphics card' },
  gpu_dead: { tier: 2, needs: ['gpu'], symptom: ['The fans turn on but the screen stays black. Monitor works on my laptop.'], label: 'Dead graphics card' },
  bios_boot: { tier: 1, symptom: ['My nephew "tweaked" it and now it says "Reboot and select proper boot device".', 'After a power cut it only shows a black screen about a boot device.'], label: 'Wrong boot device in BIOS' },
  bios_fan: { tier: 1, symptom: ['It runs silently now — then it gets really hot and shuts off after a few minutes.', 'Some "silent mode" tool was installed. Now it overheats.'], label: 'Fans switched off in firmware' },
  bios_volt: { tier: 2, symptom: ['A friend tried to "overclock" it. Now it crashes and runs hot.'], label: 'Bad overclock (CPU voltage)' },
  malware: { tier: 1, symptom: ['Pop-ups everywhere, the browser home page changed itself and it\'s slow.', 'My antivirus got switched off by itself and the fan is always loud.'], label: 'Malware infection' },
  os_corrupt: { tier: 1, symptom: ['It restarts with an error screen every time it starts up. My files are on there!', 'After an update it won\'t start any more, it just loops.'], label: 'Corrupted OS' },
  cable_loose: { tier: 1, symptom: ['Sometimes it shuts off or won\'t start at all. I moved house last week.', 'It worked before I carried it to my new desk. Now it cuts out randomly.'], label: 'Loose power cable' },
  fan_unplugged: { tier: 1, symptom: ['It says "CPU fan error" when it starts, and gets hot.', 'After I cleaned it myself it shows a fan error.'], label: 'CPU fan unplugged' },
  dust: { tier: 1, symptom: ['It has got louder and louder and now it slows down when busy.', 'It sounds like a hair dryer and the top is hot to touch.'], label: 'Dust buildup' },
  paste_dried: { tier: 1, symptom: ['Over the years it got hotter and slower. It\'s never been opened.'], label: 'Dried thermal paste' },
  cooler_dead: { tier: 1, symptom: ['There was a grinding noise for a week, then it went quiet. Now it overheats.'], label: 'Dead CPU cooler fan' },
  mb_dead: { tier: 3, symptom: ['Fans spin, nothing else. Another shop replaced the power supply and it didn\'t help.'], label: 'Dead motherboard' },
};

// personal files customers care about
export const FILE_SETS = [
  ['Family photos', 60], ['Wedding video', 45], ['Novel drafts', 2], ['Tax records', 4], ['Thesis', 3], ['Music projects', 80],
  ['Client invoices', 6], ['Recipe collection', 1], ['Game saves', 5], ['Holiday videos', 70], ['Patient letters', 8], ['Design portfolio', 30],
];
