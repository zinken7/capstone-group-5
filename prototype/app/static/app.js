const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "Request failed");
  return body;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3200);
}

function statusBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

function createMap(id, center = [-22.5, 119.2], zoom = 5) {
  const map = L.map(id).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  return map;
}

function addGeoJson(map, collection) {
  const layer = L.geoJSON(collection, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: Math.max(7, Math.min(16, 6 + Math.log2(feature.properties.quantity + 1))),
      weight: 2,
      fillOpacity: .78,
    }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`<strong>${p.asset_name}</strong><br>${p.manufacturer} ${p.model_name}<br>${p.mine_site}<br>${p.quantity} asset(s)`);
    },
  }).addTo(map);
  const bounds = layer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds.pad(.15));
  return layer;
}

async function initDashboard() {
  const [analytics, geojson] = await Promise.all([api("/api/analytics"), api("/api/map")]);
  $("#total-assets").textContent = analytics.totals.assets.toLocaleString();
  $("#total-records").textContent = analytics.totals.records.toLocaleString();
  $("#total-sites").textContent = analytics.totals.mine_sites.toLocaleString();
  $("#total-countries").textContent = analytics.totals.countries.toLocaleString();

  const map = createMap("dashboard-map");
  addGeoJson(map, geojson);

  buildChart("type-chart", "doughnut", analytics.by_type);
  buildChart("manufacturer-chart", "bar", analytics.by_manufacturer, { indexAxis: "y" });
  buildChart("timeline-chart", "line", analytics.timeline, { tension: .25 });
}

function buildChart(id, type, rows, extra = {}) {
  const labels = rows.length ? rows.map(r => r.label) : ["No verified data"];
  const values = rows.length ? rows.map(r => r.value) : [0];
  new Chart($("#" + id), {
    type,
    data: { labels, datasets: [{ label: "Assets", data: values, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: type === "doughnut" } }, ...extra },
  });
}

async function initExplore() {
  const map = createMap("explore-map");
  let mapLayer;
  let page = 1;
  const load = async () => {
    const params = new URLSearchParams({ page, page_size: 20 });
    const values = {
      q: $("#filter-q").value.trim(),
      equipment_type: $("#filter-type").value,
      manufacturer: $("#filter-manufacturer").value.trim(),
      country: $("#filter-country").value.trim().toUpperCase(),
      verification_status: $("#filter-verification").value,
    };
    Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (!values.verification_status) params.set("include_all", "true");
    const mapParams = new URLSearchParams();
    if (values.verification_status) mapParams.set("verification_status", values.verification_status);
    else mapParams.set("include_all", "true");
    if (values.equipment_type) mapParams.set("equipment_type", values.equipment_type);

    const [result, geojson] = await Promise.all([
      api(`/api/equipment?${params}`),
      api(`/api/map?${mapParams}`),
    ]);
    $("#result-count").textContent = `${result.total.toLocaleString()} record${result.total === 1 ? "" : "s"}`;
    $("#equipment-body").innerHTML = result.items.map(item => `<tr data-id="${item.id}">
      <td><strong>${escapeHtml(item.asset_name)}</strong></td><td>${escapeHtml(item.equipment_type)}</td>
      <td>${escapeHtml(item.manufacturer)}<br><span class="muted">${escapeHtml(item.model_name)}</span></td>
      <td>${escapeHtml(item.mine_site)} (${escapeHtml(item.country_code)})</td><td>${item.quantity}</td>
      <td>${statusBadge(item.verification_status)}</td><td>${item.evidence_count}</td></tr>`).join("") || `<tr><td colspan="7">No matching records.</td></tr>`;
    $$('tr[data-id]', $("#equipment-body")).forEach(row => row.addEventListener("click", () => showDetail(row.dataset.id)));
    renderPagination(result.pages, result.page, next => { page = next; load(); });
    if (mapLayer) map.removeLayer(mapLayer);
    mapLayer = addGeoJson(map, geojson);
  };
  $("#apply-filters").addEventListener("click", () => { page = 1; load().catch(e => toast(e.message)); });
  ["#filter-q", "#filter-manufacturer", "#filter-country"].forEach(sel => $(sel).addEventListener("keydown", e => { if (e.key === "Enter") $("#apply-filters").click(); }));
  setupDialog("#detail-dialog");
  await load();
}

function renderPagination(totalPages, current, onClick) {
  const root = $("#pagination");
  root.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.className = i === current ? "active" : "";
    button.addEventListener("click", () => onClick(i));
    root.appendChild(button);
  }
}

async function showDetail(id, target = "#detail-content", dialogSelector = "#detail-dialog") {
  const item = await api(`/api/equipment/${id}`);
  $(target).innerHTML = detailHtml(item);
  $(dialogSelector).showModal();
}

