export function pickTwoDistinct(array) {
  if (array.length < 2) throw new Error("Necesito al menos 2 elementos para armar una ronda");

  const first = array[Math.floor(Math.random() * array.length)];
  let second = first;
  while (second === first) {
    second = array[Math.floor(Math.random() * array.length)];
  }
  return [first, second];
}
