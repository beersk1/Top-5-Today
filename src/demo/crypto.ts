// Demo mode only: browser versions of the two `node:crypto` functions the server uses.

export function randomUUID(): string {
  return crypto.randomUUID();
}

export function randomBytes(size: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return {
    toString: (_encoding: 'hex') => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
}
