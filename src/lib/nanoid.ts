const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function nanoid(size = 12): string {
  let id = '';
  const alphabetLength = alphabet.length;
  const cryptoObj = globalThis.crypto ?? (globalThis as any).msCrypto;
  const randomValues = new Uint8Array(size);
  if (cryptoObj && 'getRandomValues' in cryptoObj) {
    cryptoObj.getRandomValues(randomValues);
    for (let i = 0; i < size; i += 1) {
      id += alphabet[randomValues[i] % alphabetLength];
    }
    return id;
  }
  for (let i = 0; i < size; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabetLength)];
  }
  return id;
}
