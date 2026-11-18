// Shared core · small helpers.
export const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
