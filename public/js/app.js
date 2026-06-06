document.addEventListener("click", (event) => {
  const target = event.target;

  if (target.matches("[data-confirm]")) {
    const msg = target.getAttribute("data-confirm") || "Confirmer cette action ?";
    if (!confirm(msg)) event.preventDefault();
  }

  if (target.matches("[data-qty-plus], [data-qty-minus]")) {
    const box = target.closest(".qty-box");
    const input = box?.querySelector("input[type='number']");
    if (!input) return;

    const min = Number(input.min || 1);
    const max = Number(input.max || 9999);
    const current = Number(input.value || min);
    input.value = target.matches("[data-qty-plus]")
      ? Math.min(max, current + 1)
      : Math.max(min, current - 1);
  }
});

const productImageInput = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");
const fileName = document.getElementById("fileName");

if (productImageInput && imagePreview) {
  productImageInput.addEventListener("change", () => {
    const file = productImageInput.files?.[0];
    if (!file) return;
    fileName.textContent = file.name;
    imagePreview.src = URL.createObjectURL(file);
  });
}


setTimeout(() => {
  document.querySelectorAll(".flash div, .review-pending-flash").forEach((el) => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => el.remove(), 300);
  });
}, 3500);


const categorySelect = document.getElementById("categorySelect");
const categoryOther = document.getElementById("categoryOther");

function toggleCategoryOther() {
  if (!categorySelect || !categoryOther) return;
  const show = categorySelect.value === "__other";
  categoryOther.classList.toggle("is-visible", show);
  categoryOther.required = show;
  if (!show) categoryOther.value = "";
}

toggleCategoryOther();
if (categorySelect) categorySelect.addEventListener("change", toggleCategoryOther);


const priceInput = document.getElementById("priceInput");
const oldPriceInput = document.getElementById("oldPriceInput");
const discountSelect = document.getElementById("discountSelect");

function cleanNumber(value) {
  return Number(String(value || "").replace(",", "."));
}

function formatFormPrice(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function updateCurrentPriceFromDiscount() {
  if (!priceInput || !oldPriceInput || !discountSelect) return;

  const oldPrice = cleanNumber(oldPriceInput.value);
  const discount = cleanNumber(discountSelect.value);

  if (!Number.isFinite(oldPrice) || oldPrice <= 0 || !Number.isFinite(discount) || discount < 0) {
    return;
  }

  const newPrice = oldPrice * (1 - discount / 100);
  priceInput.value = formatFormPrice(newPrice);
}

if (oldPriceInput && discountSelect && priceInput) {
  oldPriceInput.addEventListener("input", updateCurrentPriceFromDiscount);
  discountSelect.addEventListener("change", updateCurrentPriceFromDiscount);
}

const paymentMethodSelect = document.getElementById("paymentMethod");
const onlinePaymentFields = document.getElementById("onlinePaymentFields");
const onlineRequiredFields = document.querySelectorAll("[data-online-field]");

function toggleOnlinePaymentFields() {
  if (!paymentMethodSelect || !onlinePaymentFields) return;
  const show = paymentMethodSelect.value === "online";
  onlinePaymentFields.classList.toggle("is-visible", show);
  onlineRequiredFields.forEach((field) => {
    field.required = show;
  });
}

toggleOnlinePaymentFields();
if (paymentMethodSelect) paymentMethodSelect.addEventListener("change", toggleOnlinePaymentFields);

const galleryImagesInput = document.getElementById("galleryImages");
const galleryFileName = document.getElementById("galleryFileName");
if (galleryImagesInput && galleryFileName) {
  galleryImagesInput.addEventListener("change", () => {
    const count = galleryImagesInput.files ? galleryImagesInput.files.length : 0;
    galleryFileName.textContent = count ? `${count} image(s) sélectionnée(s)` : "Maximum 6 images";
  });
}

const mainProductImage = document.getElementById("mainProductImage");
document.querySelectorAll("[data-gallery-thumb]").forEach((button) => {
  button.addEventListener("click", () => {
    if (mainProductImage) mainProductImage.src = button.getAttribute("data-gallery-thumb");
  });
});



const categoryMega = document.querySelector("[data-category-mega]");
if (categoryMega) {
  const trigger = categoryMega.querySelector("[data-category-mega-trigger]");
  const panel = categoryMega.querySelector("[data-category-mega-panel]");

  function setCategoryMegaOpen(open) {
    if (!trigger || !panel) return;
    if (open) {
      panel.removeAttribute("hidden");
      trigger.setAttribute("aria-expanded", "true");
      categoryMega.classList.add("is-open");
    } else {
      panel.setAttribute("hidden", "hidden");
      trigger.setAttribute("aria-expanded", "false");
      categoryMega.classList.remove("is-open");
    }
  }

  trigger?.addEventListener("click", (event) => {
    event.preventDefault();
    setCategoryMegaOpen(panel.hasAttribute("hidden"));
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-category-mega]")) return;
    setCategoryMegaOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setCategoryMegaOpen(false);
  });

  panel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setCategoryMegaOpen(false));
  });
}

