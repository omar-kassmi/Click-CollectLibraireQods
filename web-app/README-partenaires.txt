Ajout de la bande partenaires defilante

1. Copiez le contenu de partners-section.html.
2. Collez-le dans index.html juste avant le footer noir de la page d'accueil, c'est-a-dire avant la ligne qui commence par:
   <footer class="bg-[#0D0D0D] ...

3. Copiez le contenu de partners-section.css.
4. Collez-le a la fin de styles.css.

5. Ajoutez vos logos dans le dossier images/ avec ces noms:
   images/partner-1.png
   images/partner-2.png
   images/partner-3.png
   images/partner-4.png
   images/partner-5.png
   images/partner-6.png

Vous pouvez ajouter plus de logos en dupliquant les lignes:
<div class="partner-logo-card"><img src="images/partner-X.png" alt="Partenaire X"></div>

Important: gardez une deuxieme copie de la meme sequence de logos dans le HTML pour que le defilement infini reste fluide.
