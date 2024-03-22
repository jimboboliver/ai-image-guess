export function uniqueObjArray<T extends Record<string, unknown>>(
  arr: T[],
  newElement: T,
) {
  const arrCopy = arr.slice();
  const index = arrCopy.findIndex((x) => x.id === newElement.id);
  if (index === -1) {
    arrCopy.push(newElement);
  } else {
    arrCopy[index] = newElement;
  }
  return arrCopy;
}
