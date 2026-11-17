# Invitations — Black Excellence Dinner 2026

Mini site statique qui écrit le nom d'un·e invité·e sur la carte d'invitation du Gala des 10 ans de la I AM FOUNDATION et génère le PDF (2 pages, A5, vectoriel).

- **Un nom** : aperçu en direct, téléchargement du PDF.
- **Une liste** : coller une liste (un nom par ligne, séparée par virgules, ou export Excel / Sheets / CSV) ou importer un `.csv` / `.txt`. Les colonnes `Civilité`, `Prénom`, `Nom`, `Nom complet` sont reconnues ; e-mails, téléphones et doublons sont ignorés. Chaque nom reste modifiable avant export.
- Téléchargement **individuel** ou **ZIP** de toutes les cartes.

Tout se passe dans le navigateur (pdf-lib + JSZip) : aucune donnée n'est envoyée à un serveur.

## Mise en page du nom

Relevée sur `Invitation_POSITION_NOM.pdf` : Satoshi Black 14 pt, `#FF7F47`, x = 42,52 pt, ligne de base à 154,88 pt du haut de la page 2. Si un nom dépasse la largeur utile (334,5 pt), le corps est réduit automatiquement (8 pt minimum). Réglages dans `js/invite.js` → `LAYOUT`.

## Modifier le gabarit

Remplacer `assets/invitation-template.pdf` (même format, page 2 sans nom) puis régénérer les aperçus `assets/recto.webp` et `assets/verso.webp`.

## Structure

```
index.html            interface
styles.css
js/app.js             logique de l'interface
js/invite.js          génération du PDF
js/parse.js           analyse des listes
assets/               gabarit PDF, aperçus, police Satoshi (sous-ensemble latin)
vendor/               pdf-lib, @pdf-lib/fontkit, jszip
```

## Local

```
python3 -m http.server
```

Police : Satoshi par Indian Type Foundry, distribuée via Fontshare (ITF Free Font License).
