function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses a Cookie header ("a=1; b=2") into an object. Avoids needing the cookie-parser package. */
export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.includes('='))
      .map((part) => {
        const index = part.indexOf('=');
        return [part.slice(0, index), safeDecode(part.slice(index + 1))];
      }),
  );
}
