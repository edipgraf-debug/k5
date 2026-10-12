import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

export interface EpostaSonuc { ok: boolean; mesajId?: string; hata?: string }

let tasiyici: Transporter | null = null;

export async function epostaGonder(alici: string, konu: string, html: string, metin: string): Promise<EpostaSonuc> {
  if (process.env.EMAIL_PROVIDER !== 'smtp') {
    console.log(`[E-POSTA] ${alici} · ${konu}\n${metin}`);
    return { ok: true, mesajId: `konsol-${Date.now()}` };
  }
  try {
    if (!tasiyici) {
      tasiyici = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
    }
    const r = await tasiyici.sendMail({ from: process.env.SMTP_FROM, to: alici, subject: konu, html, text: metin });
    return { ok: true, mesajId: r.messageId };
  } catch (e) {
    return { ok: false, hata: (e as Error).message };
  }
}
