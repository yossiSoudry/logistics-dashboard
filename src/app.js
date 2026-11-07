// מחבר את הנתונים ל-DOM. החישובים עצמם ב-logic.js.
import { summarizeByStatus, STATUSES, STATUS_LABELS, isLowStock, lowStockItems, contractorPerformance, applyFilters } from "./logic.js";

const state = { data: null, filters: { warehouseId: "all", contractorId: "all" } };

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

function renderContractors(shipments) {
  const rows = contractorPerformance(shipments, state.data.contractors)
    .sort((a, b) => b.total - a.total);
  if (rows.length === 0) {
    el("contractor-rows").innerHTML = `<tr><td colspan="4" class="empty">אין משלוחים לקבלנים היום</td></tr>`;
    return;
  }
  el("contractor-rows").innerHTML = rows.map(
    (r) => `
      <tr data-contractor="${r.id}">
        <td>${r.name}</td>
        <td class="num">${r.total}</td>
        <td class="num">${r.delivered}</td>
        <td class="num"><span class="rate"><span class="bar"><span style="width:${r.rate}%"></span></span>${r.rate}%</span></td>
      </tr>`,
  ).join("");
}

function fillSelect(id, items) {
  const select = el(id);
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  }
}

function bindFilters() {
  fillSelect("filter-warehouse", state.data.warehouses);
  fillSelect("filter-contractor", state.data.contractors);
  el("filter-warehouse").addEventListener("change", (e) => {
    state.filters.warehouseId = e.target.value;
    render();
  });
  el("filter-contractor").addEventListener("change", (e) => {
    state.filters.contractorId = e.target.value;
    render();
  });
  el("filter-reset").addEventListener("click", () => {
    state.filters = { warehouseId: "all", contractorId: "all" };
    el("filter-warehouse").value = "all";
    el("filter-contractor").value = "all";
    render();
  });
}

function render() {
  const view = applyFilters(state.data, state.filters);
  const active = state.filters.warehouseId !== "all" || state.filters.contractorId !== "all";
  el("filter-reset").disabled = !active;
  renderStatusCards(view.shipments, view.inventory);
  renderContractors(view.shipments);
  renderInventory(view.inventory);
}

async function init() {
  const res = await fetch("data/mock-data.json");
  state.data = await res.json();
  el("date").textContent = new Date(state.data.date).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  bindFilters();
  render();
}

init();
