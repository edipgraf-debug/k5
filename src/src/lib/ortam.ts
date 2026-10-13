/**
 * Test (demo) sitesi: örnek verilerle çalışan, herkese açık deneme kurulumu (ör. Render).
 * Yalnız örnek veri + konsol SMS ile açılabilir; gerçek veritabanı ya da gerçek SMS varken kendiliğinden kapalıdır.
 */
export function demoModu(): boolean {
  return process.env.DEMO_MODU === 'true'
    && (process.env.DATA_SOURCE ?? 'mock') === 'mock'
    && process.env.SMS_PROVIDER !== 'http';
}

/** Sitenin dış adresi: SITE_URL, yoksa Render'ın verdiği adres, yoksa yerel adres */
export function siteAdresi(): string {
  return (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, '');
}
