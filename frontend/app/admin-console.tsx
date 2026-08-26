"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";

type AdminTab = "tenant" | "outlets" | "users" | "roles" | "permissions";
type Tenant = { id: string; code: string; name: string; timezone: string; currencyCode: string; status: string };
type Outlet = { id: string; code: string; name: string; address?: string; phone?: string; timezone: string; isActive: boolean };
type User = { id: string; fullName: string; email: string; employeeCode?: string; phone?: string; status: string; assignments?: { roleId: string; roleCode: string; roleName: string; outletId?: string }[] };
type Permission = { id: string; code: string; module: string; description: string };
type Role = { id: string; code: string; name: string; description?: string; isSystem: boolean; permissions?: Permission[] };

const tabs: { id: AdminTab; label: string }[] = [
  { id: "tenant", label: "Tenant" }, { id: "outlets", label: "Outlet" }, { id: "users", label: "User" }, { id: "roles", label: "Role" }, { id: "permissions", label: "Permission" },
];

export function AdminConsole({ session, api, notify }: { session: AuthSession; api: ApiClient; notify: (message: string) => void }) {
  const [tab, setTab] = useState<AdminTab>("tenant");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"outlet" | "user" | "role" | "password" | "assign-role" | "assign-permission" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const can = useCallback((permission: string) => session.user.permissions.includes(permission), [session.user.permissions]);
  const load = useCallback(async () => {
    try {
      if (tab === "tenant") setTenant(await api<Tenant>("/tenant"));
      if (tab === "outlets") setOutlets(await api<Outlet[]>("/outlets"));
      if (tab === "users") setUsers(await api<User[]>("/users"));
      if (tab === "roles") setRoles(await api<Role[]>("/roles"));
      if (tab === "permissions") setPermissions(await api<Permission[]>("/permissions"));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Data tidak dapat dimuat"); }
    finally { setLoading(false); }
  }, [api, tab]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated = await api<Tenant>("/tenant", { method: "PATCH", body: JSON.stringify({ name: form.get("name"), timezone: form.get("timezone"), currencyCode: form.get("currencyCode") }) });
    setTenant(updated); notify("Profil tenant berhasil diperbarui.");
  }

  async function toggleOutlet(outlet: Outlet) {
    await api(`/outlets/${outlet.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !outlet.isActive }) });
    notify(`Outlet ${outlet.name} ${outlet.isActive ? "dinonaktifkan" : "diaktifkan"}.`); await load();
  }

  async function toggleUser(user: User) {
    const next = user.status === "active" ? "suspended" : "active";
    await api(`/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    notify(`Status ${user.fullName} diperbarui.`); await load();
  }

  async function openRoleAssignment(user: User) {
    setSelectedUser(await api<User>(`/users/${user.id}`));
    if (!roles.length) setRoles(await api<Role[]>("/roles"));
    if (!outlets.length) setOutlets(await api<Outlet[]>("/outlets"));
    setDialog("assign-role");
  }

  async function openPermissionAssignment(role: Role) {
    setSelectedRole(await api<Role>(`/roles/${role.id}`));
    if (!permissions.length) setPermissions(await api<Permission[]>("/permissions"));
    setDialog("assign-permission");
  }

  return <section className="admin-console">
    <div className="admin-tabs" role="tablist">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setLoading(true); setTab(item.id); }}>{item.label}</button>)}</div>
    {error && <div className="admin-error">{error}<button onClick={() => void load()}>Coba lagi</button></div>}
    {loading ? <AdminSkeleton /> : <>
      {tab === "tenant" && tenant && <TenantPanel tenant={tenant} canEdit={can("tenant.update")} onSubmit={updateTenant} />}
      {tab === "outlets" && <DataPanel title="Daftar outlet" count={outlets.length} action={can("outlets.create") ? () => setDialog("outlet") : undefined} actionLabel="Tambah outlet">
        <div className="admin-table"><div className="admin-row admin-head"><span>Kode</span><span>Outlet</span><span>Zona waktu</span><span>Status</span><span /></div>{outlets.map((outlet) => <div className="admin-row" key={outlet.id}><b>{outlet.code}</b><span><strong>{outlet.name}</strong><small>{outlet.address || "Alamat belum diisi"}</small></span><span>{outlet.timezone}</span><Status value={outlet.isActive ? "Aktif" : "Nonaktif"} /><button disabled={!can("outlets.update")} onClick={() => void toggleOutlet(outlet)}>{outlet.isActive ? "Nonaktifkan" : "Aktifkan"}</button></div>)}</div>
      </DataPanel>}
      {tab === "users" && <DataPanel title="Pengguna" count={users.length} action={can("users.create") ? () => setDialog("user") : undefined} actionLabel="Tambah user">
        <div className="admin-table"><div className="admin-row user admin-head"><span>Nama</span><span>Email</span><span>Status</span><span>Role</span><span /></div>{users.map((user) => <div className="admin-row user" key={user.id}><span><strong>{user.fullName}</strong><small>{user.employeeCode || "Tanpa kode karyawan"}</small></span><span>{user.email}</span><Status value={user.status} /><span>{user.assignments?.map((item) => item.roleName).join(", ") || "Belum ditetapkan"}</span><div className="row-actions"><button disabled={!can("users.reset_password")} onClick={() => { setSelectedUser(user); setDialog("password"); }}>Ubah password</button><button disabled={!can("users.assign_roles")} onClick={() => void openRoleAssignment(user)}>Atur role</button><button disabled={!can("users.update")} onClick={() => void toggleUser(user)}>{user.status === "active" ? "Suspend" : "Aktifkan"}</button></div></div>)}</div>
      </DataPanel>}
      {tab === "roles" && <DataPanel title="Role" count={roles.length} action={can("roles.create") ? () => setDialog("role") : undefined} actionLabel="Tambah role">
        <div className="admin-card-grid">{roles.map((role) => <article key={role.id}><div><span className="admin-code">{role.code}</span>{role.isSystem && <em>System</em>}</div><h3>{role.name}</h3><p>{role.description || "Belum ada deskripsi."}</p><button disabled={!can("roles.assign_permissions")} onClick={() => void openPermissionAssignment(role)}>Atur permission</button></article>)}</div>
      </DataPanel>}
      {tab === "permissions" && <DataPanel title="Katalog permission" count={permissions.length}><PermissionList permissions={permissions} /></DataPanel>}
    </>}
    {dialog === "outlet" && <CreateOutletDialog api={api} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify("Outlet berhasil dibuat."); await load(); }} />}
    {dialog === "user" && <CreateUserDialog api={api} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify("User berhasil dibuat."); await load(); }} />}
    {dialog === "password" && selectedUser && <ResetPasswordDialog api={api} user={selectedUser} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify(`Password ${selectedUser.fullName} berhasil diperbarui. Sesi lama tidak dapat diperpanjang.`); }} />}
    {dialog === "role" && <CreateRoleDialog api={api} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify("Role berhasil dibuat."); await load(); }} />}
    {dialog === "assign-role" && selectedUser && <AssignRoleDialog api={api} user={selectedUser} roles={roles} outlets={outlets} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify("Role user berhasil diperbarui."); await load(); }} />}
    {dialog === "assign-permission" && selectedRole && <AssignPermissionDialog api={api} role={selectedRole} permissions={permissions} onClose={() => setDialog(null)} onDone={async () => { setDialog(null); notify("Permission role berhasil diperbarui."); await load(); }} />}
  </section>;
}

