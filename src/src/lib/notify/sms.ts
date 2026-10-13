import 'server-only';
import { bildirimAyarlari, type SmsAyari } from './ayar';

export interface SmsSonuc { ok: boolean; mesajId?: string; hata?: string }
export interface SmsSaglayici { gonder(telefon: string, metin: string): Promise<SmsSonuc> }

const zamanAsimi = () => AbortSignal.timeout(15_000);

/** Geliştirme / test sitesi: SMS'i sunucu günlüğüne yazar. */
async function konsol(telefon: string, metin: string): Promise<SmsSonuc> {
  console.log(`[SMS] +90${telefon}: ${metin}`);
  return { ok: true, mesajId: `konsol-${Date.now()}` };
}

/** NetGSM (GET /sms/send/get). Yanıt "00 <görevNo>" ise başarılı. Canlıya almadan önce firmanın güncel dokümanıyla doğrulayın. */
async function netgsm(a: SmsAyari, telefon: string, metin: string): Promise<SmsSonuc> {
  const p = new URLSearchParams({ usercode: a.kullanici, password: a.sifre, gsmno: `90${telefon}`, message: metin, msgheader: a.baslik, dil: 'TR' });
  const r = await fetch(`https://api.netgsm.com.tr/sms/send/get?${p}`, { signal: zamanAsimi() });
  const govde = (await r.text()).trim();
  return /^0[0-2]\s/.test(govde) ? { ok: true, mesajId: govde.split(/\s+/)[1] } : { ok: false, hata: `NetGSM: ${govde.slice(0, 120)}` };
}

/** İleti Merkezi (JSON v1). Kullanıcı = API anahtarı, şifre = hash. Canlıya almadan önce firmanın güncel dokümanıyla doğrulayın. */
async function iletimerkezi(a: SmsAyari, telefon: string, metin: string): Promise<SmsSonuc> {
  const r = await fetch('https://api.iletimerkezi.com/v1/send-sms/json', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: zamanAsimi(),
    body: JSON.stringify({ request: { authentication: { key: a.kullanici, hash: a.sifre },
      order: { sender: a.baslik, message: { text: metin, receipents: { number: [`0${telefon}`] } } } } }),
  });
  const v = await r.json().catch(() => null) as { response?: { status?: { code?: string; message?: string }; order?: { id?: string } } } | null;
  return v?.response?.status?.code === '200' ? { ok: true, mesajId: v.response.order?.id } : { ok: false, hata: `İleti Merkezi: ${v?.response?.status?.message ?? `HTTP ${r.status}`}` };
}

/** Genel HTTP sağlayıcısı: firma seçildiğinde gövde ve yanıt kontrolü o firmanın API'sine göre uyarlanır. */
async function http(a: SmsAyari, telefon: string, metin: string): Promise<SmsSonuc> {
  if (!a.apiUrl) return { ok: false, hata: 'SMS API adresi tanımlı değil' };
  const r = await fetch(a.apiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: zamanAsimi(),
    body: JSON.stringify({ kullanici: a.kullanici, sifre: a.sifre, baslik: a.baslik, numara: `90${telefon}`, mesaj: metin }),
  });
  const govde = await r.text();
  return r.ok ? { ok: true, mesajId: govde.slice(0, 100) } : { ok: false, hata: `HTTP ${r.status}: ${govde.slice(0, 200)}` };
}

/** Panelde (Site ayarları › SMS & e-posta operatörü) seçilen sağlayıcı; yoksa ortam değişkenleri. */
export function sms(): SmsSaglayici {
  return {
    async gonder(telefon, metin) {
      const { sms: a } = await bildirimAyarlari();
      try {
        if (a.saglayici === 'netgsm') return await netgsm(a, telefon, metin);
        if (a.saglayici === 'iletimerkezi') return await iletimerkezi(a, telefon, metin);
        if (a.saglayici === 'http') return await http(a, telefon, metin);
        return await konsol(telefon, metin);
      } catch (e) {
        return { ok: false, hata: (e as Error).message };
      }
    },
  };
}
