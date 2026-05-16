# Rapport PFC — SupMtiShop

## Informations générales

- **Établissement :** SUPMTI
- **Projet :** Réalisation d’un site web e-commerce
- **Nom de l’application :** SupMtiShop
- **Type :** Application web avec espace client et espace administrateur
- **Année universitaire :** 2025–2026

---

## 1. Compréhension du sujet

Le projet consiste à concevoir et développer une application web e-commerce moderne permettant aux clients de consulter des produits, créer un compte, ajouter des articles au panier, passer une commande, payer à la livraison ou par paiement en ligne simulé, et laisser des avis sur les produits.

L’administrateur dispose d’un dashboard pour gérer les produits, les images, les catégories, les clients et les commandes.

### Problème à résoudre

Plusieurs petites boutiques ont besoin d’une solution simple pour vendre leurs produits en ligne sans utiliser une plateforme complexe. Le projet répond à ce besoin à travers un site web complet, facile à utiliser et adapté au marché marocain.

### Objectifs du projet

- Créer une boutique en ligne moderne et responsive.
- Permettre aux clients de s’inscrire et de se connecter.
- Afficher les produits par catégories avec prix, ancien prix et réduction.
- Gérer un panier et le passage de commandes.
- Ajouter un paiement à la livraison et un paiement en ligne simulé.
- Permettre aux clients d’ajouter une note et un commentaire.
- Offrir un espace administrateur pour gérer la boutique.
- Assurer la sauvegarde des données dans une base locale JSON.

### Résultats attendus

- Site e-commerce fonctionnel.
- Authentification client et administrateur.
- Gestion des produits avec upload d’image depuis le PC.
- Gestion des commandes et des utilisateurs.
- Dashboard avec statistiques.
- Documentation de conception et de tests.

---

## 2. Recherche bibliographique / État de l’art

Les sites e-commerce modernes, comme les marketplaces, proposent généralement une expérience rapide, un système de recherche, des catégories, un panier, un compte client, des promotions et un suivi des commandes.

### Solutions existantes étudiées

| Solution | Avantages | Limites |
|---|---|---|
| Shopify | Rapide, professionnel, hébergement inclus | Payant, personnalisation limitée selon l’offre |
| WooCommerce | Flexible, intégré à WordPress | Nécessite maintenance et plugins |
| PrestaShop | Orienté e-commerce | Configuration plus lourde |
| Marketplaces modernes | UX riche, promotions, avis clients | Développement plus complexe |

### Positionnement de SupMtiShop

SupMtiShop est une application e-commerce pédagogique et professionnelle qui reprend les fonctionnalités importantes d’une boutique moderne : catalogue, panier, commandes, avis, promotions, dashboard admin, support WhatsApp et gestion d’images.

---

## 3. Analyse des besoins / Cahier des charges

### Acteurs

- **Visiteur :** consulte les produits, cherche des articles, crée un compte.
- **Client :** se connecte, ajoute au panier, commande, paie, consulte ses commandes, note les produits.
- **Administrateur :** gère les produits, catégories, utilisateurs, commandes et statistiques.

### Besoins fonctionnels

#### Visiteur

- Consulter la page d’accueil.
- Voir les produits et les promotions.
- Filtrer/rechercher les produits.
- Créer un compte.
- Se connecter.

#### Client

- Ajouter un produit au panier.
- Modifier les quantités.
- Passer une commande.
- Choisir le mode de paiement : livraison ou paiement en ligne.
- Voir l’historique de ses commandes.
- Ajouter une note et un commentaire sur un produit.
- Contacter la boutique par WhatsApp.

#### Administrateur

- Accéder au dashboard.
- Ajouter, modifier et supprimer des produits.
- Ajouter une image produit depuis le PC.
- Choisir une catégorie existante ou ajouter une nouvelle catégorie.
- Définir un ancien prix et un badge de réduction.
- Voir les commandes.
- Changer le statut des commandes.
- Voir et supprimer les utilisateurs clients.
- Consulter le chiffre d’affaires des commandes payées.

### Besoins non fonctionnels

- Interface responsive.
- Design professionnel avec les couleurs de SupMtiShop.
- Sécurité basique des mots de passe avec hash.
- Sauvegarde automatique des données.
- Navigation simple pour les clients et l’administrateur.
- Code organisé avec routes, vues, CSS, JS et dossier data.

### Contraintes techniques

- Fonctionnement en local avec Node.js.
- Base de données locale JSON pour faciliter la démonstration.
- Paiement en ligne simulé uniquement pour le projet.
- Upload image limité aux fichiers images.

---

## 4. Conception du système

### Architecture générale

L’application suit une architecture MVC simple :

- **Modèle / Données :** fichier `data/store.json` pour utilisateurs, produits, commandes et avis.
- **Vue :** templates EJS dans le dossier `views`.
- **Contrôleur :** routes Express dans `server.js`.
- **Assets :** fichiers CSS, JavaScript et images dans `public`.

### Diagrammes UML

Les diagrammes PlantUML sont disponibles dans :

```text
docs/pfc/uml/
```

Fichiers inclus :

- `use-case.puml`
- `class-diagram.puml`
- `sequence-order.puml`
- `activity-checkout.puml`
- `deployment.puml`

---

