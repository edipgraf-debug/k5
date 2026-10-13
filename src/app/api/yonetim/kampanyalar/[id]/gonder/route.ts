import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';
import { GonderSema, kampanyaDuyur } from '@/lib/kampanya';

/** Kampanyayı okul yetkilileri ve / veya öğretmenlere SMS ve / veya e-posta ile duyur */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, GonderSema);
  if ('yanit' in g) return g.yanit;
  const k = id ? await (await ticaretRepo()).kampanya(id) : null;
  if (!id || !k) return hata('Kampanya bulunamadı', 404);
  if (!k.aktif) return hata('Pasif kampanya duyurulamaz; önce aktif edin');
  if (k.bitis < new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10)) return hata('Süresi bitmiş kampanya duyurulamaz');
  const s = await kampanyaDuyur(k, g.veri, o.sub);
  await (await yonetimRepo()).islemYaz(o.sub, 'Kampanya', id, 'Kampanya duyuruldu',
    `${g.veri.hedefler.map((h) => (h === 'Okul' ? 'okul yetkilileri' : 'öğretmenler')).join(' + ')} · ${s.kisi} kişi · ${s.sms} SMS, ${s.eposta} e-posta${s.hata ? `, ${s.hata} hata` : ''}`);
  return NextResponse.json({ sonuc: s });
}
