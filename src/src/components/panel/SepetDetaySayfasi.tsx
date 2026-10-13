import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { listeErisimi } from '@/lib/listeler';
import { kalemleriGetir, satirAnahtari, satirFiyati, zorunluToplam as zorunluTopla } from '@/lib/kalem';
import { ticaretRepo } from '@/lib/data/ticaret';
import { hedefMetni, sepetDurumu, tarihSaat, tl } from '@/lib/bicim';
import type { Rol } from '@/lib/types';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi, SepetRozeti } from './Ortak';
import TakipTablosu from './TakipTablosu';

type PersonelRol = Exclude<Rol, 'veli' | 'plasiyer'>;

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
  const [kalemler, okul, siparisli] = await Promise.all([kalemleriGetir(liste.satirlar), r.okul(liste.okulId), (await ticaretRepo()).siparisVerenOgrenciler([liste.okulId])]);
  const rolOnek = `/${rol}`;
  const duzenle = `${rolOnek}/listeler?liste=${liste.id}${rol === 'yonetim' ? `&okulId=${liste.okulId}` : ''}`;
  const zorunluToplam = zorunluTopla(liste.satirlar, kalemler);
  const siparisVeren = takip.filter((t) => siparisli.has(t.ogrenciId)).length;
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
          <Kpi ad="Sipariş veren" deger={siparisVeren} alt={takip.length ? `Dönüşüm: %${Math.round((siparisVeren / takip.length) * 100)}` : 'Kapsamda öğrenci yok'} />
        </KpiSatiri>

        <Bolum id="takip" ust="ÖĞRENCİ BAZINDA" baslik="Bildirim ve takip"
          aksiyon={<span className="text-sm text-metin-2">Öğrenci seçip sepeti tek tek açabilir ya da hatırlatma gönderebilirsiniz.</span>}>
          <TakipTablosu listeId={liste.id} satirlar={takip.map((t) => ({ ...t }))} yayinda={liste.yayinda} toplu={liste.yayinda && liste.hedefTipi === 'Toplu'}
            bos={!liste.satirlar.length} rolOnek={rolOnek} />
        </Bolum>

        <Bolum id="kitaplar" ust="İÇERİK" baslik={`${liste.satirlar.length} kalem`} aksiyon={<span className="font-bold">Zorunlu toplam: {tl(zorunluToplam)}</span>}>
          <ul className="flex flex-col">
            {liste.satirlar.map((s) => {
              const k = kalemler[satirAnahtari(s)];
              return (
                <li key={satirAnahtari(s)} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-bold">{k?.tur === 'set' && <span className="mr-1.5 rounded bg-lacivert px-1.5 py-0.5 text-[11px] font-extrabold text-turuncu">SET</span>}{k?.ad ?? `Kalem ${satirAnahtari(s)}`}</span>
                    <span className="text-[13px] text-metin-3">{k?.alt}</span>
                    {k?.icerik && <span className="text-[13px] text-metin-3">{k.icerik.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ')}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Rozet ton={s.zorunlu ? 'lacivert' : 'gri'}>{s.zorunlu ? 'Zorunlu' : 'İsteğe bağlı'}</Rozet>
                    <span className="font-bold">{tl(satirFiyati(s, k))}</span>
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
