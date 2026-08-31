import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, DataTable, Row, Cell, Field, TextInput, SelectInput, TextArea, StatusBadge, Badge, Tabs, Modal } from "@/components/ui";
import { TENANT, OUTLETS, USERS, ROLE_PRESETS, PERMISSION_MODULES, type UserAccount, type Outlet } from "@/lib/mock-data";

const TABS = [
  { id: "tenant", label: "Tenant" },
  { id: "outlet", label: "Outlet" },
  { id: "user", label: "User" },
  { id: "role", label: "Role" },
  { id: "permission", label: "Permission" },
];

export function SettingsView() {
  const [tab, setTab] = useState("tenant");
  const [tenant, setTenant] = useState(TENANT);
  const [outlets, setOutlets] = useState<Outlet[]>(OUTLETS);
  const [users, setUsers] = useState<UserAccount[]>(USERS);
  const [roles, setRoles] = useState(ROLE_PRESETS);
  const [savingTenant, setSavingTenant] = useState(false);
  const [outletModal, setOutletModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserAccount | null>(null);
  const [roleModal, setRoleModal] = useState(false);
  const [newPerms, setNewPerms] = useState<string[]>([]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
          <p className="mt-1 text-[13px] text-mute">Tenant, outlet, user, role, dan permission</p>
        </div>
        <Tabs value={tab} onChange={setTab} tabs={TABS} />
      </div>

      {tab === "tenant" && (
        <Card className="max-w-xl p-5">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSavingTenant(true);
              setTimeout(() => { setSavingTenant(false); toast.success("Profil tenant disimpan"); }, 400);
            }}
          >
            <Field label="Nama usaha" required>
              <TextInput value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zona waktu" required>
                <TextInput value={tenant.timezone} onChange={(e) => setTenant({ ...tenant, timezone: e.target.value })} required />
              </Field>
              <Field label="Mata uang" required hint="Maksimal 3 karakter">
                <TextInput value={tenant.currency} maxLength={3} onChange={(e) => setTenant({ ...tenant, currency: e.target.value.toUpperCase() })} required />
              </Field>
              <Field label="Kode tenant"><TextInput value={tenant.code} disabled /></Field>
              <div>
                <p className="mb-1 text-[12px] font-medium text-ink/80">Status tenant</p>
                <StatusBadge label="active" />
              </div>
            </div>
            <div className="flex justify-end border-t border-black/5 pt-3">
              <Btn type="submit" disabled={savingTenant}>{savingTenant ? "Menyimpan…" : "Simpan Perubahan"}</Btn>
            </div>
          </form>
        </Card>
      )}

      {tab === "outlet" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Daftar Outlet</h2>
            <Btn onClick={() => setOutletModal(true)}><Plus className="size-3.5" /> Tambah Outlet</Btn>
          </div>
          <DataTable head={["Kode", "Nama", "Alamat", "Zona Waktu", "Status", ""]} wide>
            {outlets.map((o) => (
              <Row key={o.code}>
                <Cell className="mono">{o.code}</Cell>
                <Cell className="font-medium">{o.name}</Cell>
                <Cell className="text-mute">{o.address}</Cell>
                <Cell className="text-mute">{o.timezone}</Cell>
                <Cell><StatusBadge label={o.active ? "active" : "inactive"} /></Cell>
                <Cell>
                  <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setOutlets((p) => p.map((x) => (x.code === o.code ? { ...x, active: !x.active } : x))); toast.success(o.active ? `${o.name} dinonaktifkan` : `${o.name} diaktifkan`); }}>
                    {o.active ? "Nonaktifkan" : "Aktifkan"}
                  </Btn>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      )}

      {tab === "user" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Daftar User</h2>
            <Btn onClick={() => setUserModal(true)}><Plus className="size-3.5" /> Tambah User</Btn>
          </div>
          <DataTable head={["Nama", "Email", "Kode Karyawan", "Role", "Cakupan Outlet", "Status", ""]} wide>
            {users.map((u) => (
              <Row key={u.id}>
                <Cell className="font-medium">{u.name}</Cell>
                <Cell className="text-mute">{u.email}</Cell>
                <Cell className="mono text-mute">{u.employeeCode ?? "—"}</Cell>
                <Cell><Badge tone="neutral">{u.role}</Badge></Cell>
                <Cell className="text-mute">{u.outletScope ?? "Semua outlet"}</Cell>
                <Cell><StatusBadge label={u.status} /></Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => setResetTarget(u)}>Reset Password</Btn>
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))); toast.success(u.status === "active" ? "User ditangguhkan" : "User diaktifkan"); }}>
                      {u.status === "active" ? "Suspend" : "Aktifkan"}
                    </Btn>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      )}

      {tab === "role" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Daftar Role</h2>
            <Btn onClick={() => { setRoleModal(true); setNewPerms([]); }}><Plus className="size-3.5" /> Tambah Role</Btn>
          </div>
          <DataTable head={["Kode", "Nama", "Jumlah Permission", "Tipe", ""]}>
            {roles.map((r) => (
              <Row key={r.code}>
                <Cell className="mono">{r.code}</Cell>
                <Cell className="font-medium">{r.name}</Cell>
                <Cell className="mono text-right">{r.permissions.length}</Cell>
                <Cell>{r.system ? <Badge tone="amber">Sistem</Badge> : <Badge tone="mute">Kustom</Badge>}</Cell>
                <Cell>
                  <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => toast.info(`${r.name}: ${r.permissions.slice(0, 6).join(", ")}${r.permissions.length > 6 ? "…" : ""}`)}>Lihat Permission</Btn>
                </Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      )}

      {tab === "permission" && (
        <div className="space-y-4">
          {PERMISSION_MODULES.map((m) => (
            <Card key={m.module} className="p-4">
              <h2 className="mono text-[13px] font-semibold tracking-tight">{m.module}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {m.items.map((p) => (
                  <li key={p.code} className="rounded-lg bg-cream px-3 py-2 ring-1 ring-black/5">
                    <p className="mono text-[12px] font-medium">{p.code}</p>
                    <p className="mt-0.5 text-[11.5px] text-mute">{p.desc}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Outlet modal */}
      <Modal open={outletModal} onClose={() => setOutletModal(false)} title="Tambah Outlet">
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setOutlets((p) => [...p, { code: String(fd.get("code")).toUpperCase(), name: String(fd.get("name")), address: String(fd.get("address") || ""), timezone: String(fd.get("tz")), active: true }]);
          setOutletModal(false);
          toast.success("Outlet ditambahkan");
        }}>
          <Field label="Kode" required hint="Maks 30 karakter, uppercase"><TextInput name="code" required maxLength={30} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
          <Field label="Nama outlet" required><TextInput name="name" required /></Field>
          <Field label="Alamat"><TextArea name="address" /></Field>
          <Field label="Zona waktu" required><TextInput name="tz" required defaultValue="Asia/Jakarta" /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setOutletModal(false)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
        </form>
      </Modal>

      {/* User modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Tambah User" wide>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const pass = String(fd.get("password"));
          if (pass.length < 12) { toast.error("Password awal minimal 12 karakter"); return; }
          setUsers((p) => [...p, { id: `USR-0${p.length + 1}`, name: String(fd.get("name")), email: String(fd.get("email")), employeeCode: String(fd.get("emp") || "") || undefined, phone: String(fd.get("phone") || "") || undefined, status: "active", role: String(fd.get("role")), outletScope: String(fd.get("scope") || "") || undefined }]);
          setUserModal(false);
          toast.success("User ditambahkan");
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama lengkap" required><TextInput name="name" required /></Field>
            <Field label="Email" required><TextInput name="email" type="email" required /></Field>
            <Field label="Kode karyawan"><TextInput name="emp" /></Field>
            <Field label="Telepon"><TextInput name="phone" /></Field>
            <Field label="Password awal" required hint="Minimal 12 karakter"><TextInput name="password" type="password" required minLength={12} /></Field>
            <Field label="Role" required>
              <SelectInput name="role">{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</SelectInput>
            </Field>
            <Field label="Cakupan outlet" hint="Kosong berarti semua outlet">
              <SelectInput name="scope"><option value="">Semua outlet</option>{outlets.filter((o) => o.active).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}</SelectInput>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setUserModal(false)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password — ${resetTarget?.name ?? ""}`}>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const p1 = String(fd.get("p1")), p2 = String(fd.get("p2"));
          if (p1.length < 12 || p1.length > 128) { toast.error("Password harus 12–128 karakter"); return; }
          if (p1 !== p2) { toast.error("Konfirmasi password tidak sama"); return; }
          setResetTarget(null);
          toast.success("Password direset; sesi lama user dicabut");
        }}>
          <Field label="Password baru" required hint="12–128 karakter"><TextInput name="p1" type="password" required minLength={12} maxLength={128} /></Field>
          <Field label="Konfirmasi" required><TextInput name="p2" type="password" required minLength={12} maxLength={128} /></Field>
          <Field label="Alasan" hint="Opsional, 3–500 karakter bila diisi"><TextArea name="reason" minLength={3} maxLength={500} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setResetTarget(null)}>Batal</Btn><Btn type="submit">Reset Password</Btn></div>
        </form>
      </Modal>

      {/* Role modal */}
      <Modal open={roleModal} onClose={() => setRoleModal(false)} title="Tambah Role" wide>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setRoles((p) => [...p, { code: String(fd.get("code")).toUpperCase(), name: String(fd.get("name")), permissions: newPerms as typeof ROLE_PRESETS[number]["permissions"] }]);
          setRoleModal(false);
          toast.success("Role ditambahkan dengan permission terpilih");
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode role" required hint="Uppercase"><TextInput name="code" required onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
            <Field label="Nama role" required><TextInput name="name" required /></Field>
          </div>
          <Field label="Deskripsi"><TextArea name="desc" /></Field>
          <div>
            <p className="mb-2 text-[12px] font-medium text-ink/80">Permission</p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-cream p-2 ring-1 ring-black/5 scrollbar-thin">
              {PERMISSION_MODULES.flatMap((m) => m.items).map((p) => (
                <label key={p.code} className="flex items-center gap-2 rounded px-2 py-1 text-[12.5px] hover:bg-black/[0.03]">
                  <input type="checkbox" className="accent-[oklch(0.52_0.065_128)]" checked={newPerms.includes(p.code)} onChange={(e) => setNewPerms((prev) => (e.target.checked ? [...prev, p.code] : prev.filter((x) => x !== p.code)))} />
                  <span className="mono">{p.code}</span>
                  <span className="text-mute">{p.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setRoleModal(false)}>Batal</Btn><Btn type="submit">Simpan Role</Btn></div>
        </form>
      </Modal>
    </div>
  );
}
