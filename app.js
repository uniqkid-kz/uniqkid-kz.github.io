const MAIN_ORDER = ["Спорт товары", "Для дома и сада", "Для офиса", "Для кемпинга"];
const PAGE_SIZE = 20;

const state = {
  products: [],
  groups: {},
  mainCategory: "Все",
  subcategory: "Все",
  query: "",
  sort: "featured",
  visible: PAGE_SIZE,
};

const els = {
  headerSearch: document.querySelector("#header-search"),
  search: document.querySelector("#search"),
  sort: document.querySelector("#sort"),
  mainTabs: document.querySelector("#main-tabs"),
  subcategoryTabs: document.querySelector("#subcategory-tabs"),
  productGrid: document.querySelector("#product-grid"),
  hitsGrid: document.querySelector("#hits-grid"),
  categoryCards: document.querySelector("#main-category-cards"),
  empty: document.querySelector("#empty-state"),
  loadMore: document.querySelector("#load-more"),
  template: document.querySelector("#product-card-template"),
  dialog: document.querySelector("#product-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
};

const formatPrice = new Intl.NumberFormat("ru-RU");
const normalize = (value = "") => String(value).toLocaleLowerCase("ru").replace(/ё/g, "е").trim();
const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function imageOf(product, preferred = 0) {
  const images = product?.images || [];
  const item = images[preferred] || images[0];
  return item?.large || item?.medium || item?.small || "";
}

function findProduct({ main, category, name, avoid = [] } = {}) {
  const avoidIds = new Set(avoid.map((item) => item?.product_id));
  return state.products.find((product) => {
    if (avoidIds.has(product.product_id)) return false;
    if (main && product.main_category !== main) return false;
    if (category && product.category !== category) return false;
    if (name && !normalize(product.name).includes(normalize(name))) return false;
    return imageOf(product);
  });
}

function recommendedProducts() {
  const criteria = [
    { category: "Беговые дорожки" },
    { category: "Велотренажеры" },
    { category: "Компьютерные и офисные кресла" },
    { category: "Кофеварки и кофемашины" },
    { category: "Электрические массажеры" },
    { category: "Степперы" },
  ];
  const selected = [];
  criteria.forEach((criterion) => {
    const product = findProduct({ ...criterion, avoid: selected });
    if (product) selected.push(product);
  });
  for (const product of state.products) {
    if (selected.length >= 6) break;
    if (!selected.some((item) => item.product_id === product.product_id) && imageOf(product)) selected.push(product);
  }
  return selected;
}

function makeCard(product) {
  const fragment = els.template.content.cloneNode(true);
  const article = fragment.querySelector(".product-card");
  const button = fragment.querySelector(".product-open");
  const image = fragment.querySelector(".product-image");
  image.src = imageOf(product);
  image.alt = product.name;
  image.addEventListener("error", () => article.remove(), { once: true });
  fragment.querySelector(".product-category").textContent = product.category;
  fragment.querySelector(".product-name").textContent = product.name;
  const meta = fragment.querySelector(".product-meta");
  if (Number(product.rating) > 0) {
    meta.textContent = `★ ${Number(product.rating).toFixed(1)}`;
  } else {
    meta.textContent = "UNIQKID · на Kaspi.kz";
    meta.classList.add("no-rating");
  }
  fragment.querySelector(".product-price").textContent = `${formatPrice.format(product.price || 0)} ₸`;
  button.setAttribute("aria-label", `Открыть ${product.name}`);
  button.addEventListener("click", () => openProduct(product));
  return fragment;
}

function renderVisualSections() {
  const hero = findProduct({ category: "Беговые дорожки", name: "Q6.1" }) || findProduct({ category: "Беговые дорожки" });
  const office = findProduct({ category: "Компьютерные и офисные кресла", name: "Ergo" }) || findProduct({ category: "Компьютерные и офисные кресла" });
  const home = findProduct({ category: "Массажные кресла" }) || findProduct({ category: "Кресла" });
  const detail = findProduct({ category: "Кофеварки и кофемашины" }) || findProduct({ category: "Очистители и увлажнители" });

  const heroImage = document.querySelector("#hero-image");
  heroImage.src = imageOf(hero, Math.min(1, (hero?.images?.length || 1) - 1));
  document.querySelector("#promo-sport-image").src = imageOf(hero);
  document.querySelector("#promo-office-image").src = imageOf(office);
  document.querySelector("#about-image-main").src = imageOf(home);
  document.querySelector("#about-image-small").src = imageOf(detail);

  const representative = {
    "Спорт товары": hero,
    "Для дома и сада": home || detail,
    "Для офиса": office,
    "Для кемпинга": findProduct({ category: "Палатки" }) || findProduct({ main: "Для кемпинга" }),
  };

  els.categoryCards.innerHTML = "";
  MAIN_ORDER.forEach((category) => {
    const product = representative[category] || findProduct({ main: category });
    const button = document.createElement("button");
    button.type = "button";
    button.className = "main-category-card";
    button.innerHTML = `
      <img src="${escapeHtml(imageOf(product))}" alt="${escapeHtml(category)}">
      <div>${escapeHtml(category)}</div>
      <b aria-hidden="true">→</b>
    `;
    button.addEventListener("click", () => chooseMainCategory(category, true));
    els.categoryCards.append(button);
  });

  els.hitsGrid.innerHTML = "";
  recommendedProducts().forEach((product) => els.hitsGrid.append(makeCard(product)));
}

function renderTabs() {
  els.mainTabs.innerHTML = "";
  ["Все", ...MAIN_ORDER].forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button${state.mainCategory === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => chooseMainCategory(category));
    els.mainTabs.append(button);
  });

  const subcategories = state.mainCategory === "Все"
    ? MAIN_ORDER.flatMap((category) => state.groups[category] || [])
    : state.groups[state.mainCategory] || [];
  els.subcategoryTabs.innerHTML = "";
  ["Все", ...subcategories].forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab-button${state.subcategory === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.subcategory = category;
      state.visible = PAGE_SIZE;
      renderTabs();
      renderProducts();
    });
    els.subcategoryTabs.append(button);
  });
}

