# Registre v1 des identités d'instruments pour validation historique

## Date de vérification

7 août 2026.

## WPEA

Identité vérifiée auprès de BlackRock / iShares : **iShares MSCI World Swap PEA UCITS ETF**, ISIN `IE0002XZSHO1`.

Date de lancement de la part et du fonds : **26 mars 2024**.

Source officielle : fiche produit BlackRock France, produit 335178 (`blackrock.com/fr/particuliers/products/335178/ishares-msci-world-swap-pea-ucits-etf`).

Conséquence : aucun historique exact de WPEA ne peut être utilisé avant le 26 mars 2024. Une exposition World antérieure exigerait un proxy explicitement déclaré.

## PAEJ

Identité vérifiée auprès d'Amundi : **Amundi PEA Asie Pacifique (MSCI AC Asia Pacific Ex Japan) UCITS ETF Acc**, ISIN `FR0011869312`, mnémo Euronext `PAEJ`.

Date de création de la classe : **13 mai 2014**.

Source officielle : factsheet Amundi `FR0011869312`.

Conséquence : aucun historique exact de PAEJ ne peut être utilisé avant le 13 mai 2014.

## NVDA

Identité vérifiée auprès de NVIDIA : action ordinaire NVIDIA Corporation, ticker Nasdaq `NVDA`.

Date d'introduction en bourse : **22 janvier 1999**.

Source officielle : FAQ investisseurs NVIDIA, question sur l'IPO (`investor.nvidia.com/investor-resources/faqs/`).

Conséquence : l'histoire boursière exacte de NVDA ne commence pas avant cette IPO.

## SMH — ambiguïté bloquante

Les sources officielles VanEck montrent deux produits distincts associés au ticker `SMH` selon le marché :

- **VanEck Semiconductor ETF (États-Unis)** — date de création **20 décembre 2011** ;
- **VanEck Semiconductor UCITS ETF (Europe)** — ISIN `IE00BMC38736`, date de création **1er décembre 2020**.

Sources officielles : fiches produit et documents VanEck US/Europe.

Le preset actuel indique seulement `SMH` et « ETF semi-conducteurs fictif ». Le prix indicatif du preset ne constitue pas une preuve suffisante pour choisir l'un des deux produits.

**Décision : `SMH` reste bloqué** jusqu'à ce que l'identité cible soit fixée explicitement. Aucun des deux historiques ne sera sélectionné par défaut.

## État du registre

- WPEA : identifié ;
- PAEJ : identifié ;
- NVDA : identifié ;
- SMH : bloqué pour ambiguïté d'identité.

Le registre documente l'identité et la date de début ; il ne valide pas encore la licence ni le fournisseur de données de prix qui seront utilisés pour le replay.
