import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/data/repo';
import { ticaretRepo, type VeliSepetSatiri } from '@/lib/data/ticaret';
import { govde, hata } from '@/lib/api';
import { rolGerekli } from '@/lib/auth';
import { kalemleriGetir, satirAnahtari, satirFiyati } from '@/lib/kalem';

const Sema = z.object({
  ogrenciId: z.number().int().positive(),
  // isteğe bağlı kalemlerden ve katalogdan seçilenler ("u12", "s3")
  secimler: z.array(z.string().regex(/^[us]\d{1,9}$/)).max(200),
});

async function ogrenciKontrol(veliId: number, ogrenciId: number) {
  return (await (await repo()).veliOgrencileri(veliId)).some((x) => x.id === ogrenciId);
}

/** Öğrencinin sunucudaki sepetinde seçili isteğe bağlı / katalog kalemleri */
export async function GET(req: Request) {
  const o = await rolGerekli('veli');
  if (!o) return hata('Yetkiniz yok', 403);
  const ogrenciId = Number(new URL(req.url).searchParams.get('ogrenciId'));
  if (!(await ogrenciKontrol(o.sub, ogrenciId))) return hata('Yetkiniz yok', 403);
  const satirlar = await (await ticaretRepo()).veliSepeti(o.sub, ogrenciId);
  return NextResponse.json({ secimler: satirlar.map(satirAnahtari) });
}

/**
 * Velinin sepetini sunucuya yazar (terk edilen sepet raporu ve katalogdan eklenenler). Fiyat ve içerik istemciden alınmaz:
 * öğrencinin yayındaki sepetlerinden zorunlu kalemler + seçilen isteğe bağlı kalemler + katalogdan eklenen satıştaki ürün/setler, güncel fiyatla.
 */
export async function POST(req: Request) {
  const o = await rolGerekli('veli');
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  if (!(await ogrenciKontrol(o.sub, g.veri.ogrenciId))) return hata('Yetkiniz yok', 403);
  const r = await repo();

  const secim = new Set(g.veri.secimler);
  const listeler = await r.ogrenciListeleri(g.veri.ogrenciId);
  const listeSatirlari = listeler.flatMap((l) => l.satirlar);
  const katalogdan = [...secim].filter((a) => !listeSatirlari.some((s) => satirAnahtari(s) === a))
    .map((a) => (a[0] === 's' ? { urunId: null, setId: Number(a.slice(1)) } : { urunId: Number(a.slice(1)), setId: null }));
  const kalemler = await kalemleriGetir([...listeSatirlari, ...katalogdan]);
  const satirlar: VeliSepetSatiri[] = [];
  const gorulen = new Set<string>();
  for (const l of listeler) {
    for (const s of l.satirlar) {
      const a = satirAnahtari(s);
      if ((!s.zorunlu && !secim.has(a)) || gorulen.has(a) || !kalemler[a]) continue;
      gorulen.add(a);
      satirlar.push({ listeId: l.id, urunId: s.setId ? null : s.urunId, setId: s.setId ?? null, adet: s.adet, birimFiyat: satirFiyati(s, kalemler[a]) });
    }
  }
  const t = await ticaretRepo();
  for (const k of katalogdan.slice(0, 50)) {
    const a = satirAnahtari(k);
    const kalem = kalemler[a];
    if (!kalem || gorulen.has(a)) continue;
    const satista = k.setId ? (await t.setKaydi(k.setId))?.aktif : (await t.urunKaydi(k.urunId!))?.aktif;
    if (!satista) continue;   // satışta olmayan ürün / set eklenmez
    gorulen.add(a);
    satirlar.push({ listeId: null, urunId: k.urunId, setId: k.setId, adet: 1, birimFiyat: kalem.fiyat });
  }
  await t.veliSepetKaydet(o.sub, g.veri.ogrenciId, satirlar);
  return NextResponse.json({ ok: true, kalem: satirlar.length });
}
