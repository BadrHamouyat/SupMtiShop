const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const methodOverride = require("method-override");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "store.json");
const SEED_PRODUCTS_FILE = path.join(__dirname, "data", "seed-products.json");
const UPLOAD_DIR = path.join(__dirname, "public", "images", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}


const DEFAULT_CATEGORIES = [
  "Électronique",
  "Gaming",
  "Mode",
  "Maison",
  "Beauté",
  "Sport",
  "Accessoires",
  "Enfants",
  "Auto",
  "Bureau"
];

function getCategoryOptions(db) {
  const fromProducts = (db.products || [])
    .map((p) => p.category)
    .filter(Boolean);
  return [...new Set([...DEFAULT_CATEGORIES, ...fromProducts])].sort((a, b) => a.localeCompare(b, "fr"));
}

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
      cb(null, `${Date.now()}-${safeName}${ext}`);
    }
  }),
  fileFilter: function (_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Seules les images sont acceptées."));
    }
    cb(null, true);
  },
  limits: { fileSize: 3 * 1024 * 1024 }
});

function loadDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], products: [], orders: [], reviews: [] }, null, 2));
  }

  const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  db.users = db.users || [];
  db.products = db.products || [];
  db.orders = db.orders || [];
  db.reviews = db.reviews || [];
  return db;
}

function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function nextId(list) {
  return list.length ? Math.max(...list.map((item) => Number(item.id) || 0)) + 1 : 1;
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
      createdAt: now
    });
  }

  if (!db.products || db.products.length === 0) {
    db.products = JSON.parse(fs.readFileSync(SEED_PRODUCTS_FILE, "utf8"));
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
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

app.use(flash());

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

function getCartDetails(req) {
  const db = loadDB();
  const cart = getCart(req);
  const items = cart
    .map((line) => {
      const product = db.products.find((p) => Number(p.id) === Number(line.productId));
      if (!product) return null;
      const qty = Math.max(1, Number(line.qty) || 1);
      return {
        product,
        qty,
        subtotal: Number(product.price) * qty
      };
    })
    .filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = subtotal >= 300 || subtotal === 0 ? 0 : 25;
  const discount = subtotal >= 700 ? 50 : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  return { items, subtotal, shipping, discount, total };
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
  if (oldPrice > price && oldPrice > 0) {
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  }

  return 0;
}

function calculatePriceFromForm(price, oldPrice, discountPercent) {
  const typedPrice = Number(price || 0);
  const typedOldPrice = Number(oldPrice || 0);
  const discount = Number(discountPercent || 0);

  if (typedOldPrice > 0 && discount >= 0) {
    return Math.round(typedOldPrice * (1 - discount / 100) * 100) / 100;
  }

  return Math.round(typedPrice * 100) / 100;
}

function isRevenueOrder(order) {
  return order.paymentStatus === "paid" && order.status !== "cancelled";
}

function getProductReviews(db, productId) {
  return (db.reviews || [])
    .filter((review) => Number(review.productId) === Number(productId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getReviewStats(reviews, product) {
  const count = reviews.length;
  const average = count
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count
    : Number(product.rating || 0);

  return {
    average: Math.round(average * 10) / 10,
    count,
    breakdown: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((review) => Number(review.rating) === stars).length
    }))
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

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.messages = {
    success: req.flash("success"),
    error: req.flash("error")
  };
  res.locals.cartCount = getCart(req).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  res.locals.formatPrice = formatPrice;
  res.locals.getDiscountPercent = getDiscountPercent;
  res.locals.path = req.path;
  next();
});

app.get("/", (req, res) => {
  const db = loadDB();
  const featured = db.products.filter((p) => p.featured).slice(0, 8);
  const deals = db.products.filter((p) => getDiscountPercent(p) > 0 || p.deal).slice(0, 8);
  const categories = [...new Set(db.products.map((p) => p.category))];
  res.render("home", { featured, deals, categories });
});

app.get("/products", (req, res) => {
  const db = loadDB();
  let products = [...db.products];
  const { q, category, sort, max } = req.query;

  if (q) {
    const needle = q.toLowerCase().trim();
    products = products.filter((p) =>
      [p.title, p.description, p.category].join(" ").toLowerCase().includes(needle)
    );
  }

  if (category) products = products.filter((p) => p.category === category);
  if (max) products = products.filter((p) => Number(p.price) <= Number(max));

  if (sort === "price_asc") products.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") products.sort((a, b) => b.price - a.price);
  if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
  if (sort === "sold") products.sort((a, b) => b.sold - a.sold);

  const categories = [...new Set(db.products.map((p) => p.category))];
  res.render("products", { products, categories, query: req.query });
});

app.get("/product/:id", (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");

  const reviews = getProductReviews(db, product.id);
  const reviewStats = getReviewStats(reviews, product);
  const userReview = req.session.user
    ? reviews.find((review) => Number(review.userId) === Number(req.session.user.id))
    : null;

  const related = db.products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  res.render("product-detail", { product, related, reviews, reviewStats, userReview });
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

  db.reviews = db.reviews || [];
  const existing = db.reviews.find(
    (review) => Number(review.productId) === Number(product.id) && Number(review.userId) === Number(req.session.user.id)
  );

  if (existing) {
    existing.rating = rating;
    existing.comment = comment;
    existing.updatedAt = new Date().toISOString();
  } else {
    db.reviews.unshift({
      id: nextId(db.reviews),
      productId: product.id,
      userId: req.session.user.id,
      userName: req.session.user.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  syncProductRating(db, product.id);
  saveDB(db);
  req.flash("success", existing ? "Votre avis a été modifié." : "Merci pour votre avis.");
  res.redirect(`/product/${product.id}#reviews`);
});

app.get("/cart", (req, res) => {
  res.render("cart", getCartDetails(req));
});

app.post("/cart/add", (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.body.productId));
  if (!product) {
    req.flash("error", "Produit introuvable.");
    return res.redirect("/products");
  }

  const cart = getCart(req);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const existing = cart.find((line) => Number(line.productId) === Number(product.id));
  if (existing) existing.qty = Math.min(product.stock, Number(existing.qty) + qty);
  else cart.push({ productId: product.id, qty: Math.min(product.stock, qty) });

  req.flash("success", "Produit ajouté au panier.");
  if (req.body.redirectTo === "checkout") {
    return res.redirect("/checkout");
  }
  res.redirect(req.get("referer") || "/cart");
});

app.post("/cart/update", (req, res) => {
  const cart = getCart(req);
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const line = cart.find((item) => Number(item.productId) === productId);
  if (line) line.qty = qty;
  req.flash("success", "Panier mis à jour.");
  res.redirect("/cart");
});

app.post("/cart/remove", (req, res) => {
  req.session.cart = getCart(req).filter((item) => Number(item.productId) !== Number(req.body.productId));
  req.flash("success", "Produit supprimé du panier.");
  res.redirect("/cart");
});

app.get("/register", (req, res) => {
  res.render("auth/register");
});

app.post("/register", (req, res) => {
  const db = loadDB();
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password) {
    req.flash("error", "Tous les champs sont obligatoires.");
    return res.redirect("/register");
  }
  if (password.length < 6) {
    req.flash("error", "Le mot de passe doit contenir au moins 6 caractères.");
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
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  saveDB(db);

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash("success", "Compte créé avec succès.");
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("auth/login");
});

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

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/checkout", requireClient, (req, res) => {
  const cartData = getCartDetails(req);
  if (!cartData.items.length) {
    req.flash("error", "Votre panier est vide.");
    return res.redirect("/cart");
  }
  res.render("checkout", cartData);
});

