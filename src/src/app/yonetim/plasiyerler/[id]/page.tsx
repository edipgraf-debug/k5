import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam } from '@/lib/yonetim-api';
import { plasiyerOzeti } from '@/lib/plasiyer';
import { tl } from '@/lib/bicim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import PlasiyerSecici from '@/components/yonetim/PlasiyerSecici';
import BaglaSecici from '@/components/yonetim/BaglaSecici';

export const metadata = { title: 'Plasiyer' };

export default async function PlasiyerDetay({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = idParam((await params).id);
  const y = await yonetimRepo();
  const p = id ? await y.personelKaydi(id) : null;
  if (!id || !p || p.tip !== 'Plasiyer') notFound();
  const [ozet, tumPlasiyer, tumOkul, tumOgretmen] = await Promise.all([plasiyerOzeti(id), y.plasiyerListesi(), y.okulListesi(), y.personelListesi({ tip: 'Ogretmen' })]);
  const secenekler = tumPlasiyer.map((x) => ({ id: x.id, adSoyad: x.adSoyad, kod: x.opakPlasiyerKodu }));
  const digerOkullar = tumOkul.filter((x) => x.plasiyerId !== id);
  const digerOgretmenler = tumOgretmen.filter((x) => x.gecerliPlasiyerId !== id);

  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/plasiyerler', ad: 'Plasiyerler' }} baslik={p.adSoyad}
        alt={<>Opak kodu: {p.opakPlasiyerKodu ?? '—'} · {p.eposta} · {p.aktif ? 'aktif' : 'pasif'}</>}>
        <Link href={`/yonetim/kullanicilar/${p.id}`} className="btn-cerceve min-h-11">Hesap ve şifre</Link>
      </SayfaBasligi>
      <KpiSatiri>
        <Kpi ad="Okul" deger={ozet.okullar.length} />
        <Kpi ad="Öğretmen" deger={ozet.ogretmenler.length} alt={`${ozet.ogretmenler.filter((x) => x.plasiyerId === id).length} öğretmene özel`} />
        <Kpi ad="Öğrenci" deger={ozet.ogrenci} />
        <Kpi ad="Tahsilat (başarılı)" deger={tl(ozet.tahsilat)} alt={`${ozet.bekleyenHavale} havale onay bekliyor`} />
        <Kpi ad="Terk edilen sepet" deger={ozet.terk} ton={ozet.terk ? 'uyari' : undefined} alt="24 saattir siparişe dönmeyen" />
      </KpiSatiri>

      <Bolum id="okullar" ust="OKULLAR" baslik={`${ozet.okullar.length} okul`}>
        {ozet.okullar.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[720px]`}>
              <thead><tr><th scope="col" className={TABLO.th}>Okul</th><th scope="col" className={TABLO.th}>Öğrenci</th><th scope="col" className={TABLO.th}>Yayındaki sepet</th>
                <th scope="col" className={TABLO.th}>Sipariş veren</th><th scope="col" className={TABLO.th}>Plasiyer</th></tr></thead>
              <tbody>
                {ozet.okullar.map((x) => (
                  <tr key={x.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/okullar/${x.id}`} className="font-bold">{x.ad}</Link><span className="block text-[13px] text-metin-3">{x.kod} · {x.ilce}</span></td>
                    <td className={TABLO.td}>{x.ogrenci}</td>
                    <td className={TABLO.td}>{x.yayinda}</td>
                    <td className={TABLO.td}>{x.siparisVeren}</td>
                    <td className={TABLO.td}><PlasiyerSecici url={`/api/yonetim/okullar/${x.id}/plasiyer`} deger={id} secenekler={secenekler} bosEtiket="Atanmadı" etiket={`${x.ad} plasiyeri`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Bu plasiyere bağlı okul yok.</Bos>}
        {digerOkullar.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-[#EEF0F3] px-6 py-4">
            <span className="text-sm font-bold">Okul bağla:</span>
            <BaglaSecici tur="okul" plasiyerId={id} secenekler={digerOkullar.map((x) => ({ id: x.id, ad: `${x.ad}${x.plasiyerAd ? ` (şu an: ${x.plasiyerAd})` : ''}` }))} />
          </div>
        )}
      </Bolum>

      <Bolum id="ogretmenler" ust="ÖĞRETMENLER" baslik={`${ozet.ogretmenler.length} öğretmen`}
        aksiyon={<span className="text-sm text-metin-2">Okul üzerinden gelenler okulun plasiyeri değişince birlikte değişir.</span>}>
        {ozet.ogretmenler.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[720px]`}>
              <thead><tr><th scope="col" className={TABLO.th}>Öğretmen</th><th scope="col" className={TABLO.th}>Okul / şubeler</th><th scope="col" className={TABLO.th}>Bağlantı</th>
                <th scope="col" className={TABLO.th}>Öğretmene özel plasiyer</th></tr></thead>
              <tbody>
                {ozet.ogretmenler.map((k) => (
                  <tr key={k.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/kullanicilar/${k.id}`} className="font-bold">{k.adSoyad}</Link></td>
                    <td className={TABLO.td}>{k.okulAd}<span className="block text-[13px] text-metin-3">{k.subeler.map((s) => s.ad).join(', ') || 'şube yok'}</span></td>
                    <td className={TABLO.td}>{k.plasiyerId === id ? <Rozet ton="lacivert">Öğretmene özel</Rozet> : <Rozet>Okul üzerinden</Rozet>}</td>
                    <td className={TABLO.td}><PlasiyerSecici url={`/api/yonetim/kullanicilar/${k.id}/plasiyer`} deger={k.plasiyerId} secenekler={secenekler} bosEtiket="Okulun plasiyeri" etiket={`${k.adSoyad} plasiyeri`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Bu plasiyere bağlı öğretmen yok.</Bos>}
        {digerOgretmenler.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-[#EEF0F3] px-6 py-4">
            <span className="text-sm font-bold">Başka okuldan öğretmen bağla:</span>
            <BaglaSecici tur="ogretmen" plasiyerId={id} secenekler={digerOgretmenler.map((k) => ({ id: k.id, ad: `${k.adSoyad} · ${k.okulAd ?? ''}` }))} />
          </div>
        )}
      </Bolum>
    </Sayfa>
  );
}

