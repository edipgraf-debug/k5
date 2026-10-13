import { NextResponse } from 'next/server';
import { govde, hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { farklar, idParam, kayitIslemi, PersonelSema, yonetici } from '@/lib/yonetim-api';
import { PERSONEL_ADLAR, personelGirdiKontrol } from '@/lib/kullanici-kontrol';

/** Kullanıcı bilgileri, rol, okul, şubeler (öğretmen) ve yetkiler (okul yetkilisi) */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, PersonelSema);
  if ('yanit' in g) return g.yanit;
  const y = await yonetimRepo();
  const once = id ? await y.personelKaydi(id) : null;
  if (!id || !once) return hata('Kullanıcı bulunamadı', 404);
  if (id === o.sub && (g.veri.tip !== once.tip || !g.veri.aktif)) return hata('Kendi rolünüzü değiştiremez, kendinizi pasif yapamazsınız');
  const k = await personelGirdiKontrol(g.veri);
  if (k) return hata(k);
  const s = await kayitIslemi(() => y.personelDuzenle(id, g.veri));
  if (s instanceof Response) return s;
  const f = farklar({ ...once, subeIdleri: once.subeler.map((x) => x.id).sort(), yetkiler: [...once.yetkiler].sort() },
    { ...g.veri, subeIdleri: [...g.veri.subeIdleri].sort(), yetkiler: g.veri.tip === 'Okul' ? [...g.veri.yetkiler].sort() : [] }, PERSONEL_ADLAR);
  if (f) await y.islemYaz(o.sub, 'Kullanici', id, g.veri.aktif === once.aktif ? 'Kullanıcı güncellendi' : g.veri.aktif ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasif edildi', f);
  return NextResponse.json({ kullanici: await y.personelKaydi(id) });
}
