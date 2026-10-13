import 'server-only';
import { ticaretRepo } from '../data/ticaret';
import { coz } from '../sifreleme';
import { demoModu } from '../ortam';

export type SmsSaglayiciKodu = 'console' | 'netgsm' | 'iletimerkezi' | 'http';
export interface SmsAyari { saglayici: SmsSaglayiciKodu; baslik: string; kullanici: string; sifre: string; apiUrl: string; kaynak: 'panel' | 'ortam' }
export interface EpostaAyari { saglayici: 'console' | 'smtp'; sunucu: string; port: number; guvenli: boolean; kullanici: string; sifre: string; gonderen: string; kaynak: 'panel' | 'ortam' }

let onbellek: { zaman: number; sms: SmsAyari; eposta: EpostaAyari } | null = null;

/** Panelde kaydedilen ayarı ortam değişkenlerinin önüne koyar. Test sitesinde (demo) gönderim her zaman konsoldadır. */
export async function bildirimAyarlari(): Promise<{ sms: SmsAyari; eposta: EpostaAyari }> {
  if (onbellek && Date.now() - onbellek.zaman < 30_000) return onbellek;
  let a: Record<string, string> = {};
  try { a = await (await ticaretRepo()).ayarlar(); } catch { /* ortam değişkenleri */ }
  const panelSms = !!a['sms.saglayici'] && a['sms.saglayici'] !== 'console';
  const sms: SmsAyari = panelSms
    ? { saglayici: a['sms.saglayici'] as SmsSaglayiciKodu, baslik: a['sms.baslik'] ?? '', kullanici: a['sms.kullanici'] ?? '', sifre: coz(a['sms.sifre']) ?? '', apiUrl: a['sms.apiUrl'] ?? '', kaynak: 'panel' }
    : { saglayici: process.env.SMS_PROVIDER === 'http' ? 'http' : 'console', baslik: process.env.SMS_SENDER ?? '', kullanici: process.env.SMS_API_USER ?? '',
        sifre: process.env.SMS_API_PASSWORD ?? '', apiUrl: process.env.SMS_API_URL ?? '', kaynak: 'ortam' };
  const panelEposta = a['eposta.saglayici'] === 'smtp';
  const eposta: EpostaAyari = panelEposta
    ? { saglayici: 'smtp', sunucu: a['eposta.smtpSunucu'] ?? '', port: Number(a['eposta.smtpPort'] || 587), guvenli: a['eposta.guvenli'] === '1',
        kullanici: a['eposta.kullanici'] ?? '', sifre: coz(a['eposta.sifre']) ?? '', gonderen: a['eposta.gonderen'] ?? '', kaynak: 'panel' }
    : { saglayici: process.env.EMAIL_PROVIDER === 'smtp' ? 'smtp' : 'console', sunucu: process.env.SMTP_HOST ?? '', port: Number(process.env.SMTP_PORT ?? 587),
        guvenli: Number(process.env.SMTP_PORT) === 465, kullanici: process.env.SMTP_USER ?? '', sifre: process.env.SMTP_PASSWORD ?? '', gonderen: process.env.SMTP_FROM ?? '', kaynak: 'ortam' };
  if (demoModu()) { sms.saglayici = 'console'; eposta.saglayici = 'console'; }
  onbellek = { zaman: Date.now(), sms, eposta };
  return onbellek;
}

/** Ayarlar kaydedilince hemen geçerli olsun */
export function bildirimAyarlariniYenile() { onbellek = null; }
