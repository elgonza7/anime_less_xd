// Guarda el resultado de la corrida de HOY en localStorage. Esto existe por
// un problema puntual: si terminas el juego sin cuenta y el login falla (o
// recargas la pagina por lo que sea) mientras todavia no guardaste el
// puntaje, el server ya te marco como "jugaste hoy" (por IP), pero tu
// puntaje nunca llego a Firestore -- sin esto, quedarias bloqueado el resto
// del dia sin ninguna forma de guardarlo. Con esto, mientras `saved` siga en
// false, la app te vuelve a mostrar la pantalla de resultados (con el boton
// de login) en vez de la de "ya jugaste hoy", para que puedas reintentar.
import { getTodayUTC } from "./dailySeed";

const KEY = "animeless:lastResult";

export function saveLastResult(score, totalTimeMs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: getTodayUTC(), score, totalTimeMs, saved: false }));
  } catch {
    // localStorage puede fallar (modo privado, storage lleno, etc). no es critico.
  }
}

export function markLastResultSaved() {
  try {
    const pending = getPendingResultForToday();
    if (!pending) return;
    localStorage.setItem(KEY, JSON.stringify({ ...pending, saved: true }));
  } catch {
    // ver comentario de arriba
  }
}

// null si no hay nada, o si lo que hay es de un dia anterior.
export function getPendingResultForToday() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== getTodayUTC()) return null;
    return data;
  } catch {
    return null;
  }
}
