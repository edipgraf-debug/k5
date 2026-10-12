import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { listeErisimi } from '@/lib/listeler';
import { hedefMetni, sepetDurumu, tarihSaat, tl } from '@/lib/bicim';
import type { Rol } from '@/lib/types';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi, SepetRozeti } from './Ortak';
import TakipTablosu from './TakipTablosu';

type PersonelRol = Exclude<Rol, 'veli'>;

/** /{ogretmen|okul|yonetim}/listeler/{id}: tavsiye sepeti detayı ve öğrenci bazında takip */
export default async function SepetDetaySayfasi({ rol, id }: { rol: PersonelRol; id: number }) {
  const o = await oturumAl();
  if (!o || o.rol !== rol) redirect('/giris');
  if (!Number.isInteger(id) || id <= 0) notFound();
  const r = await repo();
  const liste = await r.liste(id);
  if (!liste || !(await listeErisimi(o, liste))) notFound();
  let takip = await r.listeTakip(liste.id);
  if (o.rol === 'ogretmen') {
    const subeler = new Set((await r.okulOgrencileri(liste.okulId, await r.personelSubeleri(o.sub))).map((x) => x.id));
    takip = takip.filter((t) => subeler.has(t.ogrenciId));
  }
  const [urunler, okul] = await Promise.all([r.urunler(liste.satirlar.map((s) => s.urunId)), r.okul(liste.okulId)]);
  const rolOnek = `/${rol}`;
  const duzenle = `${rolOnek}/listeler?liste=${liste.id}${rol === 'yonetim' ? `&okulId=${liste.okulId}` : ''}`;
  const zorunluToplam = liste.satirlar.reduce((a, s) => a + (s.zorunlu ? (s.satisFiyati ?? urunler.find((u) => u.id === s.urunId)?.fiyat ?? 0) * s.adet : 0), 0);
  const acik = takip.filter((t) => t.gorebilir);
  const ulasti = takip.filter((t) => t.sms === 'Gonderildi' || t.eposta === 'Gonderildi');

  return (
    <>
      <UstCubuk rol={rol} ad={o.ad} aktif={`${rolOnek}/listeler`} />
      <Sayfa>
        <SayfaBasligi geri={{ href: duzenle, ad: 'Tavsiye sepetleri' }} baslik={liste.ad}
          alt={<>{rol === 'yonetim' && okul ? `${okul.ad} · ` : ''}{liste.kapsamAd} · {hedefMetni(liste)} · {liste.yayinTarihi ? `son yayın ${tarihSaat(liste.yayinTarihi)}` : 'henüz yayınlanmadı'}</>}>
          <SepetRozeti durum={sepetDurumu(liste)} />
          <Link href={duzenle} className="btn-cerceve min-h-11">Sepeti düzenle</Link>
        </SayfaBasligi>

        <KpiSatiri>
          <Kpi ad="Sınıftaki öğrenci" deger={takip.length} alt={liste.kapsamAd} />
          <Kpi ad="Sepet açık" deger={acik.length} alt={liste.hedefTipi === 'Toplu' && liste.yayinda ? 'Tüm sınıf' : 'Seçili öğrenciler'} />
          <Kpi ad="Bildirim ulaştı" deger={ulasti.length} alt={`${takip.filter((t) => t.sms === 'Hata').length} SMS ulaşmadı`} />
          <Kpi ad="Veli sepeti açtı" deger={takip.filter((t) => t.acildi).length} alt={acik.length ? `Oran: %${Math.round((takip.filter((t) => t.acildi).length / acik.length) * 100)}` : 'Sepet henüz kimseye açık değil'} />
          <Kpi ad="Sipariş" deger="—" alt="Ödeme adımıyla birlikte izlenecek" />
        </KpiSatiri>

        <Bolum id="takip" ust="ÖĞRENCİ BAZINDA" baslik="Bildirim ve takip"
          aksiyon={<span className="text-sm text-metin-2">Öğrenci seçip sepeti tek tek açabilir ya da hatırlatma gönderebilirsiniz.</span>}>
          <TakipTablosu listeId={liste.id} satirlar={takip.map((t) => ({ ...t }))} yayinda={liste.yayinda} toplu={liste.yayinda && liste.hedefTipi === 'Toplu'}
            bos={!liste.satirlar.length} rolOnek={rolOnek} />
        </Bolum>

        <Bolum id="kitaplar" ust="İÇERİK" baslik={`${liste.satirlar.length} kitap`} aksiyon={<span className="font-bold">Zorunlu toplam: {tl(zorunluToplam)}</span>}>
          <ul className="flex flex-col">
            {liste.satirlar.map((s) => {
              const u = urunler.find((x) => x.id === s.urunId);
              return (
                <li key={s.urunId} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-bold">{u?.ad ?? `Ürün #${s.urunId}`}</span>
                    <span className="text-[13px] text-metin-3">{[u?.yazar, u?.yayinevi].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Rozet ton={s.zorunlu ? 'lacivert' : 'gri'}>{s.zorunlu ? 'Zorunlu' : 'İsteğe bağlı'}</Rozet>
                    <span className="font-bold">{tl(s.satisFiyati ?? u?.fiyat ?? 0)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {!liste.satirlar.length && <p className="px-6 py-5 text-metin-2">Sepet boş; yayınlamadan önce kitap ekleyin.</p>}
        </Bolum>
      </Sayfa>
    </>
  );
}