app.post("/checkout", requireClient, (req, res) => {
  const db = loadDB();
  const cartData = getCartDetails(req);
  if (!cartData.items.length) {
    req.flash("error", "Votre panier est vide.");
    return res.redirect("/cart");
  }

  const { fullName, phone, city, address, paymentMethod, cardName, cardNumber, cardExpiry, cardCvc } = req.body;
  if (!fullName || !phone || !city || !address || !paymentMethod) {
    req.flash("error", "Merci de compléter les informations de livraison.");
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

  const order = {
    id: nextId(db.orders),
    reference: `CMD-${Date.now()}`,
    userId: req.session.user.id,
    customer: { fullName, phone, city, address, email: req.session.user.email },
    items: cartData.items.map((item) => ({
      productId: item.product.id,
      title: item.product.title,
      image: item.product.image,
      price: item.product.price,
      qty: item.qty,
      subtotal: item.subtotal
    })),
    subtotal: cartData.subtotal,
    shipping: cartData.shipping,
    discount: cartData.discount,
    total: cartData.total,
    paymentMethod,
    paymentStatus: onlinePaid ? "paid" : "pending",
    paymentReference: onlinePaid ? `PAY-${crypto.randomBytes(4).toString("hex").toUpperCase()}` : "",
    paymentDetails: onlinePaid ? {
      cardHolder: cardName,
      cardLast4: cardDigits.slice(-4),
      provider: "MegaPay"
    } : null,
    status: "new",
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(order);
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
  const order = db.orders.find(
    (o) => Number(o.id) === Number(req.params.id) && Number(o.userId) === Number(req.session.user.id)
  );
  if (!order) return res.status(404).render("not-found");
  res.render("order-detail", { order });
});

// Admin
app.get("/admin", requireAdmin, (req, res) => {
  const db = loadDB();
  const paidOrders = db.orders.filter(isRevenueOrder);
  const stats = {
    products: db.products.length,
    users: db.users.filter((u) => u.role === "client").length,
    orders: db.orders.length,
    paidOrders: paidOrders.length,
    revenue: paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  };
  const latestOrders = db.orders.slice(0, 6);
  const lowStock = db.products.filter((p) => p.stock <= 12).slice(0, 6);
  res.render("admin/dashboard", { stats, latestOrders, lowStock });
});

app.get("/admin/products", requireAdmin, (req, res) => {
  const db = loadDB();
  const q = String(req.query.q || "").trim().toLowerCase();
  let products = [...db.products];

  if (q) {
    products = products.filter((p) =>
      [p.title, p.category, p.description].join(" ").toLowerCase().includes(q)
    );
  }

  const productStats = {
    total: db.products.length,
    deals: db.products.filter((p) => getDiscountPercent(p) > 0 || p.deal).length,
    featured: db.products.filter((p) => p.featured).length,
    lowStock: db.products.filter((p) => Number(p.stock) <= 10).length
  };

  res.render("admin/products", { products, productStats, q: req.query.q || "" });
});

app.get("/admin/products/new", requireAdmin, (req, res) => {
  const db = loadDB();
  res.render("admin/product-form", { product: null, action: "/admin/products", categories: getCategoryOptions(db) });
});

app.post("/admin/products", requireAdmin, upload.single("productImage"), (req, res) => {
  const db = loadDB();
  const { title, description, price, oldPrice, stock, featured, deal, discountPercent } = req.body;
  const category = String(req.body.category === "__other" ? req.body.categoryOther : req.body.category || "").trim();

  if (!title || !category || !stock || (!price && !oldPrice)) {
    req.flash("error", "Titre, catégorie, stock et prix sont obligatoires.");
    return res.redirect("/admin/products/new");
  }

  const finalPrice = calculatePriceFromForm(price, oldPrice, discountPercent);
  const finalOldPrice = Number(oldPrice || finalPrice);

  db.products.unshift({
    id: nextId(db.products),
    title,
    description: description || "",
    category,
    price: finalPrice,
    oldPrice: finalOldPrice,
    stock: Number(stock),
    image: req.file ? `/images/uploads/${req.file.filename}` : "/images/products/p1.svg",
    featured: featured === "on",
    deal: deal === "on" || Number(discountPercent || 0) > 0,
    discountPercent: Number(discountPercent || 0),
    rating: 4.2,
    sold: 0,
    createdAt: new Date().toISOString()
  });
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

app.put("/admin/products/:id", requireAdmin, upload.single("productImage"), (req, res) => {
  const db = loadDB();
  const product = db.products.find((p) => Number(p.id) === Number(req.params.id));
  if (!product) return res.status(404).render("not-found");

  const { title, description, price, oldPrice, stock, featured, deal, discountPercent } = req.body;
  const category = String(req.body.category === "__other" ? req.body.categoryOther : req.body.category || "").trim();

  const finalPrice = calculatePriceFromForm(price, oldPrice, discountPercent);
  const finalOldPrice = Number(oldPrice || finalPrice);

  Object.assign(product, {
    title,
    description,
    category,
    price: finalPrice,
    oldPrice: finalOldPrice,
    stock: Number(stock),
    image: req.file ? `/images/uploads/${req.file.filename}` : product.image,
    featured: featured === "on",
    deal: deal === "on" || Number(discountPercent || 0) > 0,
    discountPercent: Number(discountPercent || 0)
  });

  saveDB(db);
  req.flash("success", "Produit modifié.");
  res.redirect("/admin/products");
});

app.delete("/admin/products/:id", requireAdmin, (req, res) => {
  const db = loadDB();
  db.products = db.products.filter((p) => Number(p.id) !== Number(req.params.id));
  saveDB(db);
  req.flash("success", "Produit supprimé.");
  res.redirect("/admin/products");
});

app.get("/admin/orders", requireAdmin, (req, res) => {
  const db = loadDB();
  res.render("admin/orders", { orders: db.orders });
});

app.post("/admin/orders/:id/status", requireAdmin, (req, res) => {
  const db = loadDB();
  const order = db.orders.find((o) => Number(o.id) === Number(req.params.id));
  if (!order) return res.status(404).render("not-found");

  order.status = req.body.status || order.status;
  order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
  saveDB(db);
  req.flash("success", "Commande mise à jour.");
  res.redirect("/admin/orders");
});


app.get("/admin/users", requireAdmin, (req, res) => {
  const db = loadDB();
  const users = db.users;
  res.render("admin/users", { users });
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

app.use((req, res) => {
  res.status(404).render("not-found");
});

app.listen(PORT, () => {
  console.log(`SupMtiShop lancé sur http://localhost:${PORT}`);
  console.log("Admin: admin@market.ma / admin123");
  console.log("Client démo: client@market.ma / client123");
});