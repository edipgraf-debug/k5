/** "TR33 0006 1005 ..." → "TR330006100519786457841326"; TR IBAN 26 karakter ve mod-97 kontrolü */
export const ibanTemizle = (s: string) => s.replace(/\s+/g, '').toUpperCase();

export function ibanGecerli(iban: string): boolean {
  const i = ibanTemizle(iban);
  if (!/^TR\d{24}$/.test(i)) return false;
  const yeniden = (i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let kalan = 0;
  for (const c of yeniden) kalan = (kalan * 10 + Number(c)) % 97;
  return kalan === 1;
}

export const ibanBicimle = (i: string) => ibanTemizle(i).replace(/(.{4})/g, '$1 ').trim();
