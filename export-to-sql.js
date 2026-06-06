const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'store.json');

function loadDB() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function escapeSQL(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''") + "'";
}

function generateSQL(db) {
    let sql = [];
    
    sql.push('-- Script de migration SupMtiShop vers Oracle');
    sql.push('-- Généré automatiquement le ' + new Date().toISOString());
    sql.push('');
    
    // 1. Insertion des catégories
    sql.push('-- Catégories');
    sql.push('INSERT ALL');
    db.categories.forEach(cat => {
        sql.push(`  INTO CATEGORIE (id, nom, slug, icon) VALUES (${cat.id}, ${escapeSQL(cat.name)}, ${escapeSQL(cat.slug)}, ${escapeSQL(cat.icon)})`);
    });
    sql.push('SELECT * FROM DUAL;');
    sql.push('');
    
    // 2. Insertion des utilisateurs
    sql.push('-- Utilisateurs');
    sql.push('INSERT ALL');
    db.users.forEach(user => {
        sql.push(`  INTO UTILISATEUR (id, nom, email, passwordHash, role, phone, city, address, createdAt) VALUES (${user.id}, ${escapeSQL(user.name)}, ${escapeSQL(user.email)}, ${escapeSQL(user.passwordHash)}, ${escapeSQL(user.role)}, ${escapeSQL(user.phone)}, ${escapeSQL(user.city)}, ${escapeSQL(user.address)}, TO_TIMESTAMP(${escapeSQL(user.createdAt)}, 'YYYY-MM-DD"T"HH24:MI:SS.FF"Z"'))`);
    });
    sql.push('SELECT * FROM DUAL;');
    sql.push('');
    
    // 3. Insertion des produits
    sql.push('-- Produits');
    sql.push('INSERT ALL');
    db.products.forEach(prod => {
        const catId = db.categories.find(c => c.name === prod.category)?.id || 'NULL';
        sql.push(`  INTO PRODUIT (id, title, description, categorie_id, price, oldPrice, stock, image, featured, deal, discountPercent, rating, reviewCount, sold, createdAt) VALUES (${prod.id}, ${escapeSQL(prod.title)}, ${escapeSQL(prod.description)}, ${catId}, ${prod.price}, ${prod.oldPrice || prod.price}, ${prod.stock}, ${escapeSQL(prod.image)}, ${prod.featured ? 1 : 0}, ${prod.deal ? 1 : 0}, ${prod.discountPercent || 0}, ${prod.rating || 0}, ${prod.reviewCount || 0}, ${prod.sold || 0}, TO_TIMESTAMP(${escapeSQL(prod.createdAt)}, 'YYYY-MM-DD"T"HH24:MI:SS.FF"Z"'))`);
    });
    sql.push('SELECT * FROM DUAL;');
    sql.push('');
    
    // 4. Insertion des commandes
    sql.push('-- Commandes');
    sql.push('INSERT ALL');
    db.orders.forEach(order => {
        sql.push(`  INTO COMMANDE (id, reference, utilisateur_id, fullName, phone, city, address, email, subtotal, shipping, discount, total, paymentMethod, paymentStatus, status, createdAt) VALUES (${order.id}, ${escapeSQL(order.reference)}, ${order.userId}, ${escapeSQL(order.customer?.fullName)}, ${escapeSQL(order.customer?.phone)}, ${escapeSQL(order.customer?.city)}, ${escapeSQL(order.customer?.address)}, ${escapeSQL(order.customer?.email)}, ${order.subtotal}, ${order.shipping}, ${order.discount}, ${order.total}, ${escapeSQL(order.paymentMethod)}, ${escapeSQL(order.paymentStatus)}, ${escapeSQL(order.status)}, TO_TIMESTAMP(${escapeSQL(order.createdAt)}, 'YYYY-MM-DD"T"HH24:MI:SS.FF"Z"'))`);
    });
    sql.push('SELECT * FROM DUAL;');
    sql.push('');
    
    sql.push('-- Fin du script');
    sql.push('COMMIT;');
    
    return sql.join('\n');
}

// Exécution
const db = loadDB();
const sql = generateSQL(db);

const outputFile = path.join(__dirname, 'data', 'migration-oracle.sql');
fs.writeFileSync(outputFile, sql, 'utf8');

console.log('✅ Script SQL généré !');
console.log(`📄 Fichier : ${outputFile}`);
console.log(`📊 Statistiques :`);
console.log(`   - ${db.categories.length} catégories`);
console.log(`   - ${db.users.length} utilisateurs`);
console.log(`   - ${db.products.length} produits`);
console.log(`   - ${db.orders.length} commandes`);