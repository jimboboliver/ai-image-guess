export function uniqueObjArray<T extends Record<string, unknown>>(
  arr: T[],
  newElement: T,
) {
  const arrCopy = arr.slice();
  const index = arrCopy.findIndex((x) => x.sk === newElement.sk);
  if (index === -1) {
    arrCopy.push(newElement);
  } else {
    arrCopy[index] = newElement;
  }
  return arrCopy;
}
