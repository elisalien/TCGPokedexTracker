# Pokédex TCG Tracker

> Tracker web de collection de cartes Pokémon TCG, Pokédex par Pokédex : une carte Classique et/ou Reverse par Pokémon, du n°001 au n°1025.

![Platform](https://img.shields.io/badge/platform-Web-informational) ![Stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-blue)

## À propos

Pokédex TCG Tracker est une petite application web statique (HTML, CSS et JavaScript sans dépendance) pour suivre sa collection de cartes Pokémon par région, de Kanto à Paldea. Pour chaque Pokémon, on coche si l'on possède une carte Classique et/ou Reverse (holo), et l'on note la langue, la série / le set et des tags. Toutes les données restent dans le navigateur (localStorage) et peuvent être exportées / importées en JSON. L'interface est en français, au style « Glasscore » (version 3.8.0 d'après `index.html`).

## Fonctionnalités

- **Navigation par région** : Tout, Kanto, Johto, Hoenn, Sinnoh, Unys, Kalos, Alola, Galar, Hisui, Paldea (1025 Pokémon)
- **Suivi par carte** : Classique / Reverse (cocher Reverse priorise l'holo et décoche Classique), langue (JP, EN, FR, IT, KR, CN), série / set, notes sous forme de tags séparés par des virgules, avec suggestions basées sur les saisies existantes
- **Recherche** par numéro, nom, set ou note, et **filtres** : Tout, Cochés, Manquants, Classique, Reverse
- **Édition groupée** : sélection multiple (Maj + clic pour sélectionner une plage), puis application de la langue, du set, des notes (ajout ou remplacement), de Classique et de Reverse
- **Dashboard** : résumé global et progression, holo/reverse et classique par langue, progression par région, objectifs 100 % Reverse, répartition par types, top des sets et des tags
- **Sauvegarde locale** automatique dans le navigateur, **export / import JSON**, réinitialisation complète
- **Noms français hors ligne** : chargement des noms depuis `data/fr_names.json` (n°001 à 151 pour l'instant)

## Installation

Aucune installation ni build : ce sont des fichiers statiques.

1. Cloner ou télécharger le repo.
2. Servir le dossier avec n'importe quel serveur web statique (par exemple `python3 -m http.server` à la racine), puis ouvrir `index.html` dans le navigateur.

Le bouton « Charger noms FR (offline) » lit `data/fr_names.json` via `fetch`, ce qui nécessite que la page soit servie en HTTP plutôt qu'ouverte en `file://`.

## Utilisation

1. Choisir une région dans la barre latérale.
2. Pour remplir les noms et les types des 1025 Pokémon d'un coup, cliquer sur **Importer** et choisir [`pokedex-tcg-ALL.json`](pokedex-tcg-ALL.json) (jeu de données complet fourni à la racine). Le bouton **Charger noms FR (offline)** remplit, lui, les noms à partir de `data/fr_names.json`.
3. Cocher Classique / Reverse, renseigner la langue, le set et les notes. Les modifications sont enregistrées automatiquement.
4. Utiliser la recherche, les filtres et l'édition groupée pour aller plus vite, et l'onglet **Dashboard** pour la vue globale.
5. **Exporter** régulièrement : le fichier téléchargé (`pokedex-tcg-ALL.json`) peut être réimporté plus tard ou sur un autre navigateur. « Réinit. tout » efface toutes les données locales.

Format d'une entrée exportée / importable :

```json
{
  "dex": 1,
  "region": "Kanto",
  "nameFR": "Bulbizarre",
  "types": ["Plante", "Poison"],
  "classic": true,
  "reverse": false,
  "language": "FR",
  "set": "",
  "notes": ""
}
```

## Structure du projet

```
├── index.html               # interface (sidebar des régions, tableau, dashboard)
├── assets/
│   ├── app.js               # logique : données, rendu, filtres, édition groupée, dashboard, import/export
│   ├── styles.css           # styles « glass »
│   └── noise.png            # texture
├── data/
│   ├── fr_names.json        # noms FR hors ligne (n°001 à 151)
│   └── sample-dataset.json  # petit jeu de données d'exemple
└── pokedex-tcg-ALL.json     # jeu de données complet (1025 Pokémon, noms FR + types)
```

## Stack technique

HTML, CSS et JavaScript vanilla, localStorage. Aucune dépendance ni étape de build.

## Crédits & licence

Aucune licence n'est spécifiée — tous droits réservés.

---

<p align="center">
  Fait par <a href="https://github.com/elisalien">Élisalien</a> ·
  <a href="https://gitlab.com/elisalien/catalog">Catalogue des shaders, sources & logiciels</a>
</p>
