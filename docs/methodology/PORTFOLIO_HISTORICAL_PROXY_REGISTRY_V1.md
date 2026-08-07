# Registre v1 des proxies historiques candidats

## Principe

Un proxy n'est admissible que s'il est relié explicitement à l'instrument d'origine par une documentation officielle de l'émetteur ou de l'administrateur d'indice.

Le proxy ne doit jamais être choisi parce que son historique produit un résultat favorable.

## WPEA

BlackRock indique que WPEA vise un rendement similaire au rendement total net du MSCI World Index. Le candidat de prolongation historique est donc l'indice de référence officiel, et non un autre ETF World choisi a posteriori.

Limites obligatoires :

- l'indice n'est pas le fonds ;
- le TER du fonds n'est pas inclus ;
- le spread de swap n'est pas reconstitué historiquement ;
- le tracking error du fonds n'est pas reconstitué.

Source officielle : https://www.blackrock.com/fr/particuliers/products/335178/ishares-msci-world-swap-pea-ucits-etf

## PAEJ

Amundi documente comme indice de référence `MSCI Daily TR Net AC Asia Pacific Ex Japan USD`.

Le benchmark peut constituer un proxy candidat si une période antérieure à la création du fonds devait un jour être étudiée, mais une conversion de devise cohérente avec le portefeuille en EUR serait alors nécessaire.

Source officielle : https://www.amundietf.fr/pdfDocuments/monthly-factsheet/FR0011869312/FRA/FRA/INSTITUTIONNEL/ETF

## SMH

Les deux produits ne partagent pas le même benchmark et restent donc séparés :

- SMH US : `MVIS US Listed Semiconductor 25 Index` ;
- SMH UCITS : `MarketVector US Listed Semiconductor 10% Capped Screened Index`.

Le choix de l'un ou l'autre reste bloqué tant que l'identité du ticker du preset n'est pas explicitement résolue.

Sources officielles :

- https://vaneck.com/us/en/investments/semiconductor-etf-smh/
- https://www.vaneck.com/FR/en/investments/semiconductor-etf/index/

## Approbation

Un proxy candidat ne devient `approved-for-protocol` que si :

- le protocole est identifié ;
- la justification est enregistrée ;
- le choix est réalisé avant accès aux résultats historiques de validation ;
- les limitations sont explicitement acceptées.

Le prochain bloc doit figer les règles d'utilisation du proxy WPEA dans les trois horizons, sans encore calculer de performance historique.
