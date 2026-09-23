// PRNG deterministico re-sembrado con la fecha (UTC) de hoy. Reemplaza a
// Math.random() en todos los picks del juego para que recargar la pagina el
// MISMO dia te muestre siempre la misma secuencia de comparaciones, en vez
// de "otro tier" random cada vez. No hace falta una libreria para esto: es
// mulberry32, un generador chiquito y bien conocido, sembrado con un hash
// simple del string de fecha.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

let cachedDate = null;
let rng = null;

// pica un numero en [0, 1), deterministico por dia. si cambio el dia (UTC)
// a mitad de una sesion abierta, se re-siembra sola en la siguiente llamada.
export function dailyRandom() {
  const today = getTodayUTC();
  if (today !== cachedDate) {
    cachedDate = today;
    rng = mulberry32(hashStringToInt(today));
  }
  return rng();
}

export function dailyRandomInt(maxExclusive) {
  return Math.floor(dailyRandom() * maxExclusive);
}
