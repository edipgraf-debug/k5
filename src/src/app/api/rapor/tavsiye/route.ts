import { hata } from '@/lib/api';
import { oturumAl } from '@/lib/auth';
import { HAZIRLAYAN_ADI, raporKapsami, tavsiyeDurumu } from '@/lib/raporlar';
import { tabloExcel } from '@/lib/excel-rapor';
import { excelYaniti } from '@/lib/yukleme/indir';

const DURUM = { taslak: 'Taslak', yayinda: 'Yayında', degisti: 'Yayında · değişiklik var' };

export async function GET(req: Request) {
  const o = await oturumAl();
  const kapsam = o ? await raporKapsami(o) : false;
  if (kapsam === false) return hata('Yetkiniz yok', 403);
  const l = await tavsiyeDurumu(kapsam, { okulId: Number(new URL(req.url).searchParams.get('okulId')) || null });
  const x = await tabloExcel('Tavsiye sepeti durumu', [
    { baslik: 'Okul', genislik: 28 }, { baslik: 'Plasiyer', genislik: 20 }, { baslik: 'Sepet', genislik: 28 }, { baslik: 'Sınıf', genislik: 10 },
    { baslik: 'Hazırlayan', genislik: 20 }, { baslik: 'Rol', genislik: 14 }, { baslik: 'Durum', genislik: 14 }, { baslik: 'Kapsam', genislik: 9 },
    { baslik: 'Açık', genislik: 8 }, { baslik: 'Veli açtı', genislik: 10 }, { baslik: 'Sipariş', genislik: 9 }, { baslik: 'Dönüşüm %', genislik: 11 },
  ], l.map((s) => [s.okulAd, s.plasiyerAd, s.ad, s.kapsamAd, s.hazirlayan, HAZIRLAYAN_ADI[s.hazirlayanTip] ?? '', DURUM[s.durum], s.kapsam, s.acik, s.acan, s.siparis,
    s.acik ? Math.round((s.siparis / s.acik) * 100) : null]));
  return excelYaniti(x, `tavsiye-sepeti-durumu-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
