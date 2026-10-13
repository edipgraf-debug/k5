import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { bildirimAyarlari } from './ayar';

export interface EpostaSonuc { ok: boolean; mesajId?: string; hata?: string }

let tasiyici: { imza: string; t: Transporter } | null = null;

/** Panelde seçilen SMTP (yoksa ortam değişkenleri); test sitesinde konsola yazar. */
export async function epostaGonder(alici: string, konu: string, html: string, metin: string): Promise<EpostaSonuc> {
  const { eposta: a } = await bildirimAyarlari();
  if (a.saglayici !== 'smtp') {
    console.log(`[E-POSTA] ${alici} · ${konu}\n${metin}`);
    return { ok: true, mesajId: `konsol-${Date.now()}` };
  }
  if (!a.sunucu || !a.gonderen) return { ok: false, hata: 'SMTP sunucusu ya da gönderen adresi tanımlı değil' };
  try {
    const imza = JSON.stringify([a.sunucu, a.port, a.guvenli, a.kullanici, a.sifre]);
    if (!tasiyici || tasiyici.imza !== imza) {
      tasiyici = { imza, t: nodemailer.createTransport({ host: a.sunucu, port: a.port, secure: a.guvenli,
        auth: a.kullanici ? { user: a.kullanici, pass: a.sifre } : undefined }) };
    }
    const r = await tasiyici.t.sendMail({ from: a.gonderen, to: alici, subject: konu, html, text: metin });
    return { ok: true, mesajId: r.messageId };
  } catch (e) {
    return { ok: false, hata: (e as Error).message };
  }
}
