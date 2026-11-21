import { readFileSync } from "node:fs";
import { toAirtableFields } from "../src/lib/airtable.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export function loadMockData() {
  return JSON.parse(readFileSync(join(here, "..", "data", "mock-data.json"), "utf8"));
}

/** מה ש-Airtable היה מחזיר אחרי הטעינה: רשומות עם מזהים, בסדר מעורבב. */
export function fakeAirtable(source) {
  const ids = {
    warehouses: new Map(source.warehouses.map((w, i) => [w.id, `recW${i}`])),
    contractors: new Map(source.contractors.map((c, i) => [c.id, `recC${i}`])),
  };
  const fields = toAirtableFields(source, ids);
  const records = (list, prefix, idOf) => list.map((f, i) => ({ id: idOf ? idOf(f, i) : `${prefix}${i}`, createdTime: "2026-11-15T00:00:00.000Z", fields: f }));
  return {
    warehouses: records(fields.warehouses, "", (f) => ids.warehouses.get(f.Key)).reverse(),
    contractors: records(fields.contractors, "", (f) => ids.contractors.get(f.Key)).reverse(),
    inventory: records(fields.inventory, "recI").reverse(),
    shipments: records(fields.shipments, "recS").reverse(),
  };
}

