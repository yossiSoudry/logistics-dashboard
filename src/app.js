// מחבר את הנתונים ל-DOM. החישובים עצמם ב-logic.js.
import { summarizeByStatus, STATUSES, STATUS_LABELS, isLowStock, lowStockItems } from "./logic.js";

const state = { data: null };

function el(id) {
  return document.getElementById(id);
}

function warehouseName(id) {
  return state.data.warehouses.find((w) => w.id === id)?.name ?? id;
}

function renderStatusCards(shipments, inventory) {
  const summary = summarizeByStatus(shipments);
  const cards = STATUSES.map(
    (st) => `
      <div class="card" data-status="${st}">
        <div class="label">${STATUS_LABELS[st]}</div>
        <div class="value" data-count="${st}">${summary[st]}</div>
      </div>`,
  );
  cards.push(`
      <div class="card low">
        <div class="label">פריטים מתחת למינימום</div>
        <div class="value" data-count="low-stock">${lowStockItems(inventory).length}</div>
      </div>`);
  el("status-cards").innerHTML = cards.join("");
}

function renderInventory(inventory) {
  if (inventory.length === 0) {
    el("inventory-rows").innerHTML = `<tr><td colspan="4" class="empty">אין פריטים להצגה</td></tr>`;
    return;
  }
  el("inventory-rows").innerHTML = inventory.map(
    (i) => `
      <tr class="${isLowStock(i) ? "low" : ""}" data-sku="${i.sku}">
        <td>${i.name}</td>
        <td>${warehouseName(i.warehouseId)}</td>
        <td class="num qty">${i.quantity}</td>
        <td class="num">${i.minimum}</td>
      </tr>`,
  ).join("");
}

function render() {
  const view = state.data;
  renderStatusCards(view.shipments, view.inventory);
  renderInventory(view.inventory);
}

async function init() {
  const res = await fetch("data/mock-data.json");
  state.data = await res.json();
  el("date").textContent = new Date(state.data.date).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  render();
}

init();
