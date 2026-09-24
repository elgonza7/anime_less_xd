// PRNG deterministico por FECHA + CONTEXTO (no secuencial). Cada pick del
// juego (que anime, que episodio, que opening) se deriva de una key propia
// ("categoria:ronda:lado:intento"), no de "el siguiente numero de una cola".
// Eso es a proposito: si fuera secuencial, jugar una segunda vez el mismo
// dia sin recargar la pagina (por ejemplo tocando el logo para volver al
// inicio) seguiria consumiendo la cola desde donde quedo y te daria otros
// animes distintos. Con una key fija por pick, la ronda 3 de "rating" del
// 23 de septiembre es SIEMPRE el mismo anime, la recargues o la vuelvas a
// jugar 10 veces seguidas sin recargar.
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

// mismo criterio que api/_lib/ip.js: el dia resetea a las 8am hora Argentina
// (UTC-3, sin horario de verano) = 11:00 UTC, no a medianoche UTC.
const RESET_UTC_HOUR = 11;

export function getTodayUTC() {
  const shifted = new Date(Date.now() - RESET_UTC_HOUR * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

// numero en [0, 1) determinado por hoy + los "parts" que le pases. las
// mismas parts el mismo dia = siempre el mismo numero.
export function seededRandom(...parts) {
  const key = `${getTodayUTC()}|${parts.join("|")}`;
  return mulberry32(hashStringToInt(key))();
}

export function seededRandomInt(maxExclusive, ...parts) {
  return Math.floor(seededRandom(...parts) * maxExclusive);
}