function detailHtml(item) {
  const hierarchy = item.location_hierarchy.map(x => x.name).join(" → ");
  const evidence = item.evidence.map(e => `<li><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(e.title)}</strong></a><br><span class="muted">${escapeHtml(e.evidence_type)}${e.publisher ? ` · ${escapeHtml(e.publisher)}` : ""}</span></li>`).join("");
  const caseStudies = item.case_studies.map(c => `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(c.title)}</strong></a><br><span class="muted">${escapeHtml(c.media_type)}</span>${c.summary ? `<p>${escapeHtml(c.summary)}</p>` : ""}</li>`).join("");
  return `<p class="eyebrow">${escapeHtml(item.equipment_type)} · ${escapeHtml(item.country_code)}</p><h1>${escapeHtml(item.asset_name)}</h1>
    <div class="detail-grid">
      <div class="detail-item"><span>Manufacturer / model</span><strong>${escapeHtml(item.manufacturer)} ${escapeHtml(item.model_name)}</strong></div>
      <div class="detail-item"><span>Verification</span><strong>${statusBadge(item.verification_status)}</strong></div>
      <div class="detail-item"><span>Owner</span><strong>${escapeHtml(item.owner || "Unknown")}</strong></div>
      <div class="detail-item"><span>Integrator</span><strong>${escapeHtml(item.integrator || "Unknown")}</strong></div>
      <div class="detail-item"><span>Quantity</span><strong>${item.quantity}</strong></div>
      <div class="detail-item"><span>Commissioned</span><strong>${item.commissioning_date || "Unknown"}</strong></div>
      <div class="detail-item"><span>Mine hierarchy</span><strong>${escapeHtml(hierarchy)}</strong></div>
      <div class="detail-item"><span>Autonomy</span><strong>${escapeHtml(item.autonomy_level || "Not specified")}</strong></div>
    </div>
    ${item.notes ? `<h2>Notes</h2><p>${escapeHtml(item.notes)}</p>` : ""}
    <h2>Evidence</h2><ul class="evidence-list">${evidence || "<li>No evidence attached.</li>"}</ul>
    ${caseStudies ? `<h2>Case studies & media</h2><ul class="evidence-list">${caseStudies}</ul>` : ""}`;
}

function setupDialog(selector) {
  const dialog = $(selector);
  $(".dialog-close", dialog).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
}

async function initSubmit() {
  const form = $("#submission-form");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const fd = new FormData(form);
    const nullableNumber = name => fd.get(name) ? Number(fd.get(name)) : null;
    const nullableText = name => fd.get(name)?.toString().trim() || null;
    const payload = {
      asset_name: fd.get("asset_name"), equipment_type: fd.get("equipment_type"),
      manufacturer_name: fd.get("manufacturer_name"), model_name: fd.get("model_name"),
      max_payload_tonnes: nullableNumber("max_payload_tonnes"), operating_weight_tonnes: nullableNumber("operating_weight_tonnes"),
      owner_name: nullableText("owner_name"), integrator_name: nullableText("integrator_name"),
      mine_site_name: fd.get("mine_site_name"), parent_operation_name: nullableText("parent_operation_name"), region_name: nullableText("region_name"),
      country_code: fd.get("country_code"), latitude: Number(fd.get("latitude")), longitude: Number(fd.get("longitude")),
      quantity: Number(fd.get("quantity")), commissioning_date: nullableText("commissioning_date"), asset_status: fd.get("asset_status"),
      autonomy_level: nullableText("autonomy_level"), notes: nullableText("notes"),
      submitted_by_name: fd.get("submitted_by_name"), submitted_by_email: fd.get("submitted_by_email"),
      evidence: [{ title: fd.get("evidence_title"), url: fd.get("evidence_url"), evidence_type: fd.get("evidence_type"), publisher: nullableText("evidence_publisher"), published_date: nullableText("evidence_published_date") }],
      case_studies: nullableText("case_study_url") ? [{
        title: nullableText("case_study_title") || "Linked case study",
        summary: nullableText("case_study_summary"),
        url: nullableText("case_study_url"),
        media_type: fd.get("case_study_media_type") || "case_study",
      }] : [],
    };
    const status = $("#form-status");
    status.textContent = "Submitting...";
    try {
      const result = await api("/api/submissions", { method: "POST", body: JSON.stringify(payload) });
      status.textContent = `Submission #${result.id} received.`;
      form.reset();
      toast(result.message);
    } catch (error) {
      status.textContent = error.message;
      toast(error.message);
    }
  });
}

async function initAdmin() {
  setupDialog("#admin-dialog");
  $("#load-submissions").addEventListener("click", () => loadAdmin().catch(e => toast(e.message)));
}

async function loadAdmin() {
  const key = $("#admin-key").value;
  const result = await api("/api/admin/submissions?verification_status=pending", { headers: { "X-Admin-Key": key } });
  const root = $("#admin-list");
  root.innerHTML = result.items.map(item => `<article class="panel admin-card">
    <div><p class="eyebrow">PENDING #${item.id}</p><h2>${escapeHtml(item.asset_name)}</h2><p class="muted">${escapeHtml(item.manufacturer)} ${escapeHtml(item.model_name)} · ${escapeHtml(item.mine_site)} · ${item.evidence_count} evidence source(s)</p></div>
    <div class="actions"><button class="button secondary small" data-view="${item.id}">Review details</button><button class="button primary small" data-approve="${item.id}">Approve</button><button class="button danger small" data-reject="${item.id}">Reject</button></div>
  </article>`).join("") || `<article class="panel empty-state"><h2>Queue is clear</h2><p>No pending submissions.</p></article>`;
  $$('[data-view]', root).forEach(b => b.addEventListener("click", () => showDetail(b.dataset.view, "#admin-detail", "#admin-dialog")));
  $$('[data-approve]', root).forEach(b => b.addEventListener("click", () => review(b.dataset.approve, "approve", key)));
  $$('[data-reject]', root).forEach(b => b.addEventListener("click", () => review(b.dataset.reject, "reject", key)));
}

async function review(id, action, key) {
  const notes = prompt(`Optional review notes for ${action}:`) || null;
  await api(`/api/admin/submissions/${id}/${action}`, { method: "POST", headers: { "X-Admin-Key": key }, body: JSON.stringify({ notes }) });
  toast(`Submission ${action === "approve" ? "approved" : "rejected"}.`);
  await loadAdmin();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[c]);
}
