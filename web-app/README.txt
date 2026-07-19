Correctif référence et QR :
- la référence est affichée directement depuis le paramètre ?order= ;
- le QR est généré immédiatement depuis ?qr= sans attendre Supabase ;
- si la librairie QRCode n'est pas chargée, une image QR de secours est utilisée ;
- une erreur de lecture Supabase ne vide plus la référence et le QR ;
- le design de la capture est conservé.
