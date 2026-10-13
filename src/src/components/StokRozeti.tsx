/** Depo stok miktarı (Kalıtım B2B'deki gibi tüm kullanıcılara adet olarak gösterilir) */
export default function StokRozeti({ stok, kucuk }: { stok: number | null | undefined; kucuk?: boolean }) {
  const boyut = kucuk ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-[13px]';
  if (stok == null) return <span className={`inline-flex items-center self-start whitespace-nowrap rounded-lg bg-[#EEF0F3] font-bold text-metin-2 ${boyut}`}>Stok bilgisi yok</span>;
  if (stok <= 0) return <span className={`inline-flex items-center self-start whitespace-nowrap rounded-lg bg-kirmizi-zemin font-extrabold text-kirmizi ${boyut}`}>Stokta yok</span>;
  const az = stok < 10;
  return (
    <span className={`inline-flex items-center self-start whitespace-nowrap rounded-lg font-extrabold ${az ? 'bg-sari-zemin text-sari' : 'bg-yesil-zemin text-yesil'} ${boyut}`}>
      Depo: {stok.toLocaleString('tr-TR')} adet{az ? ' · az' : ''}
    </span>
  );
}
