try { require('dotenv').config(); } catch (_err) {}

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const methodOverride = require("method-override");
const multer = require("multer");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "store.json");
const SEED_PRODUCTS_FILE = path.join(__dirname, "data", "seed-products.json");
const UPLOAD_DIR = path.join(__dirname, "public", "images", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const DEFAULT_CATEGORIES = [
  { name: "Électronique", icon: "💻" },
  { name: "Gaming", icon: "🎮" },
  { name: "Mode", icon: "👕" },
  { name: "Maison", icon: "🏠" },
  { name: "Beauté", icon: "💄" },
  { name: "Sport", icon: "🏋️" },
  { name: "Accessoires", icon: "🎧" },
  { name: "Enfants", icon: "🧸" },
  { name: "Auto", icon: "🚗" },
  { name: "Bureau", icon: "🖥️" }
];

const ORDER_STEPS = [
  { key: "new", label: "Commande reçue" },
  { key: "processing", label: "En préparation" },
  { key: "shipped", label: "Expédiée" },
  { key: "delivered", label: "Livrée" }
];

const CITY_SHIPPING = {
  "taourirt": 20,
  "oujda": 20,
  "rabat": 35,
  "casablanca": 35,
  "fès": 35,
  "fes": 35,
  "marrakech": 35,
  "tanger": 35,
  "agadir": 40,
  "meknès": 35,
  "meknes": 35
};

const COUPONS = {
  SUPMTI10: { label: "SUPMTI10", type: "percent", value: 10, description: "-10% sur le sous-total" },
  WELCOME20: { label: "WELCOME20", type: "percent", value: 20, max: 120, description: "-20% jusqu’à 120 DH" },
  LIVRAISON: { label: "LIVRAISON", type: "shipping", value: 100, description: "Livraison gratuite" }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path
        .basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || "product";
      cb(null, `${Date.now()}-${crypto.randomBytes(3).toString("hex")}-${safeName}${ext}`);
    }
  }),
  fileFilter: function (_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Seules les images sont acceptées."));
    }
    cb(null, true);
  },
  limits: { fileSize: 4 * 1024 * 1024 }
});

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_err) {
    return fallback;
  }
}

function nextId(list) {
  return list && list.length ? Math.max(...list.map((item) => Number(item.id) || 0)) + 1 : 1;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeCategoryName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function ensureDBShape(db) {
  db.users = db.users || [];
  db.products = db.products || [];
  db.orders = db.orders || [];
  db.reviews = db.reviews || [];
  db.wishlist = db.wishlist || [];
  db.categories = db.categories || [];
  db.contactMessages = db.contactMessages || [];

  if (!db.categories.length) {
    const productCategories = [...new Set(db.products.map((p) => normalizeCategoryName(p.category)).filter(Boolean))];
    const all = [...DEFAULT_CATEGORIES.map((c) => c.name), ...productCategories];
    db.categories = [...new Set(all)].map((name, index) => ({
      id: index + 1,
      name,
      slug: slugify(name),
      icon: DEFAULT_CATEGORIES.find((c) => c.name === name)?.icon || "🛒",
      createdAt: new Date().toISOString()
    }));
  }

  db.products.forEach((product) => {
    product.gallery = Array.isArray(product.gallery) ? product.gallery : [];
    product.stock = Number(product.stock || 0);
    product.sold = Number(product.sold || 0);
    product.rating = Number(product.rating || 0);
    product.reviewCount = Number(product.reviewCount || 0);
  });

  db.users.forEach((user) => {
    user.phone = user.phone || "";
    user.city = user.city || "";
    user.address = user.address || "";
  });

  db.orders.forEach((order) => {
    order.status = order.status || "new";
    order.paymentStatus = order.paymentStatus || "pending";
    order.shipping = Number(order.shipping || 0);
    order.discount = Number(order.discount || 0);
    order.total = Number(order.total || 0);
    order.statusHistory = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : [{ status: order.status, at: order.createdAt || new Date().toISOString(), by: "Système" }];
  });

  db.reviews.forEach((review) => {
    review.status = review.status || "approved";
    review.createdAt = review.createdAt || new Date().toISOString();
    review.updatedAt = review.updatedAt || review.createdAt;
  });

  return db;
}

function loadDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], products: [], orders: [], reviews: [], wishlist: [], categories: [], contactMessages: [] }, null, 2));
  }
  const db = ensureDBShape(readJson(DATA_FILE, { users: [], products: [], orders: [], reviews: [], wishlist: [], categories: [], contactMessages: [] }));
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(ensureDBShape(db), null, 2));
}

function getCategories(db) {
  return [...(db.categories || [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function getCategoryOptions(db) {
  const fromProducts = (db.products || [])
    .map((p) => normalizeCategoryName(p.category))
    .filter(Boolean);
  const fromDb = (db.categories || []).map((c) => normalizeCategoryName(c.name)).filter(Boolean);
  return [...new Set([...DEFAULT_CATEGORIES.map((c) => c.name), ...fromDb, ...fromProducts])].sort((a, b) => a.localeCompare(b, "fr"));
}

function findCategoryIcon(db, categoryName) {
  const category = (db.categories || []).find((c) => c.name === categoryName);
  return category?.icon || DEFAULT_CATEGORIES.find((c) => c.name === categoryName)?.icon || "🛒";
}

function getNavigationCategories(db) {
  const products = db.products || [];
  return getCategories(db).map((category) => {
    const categoryProducts = products.filter((product) => product.category === category.name);
    const firstProductWithImage = categoryProducts.find((product) => product.image);
    const hasHotDeal = categoryProducts.some((product) => getDiscountPercent(product) > 0 || product.deal);
    return {
      ...category,
      icon: category.icon || findCategoryIcon(db, category.name),
      image: category.image || firstProductWithImage?.image || "",
      count: categoryProducts.length,
      hot: hasHotDeal
    };
  });
}

function seedAdminAndClient() {
  const db = loadDB();
  const now = new Date().toISOString();

  if (!db.users.some((u) => u.email === "admin@market.ma")) {
    db.users.push({
      id: nextId(db.users),
      name: "Administrateur",
      email: "admin@market.ma",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "admin",
      phone: "",
      city: "",
      address: "",
      createdAt: now
    });
  }

  if (!db.users.some((u) => u.email === "client@market.ma")) {
    db.users.push({
      id: nextId(db.users),
      name: "Client Démo",
      email: "client@market.ma",
      passwordHash: bcrypt.hashSync("client123", 10),
      role: "client",
      phone: "06 00 00 00 00",
      city: "Taourirt",
      address: "Adresse démo",
      createdAt: now
    });
  }

  if (!db.products || db.products.length === 0) {
    db.products = readJson(SEED_PRODUCTS_FILE, []);
  }

  saveDB(db);
}

seedAdminAndClient();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: "lax" }
  })
);

app.use(flash());

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function getCouponInfo(code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized || !COUPONS[normalized]) return null;
  return { code: normalized, ...COUPONS[normalized] };
}

