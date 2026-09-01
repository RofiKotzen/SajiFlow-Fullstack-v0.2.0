import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("POS permission seed contract", () => {
  const seed = readFileSync(
    resolve(process.cwd(), "src/scripts/seed.ts"),
    "utf8",
  );
  const permissions = [
    "pos.read",
    "pos.create",
    "pos.update",
    "pos.submit",
    "pos.pay",
    "pos.complete",
    "pos.cancel",
    "pos.void",
    "kds.read",
    "kds.update",
    "kds.cancel",
  ];

  it.each(permissions)("contains permission %s", (permission) => {
    expect(seed).toContain(`"${permission}"`);
  });

  it("keeps permission and Super Admin assignment idempotent", () => {
    expect(seed).toContain(
      ".onConflictDoNothing({ target: permissions.code })",
    );
    expect(seed).toContain(".onConflictDoNothing()");
    expect(seed).toContain('eq(roles.code, "SUPER_ADMIN")');
  });

  it("does not update existing credentials, profiles, or assignments", () => {
    expect(seed).not.toMatch(/\.update\(userCredentials\)/);
    expect(seed).not.toMatch(/\.update\(users\)/);
    expect(seed).not.toMatch(/\.update\(userRoles\)/);
  });
});