## 5. Choix des technologies

| Élément | Technologie | Raison |
|---|---|---|
| Backend | Node.js + Express.js | Simple, rapide, adapté aux projets web |
| Frontend | HTML, CSS, JavaScript | Léger, facile à présenter |
| Templates | EJS | Génération dynamique des pages |
| Base de données | JSON local | Simple pour projet académique et démonstration |
| Authentification | Sessions Express | Gestion connexion client/admin |
| Sécurité mot de passe | bcryptjs | Hash des mots de passe |
| Upload images | Multer | Upload des images depuis le PC |
| Design | CSS personnalisé | Thème SupMtiShop avec teal, orange/rouge et noir |

---

## 6. Planification du projet

| Étape | Tâches | Durée estimée |
|---|---|---|
| 1 | Compréhension du besoin et cahier des charges | 2 jours |
| 2 | Conception UML et architecture | 3 jours |
| 3 | Création structure Node.js/Express | 2 jours |
| 4 | Développement catalogue + panier | 4 jours |
| 5 | Authentification client/admin | 3 jours |
| 6 | Dashboard administrateur | 4 jours |
| 7 | Upload images et catégories | 2 jours |
| 8 | Paiement livraison/en ligne simulé | 2 jours |
| 9 | Avis clients et notation | 2 jours |
| 10 | Tests, correction et documentation | 4 jours |

---

## 7. Développement / Implémentation

### Fonctionnalités réalisées

- Page d’accueil moderne.
- Catalogue produits.
- Recherche et tri.
- Page détail produit.
- Panier avec quantités.
- Inscription et connexion.
- Espace client.
- Commandes.
- Paiement à la livraison.
- Paiement en ligne simulé.
- Avis et notes clients.
- Dashboard administrateur.
- Gestion produits.
- Upload image depuis PC.
- Gestion catégories.
- Gestion utilisateurs.
- Gestion commandes.
- Statistiques de chiffre d’affaires payé.
- Bouton WhatsApp flottant.
- Logo SupMtiShop et thème couleurs SupMti.

### Structure du projet

```text
server.js
package.json
data/
  store.json
  seed-products.json
public/
  css/style.css
  js/app.js
  images/
views/
  partials/
  auth/
  admin/
  home.ejs
  products.ejs
  product-detail.ejs
  cart.ejs
  checkout.ejs
  orders.ejs
docs/pfc/
```

---

## 8. Tests et validation

### Tests fonctionnels

| Fonction | Scénario | Résultat attendu | Statut |
|---|---|---|---|
| Inscription | Créer un compte client | Compte ajouté dans `store.json` | OK |
| Connexion | Se connecter avec email/mot de passe | Accès à l’espace client | OK |
| Produit | Admin ajoute un produit | Produit visible dans catalogue | OK |
| Image | Admin upload une image | Image sauvegardée dans `public/images/uploads` | OK |
| Panier | Client ajoute un article | Article visible dans panier | OK |
| Commande | Client valide panier | Commande créée | OK |
| Paiement livraison | Choix livraison | Commande enregistrée en attente | OK |
| Paiement en ligne | Saisie carte demo | Commande marquée payée | OK |
| Avis | Client note un produit | Avis affiché sur page produit | OK |
| Dashboard | Admin consulte statistiques | Chiffre d’affaires payé affiché | OK |

### Validation

Le projet répond aux besoins principaux d’un site e-commerce : gestion catalogue, panier, commande, paiement, compte client et administration.

---

## 9. Plan de rapport

1. Introduction générale
2. Présentation du sujet
3. Problématique
4. Objectifs du projet
5. Étude de l’existant
6. Cahier des charges
7. Analyse et conception UML
8. Choix technologiques
9. Réalisation de l’application
10. Tests et validation
11. Difficultés rencontrées
12. Perspectives d’amélioration
13. Conclusion générale

---

## 10. Préparation de la soutenance

### Plan PowerPoint proposé

1. Page de garde : SupMtiShop
2. Contexte et problématique
3. Objectifs du projet
4. Analyse des besoins
5. Acteurs et cas d’utilisation
6. Architecture du système
7. Technologies utilisées
8. Démonstration : côté client
9. Démonstration : côté administrateur
10. Tests et validation
11. Difficultés et solutions
12. Conclusion et perspectives

### Questions possibles du jury

- Pourquoi avoir choisi Node.js et Express ?
- Pourquoi une base JSON au lieu de MySQL ?
- Comment sont sécurisés les mots de passe ?
- Comment fonctionne l’upload des images ?
- Quelle est la différence entre client et administrateur ?
- Comment calculer le chiffre d’affaires ?
- Comment améliorer le projet dans le futur ?

### Perspectives d’amélioration

- Remplacer JSON par MySQL ou MongoDB.
- Ajouter un vrai paiement bancaire.
- Ajouter suivi de livraison réel.
- Ajouter facture PDF.
- Ajouter notifications email.
- Ajouter gestion fournisseurs.
- Déployer en ligne.

---

## Conclusion

SupMtiShop est une application e-commerce complète qui permet de présenter une solution moderne avec deux espaces principaux : client et administrateur. Le projet respecte les étapes essentielles d’un PFC : analyse, conception, choix technologiques, développement, tests et documentation.