function calculateCouponDiscount(code, subtotal, shipping) {
  const coupon = getCouponInfo(code);
  if (!coupon || subtotal <= 0) return { coupon: null, couponDiscount: 0, shippingDiscount: 0 };

  if (coupon.type === "percent") {
    const raw = subtotal * (Number(coupon.value || 0) / 100);
    return { coupon, couponDiscount: Math.min(raw, Number(coupon.max || raw)), shippingDiscount: 0 };
  }

  if (coupon.type === "shipping") {
    return { coupon, couponDiscount: 0, shippingDiscount: shipping };
  }

  return { coupon: null, couponDiscount: 0, shippingDiscount: 0 };
}

function getShippingByCity(city, subtotal) {
  if (!subtotal) return 0;
  if (subtotal >= 1000) return 0;
  const key = slugify(city || "").replace(/-/g, " ");
  const normalizedKey = Object.keys(CITY_SHIPPING).find((c) => slugify(c).replace(/-/g, " ") === key);
  return normalizedKey ? CITY_SHIPPING[normalizedKey] : 45;
}

function getCartDetails(req, city = "", couponCode = "") {
  const db = loadDB();
  const cart = getCart(req);
  const items = cart
    .map((line) => {
      const product = db.products.find((p) => Number(p.id) === Number(line.productId));
      if (!product) return null;
      const qty = Math.max(1, Number(line.qty) || 1);
      return { product, qty, subtotal: Number(product.price) * qty };
    })
    .filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingBase = getShippingByCity(city, subtotal);
  const autoDiscount = subtotal >= 700 ? 50 : 0;
  const couponData = calculateCouponDiscount(couponCode, subtotal, shippingBase);
  const shipping = Math.max(0, shippingBase - couponData.shippingDiscount);
  const couponDiscount = Math.round((couponData.couponDiscount + Number.EPSILON) * 100) / 100;
  const discount = autoDiscount + couponDiscount;
  const total = Math.max(0, subtotal + shipping - discount);

  return { items, subtotal, shipping, shippingBase, autoDiscount, coupon: couponData.coupon, couponCode: normalizeCouponCode(couponCode), couponDiscount, discount, total, selectedCity: city, shippingTable: CITY_SHIPPING };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash("error", "Connectez-vous d'abord.");
    return res.redirect("/login");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    req.flash("error", "Accès réservé à l'administrateur.");
    return res.redirect("/login");
  }
  next();
}

function requireClient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "client") {
    req.flash("error", "Accès réservé au client.");
    return res.redirect("/login");
  }
  next();
}

function formatPrice(value) {
  return `${Number(value || 0).toFixed(2)} DH`;
}

function getDiscountPercent(product) {
  const direct = Number(product?.discountPercent || 0);
  if (direct > 0) return Math.round(direct);
  const oldPrice = Number(product?.oldPrice || 0);
  const price = Number(product?.price || 0);
  if (oldPrice > price && oldPrice > 0) return Math.round(((oldPrice - price) / oldPrice) * 100);
  return 0;
}

function calculatePriceFromForm(price, oldPrice, discountPercent) {
  const typedPrice = Number(price || 0);
  const typedOldPrice = Number(oldPrice || 0);
  const discount = Number(discountPercent || 0);
  if (typedOldPrice > 0 && discount >= 0) return Math.round(typedOldPrice * (1 - discount / 100) * 100) / 100;
  return Math.round(typedPrice * 100) / 100;
}

function isRevenueOrder(order) {
  return order.paymentStatus === "paid" && order.status !== "cancelled";
}

function getAllProductReviews(db, productId) {
  return (db.reviews || [])
    .filter((review) => Number(review.productId) === Number(productId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getProductReviews(db, productId) {
  return getAllProductReviews(db, productId).filter((review) => review.status === "approved");
}

function hasUserPurchasedProduct(db, userId, productId) {
  return (db.orders || []).some((order) =>
    Number(order.userId) === Number(userId) &&
    order.status !== "cancelled" &&
    (order.items || []).some((item) => Number(item.productId) === Number(productId))
  );
}

function getReviewStats(reviews, product) {
  const count = reviews.length;
  const average = count ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count : Number(product.rating || 0);
  return {
    average: Math.round(average * 10) / 10,
    count,
    breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((review) => Number(review.rating) === stars).length }))
  };
}

function syncProductRating(db, productId) {
  const product = db.products.find((p) => Number(p.id) === Number(productId));
  if (!product) return;
  const reviews = getProductReviews(db, productId);
  product.reviewCount = reviews.length;
  if (reviews.length) {
    const average = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
    product.rating = Math.round(average * 10) / 10;
  }
}

function statusLabel(status) {
  return {
    new: "Commande reçue",
    processing: "En préparation",
    shipped: "Expédiée",
    delivered: "Livrée",
    cancelled: "Annulée"
  }[status] || status;
}

function paymentStatusLabel(status) {
  return {
    pending: "En attente",
    paid: "Payée",
    refunded: "Remboursée"
  }[status] || status;
}

function getOrderTimeline(order) {
  if (order.status === "cancelled") {
    return [{ key: "cancelled", label: "Commande annulée", done: true }];
  }
  const currentIndex = Math.max(0, ORDER_STEPS.findIndex((step) => step.key === order.status));
  return ORDER_STEPS.map((step, index) => ({ ...step, done: index <= currentIndex, active: index === currentIndex }));
}

function getTopCategories(db) {
  const map = new Map();
  db.products.forEach((p) => {
    map.set(p.category, (map.get(p.category) || 0) + 1);
  });
  return [...map.entries()].map(([name, count]) => ({ name, count, icon: findCategoryIcon(db, name) })).sort((a, b) => b.count - a.count).slice(0, 6);
}


function normalizeForSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPriceRange(message) {
  const text = normalizeForSearch(message);
  const numbers = [...text.matchAll(/\b\d+(?:[.,]\d+)?\b/g)].map((match) => Number(String(match[0]).replace(",", "."))).filter(Number.isFinite);
  if (!numbers.length) return { min: null, max: null };

  const rangeMatch = text.match(/(?:entre|between)\s+(\d+(?:[.,]\d+)?)\s+(?:et|and|a|to)\s+(\d+(?:[.,]\d+)?)/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1].replace(",", "."));
    const b = Number(rangeMatch[2].replace(",", "."));
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  if (/\b(moins|inferieur|inférieur|max|maximum|budget|under|below|cheap|pas cher)\b/.test(text)) {
    return { min: null, max: numbers[0] };
  }

  if (/\b(plus|superieur|supérieur|min|minimum|over|above)\b/.test(text)) {
    return { min: numbers[0], max: null };
  }

  if (/\b(dh|dirham|mad|prix)\b/.test(text)) {
    return { min: null, max: numbers[0] };
  }

  return { min: null, max: null };
}

