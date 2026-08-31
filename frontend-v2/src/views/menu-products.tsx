import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Drawer, Field, TextInput, SelectInput, TextArea, StatusBadge, Badge, Modal } from "@/components/ui";
import { MENUS, MENU_CATEGORIES, OUTLETS, idr, type MenuProduct } from "@/lib/mock-data";

export function MenuProductsView() {
  const [menus, setMenus] = useState<MenuProduct[]>(MENUS);
  const [categories, setCategories] = useState(MENU_CATEGORIES);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const [menuModal, setMenuModal] = useState(false);
  const [catModal, setCatModal] = useState(false);

  const rows = menus.filter((m) => `${m.code} ${m.name}`.toLowerCase().includes(q.toLowerCase()) && (statusFilter === "all" || (statusFilter === "active") === m.active));
  const totalVariants = menus.reduce((s, m) => s + m.variants.length, 0);
  const catName = (code: string) => categories.find((c) => c.code === code)?.name ?? code;

  const toggleAvailability = (menuCode: string, sku: string, outlet: string) => {
    setMenus((p) => p.map((m) => m.code === menuCode ? {
      ...m, lockVersion: m.lockVersion + 1,
      variants: m.variants.map((v) => v.sku === sku ? { ...v, availability: { ...v.availability, [outlet]: !v.availability[outlet] } } : v),
    } : m));
    setSelected((s) => s && s.code === menuCode ? { ...s, variants: s.variants.map((v) => v.sku === sku ? { ...v, availability: { ...v.availability, [outlet]: !v.availability[outlet] } } : v) } : s);
    toast.success("Availability outlet diperbarui");
  };

  const setOverride = (menuCode: string, sku: string, outlet: string) => {
    const raw = window.prompt(`Price override untuk outlet ${outlet} (kosongkan untuk kembali ke base price)`);
    if (raw === null) return;
    const val = raw.trim() === "" ? undefined : Number(raw);
    setMenus((p) => p.map((m) => m.code === menuCode ? {
      ...m, lockVersion: m.lockVersion + 1,
      variants: m.variants.map((v) => v.sku === sku ? { ...v, overrides: { ...v.overrides, [outlet]: val } } : v),
    } : m));
    setSelected((s) => s && s.code === menuCode ? { ...s, variants: s.variants.map((v) => v.sku === sku ? { ...v, overrides: { ...v.overrides, [outlet]: val } } : v) } : s);
    toast.success(val === undefined ? "Override dihapus, kembali ke base price" : `Override diset ${idr(val)}`);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu & Produk</h1>
          <p className="mt-1 text-[13px] text-mute">Menu, variant, availability, dan harga per outlet</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => setCatModal(true)}>Kelola Kategori</Btn>
          <Btn onClick={() => setMenuModal(true)}><Plus className="size-3.5" /> Tambah Menu</Btn>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[{ l: "Total Menu", v: menus.length }, { l: "Total Variant", v: totalVariants }, { l: "Butuh Resep", v: menus.flatMap((m) => m.variants).filter((v) => v.requiresRecipe).length }].map((k) => (
          <Card key={k.l} className="p-3.5">
            <p className="text-[12px] font-medium text-mute">{k.l}</p>
            <p className="mono mt-1.5 text-[20px] font-semibold">{k.v}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Daftar Menu"
          sub={`${rows.length} menu`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu…" className="w-44 pl-8" />
              </div>
              <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
                <option value="active">Aktif</option><option value="archived">Diarsipkan</option><option value="all">Semua</option>
              </SelectInput>
            </div>
          }
        />
        <DataTable head={["Kode", "Nama Menu", "Kategori", "Variant", "Harga Dasar", "Lock", "Status", ""]} wide>
          {rows.map((m) => (
            <Row key={m.code} onClick={() => setSelected(m)}>
              <Cell className="mono text-ink/90">{m.code}</Cell>
              <Cell className="font-medium">{m.name}</Cell>
              <Cell className="text-mute">{catName(m.category)}</Cell>
              <Cell className="mono text-right">{m.variants.length}</Cell>
              <Cell className="mono text-right">{idr(m.variants[0]?.price ?? 0)}</Cell>
              <Cell className="mono text-mute">v{m.lockVersion}</Cell>
              <Cell><StatusBadge label={m.active ? "active" : "archived"} /></Cell>
              <Cell>
                <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={(e) => { e.stopPropagation(); setMenus((p) => p.map((x) => (x.code === m.code ? { ...x, active: !x.active, lockVersion: x.lockVersion + 1 } : x))); toast.success(m.active ? "Menu diarsipkan" : "Menu diaktifkan"); }}>
                  {m.active ? "Arsipkan" : "Aktifkan"}
                </Btn>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} sub={selected ? `${selected.code} · ${catName(selected.category)} · lockVersion v${selected.lockVersion}` : undefined}>
        {selected && (
          <div className="space-y-5">
            {selected.desc && <p className="text-[12.5px] text-mute">{selected.desc}</p>}
            {selected.variants.map((v) => (
              <div key={v.sku} className="rounded-xl bg-cream p-3 ring-1 ring-black/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium">{v.name} {v.isDefault && <Badge tone="olive" className="ml-1">default</Badge>}</p>
                    <p className="mono mt-0.5 text-[11px] text-mute">{v.sku} · urutan {v.displayOrder}</p>
                  </div>
                  <span className="mono text-[13px] font-semibold">{idr(v.price)}</span>
                </div>
                {v.requiresRecipe && <p className="mt-1.5 text-[11.5px] text-mute">Membutuhkan approved recipe agar layak dijual di POS.</p>}
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-mute">Availability & harga per outlet</p>
                  {OUTLETS.filter((o) => o.active).map((o) => (
                    <div key={o.code} className="flex items-center justify-between rounded-lg bg-card px-2.5 py-1.5 text-[12.5px] ring-1 ring-black/5">
                      <span>{o.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="mono text-mute">{v.overrides[o.code] !== undefined ? idr(v.overrides[o.code]!) : idr(v.price)}</span>
                        <button onClick={() => setOverride(selected.code, v.sku, o.code)} className="rounded px-1.5 py-0.5 text-[11px] font-medium text-olive hover:bg-olive-soft">Harga</button>
                        <button onClick={() => toggleAvailability(selected.code, v.sku, o.code)}>
                          <Badge tone={v.availability[o.code] ? "olive" : "mute"}>{v.availability[o.code] ? "Tersedia" : "Nonaktif"}</Badge>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Modal open={menuModal} onClose={() => setMenuModal(false)} title="Tambah Menu" wide>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = String(fd.get("code"));
            if (!/^[A-Za-z0-9_-]+$/.test(code)) { toast.error("Kode menu hanya huruf, angka, underscore, atau hyphen"); return; }
            setMenus((p) => [...p, {
              code, name: String(fd.get("name")), category: String(fd.get("category")), desc: String(fd.get("desc") || "") || undefined,
              active: true, lockVersion: 1,
              variants: [{ sku: `${code}-REG`, name: String(fd.get("variant")), price: Number(fd.get("price")), displayOrder: 0, isDefault: true, requiresRecipe: fd.get("recipe") === "on", active: true, availability: { KMG: true, MTG: true, TBT: true }, overrides: {} }],
            }]);
            setMenuModal(false);
            toast.success("Menu ditambahkan");
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode menu" required hint="Huruf, angka, _ atau -"><TextInput name="code" required pattern="[A-Za-z0-9_\-]+" /></Field>
            <Field label="Nama menu" required><TextInput name="name" required /></Field>
            <Field label="Kategori" required>
              <SelectInput name="category" required>
                {categories.filter((c) => c.active).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Nama variant awal" required><TextInput name="variant" required defaultValue="Regular" /></Field>
            <Field label="Base selling price" required><TextInput name="price" type="number" min={0} step={0.01} required /></Field>
          </div>
          <Field label="Deskripsi"><TextArea name="desc" /></Field>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="recipe" defaultChecked className="accent-[oklch(0.52_0.065_128)]" /> Requires recipe</label>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setMenuModal(false)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
        </form>
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Kategori Menu">
        <div className="space-y-3">
          <ul className="space-y-2">
            {categories.map((c) => {
              const hasActiveMenu = menus.some((m) => m.category === c.code && m.active);
              return (
                <li key={c.code} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                  <span><span className="mono text-mute">{c.code}</span> · {c.name} <span className="text-mute">urutan {c.order}</span></span>
                  <Btn
                    variant="ghost" className="px-2 py-1 text-[12px]"
                    disabled={c.active && hasActiveMenu}
                    title={c.active && hasActiveMenu ? "Kategori dengan menu aktif tidak dapat diarsipkan" : undefined}
                    onClick={() => { setCategories((p) => p.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x))); toast.success(c.active ? "Kategori diarsipkan" : "Kategori diaktifkan"); }}
                  >
                    {c.active ? "Arsipkan" : "Aktifkan"}
                  </Btn>
                </li>
              );
            })}
          </ul>
          <form
            className="flex items-center gap-2 border-t border-black/5 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setCategories((p) => [...p, { code: String(fd.get("code")).toUpperCase(), name: String(fd.get("name")), order: Number(fd.get("order")), active: true }]);
              (e.target as HTMLFormElement).reset();
              toast.success("Kategori ditambahkan");
            }}
          >
            <TextInput name="code" placeholder="Kode" className="w-24" required />
            <TextInput name="name" placeholder="Nama kategori" required />
            <TextInput name="order" type="number" min={0} placeholder="Urutan" className="w-20" defaultValue={0} />
            <Btn type="submit" className="px-2.5 py-1.5 text-[12px]"><Plus className="size-3" /></Btn>
          </form>
        </div>
      </Modal>
    </div>
  );
}
