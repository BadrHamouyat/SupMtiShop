# SupMtiShop — Site e-commerce professionnel

SupMtiShop est un site e-commerce complet réalisé avec **Node.js, Express.js, EJS, CSS, JavaScript et une base de données JSON locale**.

## Fonctionnalités principales

### Client

- Inscription et connexion sécurisée avec mot de passe chiffré
- Catalogue produits avec recherche et filtres avancés
- Détail produit avec galerie d'images
- Panier d'achat
- Checkout avec paiement à la livraison ou paiement en ligne simulé
- Frais de livraison selon la ville
- Acceptation des conditions avant commande
- Suivi de commande sous forme de timeline
- Téléchargement de facture PDF
- Favoris / wishlist
- Profil client modifiable
- Avis client avec note et commentaire

### Administrateur

- Dashboard avec statistiques avancées
- Chiffre d'affaires calculé seulement sur les commandes payées
- Produits les plus vendus
- Top catégories
- Alertes stock faible
- Gestion des produits avec upload image principale + galerie
- Gestion des catégories avec icône et image
- Gestion des commandes et statuts
- Modération des avis clients
- Gestion des utilisateurs

## Technologies utilisées

| Technologie | Rôle |
|---|---|
| HTML/EJS | Structure dynamique des pages |
| CSS | Design moderne et responsive |
| JavaScript | Interactivité côté client |
| Node.js | Exécution serveur |
| Express.js | Routes et logique backend |
| JSON | Base de données locale |
| Multer | Upload des images |
| bcryptjs | Chiffrement des mots de passe |
| express-session | Sessions utilisateur |
| PDFKit | Génération des factures PDF |
| dotenv | Variables d'environnement |

## Installation

```bash
npm install
npm start
```

Ouvrir ensuite :

```text
http://localhost:3000
```

## Comptes de test

### Admin

```text
admin@market.ma
admin123
```

### Client

```text
client@market.ma
client123
```

## Base de données JSON

Les données sont sauvegardées dans :

```text
data/store.json
```

Ce fichier contient :

- utilisateurs
- produits
- commandes
- avis
- catégories
- favoris

Les images uploadées sont sauvegardées dans :

```text
public/images/uploads
```

## Structure importante

```text
server.js                  Backend Express
views/                     Pages EJS
views/admin/               Pages administrateur
views/auth/                Connexion / inscription
public/css/style.css       Design
public/js/app.js           Interactions client
data/store.json            Base de données JSON
```

## Remarque

Le paiement en ligne est une simulation locale pour le projet PFC. Il ne connecte pas un vrai service bancaire.

## Améliorations professionnelles ajoutées

Cette version contient plusieurs améliorations pour rapprocher le projet d'un vrai site e-commerce :

- Chatbot assistant produit avec suggestions rapides.
- Pages À propos, Contact, FAQ et Politique de retour.
- Système de codes promo : `SUPMTI10`, `WELCOME20`, `LIVRAISON`.
- Suivi de commande avec statuts.
- Dashboard administrateur avec statistiques, graphiques simples et exports CSV.
- Avis clients avec badge “Achat vérifié”.
- Mode sombre / mode clair.
- Validation frontend des formulaires.
- Amélioration de l’expérience mobile et responsive.

Les données sont toujours stockées dans `data/store.json`.
