/* Units, with the full name spelled out next to every symbol.
   `factor` converts to the category's base unit. Temperature is handled separately
   because it needs an offset, not just a multiplier. */
window.RT = window.RT || {};
RT.units = {
  length: {
    label: 'Length', base: 'm',
    units: [
      ['nm', 'nanometre', 1e-9], ['um', 'micrometre (micron)', 1e-6], ['mm', 'millimetre', 1e-3],
      ['cm', 'centimetre', 0.01], ['m', 'metre', 1], ['km', 'kilometre', 1000],
      ['in', 'inch', 0.0254], ['ft', 'foot', 0.3048], ['yd', 'yard', 0.9144],
      ['mi', 'mile', 1609.344], ['nmi', 'nautical mile', 1852],
      ['furlong', 'furlong', 201.168], ['fathom', 'fathom', 1.8288],
      ['au', 'astronomical unit', 1.495978707e11], ['ly', 'light-year', 9.4607304725808e15],
      ['pc', 'parsec', 3.0856775814913673e16]
    ]
  },
  mass: {
    label: 'Mass', base: 'kg',
    units: [
      ['ug', 'microgram', 1e-9], ['mg', 'milligram', 1e-6], ['g', 'gram', 0.001],
      ['kg', 'kilogram', 1], ['t', 'tonne (metric ton)', 1000],
      ['gr', 'grain', 6.479891e-5], ['ct', 'carat', 0.0002],
      ['oz', 'ounce', 0.028349523125], ['lb', 'pound', 0.45359237],
      ['st', 'stone', 6.35029318], ['cwt', 'hundredweight (UK)', 50.80234544],
      ['ton_us', 'short ton (US)', 907.18474], ['ton_uk', 'long ton (UK)', 1016.0469088]
    ]
  },
  temperature: {
    label: 'Temperature', base: 'C', special: 'temperature',
    units: [
      ['C', 'degrees Celsius', 1], ['F', 'degrees Fahrenheit', 1],
      ['K', 'kelvin', 1], ['R', 'degrees Rankine', 1]
    ]
  },
  volume: {
    label: 'Volume', base: 'l',
    units: [
      ['ml', 'millilitre', 0.001], ['cl', 'centilitre', 0.01], ['dl', 'decilitre', 0.1],
      ['l', 'litre', 1], ['m3', 'cubic metre', 1000], ['cm3', 'cubic centimetre', 0.001],
      ['tsp_us', 'teaspoon (US)', 0.00492892159375], ['tbsp_us', 'tablespoon (US)', 0.01478676478125],
      ['floz_us', 'fluid ounce (US)', 0.0295735295625], ['cup_us', 'cup (US)', 0.2365882365],
      ['pt_us', 'pint (US)', 0.473176473], ['qt_us', 'quart (US)', 0.946352946],
      ['gal_us', 'gallon (US)', 3.785411784],
      ['floz_uk', 'fluid ounce (imperial)', 0.0284130625], ['pt_uk', 'pint (imperial)', 0.56826125],
      ['qt_uk', 'quart (imperial)', 1.1365225], ['gal_uk', 'gallon (imperial)', 4.54609],
      ['in3', 'cubic inch', 0.016387064], ['ft3', 'cubic foot', 28.316846592],
      ['bbl', 'barrel (oil)', 158.987294928]
    ]
  },
  area: {
    label: 'Area', base: 'm2',
    units: [
      ['mm2', 'square millimetre', 1e-6], ['cm2', 'square centimetre', 1e-4],
      ['m2', 'square metre', 1], ['ha', 'hectare', 10000], ['km2', 'square kilometre', 1e6],
      ['in2', 'square inch', 0.00064516], ['ft2', 'square foot', 0.09290304],
      ['yd2', 'square yard', 0.83612736], ['ac', 'acre', 4046.8564224],
      ['mi2', 'square mile', 2589988.110336]
    ]
  },
  speed: {
    label: 'Speed', base: 'mps',
    units: [
      ['mps', 'metres per second', 1], ['kph', 'kilometres per hour', 0.2777777777777778],
      ['mph', 'miles per hour', 0.44704], ['fps', 'feet per second', 0.3048],
      ['kn', 'knots (nautical miles per hour)', 0.5144444444444445],
      ['mach', 'Mach (at sea level, 15 °C)', 340.29], ['c', 'speed of light', 299792458]
    ]
  },
  data: {
    label: 'Digital storage', base: 'B',
    units: [
      ['bit', 'bit', 0.125], ['B', 'byte', 1],
      ['kB', 'kilobyte (1000 bytes)', 1e3], ['MB', 'megabyte (1000 kB)', 1e6],
      ['GB', 'gigabyte (1000 MB)', 1e9], ['TB', 'terabyte (1000 GB)', 1e12],
      ['PB', 'petabyte (1000 TB)', 1e15],
      ['KiB', 'kibibyte (1024 bytes)', 1024], ['MiB', 'mebibyte (1024 KiB)', 1048576],
      ['GiB', 'gibibyte (1024 MiB)', 1073741824], ['TiB', 'tebibyte (1024 GiB)', 1099511627776],
      ['PiB', 'pebibyte (1024 TiB)', 1125899906842624]
    ]
  },
  time: {
    label: 'Time', base: 's',
    units: [
      ['ns', 'nanosecond', 1e-9], ['us', 'microsecond', 1e-6], ['ms', 'millisecond', 0.001],
      ['s', 'second', 1], ['min', 'minute', 60], ['h', 'hour', 3600], ['d', 'day', 86400],
      ['wk', 'week', 604800], ['mo', 'month (30 days)', 2592000],
      ['yr', 'year (365.25 days)', 31557600], ['decade', 'decade', 315576000]
    ]
  },
  pressure: {
    label: 'Pressure', base: 'Pa',
    units: [
      ['Pa', 'pascal', 1], ['hPa', 'hectopascal (millibar)', 100], ['kPa', 'kilopascal', 1000],
      ['bar', 'bar', 100000], ['atm', 'standard atmosphere', 101325],
      ['psi', 'pounds per square inch', 6894.757293168361],
      ['mmHg', 'millimetres of mercury (torr)', 133.322387415],
      ['inHg', 'inches of mercury', 3386.388640341]
    ]
  },
  energy: {
    label: 'Energy', base: 'J',
    units: [
      ['J', 'joule', 1], ['kJ', 'kilojoule', 1000], ['cal', 'calorie (small)', 4.184],
      ['kcal', 'kilocalorie (food calorie)', 4184], ['Wh', 'watt-hour', 3600],
      ['kWh', 'kilowatt-hour', 3.6e6], ['BTU', 'British thermal unit', 1055.05585262],
      ['eV', 'electronvolt', 1.602176634e-19], ['ftlb', 'foot-pound', 1.3558179483314004]
    ]
  },
  power: {
    label: 'Power', base: 'W',
    units: [
      ['mW', 'milliwatt', 0.001], ['W', 'watt', 1], ['kW', 'kilowatt', 1000],
      ['MW', 'megawatt', 1e6], ['hp', 'horsepower (mechanical)', 745.6998715822702],
      ['ps', 'metric horsepower (PS)', 735.49875], ['BTUh', 'BTU per hour', 0.29307107017]
    ]
  },
  angle: {
    label: 'Angle', base: 'deg',
    units: [
      ['deg', 'degree', 1], ['rad', 'radian', 57.29577951308232],
      ['grad', 'gradian (gon)', 0.9], ['turn', 'full turn', 360],
      ['arcmin', 'arcminute', 1 / 60], ['arcsec', 'arcsecond', 1 / 3600],
      ['mrad', 'milliradian', 0.05729577951308232]
    ]
  }
};

