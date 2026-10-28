// Справочник карты: группы и типы точек (как в базе neonbay.gg), регионы Леониды, ориентиры.
window.MAP = {
  groups: [
    { id: 'collectibles', name: 'Collectibles', track: true, subs: [
      ['fragment', 'Hidden Fragments', 50, 'One of 50 hidden fragments scattered across Leonida.'],
      ['letter', 'Letter Scraps', 50, 'A torn page of a bigger story. 50 to find.'],
      ['case', 'Buried Cases', 30, 'Dig spot for a buried case — bring a shovel.'],
      ['barrel', 'Toxic Barrels', 30, 'Dumped close to the water. 30 across the state.'],
      ['plant', 'Rare Plants', 27, 'A rare species for the collection. 27 to catalogue.'],
    ] },
    { id: 'activities', name: 'Activities', track: true, subs: [
      ['jump', 'Stunt Jumps', 50, 'Hit the ramp at speed and land it clean.'],
      ['bridge', 'Under the Bridge', 50, 'Fly under this bridge to tick it off.'],
      ['flight', 'Low Flights', 15, 'Low-flight challenge — stay under the limit.'],
    ] },
    { id: 'world', name: 'World & Services', subs: [
      ['weapon', 'Weapon Shops', 0, 'Guns, ammo, body armor and attachments.'],
      ['clothes', 'Clothing Stores', 0, 'Outfits, shoes and accessories.'],
      ['tuning', 'Tuning Garages', 0, 'Respray, performance upgrades and body kits.'],
      ['gas', 'Gas Stations', 0, 'Fuel and snacks. Also a classic stick-up spot.'],
      ['safehouse', 'Safehouses', 0, 'Save, change outfits and store your vehicles.'],
      ['property', 'Properties for Sale', 0, 'Buy it to unlock a new safehouse or business.'],
    ] },
    { id: 'vehicles', name: 'Vehicles', subs: [
      ['car', 'Rare Vehicle Spawns', 0, 'Rare spawn — shows up only at certain times of day.'],
      ['boat', 'Boats & Docks', 0, 'Boats moored and ready to take.'],
      ['plane', 'Aircraft Locations', 0, 'Planes and helicopters you can take off in.'],
    ] },
    { id: 'secrets', name: 'Secrets', track: true, subs: [
      ['egg', 'Easter Eggs', 12, 'Something strange happens out here. Look up.'],
      ['mission', 'Side Missions', 20, 'Side mission start point.'],
      ['stranger', 'Strangers', 15, 'A stranger with a favor to ask.'],
    ] },
    { id: 'florida', name: 'Florida', subs: [
      ['fish', 'Fishing Spots', 0, 'A good spot to cast a line.'],
      ['dive', 'Dive Sites', 0, 'Reef or wreck worth a dive.'],
      ['wildlife', 'Wildlife Areas', 0, 'Gators, flamingos and more — keep your distance.'],
      ['island', 'Keys & Islands', 0, 'One of the Leonida Keys.'],
    ] },
    { id: 'online', name: 'Online', subs: [
      ['weekly', 'Weekly Collectibles', 0, 'Rotates every Thursday in Online.'],
      ['business', 'Business Locations', 0, 'Business you can buy in Online.'],
      ['heist', 'Heist Setups', 0, 'Heist prep location.'],
    ] },
  ],
  // b — рамка для перелёта [x0, y0, x1, y1] в % карты; lx/ly — где подпись
  regions: [
    { id: 'vice', name: 'Vice City', lx: 79, ly: 46.5, b: [60, 36, 97, 70], g: ['#ffb48a', '#ff6fa5'], d: 'Neon, beaches and the busiest streets in Leonida.' },
    { id: 'keys', name: 'Leonida Keys', lx: 44.5, ly: 85, b: [10, 78, 72, 96], g: ['#7fd8ee', '#b18cff'], d: 'Island chain, long bridges and the clearest water.' },
    { id: 'grass', name: 'Grassrivers', lx: 48, ly: 72, b: [30, 62, 66, 84], g: ['#74dcb4', '#7fd8ee'], d: 'Wetlands, airboats and gators.' },
    { id: 'gellhorn', name: 'Port Gellhorn', lx: 24, ly: 28.5, b: [5, 22, 40, 50], g: ['#ffc27a', '#ff8db8'], d: 'A faded port town on the gulf coast.' },
    { id: 'ambrosia', name: 'Ambrosia', lx: 57, ly: 37, b: [44, 24, 76, 46], g: ['#ffb48a', '#ffc27a'], d: 'Sugar mills and small-town industry.' },
    { id: 'kalaga', name: 'Mount Kalaga', lx: 48, ly: 18, b: [24, 8, 66, 34], g: ['#74dcb4', '#b18cff'], d: 'Forests, trails and the national park.' },
  ],
  // ориентиры: подписи появляются при приближении
  landmarks: [
    ['Downtown', 72, 50.5], ['Vice Beach', 92, 52], ['International Airport', 55, 58.5], ['Port of Vice City', 70, 64.5],
    ['Watson Bay', 36, 69.5], ['Keys Bridge', 53, 90.5], ['Keys Airfield', 22, 91], ['Lake', 61, 25.5], ['North Airport', 70, 16.5],
  ],
  you: [73, 52.5], // где стоит игрок — от него строится маршрут к метке
  kmPerMap: 24,      // ширина карты в км — для расстояний
  aspect: 4784 / 3336, // высота / ширина картинки карты (YANIS v17, z3)
};
