# V2.4 - Upload photo via Apps Script Web App + redirection automatique

Apps Script Web App est gratuit dans les quotas Apps Script/Drive du compte Google.

## Ce que cette version fait
- Le site ne contient plus d'import photo direct.
- "Fournir ma propre liste" demande seulement Nom, Téléphone, Email.
- Après validation, le site crée une commande `draft_google_form` puis redirige vers une Web App Apps Script.
- La Web App affiche la page d'import photo.
- Après upload, la Web App:
  1. enregistre la photo dans Drive;
  2. renomme le fichier avec la référence commande;
  3. met à jour Supabase `status = new`;
  4. redirige automatiquement vers `success.html`.

## Installation Apps Script
1. Allez sur https://script.google.com/home
2. Nouveau projet
3. Collez `google-apps-script-webapp-upload.gs`
4. Remplacez `PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` par la clé `service_role` Supabase
5. Déployer > Nouveau déploiement > Application Web
   - Exécuter en tant que: Moi
   - Qui a accès: Tout le monde
6. Copiez l'URL `/exec`
7. Dans `app.js`, remplacez `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` par cette URL
8. Remplacez les fichiers du site: `index.html`, `app.js`, `admin.js`
9. Exécutez le SQL si besoin.
