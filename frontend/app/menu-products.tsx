"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./menu-products.css";

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
  lockVersion: number;
  activeMenuCount: number;
};
type Variant = {
  id: string;
  sku: string;
  name: string;
  sellingPrice?: string;
  currencyCode?: string;
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
  categoryId: string;
  categoryName: string;
  description?: string;
  isActive: boolean;
  lockVersion: number;
  variantCount: number;
  variants?: Variant[];
};
type Lookup = {
  categories: Pick<Category, "id" | "code" | "name">[];
  outlets: { id: string; code: string; name: string }[];
  currencyCode: string;
};

export function ConnectedMenuProducts({
  session,
  api,
  onNotify,
}: {
  session: AuthSession;
  api: ApiClient;
  onNotify: (message: string) => void;
}) {
  const can = (permission: string) =>
    session.user.permissions.includes(permission);
  const canRead = session.user.permissions.includes("menus.read");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [lookups, setLookups] = useState<Lookup>({
    categories: [],
    outlets: [],
    currencyCode: "IDR",
  });
  const [selected, setSelected] = useState<Menu | null>(null);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [outletVariant, setOutletVariant] = useState<Variant | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(!canRead);
  const [conflict, setConflict] = useState("");
  const [panel, setPanel] = useState<
    "menu" | "category" | "variant" | "outlet" | null
  >(null);

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (status) params.set("isActive", status);
      const [summaryData, categoryData, menuData, lookupData] =
        await Promise.all([
          api<Summary>("/menu-products/summary"),
          api<Category[]>("/menu-categories"),
          api<{ data: Menu[] }>(`/menus?${params}`),
          api<Lookup>("/menu-products/lookups"),
        ]);
      setSummary(summaryData);
      setCategories(categoryData);
      setMenus(menuData.data);
      setLookups(lookupData);
      setForbidden(false);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Menu & Produk gagal dimuat.";
      if (/forbidden|403|akses/i.test(message)) setForbidden(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [api, query, status, canRead]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openMenu(id: string) {
    try {
      setSelected(await api<Menu>(`/menus/${id}`));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Detail menu gagal dimuat.",
      );
    }
  }

  async function mutate(
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) {
    setConflict("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setPanel(null);
      await load();
      if (selected) await openMenu(selected.id);
      onNotify(message);
    } catch (cause) {
      const text =
        cause instanceof Error ? cause.message : "Perubahan gagal disimpan.";
      if (/berubah|409|conflict/i.test(text)) setConflict(text);
      else setError(text);
    }
  }

  if (forbidden)
    return (
      <section className="mp-state">
        <h2>Akses dibatasi</h2>
        <p>
          Anda tidak memiliki permission <code>menus.read</code>.
        </p>
      </section>
    );
  if (loading && !summary)
    return (
      <section className="mp-state">
        <span className="mp-spinner" />
        <h2>Memuat Menu & Produk</h2>
        <p>Menyiapkan category, menu, variant, dan konfigurasi outlet.</p>
      </section>
    );
  if (error && !summary)
    return (
      <section className="mp-state error">
        <h2>Data tidak dapat dimuat</h2>
        <p>{error}</p>
        <button onClick={() => void load()}>Coba lagi</button>
      </section>
    );

  return (
    <section className="menu-products">
      <div className="mp-summary">
        {(
          ["menus", "categories", "variants", "active", "archived"] as const
        ).map((key) => (
          <article key={key}>
            <span>
              {key === "menus"
                ? "Menu"
                : key === "categories"
                  ? "Kategori"
                  : key === "variants"
                    ? "Variant"
                    : key === "active"
                      ? "Aktif"
                      : "Archived"}
            </span>
            <strong>{summary?.[key] ?? 0}</strong>
          </article>
        ))}
      </div>
      {error && (
        <div className="mp-banner error">
          {error}
          <button onClick={() => setError("")}>Tutup</button>
        </div>
      )}
      {conflict && (
        <div className="mp-banner conflict">
          <strong>Data telah berubah</strong>
          <span>{conflict}</span>
          <button onClick={() => void load()}>Muat ulang</button>
        </div>
      )}
      {!can("menus.create") && !can("menus.update") && (
        <div className="mp-banner">
          Mode read-only. Anda dapat melihat data tetapi tidak dapat
          mengubahnya.
        </div>
      )}
      {!can("menus.prices.read") && (
        <div className="mp-banner">
          Harga disembunyikan sesuai permission Anda.
        </div>
      )}
      <div className="mp-toolbar">
        <input
          aria-label="Cari menu"
          placeholder="Cari kode atau nama menu…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Filter status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Archived</option>
        </select>
        {can("menus.categories.manage") && (
          <button onClick={() => setPanel("category")}>Kelola kategori</button>
        )}
        {can("menus.create") && (
          <button
            className="primary-button"
            onClick={() => {
              setEditingMenu(null);
              setPanel("menu");
            }}
          >
            Tambah menu
          </button>
        )}
      </div>
      <div className="mp-layout">
        <div className="mp-table-wrap">
          {!menus.length ? (
            <div className="mp-empty">
              <h3>Belum ada menu</h3>
              <p>Buat menu pertama setelah category aktif tersedia.</p>
            </div>
          ) : (
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Kategori</th>
                  <th>Variant</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {menus.map((menu) => (
                  <tr
                    key={menu.id}
                    className={!menu.isActive ? "archived" : ""}
                  >
                    <td>
                      <strong>{menu.name}</strong>
                      <small>{menu.code}</small>
                    </td>
                    <td>{menu.categoryName}</td>
                    <td>{menu.variantCount}</td>
                    <td>
                      <span
                        className={`mp-status ${menu.isActive ? "active" : "archived"}`}
                      >
                        {menu.isActive ? "Aktif" : "Archived"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => void openMenu(menu.id)}>
                        Detail
                      </button>
                      {can("menus.update") && (
                        <button
                          onClick={() => {
                            setEditingMenu(menu);
                            setPanel("menu");
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <aside className="mp-detail">
            <button
              className="mp-close"
              aria-label="Tutup detail"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <span className="eyebrow">{selected.code}</span>
            <h2>{selected.name}</h2>
            <p>{selected.description || "Tidak ada deskripsi."}</p>
            <dl>
              <div>
                <dt>Kategori</dt>
                <dd>{selected.categoryName}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selected.isActive ? "Aktif" : "Archived"}</dd>
              </div>
            </dl>
            <div className="mp-detail-actions">
              {can("menus.update") && (
                <button
                  onClick={() => {
                    setEditingMenu(selected);
                    setPanel("menu");
                  }}
                >
                  Edit menu
                </button>
              )}
              {can("menus.variants.manage") && selected.isActive && (
                <button onClick={() => setPanel("variant")}>
                  Tambah variant
                </button>
              )}
              {can("menus.archive") && (
                <button
                  onClick={() =>
                    void mutate(
                      `/menus/${selected.id}/${selected.isActive ? "archive" : "activate"}`,
                      "POST",
                      selected.isActive
                        ? {
                            reason: "Diarsipkan dari Menu Master",
                            lockVersion: selected.lockVersion,
                          }
                        : { lockVersion: selected.lockVersion },
                      `Menu ${selected.isActive ? "diarsipkan" : "diaktifkan"}.`,
                    )
                  }
                >
                  {selected.isActive ? "Archive" : "Aktifkan"}
                </button>
              )}
            </div>
            <h3>Variant</h3>
            {selected.variants?.length ? (
              selected.variants.map((variant) => (
                <article
                  className={`mp-variant ${!variant.isActive ? "archived" : ""}`}
                  key={variant.id}
                >
                  <div>
                    <strong>{variant.name}</strong>
                    <small>
                      {variant.sku} ·{" "}
                      {variant.requiresRecipe ? "Perlu recipe" : "Tanpa recipe"}
                    </small>
                  </div>
                  <div>
                    {can("menus.prices.read") ? (
                      <b>
                        {variant.currencyCode}{" "}
                        {Number(variant.sellingPrice).toLocaleString("id-ID")}
                      </b>
                    ) : (
                      <em>Harga dirahasiakan</em>
                    )}
                    <div className="mp-variant-actions">
                      {can("menus.prices.manage") &&
                        variant.sellingPrice !== undefined && (
                          <button
                            onClick={() => {
                              const price = window.prompt(
                                "Base selling price",
                                variant.sellingPrice,
                              );
                              if (price)
                                void mutate(
                                  `/menu-variants/${variant.id}`,
                                  "PATCH",
                                  {
                                    sellingPrice: price,
                                    lockVersion: variant.lockVersion,
                                  },
                                  "Base price diperbarui.",
                                );
                            }}
                          >
                            Harga
                          </button>
                        )}
                      {can("menus.variants.manage") && (
                        <button
                          onClick={() =>
                            void mutate(
                              `/menu-variants/${variant.id}/${variant.isActive ? "archive" : "activate"}`,
                              "POST",
                              variant.isActive
                                ? {
                                    reason: "Diarsipkan dari Menu Master",
                                    lockVersion: variant.lockVersion,
                                  }
                                : { lockVersion: variant.lockVersion },
                              `Variant ${variant.isActive ? "diarsipkan" : "diaktifkan"}.`,
                            )
                          }
                        >
                          {variant.isActive ? "Archive" : "Aktifkan"}
                        </button>
                      )}
                      {can("menus.outlets.manage") && (
                        <button
                          onClick={() => {
                            setOutletVariant(variant);
                            setPanel("outlet");
                          }}
                        >
                          Outlet
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="mp-muted">Belum ada variant.</p>
            )}
            <h3>Hubungan Recipe</h3>
            <p className="mp-muted">
              Variant dengan “Perlu recipe” harus memiliki current approved
              recipe sebelum muncul pada POS-ready lookup.
            </p>
          </aside>
        )}
      </div>
      {panel === "menu" && (
        <MenuForm
          categories={categories}
          initial={editingMenu}
          onClose={() => {
            setPanel(null);
            setEditingMenu(null);
          }}
          onSubmit={(body) => {
            const current = editingMenu;
            return current
              ? mutate(
                  `/menus/${current.id}`,
                  "PATCH",
                  { ...body, lockVersion: current.lockVersion },
                  "Menu berhasil diperbarui.",
                )
              : mutate("/menus", "POST", body, "Menu berhasil dibuat.");
          }}
        />
      )}
      {panel === "category" && (
        <CategoryPanel
          categories={categories}
          canManage={can("menus.categories.manage")}
          onClose={() => setPanel(null)}
          onMutate={mutate}
        />
      )}
      {panel === "variant" && selected && (
        <VariantForm
          currency={lookups.currencyCode}
          onClose={() => setPanel(null)}
          onSubmit={(body) =>
            mutate(
              `/menus/${selected.id}/variants`,
              "POST",
              body,
              "Variant berhasil dibuat.",
            )
          }
        />
      )}
      {panel === "outlet" && outletVariant && (
        <OutletPanel
          api={api}
          variant={outletVariant}
          outlets={lookups.outlets}
          canPrice={can("menus.prices.manage")}
          onClose={() => setPanel(null)}
          onMutate={mutate}
        />
      )}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mp-modal-backdrop" role="presentation">
      <section
        className="mp-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Tutup" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function MenuForm({
  categories,
  initial,
  onClose,
  onSubmit,
}: {
  categories: Array<
    Pick<Category, "id" | "code" | "name"> & Partial<Pick<Category, "isActive">>
  >;
  initial?: Menu | null;
  onClose: () => void;
  onSubmit: (body: unknown) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: Record<string, FormDataEntryValue | null> = {
      code: data.get("code"),
      name: data.get("name"),
      description: data.get("description"),
    };
    if (!initial || data.get("categoryId") !== initial.categoryId)
      body.categoryId = data.get("categoryId");
    onSubmit(body);
  }
  return (
    <Modal
      title={initial ? `Edit ${initial.name}` : "Tambah menu"}
      onClose={onClose}
    >
      <form className="mp-form" onSubmit={submit}>
        <label>
          Kode menu
          <input
            name="code"
            required
            pattern="[A-Za-z0-9_-]+"
            defaultValue={initial?.code}
          />
        </label>
        <label>
          Nama menu
          <input name="name" required defaultValue={initial?.name} />
        </label>
        <label>
          Kategori
          <select
            name="categoryId"
            required
            defaultValue={initial?.categoryId ?? ""}
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
                disabled={
                  category.isActive === false &&
                  category.id !== initial?.categoryId
                }
              >
                {category.name}
                {category.isActive === false ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Deskripsi
          <textarea name="description" defaultValue={initial?.description} />
        </label>
        <footer>
          <button type="button" onClick={onClose}>
            Batal
          </button>
          <button className="primary-button">Simpan</button>
        </footer>
      </form>
    </Modal>
  );
}
function VariantForm({
  currency,
  onClose,
  onSubmit,
}: {
  currency: string;
  onClose: () => void;
  onSubmit: (body: unknown) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      sku: data.get("sku"),
      name: data.get("name"),
      sellingPrice: data.get("sellingPrice"),
      currencyCode: currency,
      displayOrder: Number(data.get("displayOrder")),
      isDefault: data.get("isDefault") === "on",
      requiresRecipe: data.get("requiresRecipe") === "on",
    });
  }
  return (
    <Modal title="Tambah variant" onClose={onClose}>
      <form className="mp-form" onSubmit={submit}>
        <label>
          SKU
          <input name="sku" required pattern="[A-Za-z0-9_-]+" />
        </label>
        <label>
          Nama variant
          <input name="name" required />
        </label>
        <label>
          Base selling price ({currency})
          <input
            name="sellingPrice"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          Display order
          <input name="displayOrder" type="number" min="0" defaultValue="0" />
        </label>
        <label className="mp-check">
          <input name="isDefault" type="checkbox" /> Variant default
        </label>
        <label className="mp-check">
          <input name="requiresRecipe" type="checkbox" defaultChecked />{" "}
          Memerlukan approved recipe untuk POS
        </label>
        <footer>
          <button type="button" onClick={onClose}>
            Batal
          </button>
          <button className="primary-button">Simpan</button>
        </footer>
      </form>
    </Modal>
  );
}
function CategoryPanel({
  categories,
  canManage,
  onClose,
  onMutate,
}: {
  categories: Category[];
  canManage: boolean;
  onClose: () => void;
  onMutate: (
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onMutate(
      "/menu-categories",
      "POST",
      {
        code: data.get("code"),
        name: data.get("name"),
        displayOrder: Number(data.get("displayOrder")),
      },
      "Kategori berhasil dibuat.",
    );
  }
  return (
    <Modal title="Kategori menu" onClose={onClose}>
      <div className="mp-category-list">
        {categories.map((category) => (
          <article key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <small>
                {category.code} · {category.activeMenuCount} menu aktif
              </small>
            </div>
            {canManage && (
              <button
                disabled={category.isActive && category.activeMenuCount > 0}
                onClick={() =>
                  void onMutate(
                    `/menu-categories/${category.id}/${category.isActive ? "archive" : "activate"}`,
                    "POST",
                    category.isActive
                      ? {
                          reason: "Diarsipkan dari Menu Master",
                          lockVersion: category.lockVersion,
                        }
                      : { lockVersion: category.lockVersion },
                    "Status kategori diperbarui.",
                  )
                }
              >
                {category.isActive ? "Archive" : "Aktifkan"}
              </button>
            )}
          </article>
        ))}
      </div>
      {canManage && (
        <form className="mp-form compact" onSubmit={submit}>
          <h3>Kategori baru</h3>
          <label>
            Kode
            <input name="code" required />
          </label>
          <label>
            Nama
            <input name="name" required />
          </label>
          <label>
            Urutan
            <input name="displayOrder" type="number" min="0" defaultValue="0" />
          </label>
          <button className="primary-button">Tambah</button>
        </form>
      )}
    </Modal>
  );
}
function OutletPanel({
  api,
  variant,
  outlets,
  canPrice,
  onClose,
  onMutate,
}: {
  api: ApiClient;
  variant: Variant;
  outlets: Lookup["outlets"];
  canPrice: boolean;
  onClose: () => void;
  onMutate: (
    path: string,
    method: string,
    body: unknown,
    message: string,
  ) => void;
}) {
  const [settings, setSettings] = useState<
    {
      outletId: string;
      isAvailable: boolean;
      isActive: boolean;
      priceOverride?: string;
      lockVersion: number;
    }[]
  >([]);
  useEffect(() => {
    void api<typeof settings>(`/menu-variants/${variant.id}/outlets`).then(
      setSettings,
    );
  }, [api, variant.id]);
  return (
    <Modal title={`Outlet · ${variant.name}`} onClose={onClose}>
      <div className="mp-category-list">
        {outlets.map((outlet) => {
          const setting = settings.find((item) => item.outletId === outlet.id);
          return (
            <article key={outlet.id}>
              <div>
                <strong>{outlet.name}</strong>
                <small>
                  {setting
                    ? setting.isAvailable
                      ? "Tersedia"
                      : "Tidak tersedia"
                    : "Belum dikonfigurasi"}
                  {canPrice && setting?.priceOverride
                    ? ` · Override ${setting.priceOverride}`
                    : ""}
                </small>
              </div>
              <button
                onClick={() =>
                  void onMutate(
                    `/menu-variants/${variant.id}/outlets/${outlet.id}/availability`,
                    "PUT",
                    {
                      isAvailable: !setting?.isAvailable,
                      isActive: true,
                      lockVersion: setting?.lockVersion,
                    },
                    "Availability outlet diperbarui.",
                  )
                }
              >
                {setting?.isAvailable ? "Nonaktifkan" : "Aktifkan"}
              </button>
              {canPrice && setting && (
                <button
                  onClick={() => {
                    const value = window.prompt(
                      "Price override (kosongkan untuk kembali ke base price)",
                      setting.priceOverride || "",
                    );
                    if (value !== null)
                      void onMutate(
                        `/menu-variants/${variant.id}/outlets/${outlet.id}/price`,
                        "PUT",
                        {
                          priceOverride: value || null,
                          lockVersion: setting.lockVersion,
                        },
                        "Price override diperbarui.",
                      );
                  }}
                >
                  Harga
                </button>
              )}
            </article>
          );
        })}
      </div>
    </Modal>
  );
}
