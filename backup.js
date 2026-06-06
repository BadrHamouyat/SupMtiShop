const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

// Créer le dossier backups s'il n'existe pas
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('✅ Dossier backups créé');
}

// Créer un backup avec la date et l'heure
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(BACKUP_DIR, `store-backup-${timestamp}.json`);

fs.copyFileSync(DATA_FILE, backupFile);
console.log(`✅ Backup créé : ${backupFile}`);

// Afficher les backups existants
const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('store-backup-'))
    .sort()
    .reverse();

console.log(`\n📁 Backups existants (${backups.length}) :`);
backups.slice(0, 5).forEach(f => {
    const stats = fs.statSync(path.join(BACKUP_DIR, f));
    const size = (stats.size / 1024).toFixed(2);
    console.log(`   ${f} (${size} KB)`);
});