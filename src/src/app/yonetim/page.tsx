import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { ticaretRepo } from '@/lib/data/ticaret';
import { tl } from '@/lib/bicim';
import { okulTablosu } from '@/lib/yonetim';
import { siteUrl } from '@/lib/listeler';
import { tarihSaat } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import OkulTablosu from '@/components/panel/OkulTablosu';
import HizliArama from '@/components/yonetim/HizliArama';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Kitabevi ana sayfası' };

const TIP: Record<string, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yönetimi', Yonetim: 'Kitabevi' };

export default async function YonetimAna() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const r = await repo();
  const t = await ticaretRepo();
  const [okullar, yayinlar, tahsilat, terk] = await Promise.all([okulTablosu(), r.sonYayinlar(null, 8), t.tahsilatlar({}), t.terkEdilenSepetler({ saat: 24 })]);
  const bekleyenHavale = tahsilat.filter((x) => x.tip === 'Havale' && x.durum === 'Bekliyor');
  const adressiz = okullar.filter((x) => !x.slug).length;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim" />
      <Sayfa>
        <SayfaBasligi baslik="Kitabevi ana sayfası" alt="Öğrenci, veli, öğretmen ve okul kayıtlarını buradan bulun ve düzenleyin." />
        <section aria-label="Hızlı işlemler" className="kart flex flex-col gap-4 p-5">
          <HizliArama />
          <div className="flex flex-wrap gap-2">
            <Link href="/yonetim/ogrenciler/yeni" className="btn-cerceve min-h-11">+ Öğrenci</Link>
            <Link href="/yonetim/ogrenciler/yukle" className="btn-cerceve min-h-11">Excel ile öğrenci yükle</Link>
            <Link href="/yonetim/kullanicilar/yeni?tip=Ogretmen" className="btn-cerceve min-h-11">+ Öğretmen</Link>
            <Link href="/yonetim/kullanicilar/yeni?tip=Okul" className="btn-cerceve min-h-11">+ Okul yetkilisi</Link>
            <Link href="/yonetim/okullar/yeni" className="btn-cerceve min-h-11">+ Okul</Link>
            <Link href="/yonetim/setler/yeni" className="btn-cerceve min-h-11">+ Set</Link>
            <Link href="/yonetim/kampanyalar/yeni" className="btn-cerceve min-h-11">+ Kampanya</Link>
            <Link href="/yonetim/listeler?yeni=1" className="btn-turuncu min-h-11">+ Okul adına tavsiye sepeti</Link>
          </div>
        </section>
        <KpiSatiri>
          <Kpi ad="Anlaşmalı okul" deger={okullar.length} alt={adressiz ? `${adressiz} okulun giriş adresi yok` : 'Tüm okulların giriş adresi var'} ton={adressiz ? 'uyari' : undefined} />
          <Kpi ad="Öğrenci" deger={okullar.reduce((a, x) => a + x.ogrenci, 0)} alt="Bu sezon kayıtlı" />
          <Kpi ad="Yayındaki sepet" deger={okullar.reduce((a, x) => a + x.yayinda, 0)} alt="Tüm okullar" />
          <Kpi ad="Tahsilat" deger={tl(tahsilat.filter((x) => x.durum === 'Basarili').reduce((a, x) => a + x.tutar, 0))} alt="Başarılı ödemeler" />
        </KpiSatiri>
        {(bekleyenHavale.length > 0 || terk.length > 0 || okullar.some((x) => !x.plasiyerAd)) && (
          <section aria-label="Bekleyen işler" className="flex flex-wrap gap-3">
            {bekleyenHavale.length > 0 && <Link href="/yonetim/tahsilatlar?tip=Havale&durum=Bekliyor" className="kart flex-[1_1_240px] border-turuncu p-4 font-bold no-underline">⏳ {bekleyenHavale.length} havale onay bekliyor ({tl(bekleyenHavale.reduce((a, x) => a + x.tutar, 0))}) →</Link>}
            {terk.length > 0 && <Link href="/yonetim/raporlar?sekme=terk" className="kart flex-[1_1_240px] border-turuncu p-4 font-bold no-underline">🛒 {terk.length} veli sepeti 24 saattir siparişe dönmedi →</Link>}
            {okullar.some((x) => !x.plasiyerAd) && <Link href="/yonetim/plasiyerler?atanmamis=1" className="kart flex-[1_1_240px] border-turuncu p-4 font-bold no-underline">👤 {okullar.filter((x) => !x.plasiyerAd).length} okulun plasiyeri atanmamış →</Link>}
          </section>
        )}

        <Bolum id="okullar" ust="OKULLAR" baslik="Okullar ve giriş adresleri" aksiyon={<Link href="/yonetim/okullar" className="font-bold">Tümü →</Link>}>
          {okullar.length ? <OkulTablosu okullar={okullar} site={siteUrl()} /> : <Bos>Kayıtlı okul yok.</Bos>}
        </Bolum>

        <Bolum id="yayinlar" ust="SON YAYINLAR" baslik="Son yayınlanan tavsiye sepetleri">
          {yayinlar.length ? (
            <ul className="flex flex-col">
              {yayinlar.map((y) => (
                <li key={y.yayinId} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={`/yonetim/listeler/${y.listeId}`} className="font-bold">{y.okulAd} · {y.listeAd}</Link>
                    <span className="text-[13px] text-metin-3">
                      {tarihSaat(y.tarih)} · {y.kapsamAd} · {y.hatirlatma ? 'hatırlatma' : y.hedefTipi === 'Toplu' ? 'tüm sınıf' : `${y.ogrenciSayisi} seçili öğrenci`} · {y.smsSayisi} SMS, {y.epostaSayisi} e-posta
                    </span>
                  </div>
                  <Rozet ton={y.yayinlayanTip === 'Yonetim' ? 'lacivert' : 'gri'}>{TIP[y.yayinlayanTip]} · {y.yayinlayan}</Rozet>
                </li>
              ))}
            </ul>
          ) : <Bos>Henüz yayın yok.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
