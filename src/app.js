// מחבר את הנתונים ל-DOM. החישובים עצמם ב-logic.js.
import { summarizeByStatus, STATUSES, STATUS_LABELS } from "./logic.js";

const state = { data: null };

function el(id) {
  return document.getElementById(id);
}

function renderStatusCards(shipments) {
  const summary = summarizeByStatus(shipments);
  el("status-cards").innerHTML = STATUSES.map(
    (st) => `
      <div class="card" data-status="${st}">
        <div class="label">${STATUS_LABELS[st]}</div>
        <div class="value" data-count="${st}">${summary[st]}</div>
      </div>`,
  ).join("");
}

function render() {
  const view = state.data;
  renderStatusCards(view.shipments);
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
