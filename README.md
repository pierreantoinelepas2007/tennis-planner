# Planificateur école de tennis

Site pour planifier les cours de tennis : formulaire d'inscription pour les
parents, gestion des professeurs et terrains, génération automatique d'une
proposition de planning, et vue exportable par professeur.

## Structure du projet

```
tennis-app/
  backend/     API Node.js + Express + PostgreSQL
  frontend/    Interface React (Vite)
```

Le backend sert aussi les fichiers construits du frontend, donc un seul
service suffit pour déployer l'ensemble.

## Déploiement sur Render (étape par étape)

### 1. Mettre le code sur GitHub

Si ce n'est pas déjà fait :

1. Va sur [github.com](https://github.com) et crée un nouveau repo (bouton
   vert "New"). Nomme-le par exemple `tennis-planner`. Laisse-le "Public" ou
   "Private" selon ta préférence, ne coche aucune case d'initialisation
   (pas de README, pas de .gitignore — on les a déjà).
2. Sur ton ordinateur, dans le dossier de ce projet, exécute :

   ```bash
   git init
   git add .
   git commit -m "Premier import du planificateur tennis"
   git branch -M main
   git remote add origin https://github.com/TON-UTILISATEUR/tennis-planner.git
   git push -u origin main
   ```

   Remplace `TON-UTILISATEUR` par ton nom d'utilisateur GitHub. GitHub te
   proposera la commande exacte à copier-coller juste après avoir créé le
   repo (bouton "…or push an existing repository from the command line").

### 2. Créer la base de données PostgreSQL sur Render

1. Va sur [render.com](https://render.com) et connecte-toi.
2. Clique sur "New" → "PostgreSQL".
3. Donne-lui un nom (ex : `tennis-planner-db`), choisis la région la plus
   proche (Frankfurt pour l'Europe), garde le plan gratuit ("Free").
4. Clique sur "Create Database". Attends qu'elle soit prête (statut
   "Available").
5. Une fois créée, ouvre la page de la base et copie la valeur
   **Internal Database URL** (tu en auras besoin à l'étape suivante).

### 3. Créer le service web sur Render

1. Toujours sur Render, clique sur "New" → "Web Service".
2. Connecte ton compte GitHub si ce n'est pas déjà fait, puis sélectionne
   le repo `tennis-planner`.
3. Configure le service :
   - **Name** : ce que tu veux (ex : `tennis-planner`)
   - **Region** : la même que la base de données
   - **Branch** : `main`
   - **Root Directory** : laisse vide (racine du repo)
   - **Build Command** : `npm run build`
   - **Start Command** : `npm start`
   - **Plan** : "Free"
4. Dans la section "Environment Variables", ajoute une variable :
   - **Key** : `DATABASE_URL`
   - **Value** : colle l'"Internal Database URL" copiée à l'étape 2
5. Clique sur "Create Web Service".

Render va maintenant installer les dépendances, construire le frontend, et
démarrer le serveur. La première fois, ça prend quelques minutes. Tu peux
suivre les logs de déploiement dans l'onglet "Logs".

### 4. Récupérer l'URL du site

Une fois le déploiement terminé (statut "Live"), Render affiche une URL du
type `https://tennis-planner.onrender.com` en haut de la page du service.
C'est cette URL que tu peux partager sur le groupe WhatsApp des parents (en
ajoutant `/#formulaire` ou en leur disant simplement d'ouvrir le lien et de
cliquer sur "Formulaire élève").

## Remarque sur le plan gratuit de Render

Sur le plan gratuit, le service web s'endort après 15 minutes d'inactivité,
et met alors 30 à 60 secondes à se "réveiller" au prochain accès. C'est
normal — la personne verra juste un chargement un peu plus long à
l'ouverture si personne n'a utilisé le site récemment. Les données, elles,
restent intactes puisqu'elles sont dans la base PostgreSQL séparée.

## Développement local (optionnel)

Si tu veux tester en local avant de déployer :

```bash
# Backend (nécessite une variable DATABASE_URL pointant vers une base
# PostgreSQL, locale ou distante)
cd backend
npm install
DATABASE_URL=postgres://... npm start

# Frontend, dans un autre terminal
cd frontend
npm install
npm run dev
```

Le frontend en mode développement (`npm run dev`) tourne sur
`http://localhost:5173` et redirige les appels `/api` vers le backend sur
`http://localhost:3000`.
