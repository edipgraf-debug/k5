/** Okula özel giriş adresi: kardelenokul.com/{slug}. Proxy'de de kullanıldığı için server-only değildir. */

export const AYRILMIS = new Set([
  'giris', 'veli', 'ogretmen', 'okul', 'yonetim', 'api', 'yasal', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml',
  'logo.png', 'logo-mark.png', 'kardelen', 'admin', 'static', 'public', 'sepet', 'hesap', 'siparis', 'odeme', 'kitabevi',
  'plasiyer', 'katalog', 'kampanyalar', 'kampanya', 'sayfa', 'destek', 'sifre-degistir', 'iletisim',
]);

const DESEN = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$/;

export function slugGecerli(s: string): boolean {
  return DESEN.test(s) && !s.includes('--') && !AYRILMIS.has(s);
}

const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** "Örnek Ortaokulu" → "ornek-ortaokulu" */
export function slugOner(ad: string): string {
  return ad.toLocaleLowerCase('tr').replace(/[çğıiöşüâîû]/g, (c) => TR[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 80);
}

export const OKUL_CEREZI = 'ko_okul';
