import assert from "node:assert/strict";
import test from "node:test";

test("renders the authenticated Saji Flow application shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Kotzen Operation<\/title>/i);
  assert.match(html, /Menyiapkan Saji Flow/i);
});

test("menu product master is included in the production bundle", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/menu-products.tsx", import.meta.url), "utf8"),
  );
  assert.match(source, /Menu & Produk/);
  assert.match(source, /menus\.prices\.read/);
  assert.match(source, /Mode read-only/);
  assert.match(source, /Data telah berubah/);
  assert.match(source, /Harga disembunyikan/);
  assert.match(source, /Belum ada menu/);
  assert.match(source, /Edit menu/);
  assert.match(source, /defaultValue=\{initial\?\.code\}/);
  assert.match(source, /lockVersion: current\.lockVersion/);
});

test("Recipe creation uses the outlet-aware Menu Product lookup and explains ineligible menu", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/recipe-food-cost.tsx", import.meta.url), "utf8"),
  );
  assert.match(source, /menu-products\/lookups\/recipe\?outletId=/);
  assert.match(source, /menu-products\/lookups\/recipe-context/);
  assert.doesNotMatch(source, /api<Lookups>\("\/recipes\/lookups/);
  assert.match(source, /Belum dikonfigurasi untuk outlet ini/);
  assert.match(source, /Tidak tersedia di outlet/);
  assert.match(source, /Sudah memiliki resep/);
  assert.match(source, /disabled=\{!candidate\.eligible\}/);
  assert.match(source, /\/recipes\/\$\{id\}/);
});

test("shared design system provides readable typography, colored buttons, and action spacing", async () => {
  const typography = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/typography.css", import.meta.url), "utf8"),
  );
  assert.match(typography, /--type-family-body/);
  assert.match(typography, /linear-gradient\(135deg, #143d35, #236859\)/);
  assert.match(typography, /background: #fff5e4/);
  assert.match(typography, /gap: 12px !important/);
  assert.match(typography, /button:focus-visible/);
});

test("Inter is bundled through next font and remains the single typography family", async () => {
  const { readFile } = await import("node:fs/promises");
  const [layout, typography, globals, integration] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/typography.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/integration.css", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /import \{ Inter \} from "next\/font\/google"/);
  assert.match(layout, /variable: "--font-inter"/);
  assert.match(layout, /className=\{inter\.variable\}/);
  assert.match(typography, /var\(--font-inter\), Inter/);
  assert.match(typography, /font-variant-numeric: tabular-nums lining-nums/);
  assert.doesNotMatch(`${typography}${globals}${integration}`, /Aptos|Georgia/);
  assert.doesNotMatch(typography, /font-family:[^;]+!important/);
});

test("menu and receipt secondary information use a compact type scale", async () => {
  const { readFile } = await import("node:fs/promises");
  const [menuStyles, receiptStyles] = await Promise.all([
    readFile(new URL("../app/menu-products.css", import.meta.url), "utf8"),
    readFile(new URL("../app/goods-receipts.css", import.meta.url), "utf8"),
  ]);
  assert.match(menuStyles, /\.mp-detail > p[\s\S]*font-size: 14px !important/);
  assert.match(
    menuStyles,
    /\.mp-detail \.mp-variant small[\s\S]*font-size: 12px !important/,
  );
  assert.match(
    receiptStyles,
    /\.connected-gr :where\(small[\s\S]*font-size: 11px !important/,
  );
});