function buildChatbotProductResponse(message) {
  const db = loadDB();
  const rawMessage = String(message || "").trim();
  const normalizedMessage = normalizeForSearch(rawMessage);
  const categories = getCategories(db);
  const products = [...db.products];

  const categoryQuickLinks = categories.slice(0, 6).map((category) => ({
    label: `${category.icon || "🛒"} ${category.name}`,
    query: category.name
  }));

  const productPayload = (product) => ({
    id: product.id,
    title: product.title,
    category: product.category,
    image: product.image,
    price: Number(product.price || 0),
    oldPrice: Number(product.oldPrice || 0),
    priceText: formatPrice(product.price),
    discount: getDiscountPercent(product),
    stock: Number(product.stock || 0),
    rating: Number(product.rating || 0),
    url: `/product/${product.id}`
  });

  if (!normalizedMessage) {
    return {
      reply: "Bonjour 👋 Je peux vous orienter vers les bons produits. Recherchez par nom, catégorie, prix ou disponibilité, par exemple : casque gaming, promotion, maison moins de 300 DH.",
      products: products
        .filter((product) => Number(product.stock || 0) > 0)
        .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
        .slice(0, 3)
        .map(productPayload),
      quickLinks: [
        { label: "Promotions", query: "promotions" },
        { label: "En stock", query: "produits disponibles" },
        { label: "Top ventes", query: "top ventes" },
        ...categoryQuickLinks.slice(0, 3)
      ]
    };
  }

  const helpResponses = [
    {
      pattern: /\b(livraison|delai|délai|ville|shipping)\b/,
      reply: "La livraison est calculée selon votre ville au moment du checkout. Le total est affiché clairement avant la validation de la commande."
    },
    {
      pattern: /\b(paiement|payer|carte|cash)\b/,
      reply: "Vous pouvez choisir le paiement à la livraison ou le paiement en ligne simulé. Le choix se fait dans la page de validation de commande."
    },
    {
      pattern: /\b(panier|commande|acheter|checkout)\b/,
      reply: "Pour commander : ouvrez un produit, choisissez la quantité, ajoutez-le au panier, puis validez la commande depuis la page checkout."
    },
    {
      pattern: /\b(contact|support|whatsapp|aide)\b/,
      reply: "Vous pouvez contacter le support depuis la page Contact ou avec le bouton WhatsApp disponible sur le site."
    }
  ];

  const category = categories.find((cat) => normalizedMessage.includes(normalizeForSearch(cat.name)));
  const { min, max } = extractPriceRange(rawMessage);
  const wantsDiscount = /\b(promo|promotion|reduction|réduction|discount|solde|soldes|offre|offres)\b/.test(normalizedMessage);
  const wantsStock = /\b(stock|disponible|dispo|en stock|available)\b/.test(normalizedMessage);
  const wantsBest = /\b(top|meilleur|best|populaire|vente|vendus|popular)\b/.test(normalizedMessage);
  const wantsCheap = /\b(pas cher|moins cher|cheap|prix bas|budget|economique|économique)\b/.test(normalizedMessage);

  const synonyms = {
    telephone: ["telephone", "smartphone", "phone", "mobile", "iphone", "samsung"],
    pc: ["pc", "ordinateur", "laptop", "portable", "macbook", "bureau", "desktop"],
    audio: ["audio", "casque", "ecouteur", "écouteur", "headset", "airpods", "earphone", "headphones"],
    gaming: ["gaming", "gamer", "jeu", "console", "clavier", "souris", "keyboard", "mouse"],
    mode: ["mode", "vetement", "vêtement", "tshirt", "chemise", "chaussure", "sneaker", "shoes", "pants"],
    maison: ["maison", "home", "cuisine", "deco", "décoration", "lampe", "lamp", "desk", "table", "bedding"],
    beaute: ["beaute", "beauté", "skin", "soin", "cosmetique", "cosmétique", "creme", "crème"],
    sport: ["sport", "fitness", "musculation", "gym", "cycling", "running", "shorts"],
    auto: ["auto", "voiture", "car", "vehicule", "véhicule", "moto", "motorcycle"],
    jouet: ["jouet", "jouets", "toy", "toys", "enfant", "enfants", "kids"],
    camera: ["camera", "caméra", "drone", "mini camera", "mini caméra"]
  };

  const expandedWords = new Set(normalizedMessage.split(" ").filter((word) => word.length > 2));
  Object.entries(synonyms).forEach(([key, list]) => {
    const normalizedList = list.map(normalizeForSearch);
    if (normalizedList.some((word) => normalizedMessage.includes(word))) {
      expandedWords.add(key);
      normalizedList.forEach((word) => word.split(" ").forEach((part) => part.length > 2 && expandedWords.add(part)));
    }
  });

  const scoreProduct = (product) => {
    const title = normalizeForSearch(product.title);
    const description = normalizeForSearch(product.description);
    const prodCategory = normalizeForSearch(product.category);
    const haystack = `${title} ${description} ${prodCategory}`;
    let score = 0;

    expandedWords.forEach((word) => {
      if (!word || word.length < 3) return;
      if (title.includes(word)) score += 7;
      if (prodCategory.includes(word)) score += 6;
      if (description.includes(word)) score += 3;
      if (haystack.includes(word)) score += 2;
      if ([...haystack.split(" ")].some((token) => token.startsWith(word) || word.startsWith(token))) score += 1;
    });

    if (category && normalizeForSearch(product.category) === normalizeForSearch(category.name)) score += 12;
    if (wantsDiscount && getDiscountPercent(product) > 0) score += 10;
    if (wantsStock && Number(product.stock || 0) > 0) score += 8;
    if (wantsBest) score += Math.min(12, Number(product.sold || 0) / 20);
    if (wantsCheap) score += Math.max(0, 8 - Number(product.price || 0) / 120);
    if (min !== null && Number(product.price) >= min) score += 4;
    if (max !== null && Number(product.price) <= max) score += 10;
    if (max !== null && Number(product.price) > max) score -= 30;
    if (min !== null && Number(product.price) < min) score -= 15;
    if (Number(product.stock || 0) <= 0 && !/\b(epuise|épuisé|out)\b/.test(normalizedMessage)) score -= 6;
    if (Number(product.stock || 0) > 0) score += 1;

    return score;
  };

  let results = products
    .map((product) => ({ product, score: scoreProduct(product) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.product.sold || 0) - Number(a.product.sold || 0))
    .slice(0, 5)
    .map(({ product }) => productPayload(product));

  if (results.length) {
    const pricePart = max !== null ? ` dans un budget jusqu'à ${formatPrice(max)}` : min !== null ? ` à partir de ${formatPrice(min)}` : "";
    return {
      reply: `Voici ${results.length} produit(s) correspondant à votre recherche${pricePart}. Vous pouvez ouvrir la fiche produit pour voir les détails.`,
      products: results,
      quickLinks: [
        { label: "Promotions", query: "promotions" },
        { label: "Produits disponibles", query: "produits disponibles" },
        { label: "Top ventes", query: "top ventes" },
        ...categoryQuickLinks.slice(0, 3)
      ]
    };
  }

  const help = helpResponses.find((item) => item.pattern.test(normalizedMessage));
  if (help) {
    return {
      reply: help.reply,
      products: [],
      quickLinks: categoryQuickLinks
    };
  }

  const fallbackProducts = products
    .filter((product) => Number(product.stock || 0) > 0)
    .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0) || Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 4)
    .map(productPayload);

  return {
    reply: "Je n’ai pas trouvé un résultat exact pour votre demande. Voici quelques produits populaires que vous pouvez consulter, ou essayez un mot-clé plus simple comme gaming, casque, maison, beauté ou moins de 500 DH.",
    products: fallbackProducts,
    quickLinks: [
      { label: "Gaming", query: "gaming" },
      { label: "Maison", query: "maison" },
      { label: "Accessoires", query: "accessoires" },
      { label: "Moins de 500 DH", query: "moins de 500 DH" },
      { label: "Promotions", query: "promotions" }
    ]
  };
}

