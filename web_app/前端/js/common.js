const API_BASE = "http://localhost:8000/api";

function setActiveNav(id) {
  const links = document.querySelectorAll("[data-nav]");
  links.forEach(l => l.classList.remove("active"));
  const active = document.querySelector(`[data-nav='${id}']`);
  if (active) active.classList.add("active");
}

function toggleLoader(show) {
  const el = document.getElementById("loader");
  if (!el) return;
  el.style.display = show ? "flex" : "none";
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return await res.json();
}

