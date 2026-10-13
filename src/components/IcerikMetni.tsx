/** Sade metin biçimi: boş satır paragraf, "## " ara başlık, "- " madde. HTML kabul edilmez (güvenli). */
export default function IcerikMetni({ metin }: { metin: string }) {
  const bloklar = metin.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-3.5 text-[16px] leading-relaxed text-lacivert">
      {bloklar.map((b, i) => {
        if (b.startsWith('## ')) return <h2 key={i} className="mt-2 font-baslik text-xl font-extrabold">{b.slice(3)}</h2>;
        const satirlar = b.split('\n');
        if (satirlar.every((s) => s.startsWith('- '))) return <ul key={i} className="ml-5 list-disc">{satirlar.map((s, j) => <li key={j}>{s.slice(2)}</li>)}</ul>;
        return <p key={i}>{satirlar.map((s, j) => <span key={j}>{s}{j < satirlar.length - 1 && <br />}</span>)}</p>;
      })}
    </div>
  );
}