const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('[data-nav-menu]');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('is-open');
    const isOpen = navMenu.classList.contains('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}


const iconPickers = document.querySelectorAll("[data-icon-picker]");
iconPickers.forEach((picker) => {
  const trigger = picker.querySelector("[data-icon-trigger]");
  const panel = picker.querySelector("[data-icon-panel]");
  const input = picker.parentElement?.querySelector("[data-icon-input]") || picker.querySelector("[data-icon-input]") || picker.closest("form")?.querySelector("[data-icon-input]");
  const display = picker.querySelector("[data-icon-display]");
  if (!trigger || !panel || !input || !display) return;

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const isHidden = panel.hasAttribute("hidden");
    document.querySelectorAll("[data-icon-panel]").forEach((otherPanel) => {
      if (otherPanel !== panel) otherPanel.setAttribute("hidden", "hidden");
    });
    document.querySelectorAll("[data-icon-trigger]").forEach((otherTrigger) => {
      if (otherTrigger !== trigger) otherTrigger.setAttribute("aria-expanded", "false");
    });
    if (isHidden) {
      panel.removeAttribute("hidden");
      trigger.setAttribute("aria-expanded", "true");
    } else {
      panel.setAttribute("hidden", "hidden");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  panel.querySelectorAll("[data-icon-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const icon = button.getAttribute("data-icon-option") || "🛒";
      input.value = icon;
      display.textContent = icon;
      panel.querySelectorAll("[data-icon-option]").forEach((option) => option.classList.remove("is-selected"));
      button.classList.add("is-selected");
      panel.setAttribute("hidden", "hidden");
      trigger.setAttribute("aria-expanded", "false");
    });
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-icon-picker]")) return;
  document.querySelectorAll("[data-icon-panel]").forEach((panel) => panel.setAttribute("hidden", "hidden"));
  document.querySelectorAll("[data-icon-trigger]").forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
});


document.querySelectorAll("[data-icon-picker]").forEach((picker) => {
  const currentValue = picker.closest("form")?.querySelector("[data-icon-input]")?.value;
  if (!currentValue) return;
  picker.querySelectorAll("[data-icon-option]").forEach((option) => {
    option.classList.toggle("is-selected", option.getAttribute("data-icon-option") === currentValue);
  });
});


