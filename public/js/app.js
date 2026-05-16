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
  document.querySelectorAll(".flash div").forEach((el) => {
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
