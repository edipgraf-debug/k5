import 'server-only';

export interface SmsSonuc { ok: boolean; mesajId?: string; hata?: string }
export interface SmsSaglayici { gonder(telefon: string, metin: string): Promise<SmsSonuc> }

/** Geliştirme: SMS'i sunucu günlüğüne yazar. */
class KonsolSms implements SmsSaglayici {
  async gonder(telefon: string, metin: string): Promise<SmsSonuc> {
    console.log(`[SMS] +90${telefon}: ${metin}`);
    return { ok: true, mesajId: `konsol-${Date.now()}` };
  }
}

/**
 * Genel HTTP SMS sağlayıcısı. SMS firması seçildiğinde istek gövdesi ve yanıt
 * kontrolü o firmanın API dokümanına göre bu sınıfta uyarlanır.
 */
class HttpSms implements SmsSaglayici {
  async gonder(telefon: string, metin: string): Promise<SmsSonuc> {
    const url = process.env.SMS_API_URL;
    if (!url) return { ok: false, hata: 'SMS_API_URL tanımlı değil' };
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kullanici: process.env.SMS_API_USER,
          sifre: process.env.SMS_API_PASSWORD,
          baslik: process.env.SMS_SENDER,
          numara: `90${telefon}`,
          mesaj: metin,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const govde = await r.text();
      return r.ok ? { ok: true, mesajId: govde.slice(0, 100) } : { ok: false, hata: `HTTP ${r.status}: ${govde.slice(0, 200)}` };
    } catch (e) {
      return { ok: false, hata: (e as Error).message };
    }
  }
}

let saglayici: SmsSaglayici | null = null;
export function sms(): SmsSaglayici {
  if (!saglayici) saglayici = process.env.SMS_PROVIDER === 'http' ? new HttpSms() : new KonsolSms();
  return saglayici;
}
