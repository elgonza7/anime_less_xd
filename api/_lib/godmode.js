// "modo dios": mientras se prueba la app en produccion, la cuenta del dueño
// del proyecto puede desactivar el limite de "un intento por dia" para si
// misma. Con el toggle apagado, tiene exactamente las mismas reglas que
// cualquier otro usuario. Solo esta cuenta puede leer/tocar esto -- se
// valida por email del token verificado, no por nada que mande el cliente.
export const GOD_MODE_EMAIL = "gokinflores@gmail.com";

export async function isGodModeActive(db, decodedToken) {
  if (!decodedToken || decodedToken.email !== GOD_MODE_EMAIL) return false;
  const snap = await db.collection("settings").doc("godMode").get();
  return snap.exists && snap.data().enabled === true;
}
