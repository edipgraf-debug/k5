import { randomInt } from 'node:crypto';

/** EAN-13 kontrol hanesi (ilk 12 hane için) */
export function ean13KontrolHanesi(on2: string): number {
  const t = [...on2].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0);
  return (10 - (t % 10)) % 10;
}

export const ean13Gecerli = (b: string) => /^\d{13}$/.test(b) && ean13KontrolHanesi(b.slice(0, 12)) === Number(b[12]);

/** Mağaza içi kullanım aralığında (2 ile başlayan) rastgele EAN-13: ürün barkodlarıyla çakışmaz. */
export function icBarkodUret(): string {
  const on2 = `200${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`;
  return on2 + ean13KontrolHanesi(on2);
}
