# Plan de tests — SupMtiShop

## Tests client

| ID | Test | Données | Résultat attendu |
|---|---|---|---|
| T01 | Créer compte | nom, email, mot de passe | Compte créé |
| T02 | Connexion client | client@market.ma / client123 | Accès client |
| T03 | Recherche produit | mot-clé Gaming | Produits filtrés |
| T04 | Ajouter panier | produit + quantité | Panier mis à jour |
| T05 | Paiement livraison | formulaire checkout | Commande créée |
| T06 | Paiement en ligne | carte demo | Commande payée |
| T07 | Ajouter avis | note + commentaire | Avis affiché |

## Tests administrateur

| ID | Test | Données | Résultat attendu |
|---|---|---|---|
| A01 | Connexion admin | admin@market.ma / admin123 | Dashboard admin |
| A02 | Ajouter produit | titre, prix, stock | Produit ajouté |
| A03 | Upload image | image JPG/PNG | Image affichée |
| A04 | Modifier réduction | ancien prix + -20% | Prix actuel calculé |
| A05 | Gérer commande | statut paid/delivered | Statut mis à jour |
| A06 | Supprimer client | compte client | Client supprimé |
| A07 | Chiffre d’affaires | commande payée | CA calculé uniquement sur payées |
