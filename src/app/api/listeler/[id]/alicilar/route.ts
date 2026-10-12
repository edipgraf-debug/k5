import { NextResponse } from 'next/server';
import { repo } from '@/lib/data/repo';
import { hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { alicilariOzetle, listeErisimi, smsMetni } from '@/lib/listeler';

/**
 * Yayınla onay penceresi için: kaç öğrenci, kaç veliye SMS / e-posta gidecek.
 * ?ogrenciler=1,2,3 verilirse yalnız seçili öğrenciler; ?hatirlatma=1 SMS önizlemesini hatırlatma metniyle verir.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await rolGerekli('ogretmen', 'okul', 'yonetim');
  if (!o) return hata('Yetkiniz yok', 403);
  const r = await repo();
  const liste = await r.liste(Number((await ctx.params).id));
  if (!liste) return hata('Sepet bulunamadı', 404);
  if (!(await listeErisimi(o, liste))) return hata('Yetkiniz yok', 403);
  const sp = new URL(req.url).searchParams;
  const ham = sp.get('ogrenciler');
  const ids = ham == null ? null : ham.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const alicilar = await r.listeAlicilari(liste.id, ids);
  const ozet = alicilariOzetle(alicilar);
  const okul = await r.okul(liste.okulId);
  const tur = sp.get('hatirlatma') ? 'hatirlatma' : liste.yayinTarihi && ids == null ? 'guncelleme' : 'yeni';
  // öğrenci sayısı: velisi olmayanlar dahil (sepet onlara da açılır, yalnız bildirim gitmez)
  const ogrenciSayisi = ids ? ids.length : (await r.listeTakip(liste.id)).length;
  return NextResponse.json({ ...ozet, ogrenciSayisi, velisizOgrenci: ogrenciSayisi - ozet.ogrenciSayisi, smsOrnek: alicilar[0] ? smsMetni(alicilar[0], tur, okul?.slug) : null });
}
