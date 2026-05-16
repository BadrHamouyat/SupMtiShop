# SupMtiShop — boutique e-commerce moderne

Application Node.js / Express / EJS prête à lancer en local, avec compte client, espace administrateur, panier, commandes et upload d’images produits depuis le PC.

## Lancer le site

```bash
npm install
npm start
```

Ouvrir ensuite :

```text
http://localhost:3000
```

## Comptes de test

Admin :

```text
admin@market.ma
admin123
```

Client :

```text
client@market.ma
client123
```

## Fonctionnalités

- Boutique moderne avec catégories, recherche, tri et fiches produits
- Compte client : inscription, connexion, panier et historique des commandes
- Dashboard administrateur : produits, utilisateurs, commandes et statistiques
- Ajout/modification de produits avec image depuis le PC
- Choix de catégorie via menu déroulant dans l’admin
- Paiement à la livraison ou paiement en ligne en mode démonstration
- Bouton WhatsApp flottant vers +212 762 878 817

## Images uploadées

Les images ajoutées depuis l’admin sont stockées dans :

```text
public/images/uploads
```

## Nouvelles fonctions

- Les clients peuvent ajouter une note de 1 à 5 étoiles et un commentaire sur chaque produit.
- La moyenne des avis est affichée sur la page produit.
- Paiement en ligne disponible dans la page checkout. Le numéro complet de carte n'est pas enregistré dans `data/store.json`, seulement les 4 derniers chiffres.
