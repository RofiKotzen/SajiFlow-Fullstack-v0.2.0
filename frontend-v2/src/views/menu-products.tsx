import { Archive, Layers3, Plus, RefreshCw, Search, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Badge,
  Btn,
  Card,
  CardHeader,
  Cell,
  DataTable,
  Drawer,
  Field,
  Modal,
  Row,
  SelectInput,
  StatusBadge,
  Tabs,
  TextArea,
  TextInput,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/types";

type Summary = {
  menus: number;
  categories: number;
  variants: number;
  active: number;
  archived: number;
};
type Category = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  archivedAt?: string | null;
  archiveReason?: string | null;
  lockVersion: number;
  activeMenuCount: number;
};
type Variant = {
  id: string;
  menuId?: string;
  sku: string;
  name: string;
  sellingPrice?: string;
  currencyCode?: string;
  barcode?: string | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  requiresRecipe: boolean;
  lockVersion: number;
};
type Menu = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  archivedAt?: string | null;
  archiveReason?: string | null;
  lockVersion: number;
  variantCount: number;
  variants?: Variant[];
};
type Lookup = {
  categories: Pick<Category, "id" | "code" | "name">[];
  outlets: { id: string; code: string; name: string }[];
  currencyCode: string;
};
type OutletSetting = {
  id: string;
  outletId: string;
  outletCode: string;
  outletName: string;
  isAvailable: boolean;
  isActive: boolean;
  priceOverride?: string;
  lockVersion: number;
};
type PosItem = {
  menuId: string;
  variantId: string;
  effectiveSellingPrice?: string;
  currencyCode?: string;
};
type MenuForm = { code: string; name: string; categoryId: string; description: string };
type VariantForm = {
  sku: string;
  name: string;
  sellingPrice: string;
  currencyCode: string;
  barcode: string;
  isDefault: boolean;
  displayOrder: number;
  requiresRecipe: boolean;
};
type CategoryForm = { code: string; name: string; displayOrder: number };

const EMPTY_SUMMARY: Summary = { menus: 0, categories: 0, variants: 0, active: 0, archived: 0 };
const EMPTY_LOOKUP: Lookup = { categories: [], outlets: [], currencyCode: "IDR" };
const EMPTY_MENU: MenuForm = { code: "", name: "", categoryId: "", description: "" };
const EMPTY_VARIANT: VariantForm = {
  sku: "",
  name: "",
  sellingPrice: "",
  currencyCode: "IDR",
  barcode: "",
  isDefault: false,
  displayOrder: 0,
  requiresRecipe: true,
};
const EMPTY_CATEGORY: CategoryForm = { code: "", name: "", displayOrder: 0 };