export function SessionControls({ api, logout }: { api: ApiClient; logout: () => Promise<void> }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => { api<Outlet[]>("/outlets").then((items) => { setOutlets(items); const stored = window.localStorage.getItem("sajiflow.activeOutlet"); const first = stored && items.some((item) => item.id === stored) ? stored : items[0]?.id ?? ""; setSelected(first); if (first) window.localStorage.setItem("sajiflow.activeOutlet", first); }).catch(() => setOutlets([])); }, [api]);
  return <div className="session-controls"><select aria-label="Outlet aktif" value={selected} onChange={(event) => { setSelected(event.target.value); window.localStorage.setItem("sajiflow.activeOutlet", event.target.value); }}>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</select><button onClick={() => void logout()}>Keluar</button></div>;
}

function TenantPanel({ tenant, canEdit, onSubmit }: { tenant: Tenant; canEdit: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <div className="tenant-panel"><div className="tenant-identity"><span>{tenant.code.slice(0, 2)}</span><div><p className="eyebrow">TENANT AKTIF</p><h2>{tenant.name}</h2><Status value={tenant.status} /></div></div><form onSubmit={(event) => void onSubmit(event)}><label>Nama usaha<input name="name" defaultValue={tenant.name} disabled={!canEdit} required /></label><label>Zona waktu<input name="timezone" defaultValue={tenant.timezone} disabled={!canEdit} required /></label><label>Mata uang<input name="currencyCode" defaultValue={tenant.currencyCode} disabled={!canEdit} required maxLength={3} /></label>{canEdit && <button className="primary-button">Simpan perubahan</button>}</form></div>;
}

function DataPanel({ title, count, action, actionLabel, children }: { title: string; count: number; action?: () => void; actionLabel?: string; children: React.ReactNode }) {
  return <div className="data-panel"><header><div><h2>{title}</h2><p>{count} data tersedia</p></div>{action && <button className="primary-button" onClick={action}>+ {actionLabel}</button>}</header>{children}</div>;
}

function PermissionList({ permissions }: { permissions: Permission[] }) {
  const grouped = useMemo(() => Object.entries(permissions.reduce<Record<string, Permission[]>>((acc, item) => { (acc[item.module] ??= []).push(item); return acc; }, {})), [permissions]);
  return <div className="permission-groups">{grouped.map(([module, items]) => <section key={module}><h3>{module}</h3>{items.map((item) => <div key={item.id}><code>{item.code}</code><span>{item.description}</span></div>)}</section>)}</div>;
}

function Status({ value }: { value: string }) { const active = ["active", "trial", "Aktif"].includes(value); return <span className={`admin-status ${active ? "active" : "inactive"}`}><i />{value}</span>; }
function AdminSkeleton() { return <div className="admin-skeleton"><i /><i /><i /><i /></div>; }

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-dialog" role="dialog" aria-modal="true"><header><div><p className="eyebrow">ADMINISTRASI</p><h2>{title}</h2><span>{subtitle}</span></div><button aria-label="Tutup" onClick={onClose}>×</button></header>{children}</section></div>; }

function CreateOutletDialog({ api, onClose, onDone }: { api: ApiClient; onClose: () => void; onDone: () => Promise<void> }) {
  return <Dialog title="Tambah outlet" subtitle="Buat cabang operasional baru." onClose={onClose}><SimpleForm submitLabel="Simpan outlet" onSubmit={async (form) => { await api("/outlets", { method: "POST", body: JSON.stringify({ code: String(form.get("code")).toUpperCase(), name: form.get("name"), address: form.get("address") || undefined, timezone: form.get("timezone") }) }); await onDone(); }}><label>Kode<input name="code" required maxLength={30} placeholder="JKT01" /></label><label>Nama outlet<input name="name" required placeholder="Nine Coffee Cipanas" /></label><label>Alamat<textarea name="address" rows={3} /></label><label>Zona waktu<input name="timezone" defaultValue="Asia/Jakarta" required /></label></SimpleForm></Dialog>;
}
function CreateUserDialog({ api, onClose, onDone }: { api: ApiClient; onClose: () => void; onDone: () => Promise<void> }) {
  return <Dialog title="Tambah user" subtitle="Buat akun dan password awal." onClose={onClose}><SimpleForm submitLabel="Buat user" onSubmit={async (form) => { await api("/users", { method: "POST", body: JSON.stringify({ fullName: form.get("fullName"), email: form.get("email"), employeeCode: form.get("employeeCode") || undefined, phone: form.get("phone") || undefined, password: form.get("password") }) }); await onDone(); }}><label>Nama lengkap<input name="fullName" required /></label><label>Email<input type="email" name="email" required /></label><label>Kode karyawan<input name="employeeCode" /></label><label>Telepon<input name="phone" /></label><label>Password awal<input type="password" name="password" required minLength={12} placeholder="Huruf besar, kecil, angka & simbol" /></label></SimpleForm></Dialog>;
}
function ResetPasswordDialog({ api, user, onClose, onDone }: { api: ApiClient; user: User; onClose: () => void; onDone: () => Promise<void> }) {
  return <Dialog title={`Ubah password · ${user.fullName}`} subtitle="Password baru mencabut refresh token; access token lama berakhir sesuai TTL." onClose={onClose}><SimpleForm submitLabel="Simpan password baru" onSubmit={async (form) => {
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");
    if (newPassword !== confirmation) throw new Error("Konfirmasi password tidak sama.");
    await api(`/users/${user.id}/password`, { method: "PUT", body: JSON.stringify({ newPassword, reason: form.get("reason") || undefined }) });
    await onDone();
  }}><label>Password baru<input type="password" name="newPassword" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="Huruf besar, kecil, angka & simbol" /></label><label>Konfirmasi password<input type="password" name="passwordConfirmation" required minLength={12} maxLength={128} autoComplete="new-password" /></label><label>Alasan perubahan (opsional)<textarea name="reason" minLength={3} maxLength={500} rows={3} placeholder="Contoh: user lupa password" /></label></SimpleForm></Dialog>;
}
function CreateRoleDialog({ api, onClose, onDone }: { api: ApiClient; onClose: () => void; onDone: () => Promise<void> }) {
  return <Dialog title="Tambah role" subtitle="Definisikan kelompok hak akses." onClose={onClose}><SimpleForm submitLabel="Simpan role" onSubmit={async (form) => { await api("/roles", { method: "POST", body: JSON.stringify({ code: String(form.get("code")).toUpperCase(), name: form.get("name"), description: form.get("description") || undefined }) }); await onDone(); }}><label>Kode<input name="code" required placeholder="MANAGER" /></label><label>Nama role<input name="name" required /></label><label>Deskripsi<textarea name="description" rows={3} /></label></SimpleForm></Dialog>;
}
function AssignRoleDialog({ api, user, roles, outlets, onClose, onDone }: { api: ApiClient; user: User; roles: Role[]; outlets: Outlet[]; onClose: () => void; onDone: () => Promise<void> }) {
  return <Dialog title={`Role · ${user.fullName}`} subtitle="Pilihan ini mengganti assignment aktif sebelumnya." onClose={onClose}><SimpleForm submitLabel="Terapkan role" onSubmit={async (form) => { const roleId = String(form.get("roleId")); const outletId = String(form.get("outletId") || ""); await api(`/users/${user.id}/roles`, { method: "PUT", body: JSON.stringify({ assignments: [{ roleId, ...(outletId ? { outletId } : {}) }] }) }); await onDone(); }}><label>Role<select name="roleId" required defaultValue={user.assignments?.[0]?.roleId ?? ""}><option value="" disabled>Pilih role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label>Cakupan outlet<select name="outletId" defaultValue={user.assignments?.[0]?.outletId ?? ""}><option value="">Semua outlet</option>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</select></label></SimpleForm></Dialog>;
}
function AssignPermissionDialog({ api, role, permissions, onClose, onDone }: { api: ApiClient; role: Role; permissions: Permission[]; onClose: () => void; onDone: () => Promise<void> }) {
  const granted = new Set(role.permissions?.map((item) => item.id));
  return <Dialog title={`Permission · ${role.name}`} subtitle="Centang izin yang dimiliki role ini." onClose={onClose}><SimpleForm submitLabel="Simpan permission" onSubmit={async (form) => { const permissionIds = form.getAll("permissionIds").map(String); await api(`/roles/${role.id}/permissions`, { method: "PUT", body: JSON.stringify({ permissionIds }) }); await onDone(); }}><div className="permission-checks">{permissions.map((permission) => <label key={permission.id}><input type="checkbox" name="permissionIds" value={permission.id} defaultChecked={granted.has(permission.id)} /><span><code>{permission.code}</code><small>{permission.description}</small></span></label>)}</div></SimpleForm></Dialog>;
}

function SimpleForm({ onSubmit, submitLabel, children }: { onSubmit: (form: FormData) => Promise<void>; submitLabel: string; children: React.ReactNode }) {
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); try { await onSubmit(new FormData(event.currentTarget)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Data gagal disimpan"); } finally { setSaving(false); } }
  return <form className="admin-form" onSubmit={(event) => void submit(event)}>{children}{error && <div className="auth-error">{error}</div>}<button className="primary-button" disabled={saving}>{saving ? "Menyimpan…" : submitLabel}</button></form>;
}
