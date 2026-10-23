# Silicon Dreams (`/silicon-dreams/`)

A PC building, repair and computer shop management simulator. Diagnose broken computers, swap
parts by hand, build custom PCs, install operating systems, run benchmarks, invoice customers
and grow a one-bench workshop into a specialist business. Every brand, product, customer and
piece of art is original and fictional; all art is drawn procedurally as SVG.

Plain HTML + CSS + ES modules, no build step, no dependencies, no backend. Progress saves to
`localStorage` after every action.

## Playing

| Screen | What it's for |
| --- | --- |
| **Workshop** (1) | The shop: click the shelves, tool wall, job board, benches or test station. Move machines between benches and the intake rack. |
| **Assembly** (2) | The open case. Drag parts onto highlighted zones, rotate CPUs / memory / fans, apply thermal paste, switch to **Cables** mode, close the case, press power. |
| **Testing** (3) | Power, debug LEDs, BIOS, OS installer, desktop apps (TempEye, Blazemark, StressRack, ClamShield, SysCheck, DiskDoctor), hardware tools, the job checklist. |
| **Jobs** (4) | Offers, active jobs, delivery with an invoice you set, completed and failed jobs. |
| **Store** (5) | New parts with shipping times and express delivery, the second-hand bargain bin, tools and supplies, inventory and selling, orders, side-by-side comparison and a build planner with compatibility checking. |
| **Business** (6) | Money breakdown, per-job profit, upgrades, optional subscriptions, customer tiers, milestones. |

Controls: drag with the mouse (or click a part, then a zone). While dragging, **R**, right-click
or the mouse wheel rotates. Click an installed part to inspect or remove it. **Esc** closes
dialogs and cancels drags. **1–6** switch screens. Hover almost anything for a tooltip.

**The loop:** accept a job → put the machine on a bench → gather evidence (power on, inspect,
test) → fix it with the right parts and actions → run the tests the job requires → deliver and
invoice. Every action takes workshop minutes; the shop closes at 19:00, so end the day to
continue. Rent is due weekly.

## How it works

- **Hardware** — 78 parts in 10 categories (`js/data/parts/`), each with price, resale value,
  performance, power, compatibility fields and failure rate. Add a part by appending an entry.
- **Compatibility** (`js/core/compat.js`) — sockets, memory type and slots, form factors, GPU
  length, cooler height / radiator mounts / socket brackets, cooling capacity, PSU form factor,
  wattage and connectors, drive bays and ports, fan mounts and headers, OS minimums, video output.
- **The machine** (`js/core/pc.js`) — parts sit in zones, cables are plugged in one by one,
  thermal paste has an amount and state, dust builds up, the side panel opens and closes.
  Customer machines are assembled the same way and then given hidden faults.
- **Simulation** (`js/core/sim.js`) — power draw against effective PSU capacity, airflow from
  fan direction and dust, CPU/GPU temperatures with throttling and shutdowns, noise, and CPU /
  GPU Marks from the real parts, memory speed and channels, drivers, malware and heat.
- **Boot** (`js/core/boot.js`) — power → POST → video → boot device → OS, stopping at the first
  failure with LEDs, beep codes and a plain explanation.
- **Diagnosis** (`js/core/diag.js`, `testing.js`, `software.js`) — each tool only reports what
  it could plausibly notice. Faults: dead / unstable PSU, bad memory, failing drive, artifacting
  or dead GPU, wrong boot device, fans off or bad voltage in the BIOS, malware (rootkits need the
  Pro scanner), corrupted OS, loose cables, unplugged CPU fan, dust, dried paste, dead cooler,
  dead motherboard.
- **Tests** are stamped with the machine's fingerprint, so they only count for the exact setup
  they ran on. A job can't be delivered until its required tests pass on the current setup.
- **Jobs** (`js/core/jobs.js`, `js/data/jobs.js`) — repairs, builds (12 briefs from office PCs
  to flagship and silent studio workstations), upgrades that must keep the original case, board
  and CPU, data recovery, malware removal that must keep files, cooling fixes, fleet contracts
  and multi-machine service contracts. Customers have personalities that weigh price, speed and
  quality differently. Faults left behind bring the customer back for a refund.
- **Economy** (`js/core/economy.js`) — every transaction is in the ledger; parts ship in 0–2
  days (express for a fee); used parts can hide faults; shelf space is limited.
- **Progression** (`js/core/business.js`) — workshop level from experience, reputation, five
  customer tiers, upgrades (benches, shelving, intake, supplier accounts, showroom,
  certification, speed-ups), optional subscriptions and 16 milestones.
- **Saving** (`js/core/save.js`) — every field is validated on load, cross-references between
  parts, machines, benches and jobs are repaired, and an unreadable save is set aside as a
  backup. Settings → Export / Import / Reset.

Accessibility: adjustable text size, reduced motion, high contrast, colour-blind friendly status
(shapes as well as colours), tooltips on/off, keyboard access to every control, sound with mute
and volume.

## Tests

`node --test tests/music/silicon-dreams.test.mjs` covers the component database, invalid
combinations, missing parts, hands-on assembly and wiring order, that every build brief can be
met within budget, that every fault is detectable and fixable, invoices, comebacks, cancelled
and failed jobs, multiple jobs, contracts, generated-job fuzzing, money and inventory limits,
progression, the clock, and save/reload.
