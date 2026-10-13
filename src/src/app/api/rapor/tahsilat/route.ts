import { hata } from '@/lib/api';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { raporKapsami, tahsilatFiltresi, ODEME_DURUM_ADI } from '@/lib/raporlar';
import { tabloExcel } from '@/lib/excel-rapor';
import { excelYaniti } from '@/lib/yukleme/indir';

/** Tahsilat listesi Excel (kitabevi: tümü, plasiyer: kendi okulları) */
export async function GET(req: Request) {
  const o = await oturumAl();
  const kapsam = o ? await raporKapsami(o) : false;
  if (kapsam === false) return hata('Yetkiniz yok', 403);
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const l = await (await ticaretRepo()).tahsilatlar(tahsilatFiltresi(sp, kapsam));
  const x = await tabloExcel('Tahsilatlar', [
    { baslik: 'Tarih', genislik: 18 }, { baslik: 'Sipariş no', genislik: 16, metin: true }, { baslik: 'Okul', genislik: 28 }, { baslik: 'Plasiyer', genislik: 20 },
    { baslik: 'Veli', genislik: 22 }, { baslik: 'Öğrenci', genislik: 22 }, { baslik: 'Tip', genislik: 10 }, { baslik: 'POS / banka', genislik: 22 }, { baslik: 'Taksit', genislik: 8 },
    { baslik: 'Kart son 4', genislik: 10, metin: true }, { baslik: 'Havale gönderen', genislik: 20 }, { baslik: 'Referans', genislik: 12, metin: true },
    { baslik: 'Tutar', genislik: 14, para: true }, { baslik: 'Durum', genislik: 12 }, { baslik: 'Onaylayan', genislik: 18 },
  ], l.map((t) => [t.tarih, t.siparisNo, t.okulAd, t.plasiyerAd, t.veliAd, t.ogrenciAd, t.tip, t.tip === 'Kart' ? t.pos : t.banka, t.taksit, t.kartSonDort,
    t.havaleGonderen, t.referans, t.tutar, ODEME_DURUM_ADI[t.durum], t.onaylayan]));
  return excelYaniti(x, `tahsilatlar-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
