# Registre de convergence des composantes candidates de l’IGL

## Objet

Ce registre consolide la précision statistique et la stabilité des effets observés pour chaque composante candidate de l’Indice global LEYNOR (IGL).

Il ne crée ni score, ni pondération, ni recommandation d’investissement.

## Critères par cellule

Une cellule est considérée comme stable uniquement lorsque :

- sa dispersion relative est inférieure ou égale à 5 % ;
- la dérive relative de l’effet médian entre deux vagues est inférieure ou égale à 2 %.

Une campagne est considérée comme convergée lorsqu’au moins 80 % de ses cellules satisfont simultanément ces deux critères. Les cellules restantes restent visibles et ne sont jamais imputées ou masquées.

## Critères par composante candidate

Une composante ne peut entrer dans la phase de validation que si :

1. toutes les campagnes utilisées sont convergées ;
2. au moins deux campagnes indépendantes sont disponibles ;
3. les campagnes possèdent des identifiants distincts ;
4. l’incertitude résiduelle reste documentée.

Le statut `eligible-for-validation` signifie uniquement que la composante peut être étudiée dans une validation indépendante. Il n’autorise aucune pondération de l’IGL.

## Statistiques conservées

Pour chaque campagne :

- nombre total de cellules ;
- nombre et part de cellules stables ;
- dispersion médiane, au 90e percentile et maximale ;
- dérive médiane et au 90e percentile ;
- critères et seuils appliqués ;
- liste complète des cellules et de leur statut.

## Garde-fous

- absence d’horodatage implicite pour préserver la reproductibilité ;
- tri déterministe des candidats ;
- rejet explicite des valeurs négatives ou non finies ;
- aucune transformation automatique des preuves en points ;
- aucune validation fondée sur une campagne unique ;
- aucune affirmation de robustesse lorsque des cellules importantes restent instables.

## Étape suivante

Appliquer le registre aux composantes candidates déjà étudiées, puis lancer une campagne indépendante de validation croisée. Seules les composantes satisfaisant les critères dans les deux campagnes pourront entrer dans une calibration expérimentale, encore distincte de l’IGL affiché aux utilisateurs.
