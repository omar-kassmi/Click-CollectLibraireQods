Correctif cumulatif du filtre multi-selection Admin.

Paiement :
- Paye et Non paye sont selectionnes par defaut.
- Il est impossible de decocher la derniere option de paiement active.
- Si l'utilisateur tente de le faire, la case est automatiquement reactivee.
- Tout selectionner selectionne tous les statuts et les deux paiements.
- Tout effacer efface les statuts mais conserve Paye et Non paye actifs.

Installation : remplacer admin.html et admin.js, puis Ctrl+F5.
app.js est inclus sans modification pour conserver la version de reference.
