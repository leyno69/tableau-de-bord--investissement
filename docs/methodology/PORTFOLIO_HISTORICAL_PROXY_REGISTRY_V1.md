# Registre v1 des proxies historiques candidats

## Principe

Un proxy n'est admissible que s'il est relié explicitement à l'instrument d'origine par une documentation officielle de l'émetteur ou de l'administrateur d'indice.

Le proxy ne doit jamais être choisi parce que son historique produit un résultat favorable.

## WPEA

BlackRock indique que WPEA vise un rendement similaire au rendement total net du MSCI World Index. Le candidat de prolongation historique est donc l'indice de référence officiel, et non un autre ETF World choisi a posteriori.

Le protocole v1 fige plus précisément la piste comme **MSCI World Index (EUR), Net Returns** pour rester cohérent avec un portefeuille libellé en euros.

Statuts distincts :

- identité du benchmark : `approved-as-benchmark-identity` ;
- ingestion des données publiques MSCI : `blocked-license-not-established` ;
- validation scientifique par proxy : `blocked` tant qu'une source autorisée et de qualité suffisante n'est pas obtenue.

Le portail MSCI précise que les indices et données MSCI sont sa propriété exclusive et qu'ils ne peuvent pas être utilisés sans permission écrite expresse. La visibilité publique ne constitue donc pas, à elle seule, une autorisation d'ingestion ou de redistribution.

Limites obligatoires :

- l'indice n'est pas le fonds ;
- le TER du fonds n'est pas inclus ;
- le spread de swap n'est pas reconstitué historiquement ;
- le tracking error du fonds n'est pas reconstitué.

Sources officielles :

- BlackRock WPEA : https://www.blackrock.com/fr/particuliers/products/335178/ishares-msci-world-swap-pea-ucits-etf
- MSCI World : https://www.msci.com/indexes/index/990100/msci-world-index
- MSCI Index Data Search : https://app2.msci.com/products/index-data-search/

Documents LEYNOR :

- `MSCI_WORLD_EUR_PROXY_PROTOCOL_V1.md` ;
- `MSCI_WORLD_EUR_DATA_RIGHTS_EVIDENCE_V1.md`.

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
- les limitations sont explicitement acceptées ;
- les droits et la qualité de la source de données utilisée pour le replay sont établis séparément.

Une identité de benchmark approuvée ne vaut donc jamais, à elle seule, autorisation d'ingestion de ses données.