function chooseMainCategory(category, scroll = false) {
  state.mainCategory = category;
  state.subcategory = "Все";
  state.visible = PAGE_SIZE;
  renderTabs();
  renderProducts();
  if (scroll) document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
}

function filteredProducts() {
  const query = normalize(state.query);
  const result = state.products.filter((product) => {
    if (state.mainCategory !== "Все" && product.main_category !== state.mainCategory) return false;
    if (state.subcategory !== "Все" && product.category !== state.subcategory) return false;
    if (!query) return true;
    return normalize([product.name, product.category, product.main_category, product.brand, product.description].join(" ")).includes(query);
  });

  if (state.sort === "price-asc") result.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (state.sort === "price-desc") result.sort((a, b) => (b.price || 0) - (a.price || 0));
  if (state.sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return result;
}

function renderProducts() {
  const filtered = filteredProducts();
  const visible = filtered.slice(0, state.visible);
  els.productGrid.innerHTML = "";
  visible.forEach((product) => els.productGrid.append(makeCard(product)));
  els.empty.hidden = filtered.length !== 0;
  els.loadMore.hidden = visible.length >= filtered.length || filtered.length === 0;
}

function specsHtml(product) {
  const groups = Array.isArray(product.specifications) ? product.specifications : [];
  if (!groups.length) return "";
  let rows = 0;
  return `<div class="specs">${groups.slice(0, 4).map((group) => {
    const items = (group.specifications || group.attributes || group.items || []).filter(() => rows++ < 20);
    if (!items.length) return "";
    return `<h3>${escapeHtml(group.name || "Характеристики")}</h3>${items.map((item) => {
      const name = item.name || item.title || "";
      const value = item.value || item.text || item.values?.join(", ") || "";
      return `<div class="spec-row"><span>${escapeHtml(name)}</span><span>${escapeHtml(value)}</span></div>`;
    }).join("")}`;
  }).join("")}</div>`;
}

function openProduct(product) {
  const images = (product.images || []).filter((item) => item.large || item.medium || item.small).slice(0, 14);
  const first = imageOf(product);
  const description = product.description || "Подробные характеристики и условия покупки доступны на странице товара в Kaspi.kz.";
  els.dialogContent.innerHTML = `
    <div class="dialog-layout">
      <div class="dialog-gallery">
        <img id="dialog-main-image" class="dialog-gallery-main" src="${escapeHtml(first)}" alt="${escapeHtml(product.name)}">
        <div class="dialog-thumbs">
          ${images.map((item, index) => `<button class="dialog-thumb${index === 0 ? " active" : ""}" type="button" data-src="${escapeHtml(item.large || item.medium || item.small)}"><img src="${escapeHtml(item.small || item.medium || item.large)}" alt=""></button>`).join("")}
        </div>
      </div>
      <div class="dialog-info">
        <p class="eyebrow">${escapeHtml(product.main_category)} · ${escapeHtml(product.category)}</p>
        <h2>${escapeHtml(product.name)}</h2>
        <div class="dialog-price">${formatPrice.format(product.price || 0)} ₸</div>
        <p class="dialog-description">${escapeHtml(description)}</p>
        <a class="button button-primary dialog-kaspi" href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">Открыть на Kaspi.kz <span>→</span></a>
        ${specsHtml(product)}
      </div>
    </div>
  `;
  const mainImage = els.dialogContent.querySelector("#dialog-main-image");
  els.dialogContent.querySelectorAll(".dialog-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainImage.src = thumb.dataset.src;
      els.dialogContent.querySelectorAll(".dialog-thumb").forEach((item) => item.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
  els.dialog.showModal();
}

function bindEvents() {
  const setSearch = (value, syncTarget) => {
    state.query = value;
    state.visible = PAGE_SIZE;
    if (syncTarget) syncTarget.value = value;
    renderProducts();
  };
  els.search.addEventListener("input", (event) => setSearch(event.target.value, els.headerSearch));
  els.headerSearch.addEventListener("input", (event) => {
    setSearch(event.target.value, els.search);
    if (event.target.value.trim()) document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });
  els.loadMore.addEventListener("click", () => {
    state.visible += PAGE_SIZE;
    renderProducts();
  });
  document.querySelectorAll("[data-promo-category]").forEach((button) => {
    button.addEventListener("click", () => chooseMainCategory(button.dataset.promoCategory, true));
  });
  els.dialogClose.addEventListener("click", () => els.dialog.close());
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });
}

async function init() {
  try {
    const response = await fetch("./data/products.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.products = payload.products || [];
    state.groups = payload.main_categories || {};
    renderVisualSections();
    renderTabs();
    renderProducts();
    bindEvents();
  } catch (error) {
    console.error(error);
    els.productGrid.innerHTML = '<div class="empty-state"><h3>Каталог не загрузился</h3><p>Откройте сайт через локальный сервер или GitHub Pages.</p></div>';
  }
}

init();
