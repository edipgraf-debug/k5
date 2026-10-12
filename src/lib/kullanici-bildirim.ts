import 'server-only';
import { epostaGonder } from './notify/email';
import { repo } from './data/repo';
import { siteUrl } from './listeler';
import type { PersonelKaydi } from './data/yonetim';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Kullanıcının giriş adresi: okul kullanıcıları okulun özel adresi, kitabevi /yonetim/giris */
export async function girisAdresiFor(p: Pick<PersonelKaydi, 'tip' | 'okulId'>) {
  if (p.tip === 'Yonetim') return `${siteUrl()}/yonetim/giris`;
  const okul = p.okulId ? await (await repo()).okul(p.okulId) : null;
  return `${siteUrl()}/${okul?.slug || 'giris'}`;
}

/** Geçici şifreyi kullanıcının e-postasına gönderir. Şifre hiçbir kayda yazılmaz. */
export async function geciciSifreEpostasi(p: PersonelKaydi, sifre: string, yeniHesap: boolean) {
  const adres = await girisAdresiFor(p);
  const rol = p.tip === 'Ogretmen' ? 'öğretmen' : p.tip === 'Okul' ? 'okul yönetimi' : 'kitabevi yönetim';
  const konu = yeniHesap ? 'Kardelen Okul hesabınız açıldı' : 'Kardelen Okul geçici şifreniz';
  const metin = `Sayın ${p.adSoyad},\n\n${yeniHesap ? `Kardelen Okul ${rol} hesabınız açıldı.` : 'Hesabınız için geçici şifre oluşturuldu.'}\n` +
    `Giriş adresi: ${adres}\nE-posta: ${p.eposta}\nGeçici şifre: ${sifre}\n\nİlk girişte kendi şifrenizi belirlemeniz istenecek.\n\nKardelen Okul`;
  const html = `<div style="font-family:Arial,sans-serif;color:#172334;max-width:560px">
    <h2 style="margin:0 0 12px">${esc(konu)}</h2>
    <p>Sayın ${esc(p.adSoyad)},</p>
    <p>${yeniHesap ? `Kardelen Okul ${rol} hesabınız açıldı.` : 'Hesabınız için geçici şifre oluşturuldu.'}</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#5A6575">E-posta</td><td><strong>${esc(p.eposta)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#5A6575">Geçici şifre</td><td><strong style="font-family:monospace;font-size:16px">${esc(sifre)}</strong></td></tr>
    </table>
    <p><a href="${esc(adres)}" style="display:inline-block;padding:12px 20px;background:#F89C0E;color:#172334;font-weight:bold;border-radius:10px;text-decoration:none">Giriş yap</a></p>
    <p style="font-size:13px;color:#5A6575">İlk girişte kendi şifrenizi belirlemeniz istenecek. Bu e-postayı siz istemediyseniz Kardelen Okul ile iletişime geçin.</p>
  </div>`;
  return epostaGonder(p.eposta, konu, html, metin);
}
