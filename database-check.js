const fs = require('fs');
const path = require('path');

// Chemin du fichier de données
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

// Lire la base de données
function loadDB() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// Vérifier la base de données
function checkDatabase() {
    const db = loadDB();
    
    console.log("=== VÉRIFICATION DE LA BASE DE DONNÉES ===\n");
    
    // 1. Compter les éléments
    console.log("📊 Statistiques :");
    console.log("   Utilisateurs : " + db.users.length);
    console.log("   Produits     : " + db.products.length);
    console.log("   Commandes    : " + db.orders.length);
    console.log("   Avis         : " + db.reviews.length);
    console.log("   Catégories   : " + db.categories.length);
    console.log("   Wishlist     : " + db.wishlist.length);
    console.log("");
    
    // 2. Vérifier les emails en double
    console.log("🔍 Vérification des emails...");
    const emails = db.users.map(u => u.email.toLowerCase());
    const uniqueEmails = [...new Set(emails)];
    
    if (emails.length === uniqueEmails.length) {
        console.log("   ✅ Tous les emails sont uniques");
    } else {
        console.log("   ❌ Emails en double trouvés !");
    }
    
    // 3. Vérifier les IDs en double
    console.log("\n🔍 Vérification des IDs...");
    const ids = db.users.map(u => u.id);
    const uniqueIds = [...new Set(ids)];
    
    if (ids.length === uniqueIds.length) {
        console.log("   ✅ Tous les IDs sont uniques");
    } else {
        console.log("   ❌ IDs en double trouvés !");
    }
    
    // 4. Vérifier les commandes orphelines
    console.log("\n🔍 Vérification des commandes...");
    let ordersOk = true;
    db.orders.forEach(order => {
        const userExists = db.users.some(u => u.id === order.userId);
        if (!userExists) {
            console.log("   ❌ Commande " + order.id + " : utilisateur introuvable");
            ordersOk = false;
        }
    });
    if (ordersOk) {
        console.log("   ✅ Toutes les commandes ont un utilisateur valide");
    }
    
    console.log("\n=== VÉRIFICATION TERMINÉE ===");
}

// Lancer la vérification
checkDatabase();