const shopbot = document.querySelector("[data-shopbot]");
if (shopbot) {
  const toggle = shopbot.querySelector("[data-shopbot-toggle]");
  const closeBtn = shopbot.querySelector("[data-shopbot-close]");
  const windowBox = shopbot.querySelector("[data-shopbot-window]");
  const messages = shopbot.querySelector("[data-shopbot-messages]");
  const form = shopbot.querySelector("[data-shopbot-form]");
  const input = shopbot.querySelector("[data-shopbot-input]");

  function setShopbotOpen(open) {
    if (!windowBox || !toggle) return;
    if (open) {
      windowBox.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
      setTimeout(() => input?.focus(), 80);
    } else {
      windowBox.setAttribute("hidden", "hidden");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function addShopbotMessage(content, type = "bot") {
    if (!messages) return null;
    const div = document.createElement("div");
    div.className = `shopbot-msg ${type}`;
    div.innerHTML = content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderShopbotProducts(products) {
    if (!products || !products.length) return "";
    return `<div class="shopbot-products">${products.map((product) => `
      <a class="shopbot-product" href="${escapeHtml(product.url)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
        <div>
          <strong>${escapeHtml(product.title)}</strong>
          <span>${escapeHtml(product.category)} • ⭐ ${escapeHtml(product.rating)}</span>
          <b>${escapeHtml(product.priceText)}</b>
          ${Number(product.discount) > 0 ? `<em>-${escapeHtml(product.discount)}%</em>` : ""}
          <small>Voir le produit</small>
        </div>
      </a>
    `).join("")}</div>`;
  }

  function renderShopbotQuickLinks(quickLinks) {
    if (!quickLinks || !quickLinks.length) return "";
    return `<div class="shopbot-chips dynamic">${quickLinks.map((link) => `
      <button type="button" data-shopbot-chip="${escapeHtml(link.query)}">${escapeHtml(link.label)}</button>
    `).join("")}</div>`;
  }

  async function askShopbot(message) {
    const clean = String(message || "").trim();
    if (!clean) return;

    addShopbotMessage(escapeHtml(clean), "user");
    const loading = addShopbotMessage("Je cherche les meilleurs produits pour vous...", "bot is-loading");

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean })
      });
      const data = await res.json();
      if (loading) loading.remove();
      addShopbotMessage(`${escapeHtml(data.reply)}${renderShopbotProducts(data.products)}${renderShopbotQuickLinks(data.quickLinks)}`, "bot");
    } catch (_err) {
      if (loading) loading.remove();
      addShopbotMessage("Désolé, je n'arrive pas à chercher maintenant. Essayez encore.", "bot");
    }
  }

  toggle?.addEventListener("click", () => setShopbotOpen(windowBox.hasAttribute("hidden")));
  closeBtn?.addEventListener("click", () => setShopbotOpen(false));

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    askShopbot(value);
  });

  shopbot.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-shopbot-chip]");
    if (!chip) return;
    const query = chip.getAttribute("data-shopbot-chip");
    setShopbotOpen(true);
    askShopbot(query);
  });
}

// Dark mode removed: site stays in light mode for a cleaner design
try { localStorage.removeItem("supmtishop-theme"); } catch (error) {}

// Extra frontend validation for a better user experience
const checkoutForm = document.querySelector('form[action="/checkout"]');
if (checkoutForm) {
  checkoutForm.addEventListener("submit", (event) => {
    const phone = checkoutForm.querySelector('[name="phone"]')?.value || "";
    const address = checkoutForm.querySelector('[name="address"]')?.value || "";
    if (phone.replace(/\D/g, "").length < 9) {
      event.preventDefault();
      alert("Merci de saisir un numéro de téléphone valide.");
      return;
    }
    if (address.trim().length < 8) {
      event.preventDefault();
      alert("Merci de saisir une adresse complète.");
    }
  });
}

const contactForm = document.querySelector('form[action="/contact"]');
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    const message = contactForm.querySelector('[name="message"]')?.value || "";
    if (message.trim().length < 10) {
      event.preventDefault();
      alert("Le message doit contenir au moins 10 caractères.");
    }
  });
}


// Simple loading state for professional form actions
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (event.defaultPrevented) return;
  if ((form.method || "").toLowerCase() !== "post") return;

  const button = form.querySelector('button[type="submit"], .btn[type="submit"]');
  if (!button || button.hasAttribute("data-no-loading")) return;

  const originalText = button.textContent;
  button.dataset.originalText = originalText;
  setTimeout(() => {
    if (!form.matches(":valid") && form.checkValidity) return;
    button.disabled = true;
    button.classList.add("is-loading-action");
    button.textContent = "Traitement en cours...";
  }, 0);
});