export function MenuProductsView() {
  const { api, session, activeOutletId } = useAuth();
  const can = useCallback(
    (permission: string) => Boolean(session?.user.permissions.includes(permission)),
    [session],
  );
  const allowed = can("menus.read"),
    canReadPrice = can("menus.prices.read");
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY),
    [categories, setCategories] = useState<Category[]>([]),
    [menus, setMenus] = useState<Menu[]>([]),
    [lookup, setLookup] = useState<Lookup>(EMPTY_LOOKUP);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("active"),
    [categoryId, setCategoryId] = useState(""),
    [outletId, setOutletId] = useState(activeOutletId);
  const [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<Menu | null>(null),
    [detail, setDetail] = useState<Menu | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [effective, setEffective] = useState<Record<string, PosItem>>({});
  const [menuForm, setMenuForm] = useState<MenuForm | null>(null),
    [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm | null>(null),
    [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null),
    [editingCategory, setEditingCategory] = useState<Category | null>(null),
    [categoryPanel, setCategoryPanel] = useState(false);
  const [outletVariant, setOutletVariant] = useState<Variant | null>(null),
    [settings, setSettings] = useState<OutletSetting[]>([]),
    [settingsLoading, setSettingsLoading] = useState(false),
    [settingsError, setSettingsError] = useState("");
  const [submitting, setSubmitting] = useState(false),
    [formError, setFormError] = useState(""),
    [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<{
    kind: "menu" | "variant" | "category";
    item: Menu | Variant | Category;
    reason: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      const [summaryData, categoryData, menuData, lookupData] = await Promise.all([
        api<Summary>("/menu-products/summary"),
        api<Category[]>("/menu-categories"),
        api<{ data: Menu[]; total: number }>("/menus?pageSize=100"),
        api<Lookup>("/menu-products/lookups"),
      ]);
      setSummary(normalizeSummary(summaryData));
      setCategories(categoryData.map(normalizeCategory));
      setMenus(menuData.data.map(normalizeMenu));
      setLookup(lookupData);
      if (outletId) {
        const pos = await api<PosItem[]>(
          `/menu-products/lookups/pos?outletId=${encodeURIComponent(outletId)}`,
        );
        setEffective(Object.fromEntries(pos.map((row) => [row.variantId, row])));
      } else setEffective({});
    } catch (cause) {
      setError(message(cause, "Menu & Produk tidak dapat dimuat."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [allowed, api, outletId]);
  useEffect(() => {
    if (activeOutletId) setOutletId(activeOutletId);
  }, [activeOutletId]);
  useEffect(() => {
    void reload;
    void load();
  }, [load, reload]);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailError("");
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    api<Menu>(`/menus/${selected.id}`)
      .then((row) => {
        if (active) setDetail(normalizeMenu(row));
      })
      .catch((cause) => {
        if (active) setDetailError(message(cause, "Detail menu tidak dapat dimuat."));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, selected, reload]);
  useEffect(() => {
    if (!outletVariant) {
      setSettings([]);
      setSettingsError("");
      return;
    }
    let active = true;
    setSettingsLoading(true);
    setSettingsError("");
    api<OutletSetting[]>(`/menu-variants/${outletVariant.id}/outlets`)
      .then((rows) => {
        if (active) setSettings(rows.map(normalizeSetting));
      })
      .catch((cause) => {
        if (active) setSettingsError(message(cause, "Konfigurasi outlet tidak dapat dimuat."));
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, outletVariant, reload]);

  const rows = useMemo(
    () =>
      menus.filter(
        (row) =>
          includes(`${row.code} ${row.name}`, query) &&
          (status === "all" || row.isActive === (status === "active")) &&
          (!categoryId || row.categoryId === categoryId) &&
          (!outletId || Object.values(effective).some((item) => item.menuId === row.id)),
      ),
    [menus, query, status, categoryId, outletId, effective],
  );
  const hasFilters = Boolean(query || categoryId || outletId || status !== "all");
  function openMenu(row?: Menu) {
    setFormError("");
    setConflict(false);
    setEditingMenu(row ?? null);
    setMenuForm(
      row
        ? {
            code: row.code,
            name: row.name,
            categoryId: row.categoryId,
            description: row.description ?? "",
          }
        : { ...EMPTY_MENU },
    );
  }
  function openVariant(row?: Variant) {
    setFormError("");
    setConflict(false);
    setEditingVariant(row ?? null);
    setVariantForm(
      row
        ? {
            sku: row.sku,
            name: row.name,
            sellingPrice: row.sellingPrice ?? "",
            currencyCode: row.currencyCode ?? lookup.currencyCode,
            barcode: row.barcode ?? "",
            isDefault: row.isDefault,
            displayOrder: row.displayOrder,
            requiresRecipe: row.requiresRecipe,
          }
        : { ...EMPTY_VARIANT, currencyCode: lookup.currencyCode },
    );
  }
  function openCategory(row?: Category) {
    setFormError("");
    setConflict(false);
    setEditingCategory(row ?? null);
    setCategoryForm(
      row
        ? { code: row.code, name: row.name, displayOrder: row.displayOrder }
        : { ...EMPTY_CATEGORY },
    );
  }
  function closeForms(force = false) {
    if (submitting && !force) return;
    setMenuForm(null);
    setVariantForm(null);
    setCategoryForm(null);
    setEditingMenu(null);
    setEditingVariant(null);
    setEditingCategory(null);
    setFormError("");
  }
  async function mutate(
    path: string,
    method: string,
    body: unknown,
    success: string,
    close = true,
  ) {
    setSubmitting(true);
    setFormError("");
    setConflict(false);
    try {
      await api(path, { method, body: JSON.stringify(body) });
      toast.success(success);
      if (close) closeForms(true);
      await load();
      setReload((value) => value + 1);
      return true;
    } catch (cause) {
      const isConflict = cause instanceof ApiError && cause.status === 409;
      setConflict(isConflict);
      setFormError(
        isConflict
          ? "Data telah berubah. Muat ulang sebelum menyimpan kembali."
          : message(cause, "Perubahan gagal disimpan."),
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  async function saveMenu(event: FormEvent) {
    event.preventDefault();
    if (!menuForm) return;
    const body = {
      ...menuForm,
      code: menuForm.code.trim().toUpperCase(),
      description: clean(menuForm.description),
      ...(editingMenu ? { lockVersion: editingMenu.lockVersion } : {}),
    };
    await mutate(
      editingMenu ? `/menus/${editingMenu.id}` : "/menus",
      editingMenu ? "PATCH" : "POST",
      body,
      editingMenu ? "Menu berhasil diperbarui" : "Menu berhasil dibuat",
    );
  }
  async function saveVariant(event: FormEvent) {
    event.preventDefault();
    if (!variantForm || !detail) return;
    const body = {
      ...variantForm,
      sku: variantForm.sku.trim().toUpperCase(),
      barcode: clean(variantForm.barcode),
      sellingPrice: variantForm.sellingPrice,
      ...(editingVariant ? { lockVersion: editingVariant.lockVersion } : {}),
    };
    if (editingVariant && !can("menus.prices.manage"))
      delete (body as Partial<VariantForm>).sellingPrice;
    await mutate(
      editingVariant ? `/menu-variants/${editingVariant.id}` : `/menus/${detail.id}/variants`,
      editingVariant ? "PATCH" : "POST",
      body,
      editingVariant ? "Variant berhasil diperbarui" : "Variant berhasil dibuat",
    );
  }
  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryForm) return;
    const body = {
      ...categoryForm,
      code: categoryForm.code.trim().toUpperCase(),
      ...(editingCategory ? { lockVersion: editingCategory.lockVersion } : {}),
    };
    await mutate(
      editingCategory ? `/menu-categories/${editingCategory.id}` : "/menu-categories",
      editingCategory ? "PATCH" : "POST",
      body,
      editingCategory ? "Kategori berhasil diperbarui" : "Kategori berhasil dibuat",
    );
  }
  async function toggle() {
    if (!confirm) return;
    const active = confirm.item.isActive,
      body = active
        ? { reason: confirm.reason, lockVersion: confirm.item.lockVersion }
        : { lockVersion: confirm.item.lockVersion };
    const base =
      confirm.kind === "menu"
        ? `/menus/${confirm.item.id}`
        : confirm.kind === "variant"
          ? `/menu-variants/${confirm.item.id}`
          : `/menu-categories/${confirm.item.id}`;
    if (
      await mutate(
        `${base}/${active ? "archive" : "activate"}`,
        "POST",
        body,
        `${label(confirm.kind)} berhasil ${active ? "diarsipkan" : "diaktifkan"}`,
        false,
      )
    ) {
      setConfirm(null);
      if (confirm.kind === "menu") setSelected(null);
    }
  }
  async function setAvailability(outletId: string, current?: OutletSetting) {
    if (!outletVariant) return;
    await mutate(
      `/menu-variants/${outletVariant.id}/outlets/${outletId}/availability`,
      "PUT",
      {
        isAvailable: !current?.isAvailable,
        isActive: true,
        ...(current ? { lockVersion: current.lockVersion } : {}),
      },
      "Availability outlet diperbarui",
      false,
    );
  }
  async function setPrice(outletId: string, current: OutletSetting, value: string) {
    if (!outletVariant) return;
    await mutate(
      `/menu-variants/${outletVariant.id}/outlets/${outletId}/price`,
      "PUT",
      { priceOverride: value.trim() || null, lockVersion: current.lockVersion },
      "Harga outlet diperbarui",
      false,
    );
  }

  if (!allowed)
    return (
      <State
        kind="forbidden"
        title="Akses Menu & Produk dibatasi"
        text="Permission menus.read diperlukan."
      />
    );
  if (loading)
    return (
      <State
        kind="loading"
        title="Memuat Menu & Produk"
        text="Kategori, menu, variant, dan lookup sedang diambil."
      />
    );
  if (error && !menus.length)
    return (
      <State
        kind="error"
        title="Menu & Produk tidak dapat dimuat"
        text={error}
        action="Coba lagi"
        onAction={() => setReload((value) => value + 1)}
      />
    );
  return (
    <div className="min-w-0">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Menu & Produk</h1>
          <p className="mt-1 text-[13px] text-mute">
            Menu, variant, availability, dan harga per outlet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            variant="outline"
            className="px-2.5"
            aria-label="Muat ulang"
            onClick={() => setReload((value) => value + 1)}
          >
            <RefreshCw className="size-3.5" />
          </Btn>
          {can("menus.categories.manage") && (
            <Btn variant="outline" onClick={() => setCategoryPanel(true)}>
              Kelola Kategori
            </Btn>
          )}
          {can("menus.create") && (
            <Btn onClick={() => openMenu()}>
              <Plus className="size-3.5" />
              Tambah Menu
            </Btn>
          )}
        </div>
      </header>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={<UtensilsCrossed />} label="Total Menu" value={summary.menus} />
        <Kpi icon={<Layers3 />} label="Kategori" value={summary.categories} />
          <Kpi icon={<Layers3 />} label="Varian" value={summary.variants} />
        <Kpi icon={<UtensilsCrossed />} label="Aktif" value={summary.active} />
          <Kpi icon={<Archive />} label="Diarsipkan" value={summary.archived} />
      </div>
      {refreshing && (
        <p className="mb-2 text-xs text-mute" role="status">
          Memperbarui…
        </p>
      )}
      {error && (
        <div className="mb-4 rounded-xl bg-terra/10 px-4 py-3 text-sm text-terra" role="alert">
          {error}
        </div>
      )}
      {!canReadPrice && (
        <div className="mb-4 rounded-xl bg-black/5 px-4 py-3 text-xs text-mute">
          Harga disembunyikan sesuai permission menus.prices.read.
        </div>
      )}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader
          title="Daftar Menu"
          sub={`${rows.length} menu`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute" />
                <TextInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari menu…"
                  className="w-40 pl-8 sm:w-52"
                />
              </div>
              <SelectInput
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-36"
              >
                <option value="">Semua kategori</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-32"
              >
                <option value="active">Aktif</option>
                <option value="archived">Diarsipkan</option>
                <option value="all">Semua</option>
              </SelectInput>
              <SelectInput
                aria-label="Filter outlet POS-ready"
                value={outletId}
                onChange={(event) => setOutletId(event.target.value)}
                className="w-36"
              >
                <option value="">Semua outlet</option>
                {lookup.outlets.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </SelectInput>
            </div>
          }
        />
        {rows.length ? (
          <DataTable head={["Kode", "Nama", "Kategori", "Variant", "Lock", "Status", ""]} wide>
            {rows.map((row) => (
              <Row key={row.id} onClick={() => setSelected(row)}>
                <Cell className="mono font-medium">{row.code}</Cell>
                <Cell className="font-medium">{row.name}</Cell>
                <Cell className="text-mute">{row.categoryName}</Cell>
                <Cell className="mono text-right">{row.variantCount}</Cell>
                <Cell className="mono text-mute">v{row.lockVersion}</Cell>
                <Cell>
                  <StatusBadge label={row.isActive ? "active" : "archived"} />
                </Cell>
                <Cell>
                  <Actions
                    edit={can("menus.update")}
                    archive={can("menus.archive")}
                    active={row.isActive}
                    onEdit={() => openMenu(row)}
                    onToggle={() => setConfirm({ kind: "menu", item: row, reason: "" })}
                  />
                </Cell>
              </Row>
            ))}
          </DataTable>
        ) : (
          <State
            kind="empty"
            title={hasFilters ? "Tidak ada hasil" : "Belum ada menu"}
            text={
              hasFilters
                ? "Ubah pencarian atau filter aktif."
                : "Tambahkan menu pertama untuk tenant ini."
            }
          />
        )}
      </Card>
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={detail?.name ?? selected?.name ?? "Detail Menu"}
        sub={
          detail
            ? `${detail.code} · ${detail.categoryName} · v${detail.lockVersion}`
            : selected?.code
        }
      >
        {detailLoading ? (
              <State kind="loading" title="Memuat detail" text="Varian sedang diambil." />
        ) : detailError ? (
          <State
            kind="error"
            title="Detail gagal dimuat"
            text={detailError}
            action="Coba lagi"
            onAction={() => setReload((value) => value + 1)}
          />
        ) : (
          detail && (
            <MenuDetail
              menu={detail}
              can={can}
              canReadPrice={canReadPrice}
              effective={effective}
              activeOutlet={lookup.outlets.find((row) => row.id === activeOutletId)?.name}
              onAdd={() => openVariant()}
              onEdit={openVariant}
              onOutlet={setOutletVariant}
              onToggle={(row) => setConfirm({ kind: "variant", item: row, reason: "" })}
            />
          )
        )}
      </Drawer>
      <Modal
        open={Boolean(menuForm)}
        onClose={closeForms}
        title={editingMenu ? "Ubah Menu" : "Tambah Menu"}
        wide
      >
        {menuForm && (
          <MenuEditor
            form={menuForm}
            setForm={setMenuForm}
            categories={lookup.categories}
            error={formError}
            conflict={conflict}
            submitting={submitting}
            onSubmit={saveMenu}
            onCancel={closeForms}
            onReload={() => {
              closeForms(true);
              setReload((value) => value + 1);
            }}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(variantForm)}
        onClose={closeForms}
        title={editingVariant ? "Ubah Varian" : "Tambah Varian"}
        wide
      >
        {variantForm && (
          <VariantEditor
            form={variantForm}
            setForm={setVariantForm}
            canPrice={can("menus.prices.manage")}
            error={formError}
            conflict={conflict}
            submitting={submitting}
            onSubmit={saveVariant}
            onCancel={closeForms}
            onReload={() => {
              closeForms(true);
              setReload((value) => value + 1);
            }}
          />
        )}
      </Modal>
      <Modal
        open={categoryPanel}
        onClose={() => setCategoryPanel(false)}
        title="Kategori Menu"
        wide
      >
        <CategoryPanel
          rows={categories}
          canManage={can("menus.categories.manage")}
          onAdd={() => openCategory()}
          onEdit={openCategory}
          onToggle={(row) => setConfirm({ kind: "category", item: row, reason: "" })}
        />
      </Modal>
      <Modal
        open={Boolean(categoryForm)}
        onClose={closeForms}
        title={editingCategory ? "Ubah Kategori" : "Tambah Kategori"}
      >
        {categoryForm && (
          <CategoryEditor
            form={categoryForm}
            setForm={setCategoryForm}
            error={formError}
            conflict={conflict}
            submitting={submitting}
            onSubmit={saveCategory}
            onCancel={closeForms}
            onReload={() => {
              closeForms(true);
              setReload((value) => value + 1);
            }}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(outletVariant)}
        onClose={() => setOutletVariant(null)}
        title={`Outlet · ${outletVariant?.name ?? ""}`}
        wide
      >
        <OutletPanel
          variant={outletVariant}
          outlets={lookup.outlets}
          settings={settings}
          loading={settingsLoading}
          error={settingsError || formError}
          canAvailability={can("menus.outlets.manage")}
          canPrice={can("menus.prices.manage")}
          canReadPrice={canReadPrice}
          submitting={submitting}
          onAvailability={(id, current) => void setAvailability(id, current)}
          onPrice={(id, current, value) => void setPrice(id, current, value)}
          onRetry={() => setReload((value) => value + 1)}
        />
      </Modal>
      <Modal
        open={Boolean(confirm)}
        onClose={() => !submitting && setConfirm(null)}
        title={confirm?.item.isActive ? "Arsipkan data?" : "Aktifkan kembali?"}
      >
        {confirm?.item.isActive && (
          <Field label="Alasan arsip" required>
            <TextArea
              minLength={3}
              maxLength={500}
              value={confirm.reason}
              onChange={(event) => setConfirm({ ...confirm, reason: event.target.value })}
            />
          </Field>
        )}
        <FormError
          text={formError}
          conflict={conflict}
          onReload={() => {
            setConfirm(null);
            setReload((value) => value + 1);
          }}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" disabled={submitting} onClick={() => setConfirm(null)}>
            Batal
          </Btn>
          <Btn
            variant={confirm?.item.isActive ? "danger" : "primary"}
            disabled={
              submitting || Boolean(confirm?.item.isActive && confirm.reason.trim().length < 3)
            }
            onClick={() => void toggle()}
          >
            {submitting ? "Memproses…" : confirm?.item.isActive ? "Arsipkan" : "Aktifkan"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function MenuDetail(p: {
  menu: Menu;
  can: (permission: string) => boolean;
  canReadPrice: boolean;
  effective: Record<string, PosItem>;
  activeOutlet?: string;
  onAdd: () => void;
  onEdit: (row: Variant) => void;
  onOutlet: (row: Variant) => void;
  onToggle: (row: Variant) => void;
}) {
  return (
    <div className="space-y-4">
      {p.menu.description && <p className="text-sm text-mute">{p.menu.description}</p>}
      <div className="flex justify-between">
        <StatusBadge label={p.menu.isActive ? "active" : "archived"} />
        {p.can("menus.variants.manage") && p.can("menus.prices.manage") && p.menu.isActive && (
          <Btn onClick={p.onAdd}>
            <Plus className="size-3.5" />
            Variant
          </Btn>
        )}
      </div>
      {p.menu.variants?.length ? (
        p.menu.variants.map((row) => (
          <Card key={row.id} className="p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <strong className="text-sm">{row.name}</strong>
                {row.isDefault && (
                  <Badge tone="olive" className="ml-2">
                    default
                  </Badge>
                )}
                <p className="mono mt-1 text-[11px] text-mute">
                  {row.sku} · urutan {row.displayOrder} · v{row.lockVersion}
                </p>
              </div>
              <div className="text-right">
                {p.canReadPrice ? (
                  <>
                    <strong className="mono text-sm">
                      {money(row.sellingPrice, row.currencyCode)}
                    </strong>
                    {p.effective[row.id] && (
                      <small className="block text-[11px] text-mute">
                        Effective {p.activeOutlet}:{" "}
                        {money(
                          p.effective[row.id].effectiveSellingPrice,
                          p.effective[row.id].currencyCode,
                        )}
                      </small>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-mute">Harga dirahasiakan</span>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <StatusBadge label={row.isActive ? "active" : "archived"} />
                {row.requiresRecipe && (
                  <Badge tone="amber" className="ml-1">
                    requires recipe
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {p.can("menus.variants.manage") && (
                  <Btn
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={!row.isActive}
                    onClick={() => p.onEdit(row)}
                  >
                    Ubah
                  </Btn>
                )}
                {p.can("menus.outlets.manage") && (
                  <Btn
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => p.onOutlet(row)}
                  >
                    Outlet
                  </Btn>
                )}
                {p.can("menus.variants.manage") && (
                  <Btn
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => p.onToggle(row)}
                  >
                    {row.isActive ? "Arsipkan" : "Aktifkan"}
                  </Btn>
                )}
              </div>
            </div>
          </Card>
        ))
      ) : (
        <State
          kind="empty"
          title="Belum ada variant"
          text="Tambahkan variant secara eksplisit; sistem tidak membuat variant otomatis."
        />
      )}
    </div>
  );
}
function CategoryPanel(p: {
  rows: Category[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (row: Category) => void;
  onToggle: (row: Category) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {p.canManage && (
          <Btn onClick={p.onAdd}>
            <Plus className="size-3.5" />
            Kategori
          </Btn>
        )}
      </div>
      {p.rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream p-3 text-xs ring-1 ring-black/5"
        >
          <span>
            <strong>{row.name}</strong>
            <small className="mono ml-2 text-mute">
              {row.code} · urutan {row.displayOrder} · {row.activeMenuCount} menu aktif · v
              {row.lockVersion}
            </small>
          </span>
          <div className="flex items-center gap-1">
            <StatusBadge label={row.isActive ? "active" : "archived"} />
            {p.canManage && (
              <>
                <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => p.onEdit(row)}>
                  Ubah
                </Btn>
                <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => p.onToggle(row)}>
                  {row.isActive ? "Arsipkan" : "Aktifkan"}
                </Btn>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
function OutletPanel(p: {
  variant: Variant | null;
  outlets: Lookup["outlets"];
  settings: OutletSetting[];
  loading: boolean;
  error: string;
  canAvailability: boolean;
  canPrice: boolean;
  canReadPrice: boolean;
  submitting: boolean;
  onAvailability: (id: string, current?: OutletSetting) => void;
  onPrice: (id: string, current: OutletSetting, value: string) => void;
  onRetry: () => void;
}) {
  if (p.loading)
    return (
      <State kind="loading" title="Memuat outlet" text="Availability dan harga sedang diambil." />
    );
  if (p.error)
    return (
      <State
        kind="error"
        title="Konfigurasi outlet bermasalah"
        text={p.error}
        action="Muat ulang"
        onAction={p.onRetry}
      />
    );
  return (
    <div className="space-y-2">
      {p.outlets.map((outlet) => {
        const current = p.settings.find((row) => row.outletId === outlet.id);
        return (
          <OutletRow
            key={outlet.id}
            outlet={outlet}
            current={current}
            canAvailability={p.canAvailability}
            canPrice={p.canPrice}
            canReadPrice={p.canReadPrice}
            submitting={p.submitting}
            onAvailability={() => p.onAvailability(outlet.id, current)}
            onPrice={(value) => current && p.onPrice(outlet.id, current, value)}
          />
        );
      })}
    </div>
  );
}
function OutletRow(p: {
  outlet: Lookup["outlets"][number];
  current?: OutletSetting;
  canAvailability: boolean;
  canPrice: boolean;
  canReadPrice: boolean;
  submitting: boolean;
  onAvailability: () => void;
  onPrice: (value: string) => void;
}) {
  const currentPrice = p.current?.priceOverride ?? "";
  const [price, setPrice] = useState(currentPrice);
  useEffect(() => setPrice(currentPrice), [currentPrice]);
  return (
    <div className="rounded-lg bg-cream p-3 ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="text-sm">{p.outlet.name}</strong>
          <p className="text-xs text-mute">
            {p.current
              ? p.current.isAvailable
                ? "Tersedia"
                : "Tidak tersedia"
              : "Belum dikonfigurasi"}
            {p.current ? ` · v${p.current.lockVersion}` : ""}
          </p>
        </div>
        {p.canAvailability && (
          <Btn variant="outline" disabled={p.submitting} onClick={p.onAvailability}>
            {p.current?.isAvailable ? "Nonaktifkan" : "Aktifkan"}
          </Btn>
        )}
      </div>
      {p.canReadPrice && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Price override">
            <TextInput
              type="number"
              min={0}
              step="0.01"
              disabled={!p.current || !p.canPrice}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Kembali ke base price"
            />
          </Field>
          {p.canPrice && (
            <Btn disabled={!p.current || p.submitting} onClick={() => p.onPrice(price)}>
              Simpan Harga
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
function MenuEditor(p: EditorProps<MenuForm> & { categories: Lookup["categories"] }) {
  const f = p.form;
  return (
    <form onSubmit={p.onSubmit} className="space-y-3">
      <FormError text={p.error} conflict={p.conflict} onReload={p.onReload} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Kode menu" required>
          <TextInput
            required
            minLength={2}
            maxLength={50}
            pattern="[A-Za-z0-9_-]+"
            value={f.code}
            onChange={(event) => p.setForm({ ...f, code: event.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Nama menu" required>
          <TextInput
            required
            minLength={2}
            maxLength={150}
            value={f.name}
            onChange={(event) => p.setForm({ ...f, name: event.target.value })}
          />
        </Field>
        <Field label="Kategori" required>
          <SelectInput
            required
            value={f.categoryId}
            onChange={(event) => p.setForm({ ...f, categoryId: event.target.value })}
          >
            <option value="">Pilih kategori aktif</option>
            {p.categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} — {row.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label="Deskripsi">
        <TextArea
          maxLength={2000}
          value={f.description}
          onChange={(event) => p.setForm({ ...f, description: event.target.value })}
        />
      </Field>
      <FormActions submitting={p.submitting} onCancel={p.onCancel} />
    </form>
  );
}
function VariantEditor(p: EditorProps<VariantForm> & { canPrice: boolean }) {
  const f = p.form;
  return (
    <form onSubmit={p.onSubmit} className="space-y-3">
      <FormError text={p.error} conflict={p.conflict} onReload={p.onReload} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SKU variant" required>
          <TextInput
            required
            minLength={2}
            maxLength={40}
            pattern="[A-Za-z0-9_-]+"
            value={f.sku}
            onChange={(event) => p.setForm({ ...f, sku: event.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Nama variant" required>
          <TextInput
            required
            maxLength={100}
            value={f.name}
            onChange={(event) => p.setForm({ ...f, name: event.target.value })}
          />
        </Field>
        <Field label="Base selling price" required>
          <TextInput
            required
            type="number"
            min={0}
            step="0.01"
            disabled={!p.canPrice}
            value={f.sellingPrice}
            onChange={(event) => p.setForm({ ...f, sellingPrice: event.target.value })}
          />
        </Field>
        <Field label="Currency">
          <TextInput value={f.currencyCode} disabled />
        </Field>
        <Field label="Barcode">
          <TextInput
            maxLength={100}
            value={f.barcode}
            onChange={(event) => p.setForm({ ...f, barcode: event.target.value })}
          />
        </Field>
        <Field label="Display order">
          <TextInput
            type="number"
            min={0}
            value={f.displayOrder}
            onChange={(event) => p.setForm({ ...f, displayOrder: Number(event.target.value) })}
          />
        </Field>
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.isDefault}
          onChange={(event) => p.setForm({ ...f, isDefault: event.target.checked })}
        />
        Variant default
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.requiresRecipe}
          onChange={(event) => p.setForm({ ...f, requiresRecipe: event.target.checked })}
        />
        Requires recipe
      </label>
      <FormActions submitting={p.submitting} onCancel={p.onCancel} />
    </form>
  );
}
function CategoryEditor(p: EditorProps<CategoryForm>) {
  const f = p.form;
  return (
    <form onSubmit={p.onSubmit} className="space-y-3">
      <FormError text={p.error} conflict={p.conflict} onReload={p.onReload} />
      <Field label="Kode" required>
        <TextInput
          required
          minLength={2}
          maxLength={40}
          pattern="[A-Za-z0-9_-]+"
          value={f.code}
          onChange={(event) => p.setForm({ ...f, code: event.target.value.toUpperCase() })}
        />
      </Field>
      <Field label="Nama" required>
        <TextInput
          required
          minLength={2}
          maxLength={100}
          value={f.name}
          onChange={(event) => p.setForm({ ...f, name: event.target.value })}
        />
      </Field>
      <Field label="Display order">
        <TextInput
          type="number"
          min={0}
          value={f.displayOrder}
          onChange={(event) => p.setForm({ ...f, displayOrder: Number(event.target.value) })}
        />
      </Field>
      <FormActions submitting={p.submitting} onCancel={p.onCancel} />
    </form>
  );
}

type EditorProps<T> = {
  form: T;
  setForm: (value: T) => void;
  error: string;
  conflict: boolean;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onReload: () => void;
};
function Actions(p: {
  edit: boolean;
  archive: boolean;
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
      {p.edit && (
        <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={p.onEdit}>
          Ubah
        </Btn>
      )}
      {p.archive && (
        <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={p.onToggle}>
          {p.active ? "Arsipkan" : "Aktifkan"}
        </Btn>
      )}
    </div>
  );
}
function FormError({
  text,
  conflict,
  onReload,
}: {
  text: string;
  conflict: boolean;
  onReload: () => void;
}) {
  return text ? (
    <div className="rounded-lg bg-terra/10 p-3 text-xs text-terra" role="alert">
      <strong>{conflict ? "Konflik versi: " : ""}</strong>
      {text}
      {conflict && (
        <button type="button" className="ml-2 underline" onClick={onReload}>
          Muat ulang
        </button>
      )}
    </div>
  ) : null;
}
function FormActions({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Btn type="button" variant="ghost" disabled={submitting} onClick={onCancel}>
        Batal
      </Btn>
      <Btn type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : "Simpan"}
      </Btn>
    </div>
  );
}
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2 text-mute">
        <span className="[&>svg]:size-3.5">{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="mono mt-2 text-xl font-semibold">{value}</p>
    </Card>
  );
}
function State({
  kind,
  title,
  text,
  action,
  onAction,
}: {
  kind: "loading" | "empty" | "forbidden" | "error";
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="grid min-h-48 place-items-center px-5 py-8 text-center"
      role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}
    >
      <div>
        {kind === "loading" && (
          <span className="mx-auto mb-3 block size-7 animate-spin rounded-full border-2 border-olive/20 border-t-olive" />
        )}
        <strong className="block text-sm">{title}</strong>
        <p className="mt-1 text-xs text-mute">{text}</p>
        {action && (
          <Btn className="mt-4" onClick={onAction}>
            {action}
          </Btn>
        )}
      </div>
    </div>
  );
}
function normalizeSummary(row: Summary): Summary {
  return {
    menus: Number(row.menus),
    categories: Number(row.categories),
    variants: Number(row.variants),
    active: Number(row.active),
    archived: Number(row.archived),
  };
}
function normalizeCategory(row: Category): Category {
  return {
    ...row,
    displayOrder: Number(row.displayOrder),
    lockVersion: Number(row.lockVersion),
    activeMenuCount: Number(row.activeMenuCount),
  };
}
function normalizeMenu(row: Menu): Menu {
  return {
    ...row,
    lockVersion: Number(row.lockVersion),
    variantCount: Number(row.variantCount ?? row.variants?.length ?? 0),
    variants: row.variants?.map((variant) => ({
      ...variant,
      displayOrder: Number(variant.displayOrder),
      lockVersion: Number(variant.lockVersion),
    })),
  };
}
function normalizeSetting(row: OutletSetting): OutletSetting {
  return { ...row, lockVersion: Number(row.lockVersion) };
}
function includes(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}
function clean(value: string) {
  return value.trim() || null;
}
function label(kind: "menu" | "variant" | "category") {
  return kind === "category" ? "Kategori" : kind === "variant" ? "Variant" : "Menu";
}
function message(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}
function money(value?: string, currency = "IDR") {
  return value === undefined
    ? "Dirahasiakan"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(value));
}
