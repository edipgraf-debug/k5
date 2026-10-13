import 'server-only';
import { repo } from './data/repo';
import { yonetimRepo, type OkulKaydi, type PersonelKaydi } from './data/yonetim';
import { ticaretRepo } from './data/ticaret';

export interface PlasiyerOkulu extends OkulKaydi { ogrenci: number; yayinda: number; siparisVeren: number }
export interface PlasiyerOzeti {
  okullar: PlasiyerOkulu[];
  ogretmenler: PersonelKaydi[];
  ogrenci: number;
  tahsilat: number;          // başarılı tahsilat toplamı
  bekleyenHavale: number;
  terk: number;              // 24 saattir siparişe dönmeyen sepet
}

/** Plasiyerin okulları, öğretmenleri ve satış özeti (kitabevi plasiyer sayfası ve plasiyer ana sayfası) */
export async function plasiyerOzeti(plasiyerId: number): Promise<PlasiyerOzeti> {
  const [r, y, t] = await Promise.all([repo(), yonetimRepo(), ticaretRepo()]);
  const [okulKayitlari, ogretmenler] = await Promise.all([y.okulListesi(false, plasiyerId), y.personelListesi({ tip: 'Ogretmen', plasiyerId })]);
  const okulIdleri = okulKayitlari.map((x) => x.id);
  const [siparisli, tahsilatlar, terk] = await Promise.all([
    t.siparisVerenOgrenciler(okulIdleri), t.tahsilatlar({ okulIdleri }), t.terkEdilenSepetler({ saat: 24, okulIdleri }),
  ]);
  const okullar: PlasiyerOkulu[] = [];
  for (const x of okulKayitlari) {
    const [ogr, listeler] = await Promise.all([r.okulOgrencileri(x.id, null), r.okulListeleri(x.id)]);
    okullar.push({ ...x, ogrenci: ogr.length, yayinda: listeler.filter((l) => l.yayinda).length, siparisVeren: ogr.filter((g) => siparisli.has(g.id)).length });
  }
  return {
    okullar, ogretmenler, ogrenci: okullar.reduce((a, x) => a + x.ogrenci, 0),
    tahsilat: Math.round(tahsilatlar.filter((x) => x.durum === 'Basarili').reduce((a, x) => a + x.tutar, 0) * 100) / 100,
    bekleyenHavale: tahsilatlar.filter((x) => x.tip === 'Havale' && x.durum === 'Bekliyor').length,
    terk: terk.length,
  };
}

/** Plasiyer oturumunun erişebildiği okullar */
export async function plasiyerOkulIdleri(plasiyerId: number): Promise<number[]> {
  return (await (await yonetimRepo()).okulListesi(false, plasiyerId)).map((x) => x.id);
}
