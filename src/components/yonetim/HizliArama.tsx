/** Kitabevi panelinde her yerden: öğrenci adı, okul no, veli telefonu, kullanıcı e-postası ya da okul adı */
export default function HizliArama({ q = '', otomatik }: { q?: string; otomatik?: boolean }) {
  return (
    <form action="/yonetim/ara" method="get" role="search" className="flex flex-wrap gap-2.5">
      <label htmlFor="hizli-ara" className="sr-only">Ara</label>
      <input id="hizli-ara" name="q" type="search" defaultValue={q} autoFocus={otomatik} minLength={2}
        className="girdi h-[52px] min-w-0 flex-[1_1_320px] text-[17px]" placeholder="Öğrenci, okul no, veli telefonu, kullanıcı e-postası veya okul ara" />
      <button type="submit" className="btn-koyu min-h-[52px]">Ara</button>
    </form>
  );
}
