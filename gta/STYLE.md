# Harbor City visual style guide

One look for the whole city: **stylised low-poly, strong silhouettes, slightly worn.** Clean boxes and prisms, never photographic
detail. The numbers live in `js/models/style.js`; every generator should take its colours and proportions from there.

## Scale (metres)
| thing | value |
| --- | --- |
| storey height | 3.2 |
| downtown ground floor (shops) | 4.2 |
| parapet / cornice | .7 / .4 |
| car length ~4.5, lane 2.8 wide, road 14, pavement 3 + block 40 | |
| kerb | .15 high, gap at the corners for crossings |
| street lamp 6.4, signal head 4.5, bus shelter 2.6 | |

## Materials
* **Facades** come from `facades.js` kinds (`glass`, `concrete`, `brick`, `plaster`, `house`, `metal`, `shop`) tinted from the palette families in `STYLE.building`. A building is a few boxes with a facade texture, ledges and a roof, never one texture on one box.
* **Downtown** = a storefront ground floor (windows, awnings, columns, a name sign) under one or two upper buildings of different character: glass tower with setbacks and a crown, concrete slab, older stone/brick building with cornices and a water tank, or mixed-use with balconies. Every roof gets a parapet and some plant (HVAC, tank, shed, mast, solar).
* **Residential**: gable, modern flat-roof, duplex and two-storey houses with porches, balconies, fences and trees. Apartment blocks have balconies, fire escapes, ledges and rooftop equipment.
* **Industrial / port**: metal sheds with roll-up doors, loading ramps and ridge vents, container stacks arranged by shipping line, gantry cranes, floodlights, gatehouses.

## Roads
Asphalt `#34353a` with tyre-track wear, patches and soft blotches; double yellow centre, white edge lines, dashed lanes, turn arrows, stop lines, crosswalks, manholes and storm drains are painted on the ground texture (6 px/m) and a procedural grain shader keeps them crisp up close. Kerbs, bus shelters, street-name blades, signs and cones are geometry. Keep roads readable: props sit on the pavement, only roadworks (cones, jersey barriers) stand in a lane.

## Vegetation
Four tree silhouettes (round, columnar, broad, autumn) plus pines, palms, shrubs and planters. Small street trees can be knocked over; parks and big trees are static. Groves and hedgerows fill the land between the city and the coast.

## Light
Day: warm directional sun (1.5–1.65) with a cool, low hemisphere (.6) for contrast; fog starts at 80 m and ends at 380 m in the haze colour, so distance fades instead of cutting. Night: cool moon, lifted ambient so roads, people and cars stay readable; lamp pools, lit windows, headlights. The sky is drawn at the far plane; a hill ring and a distant skyline (with lit windows at night) sit behind everything, tinted by the haze.

## Performance rules
Merge by material (one draw call per material per block), instance repeated props in spatial chunks (sparse kinds use bigger chunks), reuse geometry and materials, no per-window meshes, no real-time lights except sun and two headlights.
