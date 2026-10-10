import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
for (const file of ["assets/data/products.js", "assets/data/images.js", "assets/data/shows.js", "assets/data/config.js"]) {
  require(`${root}${file}`);
}
const Domain = require(`${root}assets/js/domain.js`);
const products = globalThis.STAND_PRODUCTS;
const shows = globalThis.STAND_SHOWS;
assert.equal(shows.length, 13);
assert.equal(shows.filter((show) => show.date).length, 9);
assert.equal(shows.filter((show) => !show.date).length, 4);
assert.equal(products.find((product) => product.id === "remera-unisex").countedTotal, 18);
assert.ok(products.filter((product) => product.id !== "bufalo-3d").every((product) => product.price === null));
const bufalo = products.find((product) => product.id === "bufalo-3d");
assert.equal(bufalo.startingStock, 0);
assert.equal(bufalo.variantGroups[0].values.reduce((sum, value) => sum + value.previousSold, 0), 14);

let state = Domain.normalizeState({ cart: [], movements: [], nextMovementNumber: 1 });
assert.equal(state.activeShowId, "");
state.activeShowId = shows[1].id;
const sale = Domain.makeCartItem({ product: bufalo, selectedVariants: { color: "azul" }, quantity: 2, gift: false });
const shirt = products.find((product) => product.id === "remera-unisex");
const gift = Domain.makeCartItem({ product: shirt, selectedVariants: { talle: "sin-confirmar" }, quantity: 1, gift: true });
state.cart = [sale, gift];
const beforeSale = Domain.clone(state);
state = Domain.confirmCart(state, { show: shows[1], paymentMethod: "Efectivo", note: '=HYPERLINK("x")', now: "2026-10-10T22:00:00-03:00" });
assert.equal(state.movements[0].total, 20000);
assert.equal(state.movements[0].type, "venta_mixta");
assert.equal(state.activeShowId, shows[1].id);
assert.equal(state.movements[0].show.id, shows[1].id);
assert.equal(Domain.stockRows(products, state.movements).find((row) => row.product === "Búfalo 3D" && row.variant === "Azul").appStock, -2);
const csv = Domain.movementsToCsv(state.movements);
assert.ok(csv.includes("fecha_show"));
assert.ok(csv.includes(shows[1].id));
assert.ok(csv.includes("'=HYPERLINK"));
state = Domain.normalizeState(beforeSale);
assert.equal(state.movements.length, 0);
assert.equal(state.cart.length, 2);
state.cart = [Domain.makeCartItem({ product: shirt, selectedVariants: {}, quantity: 1, gift: false })];
assert.throws(() => Domain.confirmCart(state, {}), /precio pendiente/);

for (const image of Object.values(globalThis.STAND_IMAGES)) await access(`${root}${image.src}`);
for (const file of ["assets/js/app.js", "assets/js/storage.js", "assets/js/cloud.js", "service-worker.js"]) {
  new vm.Script(await readFile(`${root}${file}`, "utf8"), { filename: file });
}
const sw = await readFile(`${root}service-worker.js`, "utf8");
const cacheList = sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1];
for (const asset of vm.runInNewContext(cacheList)) await access(`${root}${asset === "./" ? "index.html" : asset}`);

const requests = [];
const context = vm.createContext({
  STAND_CONFIG: { supabaseUrl: "https://example.supabase.co", supabasePublishableKey: "sb_publishable_test" },
  AbortSignal,
  fetch: async (url, options) => {
    requests.push({ url, ...options });
    if (url.includes("/auth/v1/token")) return { ok: true, json: async () => ({ access_token: "test-session", refresh_token: "test-refresh", expires_in: 3600, user: { id: "user-test", email: "test@example.com" } }) };
    if (url.includes("/rest/v1/")) return { ok: true, json: async () => [{ id: "backup-test", created_at: "2026-10-10T00:00:00Z" }] };
    return { ok: true, json: async () => null };
  },
});
vm.runInContext(await readFile(`${root}assets/js/cloud.js`, "utf8"), context);
assert.equal(context.StandCloud.isConfigured(), true);
await assert.rejects(context.StandCloud.saveBackup({}, "device-test"), /Ingresá/);
await context.StandCloud.signIn("test@example.com", "fake-test-only");
const result = await context.StandCloud.saveBackup({ state }, "device-test");
assert.equal(result.id, "backup-test");
const request = requests.find((item) => item.url.includes("/rest/v1/"));
assert.equal(request.headers.Authorization, "Bearer test-session");
assert.equal(JSON.parse(request.body).owner_id, "user-test");
context.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
await assert.rejects(context.StandCloud.saveBackup({ state }, "device-test"));
await assert.rejects(context.StandCloud.signOut());
assert.equal(context.StandCloud.currentUser(), null);
console.log("OK: datos, shows, venta mixta, precio pendiente, stock, undo, CSV, recursos offline y resguardo simulado.");