function getMonthlyNewUsers(db) {
  const now = new Date();
  return db.users.filter((u) => {
    if (u.role !== "client" || !u.createdAt) return false;
    const d = new Date(u.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function generateInvoicePdf(res, order) {
  const doc = new PDFDocument({ margin: 42, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=facture-${order.reference}.pdf`);
  doc.pipe(res);

  doc.fontSize(24).fillColor("#0b7f84").text("SupMtiShop", { continued: true });
  doc.fillColor("#111827").fontSize(13).text("  Facture", { align: "right" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#6b7280").text("Boutique e-commerce moderne — Supported by SupMti");
  doc.moveDown(1.3);

  doc.fillColor("#111827").fontSize(13).text(`Facture: ${order.reference}`);
  doc.fontSize(10).text(`Date: ${new Date(order.createdAt).toLocaleString("fr-FR")}`);
  doc.text(`Client: ${order.customer.fullName}`);
  doc.text(`Email: ${order.customer.email || "-"}`);
  doc.text(`Téléphone: ${order.customer.phone}`);
  doc.text(`Adresse: ${order.customer.address}, ${order.customer.city}`);
  doc.moveDown(1);

  const startY = doc.y;
  doc.fontSize(10).fillColor("#ffffff").rect(42, startY, 510, 24).fill("#0b7f84");
  doc.fillColor("#ffffff").text("Produit", 50, startY + 7, { width: 230 });
  doc.text("Prix", 285, startY + 7, { width: 70, align: "right" });
  doc.text("Qté", 370, startY + 7, { width: 40, align: "right" });
  doc.text("Total", 450, startY + 7, { width: 90, align: "right" });
  doc.fillColor("#111827");
  doc.y = startY + 34;

  order.items.forEach((item) => {
    const y = doc.y;
    doc.text(item.title, 50, y, { width: 220 });
    doc.text(formatPrice(item.price), 285, y, { width: 70, align: "right" });
    doc.text(String(item.qty), 370, y, { width: 40, align: "right" });
    doc.text(formatPrice(item.subtotal), 450, y, { width: 90, align: "right" });
    doc.moveDown(0.7);
  });

  doc.moveDown(1);
  doc.text(`Sous-total: ${formatPrice(order.subtotal)}`, { align: "right" });
  doc.text(`Livraison: ${order.shipping ? formatPrice(order.shipping) : "Gratuite"}`, { align: "right" });
  doc.text(`Réduction automatique: -${formatPrice(order.autoDiscount || 0)}`, { align: "right" });
  if (order.couponCode) doc.text(`Coupon ${order.couponCode}: -${formatPrice(order.couponDiscount || 0)}`, { align: "right" });
  else doc.text(`Coupon: -${formatPrice(0)}`, { align: "right" });
  doc.fontSize(15).fillColor("#f0442f").text(`Total: ${formatPrice(order.total)}`, { align: "right" });
  doc.moveDown(1);
  doc.fontSize(10).fillColor("#111827").text(`Paiement: ${order.paymentMethod === "online" ? "En ligne" : "À la livraison"}`);
  doc.text(`Statut paiement: ${paymentStatusLabel(order.paymentStatus)}`);
  if (order.paymentReference) doc.text(`Référence paiement: ${order.paymentReference}`);
  doc.moveDown(1.5);
  doc.fillColor("#6b7280").text("Merci pour votre confiance. Cette facture est générée automatiquement par SupMtiShop.", { align: "center" });
  doc.end();
}

app.use((req, res, next) => {
  const db = loadDB();
  const currentUser = req.session.user || null;
  const wishlistSet = new Set(
    currentUser
      ? (db.wishlist || []).filter((w) => Number(w.userId) === Number(currentUser.id)).map((w) => Number(w.productId))
      : []
  );
  res.locals.currentUser = currentUser;
  res.locals.messages = { success: req.flash("success"), error: req.flash("error") };
  res.locals.cartCount = getCart(req).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  res.locals.wishlistCount = wishlistSet.size;
  res.locals.isWishlisted = (productId) => wishlistSet.has(Number(productId));
  res.locals.formatPrice = formatPrice;
  res.locals.getDiscountPercent = getDiscountPercent;
  res.locals.statusLabel = statusLabel;
  res.locals.paymentStatusLabel = paymentStatusLabel;
  res.locals.getOrderTimeline = getOrderTimeline;
  res.locals.findCategoryIcon = (categoryName) => findCategoryIcon(db, categoryName);
  res.locals.navCategories = getNavigationCategories(db);
  res.locals.availableCoupons = COUPONS;
  res.locals.path = req.path;
  next();
});


app.post("/api/chatbot", (req, res) => {
  try {
    const response = buildChatbotProductResponse(req.body?.message || "");
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Désolé, l'assistant n'a pas pu traiter votre demande. Réessayez avec un mot-clé simple.",
      products: [],
      quickLinks: []
    });
  }
});


app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/faq", (req, res) => {
  res.render("faq");
});

app.get("/returns", (req, res) => {
  res.render("returns");
});

app.get("/contact", requireClient, (req, res) => {
  res.render("contact");
});

app.post("/contact", requireClient, (req, res) => {
  const db = loadDB();
  const { subject, message } = req.body;
  const currentClient = req.session.user;
  const name = currentClient?.name || currentClient?.nom || currentClient?.fullName || "Client";
  const email = currentClient?.email || "";
  if (!subject || !message) {
    req.flash("error", "Merci d'écrire le sujet et le message.");
    return res.redirect("/contact");
  }
  db.contactMessages.unshift({
    id: nextId(db.contactMessages),
    userId: currentClient.id,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    subject: String(subject).trim(),
    message: String(message).trim(),
    status: "new",
    createdAt: new Date().toISOString()
  });
  saveDB(db);
  req.flash("success", "Message envoyé. Le support SupMtiShop vous répondra rapidement.");
  res.redirect("/contact");
});

app.get("/", (req, res) => {
  const db = loadDB();
  const featured = db.products.filter((p) => p.featured && Number(p.stock) > 0).slice(0, 8);
  const deals = db.products.filter((p) => (getDiscountPercent(p) > 0 || p.deal) && Number(p.stock) > 0).slice(0, 8);
  const bestSellers = [...db.products].filter((p) => Number(p.stock) > 0).sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0)).slice(0, 8);
  const categories = getCategories(db).slice(0, 10);
  const testimonials = getProductReviews(db, db.products[0]?.id || 0).slice(0, 2);
  res.render("home", { featured, deals, bestSellers, categories, testimonials });
});

app.get("/products", (req, res) => {
  const db = loadDB();
  let products = [...db.products];
  const { q, category, sort, max, min, rating, discount, availability } = req.query;

  if (q) {
    const needle = q.toLowerCase().trim();
    products = products.filter((p) => [p.title, p.description, p.category].join(" ").toLowerCase().includes(needle));
  }
  if (category) products = products.filter((p) => p.category === category);
  if (min) products = products.filter((p) => Number(p.price) >= Number(min));
  if (max) products = products.filter((p) => Number(p.price) <= Number(max));
  if (rating) products = products.filter((p) => Number(p.rating || 0) >= Number(rating));
  if (discount) products = products.filter((p) => getDiscountPercent(p) >= Number(discount));
  if (availability === "in_stock") products = products.filter((p) => Number(p.stock) > 0);
  if (availability === "out") products = products.filter((p) => Number(p.stock) <= 0);

  if (sort === "price_asc") products.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") products.sort((a, b) => b.price - a.price);
  if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
  if (sort === "sold") products.sort((a, b) => b.sold - a.sold);
  if (sort === "newest") products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (sort === "discount") products.sort((a, b) => getDiscountPercent(b) - getDiscountPercent(a));

  res.render("products", { products, categories: getCategoryOptions(db), query: req.query });
});

app.get("/product/:id", (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");
  const reviews = getProductReviews(db, product.id);
  const allReviews = getAllProductReviews(db, product.id);
  const reviewStats = getReviewStats(reviews, product);
  const userReview = req.session.user ? allReviews.find((review) => Number(review.userId) === Number(req.session.user.id)) : null;
  const related = db.products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  res.render("product-detail", { product, related, reviews, reviewStats, userReview, reviewPending: req.query.reviewPending === "1" });
});

app.post("/products/:id/reviews", requireClient, (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    req.flash("error", "Choisissez une note entre 1 et 5 étoiles.");
    return res.redirect(`/product/${product.id}#reviews`);
  }
  if (comment.length < 3) {
    req.flash("error", "Le commentaire doit contenir au moins 3 caractères.");
    return res.redirect(`/product/${product.id}#reviews`);
  }
  const existing = db.reviews.find((review) => Number(review.productId) === Number(product.id) && Number(review.userId) === Number(req.session.user.id));
  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.status = "pending";
    existing.verifiedPurchase = hasUserPurchasedProduct(db, req.session.user.id, product.id);
    existing.updatedAt = new Date().toISOString();
  } else {
    db.reviews.unshift({
      id: nextId(db.reviews),
      productId: product.id,
      userId: req.session.user.id,
      userName: req.session.user.name,
      rating,
      comment,
      status: "pending",
      verifiedPurchase: hasUserPurchasedProduct(db, req.session.user.id, product.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  syncProductRating(db, product.id);
  saveDB(db);
  req.flash("success", "Votre avis est en attente de validation.");
  res.redirect(`/product/${product.id}?reviewPending=1#reviews`);
});

app.post("/wishlist/toggle", requireClient, (req, res) => {
  const db = loadDB();
  const productId = Number(req.body.productId);
  const product = db.products.find((p) => Number(p.id) === productId);
  if (!product) {
    req.flash("error", "Produit introuvable.");
    return res.redirect("/products");
  }
  const index = db.wishlist.findIndex((w) => Number(w.productId) === productId && Number(w.userId) === Number(req.session.user.id));
  if (index >= 0) {
    db.wishlist.splice(index, 1);
    req.flash("success", "Produit retiré des favoris.");
  } else {
    db.wishlist.unshift({ id: nextId(db.wishlist), userId: req.session.user.id, productId, createdAt: new Date().toISOString() });
    req.flash("success", "Produit ajouté aux favoris.");
  }
  saveDB(db);
  res.redirect(req.get("referer") || "/wishlist");
});

app.get("/wishlist", requireClient, (req, res) => {
  const db = loadDB();
  const productIds = db.wishlist.filter((w) => Number(w.userId) === Number(req.session.user.id)).map((w) => Number(w.productId));
  const products = db.products.filter((p) => productIds.includes(Number(p.id)));
  res.render("wishlist", { products });
});

app.get("/cart", (req, res) => res.render("cart", getCartDetails(req)));

app.post("/cart/add", (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.body.productId));
  if (!product) {
    req.flash("error", "Produit introuvable.");
    return res.redirect("/products");
  }
  if (Number(product.stock) <= 0) {
    req.flash("error", "Ce produit est actuellement épuisé.");
    return res.redirect(req.get("referer") || "/products");
  }
  const cart = getCart(req);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const existing = cart.find((line) => Number(line.productId) === Number(product.id));
  if (existing) existing.qty = Math.min(product.stock, Number(existing.qty) + qty);
  else cart.push({ productId: product.id, qty: Math.min(product.stock, qty) });
  req.flash("success", "Produit ajouté au panier.");
  if (req.body.redirectTo === "checkout") return res.redirect("/checkout");
  res.redirect(req.get("referer") || "/cart");
});

app.post("/cart/update", (req, res) => {
  const db = loadDB();
  const cart = getCart(req);
  const productId = Number(req.body.productId);
  const product = db.products.find((p) => Number(p.id) === productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const line = cart.find((item) => Number(item.productId) === productId);
  if (line && product) line.qty = Math.min(qty, Number(product.stock || 1));
  req.flash("success", "Panier mis à jour.");
  res.redirect("/cart");
});

app.post("/cart/remove", (req, res) => {
  req.session.cart = getCart(req).filter((item) => Number(item.productId) !== Number(req.body.productId));
  req.flash("success", "Produit supprimé du panier.");
  res.redirect("/cart");
});

app.get("/register", (req, res) => res.render("auth/register"));

app.post("/register", (req, res) => {
  const db = loadDB();
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password) {
    req.flash("error", "Tous les champs sont obligatoires.");
    return res.redirect("/register");
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    req.flash("error", "Mot de passe: minimum 8 caractères avec au moins une lettre et un chiffre.");
    return res.redirect("/register");
  }
  if (password !== confirmPassword) {
    req.flash("error", "Les mots de passe ne correspondent pas.");
    return res.redirect("/register");
  }
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    req.flash("error", "Cet email est déjà utilisé.");
    return res.redirect("/register");
  }
  const user = {
    id: nextId(db.users),
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: "client",
    phone: "",
    city: "",
    address: "",
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  saveDB(db);
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash("success", "Compte créé avec succès.");
  res.redirect("/");
});

app.get("/login", (req, res) => res.render("auth/login"));

app.post("/login", (req, res) => {
  const db = loadDB();
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    req.flash("error", "Email ou mot de passe incorrect.");
    return res.redirect("/login");
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash("success", `Bienvenue ${user.name}.`);
  res.redirect(user.role === "admin" ? "/admin" : "/");
});

app.post("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

app.get("/profile", requireClient, (req, res) => {
  const db = loadDB();
  const user = db.users.find((u) => Number(u.id) === Number(req.session.user.id));
  res.render("profile", { user });
});

app.post("/profile", requireClient, (req, res) => {
  const db = loadDB();
  const user = db.users.find((u) => Number(u.id) === Number(req.session.user.id));
  if (!user) return res.redirect("/login");
  const { name, phone, city, address, currentPassword, newPassword } = req.body;
  user.name = String(name || user.name).trim();
  user.phone = String(phone || "").trim();
  user.city = String(city || "").trim();
  user.address = String(address || "").trim();
  if (newPassword) {
    if (!bcrypt.compareSync(currentPassword || "", user.passwordHash)) {
      req.flash("error", "Mot de passe actuel incorrect.");
      return res.redirect("/profile");
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      req.flash("error", "Nouveau mot de passe: minimum 8 caractères avec lettre et chiffre.");
      return res.redirect("/profile");
    }
    user.passwordHash = bcrypt.hashSync(newPassword, 10);
  }
  req.session.user.name = user.name;
  saveDB(db);
  req.flash("success", "Profil mis à jour.");
  res.redirect("/profile");
});

app.get("/checkout", requireClient, (req, res) => {
  const db = loadDB();
  const user = db.users.find((u) => Number(u.id) === Number(req.session.user.id)) || req.session.user;
  const cartData = getCartDetails(req, user.city || "", req.query.coupon || "");
  if (!cartData.items.length) {
    req.flash("error", "Votre panier est vide.");
    return res.redirect("/cart");
  }
  res.render("checkout", { ...cartData, user });
});

app.post("/checkout", requireClient, (req, res) => {
  const db = loadDB();
  const { fullName, phone, city, address, paymentMethod, cardName, cardNumber, cardExpiry, cardCvc, acceptTerms, couponCode } = req.body;
  const cartData = getCartDetails(req, city, couponCode);
  if (couponCode && !cartData.coupon) {
    req.flash("error", "Code promo invalide. Essayez SUPMTI10, WELCOME20 ou LIVRAISON.");
    return res.redirect("/checkout");
  }
  if (!cartData.items.length) {
    req.flash("error", "Votre panier est vide.");
    return res.redirect("/cart");
  }
  if (!fullName || !phone || !city || !address || !paymentMethod) {
    req.flash("error", "Merci de compléter les informations de livraison.");
    return res.redirect("/checkout");
  }
  if (acceptTerms !== "on") {
    req.flash("error", "Vous devez accepter les conditions de vente.");
    return res.redirect("/checkout");
  }
  const onlinePaid = paymentMethod === "online";
  const cardDigits = String(cardNumber || "").replace(/\D/g, "");
  const cvcDigits = String(cardCvc || "").replace(/\D/g, "");
  if (onlinePaid && (!cardName || cardDigits.length < 12 || !cardExpiry || cvcDigits.length < 3)) {
    req.flash("error", "Merci de compléter les informations du paiement en ligne.");
    return res.redirect("/checkout");
  }
  for (const item of cartData.items) {
    const product = db.products.find((p) => Number(p.id) === Number(item.product.id));
    if (!product || product.stock < item.qty) {
      req.flash("error", `Stock insuffisant pour ${item.product.title}.`);
      return res.redirect("/cart");
    }
  }
  cartData.items.forEach((item) => {
    const product = db.products.find((p) => Number(p.id) === Number(item.product.id));
    product.stock -= item.qty;
    product.sold = Number(product.sold || 0) + item.qty;
  });
  const now = new Date().toISOString();
  const order = {
    id: nextId(db.orders),
    reference: `CMD-${Date.now()}`,
    userId: req.session.user.id,
    customer: { fullName, phone, city, address, email: req.session.user.email },
    items: cartData.items.map((item) => ({ productId: item.product.id, title: item.product.title, image: item.product.image, price: item.product.price, qty: item.qty, subtotal: item.subtotal })),
    subtotal: cartData.subtotal,
    shipping: cartData.shipping,
    shippingBase: cartData.shippingBase,
    autoDiscount: cartData.autoDiscount,
    couponCode: cartData.coupon?.code || "",
    couponLabel: cartData.coupon?.label || "",
    couponDiscount: cartData.couponDiscount,
    discount: cartData.discount,
    total: cartData.total,
    paymentMethod,
    paymentStatus: onlinePaid ? "paid" : "pending",
    paymentReference: onlinePaid ? `PAY-${crypto.randomBytes(4).toString("hex").toUpperCase()}` : "",
    paymentDetails: onlinePaid ? { cardHolder: cardName, cardLast4: cardDigits.slice(-4), provider: "SupMtiPay" } : null,
    status: "new",
    statusHistory: [{ status: "new", at: now, by: "Client" }],
    createdAt: now
  };
  db.orders.unshift(order);
  const user = db.users.find((u) => Number(u.id) === Number(req.session.user.id));
  if (user) Object.assign(user, { phone, city, address });
  saveDB(db);
  req.session.cart = [];
  req.flash("success", "Commande validée avec succès.");
  res.redirect(`/orders/${order.id}`);
});

app.get("/orders", requireClient, (req, res) => {
  const db = loadDB();
  const orders = db.orders.filter((o) => Number(o.userId) === Number(req.session.user.id));
  res.render("orders", { orders });
});

app.get("/orders/:id", requireClient, (req, res) => {
  const db = loadDB();
  const order = db.orders.find((o) => Number(o.id) === Number(req.params.id) && Number(o.userId) === Number(req.session.user.id));
  if (!order) return res.status(404).render("not-found");
  res.render("order-detail", { order });
});

app.get("/orders/:id/invoice", requireClient, (req, res) => {
  const db = loadDB();
  const order = db.orders.find((o) => Number(o.id) === Number(req.params.id) && Number(o.userId) === Number(req.session.user.id));
  if (!order) return res.status(404).render("not-found");
  generateInvoicePdf(res, order);
});

// Admin
app.get("/admin", requireAdmin, (req, res) => {
  const db = loadDB();
  const paidOrders = db.orders.filter(isRevenueOrder);
  const cancelledOrders = db.orders.filter((o) => o.status === "cancelled");
  const bestProducts = [...db.products].sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0)).slice(0, 6);
  const topCategories = getTopCategories(db);
  const stats = {
    products: db.products.length,
    users: db.users.filter((u) => u.role === "client").length,
    orders: db.orders.length,
    paidOrders: paidOrders.length,
    cancelledOrders: cancelledOrders.length,
    newClientsThisMonth: getMonthlyNewUsers(db),
    revenue: paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    lowStockCount: db.products.filter((p) => Number(p.stock) <= 10).length,
    pendingReviews: db.reviews.filter((r) => r.status === "pending").length,
    contactMessages: db.contactMessages.length
  };
  const orderStatusCounts = ["new", "processing", "shipped", "delivered", "cancelled"].map((status) => ({ status, label: statusLabel(status), count: db.orders.filter((o) => o.status === status).length }));
  const monthlyRevenue = paidOrders.reduce((map, order) => {
    const d = new Date(order.createdAt || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map[key] = (map[key] || 0) + Number(order.total || 0);
    return map;
  }, {});
  const monthlyRevenueChart = Object.entries(monthlyRevenue).sort().slice(-6).map(([month, total]) => ({ month, total }));
  const latestOrders = db.orders.slice(0, 6);
  const lowStock = db.products.filter((p) => Number(p.stock) <= 12).slice(0, 6);
  res.render("admin/dashboard", { stats, latestOrders, lowStock, bestProducts, topCategories, orderStatusCounts, monthlyRevenueChart });
});


app.get("/admin/messages", requireAdmin, (req, res) => {
  const db = loadDB();
  const status = String(req.query.status || "all");
  let contactMessages = [...(db.contactMessages || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (status !== "all") contactMessages = contactMessages.filter((m) => m.status === status);
  const counts = {
    all: (db.contactMessages || []).length,
    new: (db.contactMessages || []).filter((m) => m.status === "new").length,
    read: (db.contactMessages || []).filter((m) => m.status === "read").length,
    replied: (db.contactMessages || []).filter((m) => m.status === "replied").length
  };
  res.render("admin/messages", { contactMessages, status, counts });
});

app.post("/admin/messages/:id/status", requireAdmin, (req, res) => {
  const db = loadDB();
  const message = (db.contactMessages || []).find((m) => Number(m.id) === Number(req.params.id));
  if (!message) return res.status(404).render("not-found");
  message.status = req.body.status || message.status || "read";
  message.updatedAt = new Date().toISOString();
  saveDB(db);
  req.flash("success", "Message contact mis à jour.");
  res.redirect("/admin/messages");
});

app.delete("/admin/messages/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  db.contactMessages = (db.contactMessages || []).filter((m) => Number(m.id) !== Number(req.params.id));
  saveDB(db);
  req.flash("success", "Message contact supprimé.");
  res.redirect("/admin/messages");
});

app.get("/admin/products", requireAdmin, (req, res) => {
  const db = loadDB();
  const q = String(req.query.q || "").trim().toLowerCase();
  let products = [...db.products];
  if (q) products = products.filter((p) => [p.title, p.category, p.description].join(" ").toLowerCase().includes(q));
  const productStats = { total: db.products.length, deals: db.products.filter((p) => getDiscountPercent(p) > 0 || p.deal).length, featured: db.products.filter((p) => p.featured).length, lowStock: db.products.filter((p) => Number(p.stock) <= 10).length };
  res.render("admin/products", { products, productStats, q: req.query.q || "" });
});

app.get("/admin/products/new", requireAdmin, (req, res) => {
  const db = loadDB();
  res.render("admin/product-form", { product: null, action: "/admin/products", categories: getCategoryOptions(db) });
});

app.post("/admin/products", requireAdmin, upload.fields([{ name: "productImage", maxCount: 1 }, { name: "galleryImages", maxCount: 6 }]), (req, res) => {
  const db = loadDB();
  const { title, description, price, oldPrice, stock, featured, deal, discountPercent } = req.body;
  const category = normalizeCategoryName(req.body.category === "__other" ? req.body.categoryOther : req.body.category || "");
  if (!title || !category || !stock || (!price && !oldPrice)) {
    req.flash("error", "Titre, catégorie, stock et prix sont obligatoires.");
    return res.redirect("/admin/products/new");
  }
  if (!db.categories.some((c) => c.name.toLowerCase() === category.toLowerCase())) {
    db.categories.push({ id: nextId(db.categories), name: category, slug: slugify(category), icon: "🛒", createdAt: new Date().toISOString() });
  }
  const finalPrice = calculatePriceFromForm(price, oldPrice, discountPercent);
  const finalOldPrice = Number(oldPrice || finalPrice);
  const mainImage = req.files?.productImage?.[0] ? `/images/uploads/${req.files.productImage[0].filename}` : "/images/products/p1.svg";
  const gallery = (req.files?.galleryImages || []).map((file) => `/images/uploads/${file.filename}`);
  db.products.unshift({ id: nextId(db.products), title, description: description || "", category, price: finalPrice, oldPrice: finalOldPrice, stock: Number(stock), image: mainImage, gallery, featured: featured === "on", deal: deal === "on" || Number(discountPercent || 0) > 0, discountPercent: Number(discountPercent || 0), rating: 4.2, reviewCount: 0, sold: 0, createdAt: new Date().toISOString() });
  saveDB(db);
  req.flash("success", "Produit ajouté.");
  res.redirect("/admin/products");
});

app.get("/admin/products/:id/edit", requireAdmin, (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");
  res.render("admin/product-form", { product, action: `/admin/products/${product.id}?_method=PUT`, categories: getCategoryOptions(db) });
});

app.put("/admin/products/:id", requireAdmin, upload.fields([{ name: "productImage", maxCount: 1 }, { name: "galleryImages", maxCount: 6 }]), (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");
  const { title, description, price, oldPrice, stock, featured, deal, discountPercent } = req.body;
  const category = normalizeCategoryName(req.body.category === "__other" ? req.body.categoryOther : req.body.category || "");
  if (!db.categories.some((c) => c.name.toLowerCase() === category.toLowerCase())) db.categories.push({ id: nextId(db.categories), name: category, slug: slugify(category), icon: "🛒", createdAt: new Date().toISOString() });
  const finalPrice = calculatePriceFromForm(price, oldPrice, discountPercent);
  const finalOldPrice = Number(oldPrice || finalPrice);
  const newGallery = (req.files?.galleryImages || []).map((file) => `/images/uploads/${file.filename}`);
  const keptGallery = Array.isArray(req.body.keepGallery) ? req.body.keepGallery : req.body.keepGallery ? [req.body.keepGallery] : [];
  Object.assign(product, { title, description, category, price: finalPrice, oldPrice: finalOldPrice, stock: Number(stock), image: req.files?.productImage?.[0] ? `/images/uploads/${req.files.productImage[0].filename}` : product.image, gallery: [...keptGallery, ...newGallery], featured: featured === "on", deal: deal === "on" || Number(discountPercent || 0) > 0, discountPercent: Number(discountPercent || 0) });
  saveDB(db);
  req.flash("success", "Produit modifié.");
  res.redirect("/admin/products");
});

app.delete("/admin/products/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  db.products = db.products.filter((p) => Number(p.id) !== Number(req.params.id));
  db.reviews = db.reviews.filter((r) => Number(r.productId) !== Number(req.params.id));
  db.wishlist = db.wishlist.filter((w) => Number(w.productId) !== Number(req.params.id));
  saveDB(db);
  req.flash("success", "Produit supprimé.");
  res.redirect("/admin/products");
});

app.get("/admin/categories", requireAdmin, (req, res) => {
  const db = loadDB();
  const counts = Object.fromEntries(db.products.map((p) => [p.category, 0]));
  db.products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  res.render("admin/categories", { categories: getCategories(db), counts });
});

app.post("/admin/categories", requireAdmin, upload.single("categoryImage"), (req, res) => {
  const db = loadDB();
  const name = normalizeCategoryName(req.body.name);
  if (!name) {
    req.flash("error", "Le nom de la catégorie est obligatoire.");
    return res.redirect("/admin/categories");
  }
  if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    req.flash("error", "Cette catégorie existe déjà.");
    return res.redirect("/admin/categories");
  }
  db.categories.push({ id: nextId(db.categories), name, slug: slugify(name), icon: req.body.icon || "🛒", image: req.file ? `/images/uploads/${req.file.filename}` : "", createdAt: new Date().toISOString() });
  saveDB(db);
  req.flash("success", "Catégorie ajoutée.");
  res.redirect("/admin/categories");
});

app.post("/admin/categories/:id", requireAdmin, upload.single("categoryImage"), (req, res) => {
  const db = loadDB();
  const category = db.categories.find((c) => Number(c.id) === Number(req.params.id));
  if (!category) return res.status(404).render("not-found");
  const oldName = category.name;
  const name = normalizeCategoryName(req.body.name);
  category.name = name || category.name;
  category.slug = slugify(category.name);
  category.icon = req.body.icon || category.icon || "🛒";
  if (req.file) category.image = `/images/uploads/${req.file.filename}`;
  db.products.forEach((p) => { if (p.category === oldName) p.category = category.name; });
  saveDB(db);
  req.flash("success", "Catégorie modifiée.");
  res.redirect("/admin/categories");
});

app.delete("/admin/categories/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  const category = db.categories.find((c) => Number(c.id) === Number(req.params.id));
  if (!category) return res.status(404).render("not-found");
  if (db.products.some((p) => p.category === category.name)) {
    req.flash("error", "Impossible de supprimer une catégorie utilisée par des produits.");
    return res.redirect("/admin/categories");
  }
  db.categories = db.categories.filter((c) => Number(c.id) !== Number(req.params.id));
  saveDB(db);
  req.flash("success", "Catégorie supprimée.");
  res.redirect("/admin/categories");
});


function csvEscape(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n;]/.test(text) ? `"${text}"` : text;
}

function sendCsv(res, filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send("\ufeff" + csv);
}

app.get("/admin/export/orders.csv", requireAdmin, (req, res) => {
  const db = loadDB();
  const rows = [["Reference", "Client", "Ville", "Total", "Paiement", "Statut", "Date"]];
  db.orders.forEach((order) => rows.push([order.reference, order.customer?.fullName || "", order.customer?.city || "", order.total, paymentStatusLabel(order.paymentStatus), statusLabel(order.status), order.createdAt]));
  sendCsv(res, "supmtishop-commandes.csv", rows);
});

app.get("/admin/export/products.csv", requireAdmin, (req, res) => {
  const db = loadDB();
  const rows = [["ID", "Produit", "Categorie", "Prix", "Ancien prix", "Stock", "Vendus", "Note"]];
  db.products.forEach((p) => rows.push([p.id, p.title, p.category, p.price, p.oldPrice, p.stock, p.sold, p.rating]));
  sendCsv(res, "supmtishop-produits.csv", rows);
});

app.get("/admin/export/users.csv", requireAdmin, (req, res) => {
  const db = loadDB();
  const rows = [["ID", "Nom", "Email", "Role", "Telephone", "Ville", "Date creation"]];
  db.users.forEach((u) => rows.push([u.id, u.name, u.email, u.role, u.phone, u.city, u.createdAt]));
  sendCsv(res, "supmtishop-utilisateurs.csv", rows);
});

app.get("/admin/orders", requireAdmin, (req, res) => {
  const db = loadDB();
  res.render("admin/orders", { orders: db.orders });
});

app.post("/admin/orders/:id/status", requireAdmin, (req, res) => {
  const db = loadDB();
  const order = db.orders.find((o) => Number(o.id) === Number(req.params.id));
  if (!order) return res.status(404).render("not-found");
  const oldStatus = order.status;
  order.status = req.body.status || order.status;
  order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
  if (oldStatus !== order.status) order.statusHistory.push({ status: order.status, at: new Date().toISOString(), by: "Admin" });
  saveDB(db);
  req.flash("success", "Commande mise à jour.");
  res.redirect("/admin/orders");
});

app.get("/admin/reviews", requireAdmin, (req, res) => {
  const db = loadDB();
  const reviews = db.reviews.map((r) => ({ ...r, product: db.products.find((p) => Number(p.id) === Number(r.productId)) })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render("admin/reviews", { reviews });
});

app.post("/admin/reviews/:id/status", requireAdmin, (req, res) => {
  const db = loadDB();
  const review = db.reviews.find((r) => Number(r.id) === Number(req.params.id));
  if (!review) return res.status(404).render("not-found");
  review.status = req.body.status || review.status;
  review.updatedAt = new Date().toISOString();
  syncProductRating(db, review.productId);
  saveDB(db);
  req.flash("success", "Avis mis à jour.");
  res.redirect("/admin/reviews");
});

app.delete("/admin/reviews/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  const review = db.reviews.find((r) => Number(r.id) === Number(req.params.id));
  db.reviews = db.reviews.filter((r) => Number(r.id) !== Number(req.params.id));
  if (review) syncProductRating(db, review.productId);
  saveDB(db);
  req.flash("success", "Avis supprimé.");
  res.redirect("/admin/reviews");
});

app.get("/admin/users", requireAdmin, (req, res) => {
  const db = loadDB();
  res.render("admin/users", { users: db.users });
});

app.delete("/admin/users/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  const id = Number(req.params.id);
  const target = db.users.find((u) => Number(u.id) === id);
  if (!target) {
    req.flash("error", "Utilisateur introuvable.");
    return res.redirect("/admin/users");
  }
  if (target.role === "admin") {
    req.flash("error", "Impossible de supprimer un administrateur.");
    return res.redirect("/admin/users");
  }
  db.users = db.users.filter((u) => Number(u.id) !== id);
  db.orders = db.orders.filter((o) => Number(o.userId) !== id);
  db.wishlist = db.wishlist.filter((w) => Number(w.userId) !== id);
  saveDB(db);
  req.flash("success", "Utilisateur supprimé.");
  res.redirect("/admin/users");
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    req.flash("error", err.message || "Erreur pendant l'upload de l'image.");
    return res.redirect(req.get("referer") || "/admin/products");
  }
  next();
});

app.use((req, res) => res.status(404).render("not-found"));

app.listen(PORT, () => {
  console.log(`SupMtiShop lancé sur http://localhost:${PORT}`);
  console.log("Admin: admin@market.ma / admin123");
  console.log("Client démo: client@market.ma / client123");
});
