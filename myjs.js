import { DataJson } from "./data.js";

// Parse the JSON string exported from data.js
const parsed = JSON.parse(DataJson);

/**
 * Normalise a single metadata record into a shape that is convenient for the UI.
 */
function normaliseRecord(title, rec) {
  const get = (key) => (rec[key] ?? "").toString().trim();

  // Keywords header is messy in the source; find the first key that starts with "Keywords"
  let keywords = "";
  const kwKey = Object.keys(rec).find((k) => k.toLowerCase().startsWith("keywords"));
  if (kwKey) {
    keywords = (rec[kwKey] ?? "").toString().trim();
  }

  const description =
    get("Description") ||
    get("Detailed Description") ||
    get("Overview Description");

  const timePeriod = get("Time Period of Content");
  const category = get("Data Category");
  const custodian = get("Data Custodian");

  const externalRef = get("External Metadata Reference");
  const pointOfContact = get("Point of Contact");

  const link = pickLink(externalRef, pointOfContact);

  return {
    id: title,
    title,
    citation: get("Citation"),
    description,
    timePeriod,
    category,
    custodian,
    keywords,
    link,
    raw: rec,
  };
}

/**
 * Choose the best candidate for an outbound link.
 */
function pickLink(externalRef, pointOfContact) {
  const isUrl = (val) =>
    typeof val === "string" &&
    val.startsWith("http") &&
    !/^\s*(NA or TBC|N\/A)\s*$/i.test(val);

  if (isUrl(externalRef)) return externalRef;
  if (isUrl(pointOfContact)) return pointOfContact;
  return "";
}

// Build an array of normalised records
const records = Object.entries(parsed).map(([title, rec]) =>
  normaliseRecord(title, rec)
);

// Cache DOM references
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const yearFilter = document.getElementById("yearFilter");
const summaryEl = document.getElementById("summary");
const cardResultsEl = document.getElementById("cardResults");
const tableResultsEl = document.getElementById("tableResults");
const tableBodyEl = document.getElementById("tableBody");

const cardViewBtn = document.getElementById("cardViewBtn");
const tableViewBtn = document.getElementById("tableViewBtn");

// --- Filters & search ---

function populateFilters() {
  const categories = new Set();
  const years = new Set();

  records.forEach((r) => {
    if (r.category) categories.add(r.category);
    if (r.timePeriod) years.add(r.timePeriod);
  });

  Array.from(categories)
    .sort((a, b) => a.localeCompare(b))
    .forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

  Array.from(years)
    .sort((a, b) => a.localeCompare(b))
    .forEach((yr) => {
      const opt = document.createElement("option");
      opt.value = yr;
      opt.textContent = yr;
      yearFilter.appendChild(opt);
    });
}

function getFilteredRecords() {
  const q = (searchInput.value || "").toLowerCase();
  const category = categoryFilter.value;
  const year = yearFilter.value;

  return records.filter((r) => {
    if (category && r.category !== category) return false;
    if (year && r.timePeriod !== year) return false;

    if (!q) return true;

    const haystack = [
      r.title,
      r.citation,
      r.description,
      r.keywords,
      r.category,
      r.custodian,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

// --- Rendering ---

function renderSummary(list) {
  if (list.length === 0) {
    summaryEl.textContent =
      "No matching resources. Try a different search term or clear filters.";
  } else {
    summaryEl.textContent = `Showing ${list.length} of ${records.length} resources`;
  }
}

function renderCards(list) {
  cardResultsEl.innerHTML = "";

  if (list.length === 0) {
    const div = document.createElement("div");
    div.className = "no-results";
    div.textContent = "No matching records. Try adjusting your search or filters.";
    cardResultsEl.appendChild(div);
    return;
  }

  list.forEach((r) => {
    const card = document.createElement("article");
    card.className = "card";

    const h2 = document.createElement("h2");
    h2.textContent = r.title;
    card.appendChild(h2);

    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";

    if (r.category) {
      const catBadge = document.createElement("span");
      catBadge.className = "badge";
      catBadge.textContent = r.category;
      badgeRow.appendChild(catBadge);
    }

    if (r.timePeriod) {
      const yearBadge = document.createElement("span");
      yearBadge.className = "badge";
      yearBadge.textContent = r.timePeriod;
      badgeRow.appendChild(yearBadge);
    }

    if (badgeRow.children.length > 0) {
      card.appendChild(badgeRow);
    }

    if (r.citation) {
      const cit = document.createElement("p");
      cit.className = "citation";
      cit.textContent = r.citation;
      card.appendChild(cit);
    }

    if (r.description) {
      const desc = document.createElement("p");
      desc.className = "description";
      desc.textContent = r.description;
      card.appendChild(desc);
    }

    if (r.keywords) {
      const kw = document.createElement("p");
      kw.className = "meta";
      kw.textContent = "Keywords: " + r.keywords;
      card.appendChild(kw);
    }

    if (r.custodian) {
      const cust = document.createElement("p");
      cust.className = "meta";
      cust.textContent = "Custodian: " + r.custodian;
      card.appendChild(cust);
    }

    if (r.link) {
      const link = document.createElement("a");
      link.href = r.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open resource";
      card.appendChild(link);
    }

    cardResultsEl.appendChild(card);
  });
}

function renderTable(list) {
  tableBodyEl.innerHTML = "";

  if (list.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "no-results";
    cell.textContent = "No matching records.";
    row.appendChild(cell);
    tableBodyEl.appendChild(row);
    return;
  }

  list.forEach((r) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = r.title;
    row.appendChild(titleCell);

    const catCell = document.createElement("td");
    catCell.textContent = r.category || "";
    row.appendChild(catCell);

    const yearCell = document.createElement("td");
    yearCell.textContent = r.timePeriod || "";
    row.appendChild(yearCell);

    const kwCell = document.createElement("td");
    kwCell.textContent = r.keywords || "";
    row.appendChild(kwCell);

    const custCell = document.createElement("td");
    custCell.textContent = r.custodian || "";
    row.appendChild(custCell);

    const linkCell = document.createElement("td");
    if (r.link) {
      const a = document.createElement("a");
      a.href = r.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Open";
      linkCell.appendChild(a);
    } else {
      linkCell.textContent = "";
    }
    row.appendChild(linkCell);

    tableBodyEl.appendChild(row);
  });
}

function updateView() {
  const filtered = getFilteredRecords();
  renderSummary(filtered);
  renderCards(filtered);
  renderTable(filtered);
}

// --- View mode toggling ---

function setViewMode(mode) {
  const showCards = mode === "cards";

  if (showCards) {
    cardResultsEl.hidden = false;
    tableResultsEl.hidden = true;
    cardViewBtn.classList.add("active");
    tableViewBtn.classList.remove("active");
  } else {
    cardResultsEl.hidden = true;
    tableResultsEl.hidden = false;
    cardViewBtn.classList.remove("active");
    tableViewBtn.classList.add("active");
  }
}

// --- Init ---

function init() {
  populateFilters();
  updateView();
  setViewMode("cards");

  searchInput.addEventListener("input", updateView);
  categoryFilter.addEventListener("change", updateView);
  yearFilter.addEventListener("change", updateView);

  cardViewBtn.addEventListener("click", () => setViewMode("cards"));
  tableViewBtn.addEventListener("click", () => setViewMode("table"));
}

document.addEventListener("DOMContentLoaded", init);