/* How each unit is written out. Anything not listed here uses its id as-is. */
RT.unitSymbols = {
  um: 'µm', ug: 'µg', us: 'µs',
  m2: 'm²', cm2: 'cm²', mm2: 'mm²', km2: 'km²', in2: 'in²', ft2: 'ft²', yd2: 'yd²', mi2: 'mi²',
  m3: 'm³', cm3: 'cm³', in3: 'in³', ft3: 'ft³',
  C: '°C', F: '°F', R: '°R', deg: '°',
  mps: 'm/s', kph: 'km/h', fps: 'ft/s', BTUh: 'BTU/h', ftlb: 'ft·lb',
  tsp_us: 'tsp', tbsp_us: 'tbsp', floz_us: 'fl oz', cup_us: 'cup', pt_us: 'pt', qt_us: 'qt', gal_us: 'gal',
  floz_uk: 'fl oz', pt_uk: 'pt', qt_uk: 'qt', gal_uk: 'gal',
  ton_us: 'ton', ton_uk: 'ton', furlong: 'fur', fathom: 'ftm'
};

/* expand the compact arrays into objects */
Object.keys(RT.units).forEach(function (key) {
  var cat = RT.units[key];
  cat.id = key;
  cat.units = cat.units.map(function (u) {
    return { id: u[0], symbol: RT.unitSymbols[u[0]] || u[0], name: u[1], factor: u[2] };
  });
});
