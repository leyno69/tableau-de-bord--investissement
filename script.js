/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 1/2
   ARCHITECTURE PROFESSIONNELLE :
   TRANSACTIONS -> POSITIONS CALCULÉES
========================================================= */


/* =========================================================
   ÉLÉMENTS DU FORMULAIRE
========================================================= */

const nomActionInput = document.getElementById("nomAction");
const tickerInput = document.getElementById("ticker");
const prixAchatInput = document.getElementById("prixAchat");
const quantiteInput = document.getElementById("quantite");
const montantInvestiInput = document.getElementById("montantInvesti");

const courtierSelect = document.getElementById("courtier");
const typeTransactionSelect = document.getElementById("typeTransaction");
const modeExecutionSelect = document.getElementById("modeExecution");
const dateTransactionInput = document.getElementById("dateTransaction");

const modeSaisieSelect = document.getElementById("modeSaisie");
const champQuantite = document.getElementById("champQuantite");
const champMontant = document.getElementById("champMontant");

const fraisTransactionInput = document.getElementById("fraisTransaction");
const sourceFraisSelect = document.getElementById("sourceFrais");

const fractionStatus = document.getElementById("fractionStatus");
const fraisInfo = document.getElementById("fraisInfo");
const calculPosition = document.getElementById("calculPosition");

const ajouterPositionButton = document.getElementById("ajouterPosition");


/* =========================================================
   ZONES D'AFFICHAGE
========================================================= */

const listePositions = document.getElementById("listePositions");
const listeTransactions = document.getElementById("listeTransactions");

const totalInvestiElement = document.getElementById("totalInvesti");
const totalValeurElement = document.getElementById("totalValeur");
const totalGainElement = document.getElementById("totalGain");
const totalRendementElement = document.getElementById("totalRendement");


/* =========================================================
   DONNÉES
========================================================= */

let transactions = [];
let positions = [];

let indexTransactionEnModification = null;


/* =========================================================
   CHARGEMENT LOCALSTORAGE
========================================================= */

function chargerTransactions() {
    try {
        const donnees = JSON.parse(
            localStorage.getItem("transactions")
        );

        if (Array.isArray(donnees)) {
            transactions = donnees;
        } else {
            transactions = [];
        }
    } catch (error) {
        console.error(
            "Impossible de charger les transactions :",
            error
        );

        transactions = [];
    }
}


function sauvegarderTransactions() {
    try {
        localStorage.setItem(
            "transactions",
            JSON.stringify(transactions)
        );
    } catch (error) {
        console.error(
            "Impossible de sauvegarder les transactions :",
            error
        );
    }
}


/* =========================================================
   MIGRATION DES ANCIENNES POSITIONS
========================================================= */

function migrerAnciennesPositionsSiNecessaire() {
    if (transactions.length > 0) {
        return;
    }

    let anciennesPositions = [];

    try {
        const donnees = JSON.parse(
            localStorage.getItem("positions")
        );

        if (Array.isArray(donnees)) {
            anciennesPositions = donnees;
        }
    } catch (error) {
        anciennesPositions = [];
    }

    if (anciennesPositions.length === 0) {
        return;
    }

    const maintenant = new Date().toISOString();

    transactions = anciennesPositions
        .filter(position =>
            position &&
            Number(position.quantite) > 0 &&
            Number(position.montantInvesti) > 0
        )
        .map((position, index) => {
            const quantite = Number(position.quantite);
            const montantInvesti = Number(position.montantInvesti);

            const prixExecution =
                quantite > 0
                    ? montantInvesti / quantite
                    : 0;

            return {
                id:
                    `migration-${Date.now()}-${index}`,

                type:
                    "achat",

                courtier:
                    position.courtier ||
                    "trade-republic",

                modeExecution:
                    "autre",

                date:
                    maintenant,

                entreprise:
                    String(
                        position.entreprise ||
                        position.ticker ||
                        ""
                    ),

                ticker:
                    String(position.ticker || "")
                        .trim()
                        .toUpperCase(),

                prixExecution,
                quantite,

                montantBrut:
                    montantInvesti,

                frais:
                    0,

                sourceFrais:
                    "inconnu",

                coutTotal:
                    montantInvesti,

                sourceTransaction:
                    "migration-ancienne-position",

                qualiteTransaction:
                    "partielle",

                coursOriginal:
                    Number(
                        position.coursOriginal ??
                        position.cours
                    ),

                deviseOriginale:
                    position.deviseOriginale ||
                    null,

                coursEUR:
                    Number(
                        position.coursEUR ??
                        position.cours
                    ),

                fxRateToEUR:
                    Number.isFinite(
                        Number(position.fxRateToEUR)
                    )
                        ? Number(position.fxRateToEUR)
                        : null,

                fxDate:
                    position.fxDate || null,

                fxProvider:
                    position.fxProvider || null,

                fxStatus:
                    position.fxStatus || null,

                brokerRateConfirmed:
                    position.brokerRateConfirmed === true,

                brokerRate:
                    Number.isFinite(
                        Number(position.brokerRate)
                    )
                        ? Number(position.brokerRate)
                        : null,

                brokerRateMessage:
                    position.brokerRateMessage ||
                    "Impossible à confirmer pour cette transaction migrée."
            };
        });

    sauvegarderTransactions();
}


/* =========================================================
   FORMATAGE
========================================================= */

function formatEuro(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(nombre);
}


function formatMonnaie(valeur, devise) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "—";
    }

    const currency =
        typeof devise === "string" &&
        devise.trim()
            ? devise.trim().toUpperCase()
            : null;

    if (!currency) {
        return nombre.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    }

    try {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(nombre);
    } catch (error) {
        return (
            nombre.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }) +
            " " +
            currency
        );
    }
}


function formatQuantite(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "0";
    }

    return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
    }).format(nombre);
}


function formatPourcentage(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "—";
    }

    return (
        new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(nombre) + " %"
    );
}


function formatTaux(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8
    }).format(nombre);
}


function formatDateHeure(valeur) {
    if (!valeur) {
        return "—";
    }

    const date = new Date(valeur);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
}


function echapperHTML(texte) {
    return String(texte ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   COURTIERS
========================================================= */

function nomCourtier(courtier) {
    switch (courtier) {
        case "trade-republic":
            return "Trade Republic";

        case "revolut":
            return "Revolut";

        default:
            return courtier || "Non renseigné";
    }
}


/* =========================================================
   ID TRANSACTION
========================================================= */

function genererIdTransaction() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return (
        "tx-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2)
    );
}


/* =========================================================
   DATE PAR DÉFAUT
========================================================= */

function initialiserDateTransaction() {
    if (!dateTransactionInput) {
        return;
    }

    if (dateTransactionInput.value) {
        return;
    }

    const maintenant = new Date();

    const decalage =
        maintenant.getTimezoneOffset() * 60000;

    const localISO =
        new Date(
            maintenant.getTime() - decalage
        )
            .toISOString()
            .slice(0, 16);

    dateTransactionInput.value =
        localISO;
}


/* =========================================================
   FRAIS AUTOMATIQUES
========================================================= */

function determinerFraisAutomatiques() {
    if (
        !courtierSelect ||
        !modeExecutionSelect ||
        !fraisTransactionInput ||
        !sourceFraisSelect
    ) {
        return;
    }

    const courtier =
        courtierSelect.value;

    const modeExecution =
        modeExecutionSelect.value;


    if (courtier === "trade-republic") {

        if (modeExecution === "plan-epargne") {
            fraisTransactionInput.value =
                "0.00";

            sourceFraisSelect.value =
                "regle-courtier";

            if (fraisInfo) {
                fraisInfo.textContent =
                    "Trade Republic — plan d’épargne : 0 € de frais de transaction appliqué par défaut.";
            }

            return;
        }


        if (modeExecution === "ordre-classique") {
            fraisTransactionInput.value =
                "1.00";

            sourceFraisSelect.value =
                "regle-courtier";

            if (fraisInfo) {
                fraisInfo.textContent =
                    "Trade Republic — ordre classique : 1 € de frais appliqué par défaut. Un justificatif réel primera toujours sur cette règle.";
            }

            return;
        }
    }


    if (courtier === "revolut") {
        sourceFraisSelect.value =
            "inconnu";

        if (fraisInfo) {
            fraisInfo.textContent =
                "Revolut : frais non supposés automatiquement. Utiliser les données réelles du justificatif lorsqu'elles sont disponibles.";
        }

        return;
    }


    if (fraisInfo) {
        fraisInfo.textContent =
            "Frais à confirmer selon le courtier et le justificatif.";
    }
}


/* =========================================================
   INFORMATION FRACTIONS
========================================================= */

function mettreAJourInformationFraction() {
    if (!fractionStatus) {
        return;
    }

    const ticker =
        tickerInput
            ? tickerInput.value
                .trim()
                .toUpperCase()
            : "";

    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "";

    if (!ticker) {
        fractionStatus.textContent =
            "Saisissez un ticker pour identifier l’instrument.";

        return;
    }

    fractionStatus.textContent =
        `${ticker} — ${nomCourtier(courtier)} : ` +
        "éligibilité aux fractions à vérifier auprès du courtier.";
}


/* =========================================================
   MODE DE SAISIE
========================================================= */

function mettreAJourModeSaisie() {
    if (!modeSaisieSelect) {
        return;
    }

    const mode =
        modeSaisieSelect.value;

    if (mode === "montant") {
        if (champMontant) {
            champMontant.style.display =
                "flex";
        }

        if (champQuantite) {
            champQuantite.style.display =
                "none";
        }
    } else {
        if (champQuantite) {
            champQuantite.style.display =
                "flex";
        }

        if (champMontant) {
            champMontant.style.display =
                "none";
        }
    }

    recalculerTransaction();
}


/* =========================================================
   CALCUL EN DIRECT
========================================================= */

function recalculerTransaction() {
    if (
        !prixAchatInput ||
        !quantiteInput
    ) {
        return;
    }

    const prixExecution =
        parseFloat(
            prixAchatInput.value
        );

    const frais =
        fraisTransactionInput
            ? parseFloat(
                fraisTransactionInput.value
            )
            : 0;

    const mode =
        modeSaisieSelect
            ? modeSaisieSelect.value
            : "quantite";


    if (
        !Number.isFinite(prixExecution) ||
        prixExecution <= 0
    ) {
        if (calculPosition) {
            calculPosition.textContent =
                "Renseignez un prix d’exécution valide.";
        }

        return;
    }


    const fraisValides =
        Number.isFinite(frais) &&
        frais >= 0
            ? frais
            : 0;


    if (mode === "montant") {
        const montantBrut =
            montantInvestiInput
                ? parseFloat(
                    montantInvestiInput.value
                )
                : NaN;

        if (
            !Number.isFinite(montantBrut) ||
            montantBrut <= 0
        ) {
            quantiteInput.value =
                "0";

            if (calculPosition) {
                calculPosition.textContent =
                    "Renseignez le montant brut.";
            }

            return;
        }

        const quantite =
            montantBrut /
            prixExecution;

        quantiteInput.value =
            quantite.toFixed(8);

        const type =
            typeTransactionSelect
                ? typeTransactionSelect.value
                : "achat";

        const fluxNet =
            type === "achat"
                ? montantBrut + fraisValides
                : montantBrut - fraisValides;

        if (calculPosition) {
            calculPosition.textContent =
                `${formatQuantite(quantite)} action(s) — ` +
                `montant brut ${formatEuro(montantBrut)} — ` +
                `frais ${formatEuro(fraisValides)} — ` +
                `${type === "achat" ? "coût total" : "produit net"} ${formatEuro(fluxNet)}`;
        }

        return;
    }


    const quantite =
        parseFloat(
            quantiteInput.value
        );

    if (
        !Number.isFinite(quantite) ||
        quantite <= 0
    ) {
        if (montantInvestiInput) {
            montantInvestiInput.value =
                "0";
        }

        if (calculPosition) {
            calculPosition.textContent =
                "Renseignez le nombre d’actions.";
        }

        return;
    }


    const montantBrut =
        prixExecution *
        quantite;

    if (montantInvestiInput) {
        montantInvestiInput.value =
            montantBrut.toFixed(2);
    }


    const type =
        typeTransactionSelect
            ? typeTransactionSelect.value
            : "achat";

    const fluxNet =
        type === "achat"
            ? montantBrut + fraisValides
            : montantBrut - fraisValides;


    if (calculPosition) {
        calculPosition.textContent =
            `${formatQuantite(quantite)} action(s) × ` +
            `${formatEuro(prixExecution)} = ` +
            `${formatEuro(montantBrut)} brut — ` +
            `frais ${formatEuro(fraisValides)} — ` +
            `${type === "achat" ? "coût total" : "produit net"} ${formatEuro(fluxNet)}`;
    }
}


/* =========================================================
   RÉCUPÉRATION DONNÉES DE MARCHÉ
========================================================= */

async function recupererDonneesMarche(ticker) {
    const symbole =
        String(ticker)
            .trim()
            .toUpperCase();

    if (!symbole) {
        throw new Error(
            "Le ticker est obligatoire."
        );
    }

    const response = await fetch(
        `/api/quote?symbol=${encodeURIComponent(symbole)}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json"
            },
            cache: "no-store"
        }
    );

    let data = null;

    try {
        data =
            await response.json();
    } catch (error) {
        throw new Error(
            "La réponse du serveur est invalide."
        );
    }


    if (!response.ok) {
        throw new Error(
            data?.error ||
            "Impossible de récupérer les données de marché."
        );
    }


    const coursOriginal =
        Number(data.priceOriginal);

    const coursEUR =
        Number(data.priceEUR);


    if (
        !Number.isFinite(coursOriginal) ||
        coursOriginal <= 0
    ) {
        throw new Error(
            "Cours d'origine indisponible."
        );
    }


    if (
        !Number.isFinite(coursEUR) ||
        coursEUR <= 0
    ) {
        throw new Error(
            "Valorisation EUR indisponible ou impossible à confirmer."
        );
    }


    return {
        coursOriginal,

        deviseOriginale:
            data.currencyOriginal ||
            null,

        coursEUR,

        deviseStatus:
            data.currencyStatus ||
            "impossible_a_confirmer",

        fxRateToEUR:
            Number.isFinite(
                Number(data.fxRateToEUR)
            )
                ? Number(data.fxRateToEUR)
                : null,

        fxDate:
            data.fxDate || null,

        fxProvider:
            data.fxProvider || null,

        fxStatus:
            data.fxStatus || null,

        brokerRateConfirmed:
            data.brokerRateConfirmed === true,

        brokerRate:
            Number.isFinite(
                Number(data.brokerRate)
            )
                ? Number(data.brokerRate)
                : null,

        brokerRateMessage:
            data.brokerRateMessage ||
            "Impossible à confirmer.",

        timestamp:
            data.timestamp || null
    };
}


/* =========================================================
   CALCUL DES POSITIONS À PARTIR DES TRANSACTIONS
========================================================= */

function recalculerPositions() {
    const groupes = new Map();


    const transactionsTriees =
        [...transactions].sort(
            (a, b) =>
                new Date(a.date).getTime() -
                new Date(b.date).getTime()
        );


    for (const tx of transactionsTriees) {
        const cle =
            `${tx.courtier}::${tx.ticker}`;

        if (!groupes.has(cle)) {
            groupes.set(cle, {
                entreprise:
                    tx.entreprise,

                ticker:
                    tx.ticker,

                courtier:
                    tx.courtier,

                quantite:
                    0,

                coutAcquisitionNet:
                    0,

                fraisCumules:
                    0,

                gainsRealises:
                    0,

                nombreTransactions:
                    0,

                coursOriginal:
                    tx.coursOriginal || null,

                deviseOriginale:
                    tx.deviseOriginale || null,

                coursEUR:
                    tx.coursEUR || null,

                fxRateToEUR:
                    tx.fxRateToEUR || null,

                fxDate:
                    tx.fxDate || null,

                fxProvider:
                    tx.fxProvider || null,

                fxStatus:
                    tx.fxStatus || null,

                brokerRateConfirmed:
                    tx.brokerRateConfirmed === true,

                brokerRate:
                    tx.brokerRate || null
            });
        }


        const position =
            groupes.get(cle);

        position.nombreTransactions += 1;
        position.fraisCumules +=
            Number(tx.frais) || 0;


        if (
            Number(tx.coursEUR) > 0
        ) {
            position.coursEUR =
                Number(tx.coursEUR);

            position.coursOriginal =
                Number(tx.coursOriginal);

            position.deviseOriginale =
                tx.deviseOriginale;

            position.fxRateToEUR =
                tx.fxRateToEUR;

            position.fxDate =
                tx.fxDate;

            position.fxProvider =
                tx.fxProvider;

            position.fxStatus =
                tx.fxStatus;

            position.brokerRateConfirmed =
                tx.brokerRateConfirmed === true;

            position.brokerRate =
                tx.brokerRate || null;
        }


        if (tx.type === "achat") {
            position.quantite +=
                Number(tx.quantite);

            position.coutAcquisitionNet +=
                Number(tx.coutTotal);
        }


        if (tx.type === "vente") {
            const quantiteAvant =
                position.quantite;

            if (
                quantiteAvant <= 0
            ) {
                continue;
            }


            const quantiteVendue =
                Math.min(
                    Number(tx.quantite),
                    quantiteAvant
                );


            const pruAvantVente =
                position.coutAcquisitionNet /
                quantiteAvant;


            const coutSorti =
                pruAvantVente *
                quantiteVendue;


            const produitNet =
                Number(tx.produitNet);


            const gainRealise =
                produitNet -
                coutSorti;


            position.gainsRealises +=
                gainRealise;


            position.quantite -=
                quantiteVendue;


            position.coutAcquisitionNet -=
                coutSorti;


            if (
                Math.abs(position.quantite) <
                1e-10
            ) {
                position.quantite = 0;
                position.coutAcquisitionNet = 0;
            }
        }
    }


    positions =
        Array.from(
            groupes.values()
        )
            .filter(
                position =>
                    position.quantite > 0
            )
            .map(
                position => {

                    const pru =
                        position.quantite > 0
                            ? position.coutAcquisitionNet /
                              position.quantite
                            : 0;


                    const valeurActuelle =
                        Number(position.coursEUR) > 0
                            ? position.quantite *
                              Number(position.coursEUR)
                            : null;


                    const gainNonRealise =
                        valeurActuelle !== null
                            ? valeurActuelle -
                              position.coutAcquisitionNet
                            : null;


                    const rendement =
                        gainNonRealise !== null &&
                        position.coutAcquisitionNet > 0
                            ? (
                                gainNonRealise /
                                position.coutAcquisitionNet
                            ) * 100
                            : null;


                    return {
                        ...position,
                        pru,
                        valeurActuelle,
                        gainNonRealise,
                        rendement
                    };
                }
            );
}


/* =========================================================
   FIN DU BLOC 1/2
========================================================= */
/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 2/2
========================================================= */


/* =========================================================
   LECTURE FORMULAIRE
========================================================= */

function lireFormulaireTransaction() {
    const entreprise =
        nomActionInput
            ? nomActionInput.value.trim()
            : "";

    const ticker =
        tickerInput
            ? tickerInput.value
                .trim()
                .toUpperCase()
            : "";

    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "trade-republic";

    const type =
        typeTransactionSelect
            ? typeTransactionSelect.value
            : "achat";

    const modeExecution =
        modeExecutionSelect
            ? modeExecutionSelect.value
            : "ordre-classique";

    const date =
        dateTransactionInput &&
        dateTransactionInput.value
            ? new Date(
                dateTransactionInput.value
            ).toISOString()
            : new Date().toISOString();

    const prixExecution =
        prixAchatInput
            ? parseFloat(
                prixAchatInput.value
            )
            : NaN;

    const mode =
        modeSaisieSelect
            ? modeSaisieSelect.value
            : "quantite";

    const frais =
        fraisTransactionInput
            ? parseFloat(
                fraisTransactionInput.value
            )
            : 0;

    const sourceFrais =
        sourceFraisSelect
            ? sourceFraisSelect.value
            : "inconnu";

    let quantite = NaN;
    let montantBrut = NaN;


    /* -----------------------------------------------------
       SAISIE PAR MONTANT
    ----------------------------------------------------- */

    if (mode === "montant") {
        montantBrut =
            montantInvestiInput
                ? parseFloat(
                    montantInvestiInput.value
                )
                : NaN;

        if (
            Number.isFinite(prixExecution) &&
            prixExecution > 0 &&
            Number.isFinite(montantBrut) &&
            montantBrut > 0
        ) {
            quantite =
                montantBrut /
                prixExecution;
        }
    }


    /* -----------------------------------------------------
       SAISIE PAR QUANTITÉ
    ----------------------------------------------------- */

    else {
        quantite =
            quantiteInput
                ? parseFloat(
                    quantiteInput.value
                )
                : NaN;

        if (
            Number.isFinite(prixExecution) &&
            prixExecution > 0 &&
            Number.isFinite(quantite) &&
            quantite > 0
        ) {
            montantBrut =
                prixExecution *
                quantite;
        }
    }


    return {
        entreprise,
        ticker,
        courtier,
        type,
        modeExecution,
        date,
        prixExecution,
        quantite,
        montantBrut,
        frais,
        sourceFrais
    };
}


/* =========================================================
   VALIDATION
========================================================= */

function validerTransaction(donnees) {
    if (!donnees.entreprise) {
        throw new Error(
            "Indiquez le nom de l’entreprise."
        );
    }

    if (!donnees.ticker) {
        throw new Error(
            "Indiquez le ticker."
        );
    }

    if (
        !Number.isFinite(
            donnees.prixExecution
        ) ||
        donnees.prixExecution <= 0
    ) {
        throw new Error(
            "Le prix d’exécution doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(
            donnees.quantite
        ) ||
        donnees.quantite <= 0
    ) {
        throw new Error(
            "La quantité doit être supérieure à 0."
        );
    }

    if (
        !Number.isFinite(
            donnees.montantBrut
        ) ||
        donnees.montantBrut <= 0
    ) {
        throw new Error(
            "Le montant brut doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(
            donnees.frais
        ) ||
        donnees.frais < 0
    ) {
        throw new Error(
            "Les frais doivent être supérieurs ou égaux à 0."
        );
    }


    /* -----------------------------------------------------
       CONTRÔLE D'UNE VENTE
    ----------------------------------------------------- */

    if (donnees.type === "vente") {
        const position =
            positions.find(
                position =>
                    position.ticker ===
                        donnees.ticker &&
                    position.courtier ===
                        donnees.courtier
            );

        const quantiteDisponible =
            position
                ? Number(
                    position.quantite
                )
                : 0;

        if (
            donnees.quantite >
            quantiteDisponible + 1e-8
        ) {
            throw new Error(
                `Vente impossible : seulement ${formatQuantite(
                    quantiteDisponible
                )} action(s) disponible(s) chez ${nomCourtier(
                    donnees.courtier
                )}.`
            );
        }
    }

    return true;
}


/* =========================================================
   ENREGISTREMENT D'UNE TRANSACTION
========================================================= */

async function enregistrerTransaction() {
    if (!ajouterPositionButton) {
        return;
    }

    const donnees =
        lireFormulaireTransaction();


    try {
        validerTransaction(
            donnees
        );
    } catch (error) {
        alert(error.message);
        return;
    }


    ajouterPositionButton.disabled =
        true;

    ajouterPositionButton.textContent =
        "Récupération des données de marché...";


    try {
        const marche =
            await recupererDonneesMarche(
                donnees.ticker
            );


        const frais =
            Number(donnees.frais);


        const coutTotal =
            donnees.type === "achat"
                ? donnees.montantBrut +
                    frais
                : null;


        const produitNet =
            donnees.type === "vente"
                ? donnees.montantBrut -
                    frais
                : null;


        const ancienId =
            indexTransactionEnModification !== null &&
            transactions[
                indexTransactionEnModification
            ]
                ? transactions[
                    indexTransactionEnModification
                ].id
                : null;


        const transaction = {
            id:
                ancienId ||
                genererIdTransaction(),

            type:
                donnees.type,

            courtier:
                donnees.courtier,

            modeExecution:
                donnees.modeExecution,

            date:
                donnees.date,

            entreprise:
                donnees.entreprise,

            ticker:
                donnees.ticker,

            prixExecution:
                donnees.prixExecution,

            quantite:
                Number(
                    donnees.quantite.toFixed(8)
                ),

            montantBrut:
                Number(
                    donnees.montantBrut.toFixed(8)
                ),

            frais,

            sourceFrais:
                donnees.sourceFrais,

            coutTotal,

            produitNet,

            sourceTransaction:
                "saisie-manuelle",

            qualiteTransaction:
                "declaree-utilisateur",

            coursOriginal:
                marche.coursOriginal,

            deviseOriginale:
                marche.deviseOriginale,

            coursEUR:
                marche.coursEUR,

            deviseStatus:
                marche.deviseStatus,

            fxRateToEUR:
                marche.fxRateToEUR,

            fxDate:
                marche.fxDate,

            fxProvider:
                marche.fxProvider,

            fxStatus:
                marche.fxStatus,

            brokerRateConfirmed:
                marche.brokerRateConfirmed,

            brokerRate:
                marche.brokerRate,

            brokerRateMessage:
                marche.brokerRateMessage,

            marketTimestamp:
                marche.timestamp
        };


        /* -------------------------------------------------
           MODIFICATION
        ------------------------------------------------- */

        if (
            indexTransactionEnModification !== null
        ) {
            transactions[
                indexTransactionEnModification
            ] = transaction;

            indexTransactionEnModification =
                null;
        }


        /* -------------------------------------------------
           NOUVELLE TRANSACTION
        ------------------------------------------------- */

        else {
            transactions.push(
                transaction
            );
        }


        sauvegarderTransactions();

        recalculerPositions();

        afficherPositions();
        afficherTransactions();

        reinitialiserFormulaire();

    } catch (error) {
        console.error(
            "Erreur d'enregistrement :",
            error
        );

        alert(
            `Erreur : ${error.message}`
        );

    } finally {
        ajouterPositionButton.disabled =
            false;

        ajouterPositionButton.textContent =
            indexTransactionEnModification !== null
                ? "Enregistrer les modifications"
                : "Enregistrer la transaction";
    }
}


/* =========================================================
   AFFICHAGE DES POSITIONS
========================================================= */

function afficherPositions() {
    if (!listePositions) {
        return;
    }

    listePositions.innerHTML = "";

    recalculerPositions();


    /* =====================================================
       TOTAUX
    ===================================================== */

    let totalCapitalRestant = 0;
    let totalValeurActuelle = 0;
    let totalGainNonRealise = 0;
    let totalGainsRealises = 0;

    let valorisationComplete = true;


    /* =====================================================
       PORTEFEUILLE VIDE
    ===================================================== */

    if (positions.length === 0) {
        listePositions.innerHTML = `
            <div class="portfolio-empty">
                <p>
                    Aucune position ouverte.
                </p>
            </div>
        `;
    }


    /* =====================================================
       CARTES DES POSITIONS
    ===================================================== */

    positions.forEach(
        position => {

            const capitalRestant =
                Number(
                    position.coutAcquisitionNet
                ) || 0;

            const gainsRealises =
                Number(
                    position.gainsRealises
                ) || 0;

            totalCapitalRestant +=
                capitalRestant;

            totalGainsRealises +=
                gainsRealises;


            const valeurActuelle =
                Number(
                    position.valeurActuelle
                );

            const gainNonRealise =
                Number(
                    position.gainNonRealise
                );


            if (
                Number.isFinite(
                    valeurActuelle
                ) &&
                Number.isFinite(
                    gainNonRealise
                )
            ) {
                totalValeurActuelle +=
                    valeurActuelle;

                totalGainNonRealise +=
                    gainNonRealise;
            } else {
                valorisationComplete =
                    false;
            }


            const classeGain =
                gainNonRealise > 0
                    ? "positif"
                    : gainNonRealise < 0
                        ? "negatif"
                        : "neutre";


            const classeGainRealise =
                gainsRealises > 0
                    ? "positif"
                    : gainsRealises < 0
                        ? "negatif"
                        : "neutre";


            const carte =
                document.createElement(
                    "div"
                );


            carte.className =
                "position-card";


            carte.innerHTML = `
                <div class="position-header">

                    <div>

                        <h3>
                            ${echapperHTML(
                                position.entreprise
                            )}
                        </h3>

                        <p class="position-ticker">
                            ${echapperHTML(
                                position.ticker
                            )}
                        </p>

                    </div>


                    <span class="courtier-badge">

                        ${echapperHTML(
                            nomCourtier(
                                position.courtier
                            )
                        )}

                    </span>

                </div>


                <div class="position-details">

                    <p>
                        <strong>
                            Quantité détenue :
                        </strong>

                        ${formatQuantite(
                            position.quantite
                        )}
                    </p>


                    <p>
                        <strong>
                            PRU net de frais :
                        </strong>

                        ${formatEuro(
                            position.pru
                        )}
                    </p>


                    <p>
                        <strong>
                            Capital restant investi :
                        </strong>

                        ${formatEuro(
                            position.coutAcquisitionNet
                        )}
                    </p>


                    <p>
                        <strong>
                            Frais cumulés :
                        </strong>

                        ${formatEuro(
                            position.fraisCumules
                        )}
                    </p>


                    <p>
                        <strong>
                            Nombre de transactions :
                        </strong>

                        ${position.nombreTransactions}
                    </p>


                    <p>
                        <strong>
                            Cours d’origine :
                        </strong>

                        ${formatMonnaie(
                            position.coursOriginal,
                            position.deviseOriginale
                        )}
                    </p>


                    <p>
                        <strong>
                            Cours de référence EUR :
                        </strong>

                        ${formatEuro(
                            position.coursEUR
                        )}
                    </p>


                    <p>
                        <strong>
                            Taux FX :
                        </strong>

                        ${
                            Number.isFinite(
                                Number(
                                    position.fxRateToEUR
                                )
                            )
                                ? formatTaux(
                                    position.fxRateToEUR
                                )
                                : "—"
                        }
                    </p>


                    <p>
                        <strong>
                            Source FX :
                        </strong>

                        ${echapperHTML(
                            position.fxProvider ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>
                            Taux courtier exact :
                        </strong>

                        ${
                            position.brokerRateConfirmed
                                ? formatTaux(
                                    position.brokerRate
                                )
                                : "Impossible à confirmer"
                        }
                    </p>


                    <p>
                        <strong>
                            Valeur actuelle :
                        </strong>

                        ${formatEuro(
                            position.valeurActuelle
                        )}
                    </p>


                    <p class="${classeGain}">

                        <strong>
                            Gain / Perte non réalisé :
                        </strong>

                        ${formatEuro(
                            position.gainNonRealise
                        )}

                    </p>


                    <p class="${classeGain}">

                        <strong>
                            Rendement non réalisé :
                        </strong>

                        ${formatPourcentage(
                            position.rendement
                        )}

                    </p>


                    <p class="${classeGainRealise}">

                        <strong>
                            Gains réalisés cumulés :
                        </strong>

                        ${formatEuro(
                            position.gainsRealises
                        )}

                    </p>

                </div>
            `;


            listePositions.appendChild(
                carte
            );
        }
    );


    /* =====================================================
       PERFORMANCE TOTALE
    ===================================================== */

    const performanceTotale =
        valorisationComplete
            ? totalGainNonRealise +
                totalGainsRealises
            : null;


    /* =====================================================
       CAPITAL RESTANT
    ===================================================== */

    if (totalInvestiElement) {
        totalInvestiElement.textContent =
            formatEuro(
                totalCapitalRestant
            );
    }


    /* =====================================================
       VALEUR ACTUELLE
    ===================================================== */

    if (totalValeurElement) {
        totalValeurElement.textContent =
            valorisationComplete
                ? formatEuro(
                    totalValeurActuelle
                )
                : "Partiellement indisponible";
    }


    /* =====================================================
       PERFORMANCE
    ===================================================== */

    if (totalGainElement) {

        const classeLatente =
            totalGainNonRealise > 0
                ? "positif"
                : totalGainNonRealise < 0
                    ? "negatif"
                    : "neutre";


        const classeRealisee =
            totalGainsRealises > 0
                ? "positif"
                : totalGainsRealises < 0
                    ? "negatif"
                    : "neutre";


        const classeTotale =
            performanceTotale > 0
                ? "positif"
                : performanceTotale < 0
                    ? "negatif"
                    : "neutre";


        totalGainElement.innerHTML = `
            <div class="summary-performance">

                <div>

                    <strong>
                        Gain / Perte non réalisé
                    </strong>

                    <div class="${classeLatente}">
                        ${
                            valorisationComplete
                                ? formatEuro(
                                    totalGainNonRealise
                                )
                                : "Impossible à confirmer"
                        }
                    </div>

                </div>


                <div>

                    <strong>
                        Gains réalisés cumulés
                    </strong>

                    <div class="${classeRealisee}">
                        ${formatEuro(
                            totalGainsRealises
                        )}
                    </div>

                </div>


                <div>

                    <strong>
                        Performance totale
                    </strong>

                    <div class="${classeTotale}">
                        ${
                            performanceTotale !== null
                                ? formatEuro(
                                    performanceTotale
                                )
                                : "Impossible à confirmer"
                        }
                    </div>

                </div>

            </div>
        `;
    }


    /* =====================================================
       RENDEMENT CUMULÉ SUR CAPITAL ENGAGÉ

       FORMULE :
       performance totale / coûts d'achat cumulés × 100

       IMPORTANT :
       Ce rendement n'est ni un TWR ni un XIRR.
       Il ne tient pas compte de la durée d'investissement.
    ===================================================== */

    let totalCapitalEngage = 0;


    transactions.forEach(
        transaction => {

            if (
                transaction.type === "achat"
            ) {
                const coutAchat =
                    Number(
                        transaction.coutTotal
                    );


                if (
                    Number.isFinite(
                        coutAchat
                    ) &&
                    coutAchat > 0
                ) {
                    totalCapitalEngage +=
                        coutAchat;
                }
            }
        }
    );


    const rendementCumule =
        performanceTotale !== null &&
        totalCapitalEngage > 0
            ? (
                performanceTotale /
                totalCapitalEngage
            ) * 100
            : null;


    if (totalRendementElement) {

        const classeRendement =
            rendementCumule > 0
                ? "positif"
                : rendementCumule < 0
                    ? "negatif"
                    : "neutre";


        totalRendementElement.innerHTML = `
            <div>

                <strong>
                    Rendement cumulé
                </strong>

                <div class="${classeRendement}">
                    ${
                        rendementCumule !== null
                            ? formatPourcentage(
                                rendementCumule
                            )
                            : "Impossible à confirmer"
                    }
                </div>

            </div>


            <div style="margin-top:12px;">

                <strong>
                    Capital engagé cumulé
                </strong>

                <div>
                    ${formatEuro(
                        totalCapitalEngage
                    )}
                </div>

            </div>


            <div
                style="
                    margin-top:12px;
                    font-size:0.9em;
                    line-height:1.4;
                "
            >
                Rendement cumulé simple, frais inclus.
                Il ne tient pas compte de la durée
                d’investissement.
                Les mesures TWR et XIRR seront
                calculées séparément lorsqu'un
                historique suffisamment fiable
                sera disponible.
            </div>
        `;
    }
}


/* =========================================================
   AFFICHAGE HISTORIQUE DES TRANSACTIONS
========================================================= */

function afficherTransactions() {
    if (!listeTransactions) {
        return;
    }

    listeTransactions.innerHTML =
        "";


    if (transactions.length === 0) {
        listeTransactions.innerHTML = `
            <div class="portfolio-empty">

                <p>
                    Aucune transaction enregistrée.
                </p>

            </div>
        `;

        return;
    }


    const transactionsTriees =
        transactions
            .map(
                (transaction, index) => ({
                    transaction,
                    index
                })
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.transaction.date
                    ).getTime() -
                    new Date(
                        a.transaction.date
                    ).getTime()
            );


    transactionsTriees.forEach(
        ({
            transaction,
            index
        }) => {

            const carte =
                document.createElement(
                    "div"
                );


            carte.className =
                "position-card transaction-card";


            const typeLabel =
                transaction.type === "achat"
                    ? "Achat"
                    : "Vente";


            const montantNet =
                transaction.type === "achat"
                    ? transaction.coutTotal
                    : transaction.produitNet;


            carte.innerHTML = `
                <div class="position-header">

                    <div>

                        <h3>
                            ${typeLabel} —
                            ${echapperHTML(
                                transaction.entreprise
                            )}
                        </h3>

                        <p class="position-ticker">
                            ${echapperHTML(
                                transaction.ticker
                            )}
                        </p>

                    </div>


                    <span class="courtier-badge">

                        ${echapperHTML(
                            nomCourtier(
                                transaction.courtier
                            )
                        )}

                    </span>

                </div>


                <div class="position-details">

                    <p>
                        <strong>Date :</strong>

                        ${formatDateHeure(
                            transaction.date
                        )}
                    </p>


                    <p>
                        <strong>Type :</strong>

                        ${typeLabel}
                    </p>


                    <p>
                        <strong>Mode :</strong>

                        ${echapperHTML(
                            transaction.modeExecution
                        )}
                    </p>


                    <p>
                        <strong>Quantité :</strong>

                        ${formatQuantite(
                            transaction.quantite
                        )}
                    </p>


                    <p>
                        <strong>Prix d’exécution :</strong>

                        ${formatEuro(
                            transaction.prixExecution
                        )}
                    </p>


                    <p>
                        <strong>Montant brut :</strong>

                        ${formatEuro(
                            transaction.montantBrut
                        )}
                    </p>


                    <p>
                        <strong>Frais :</strong>

                        ${formatEuro(
                            transaction.frais
                        )}
                    </p>


                    <p>
                        <strong>
                            ${
                                transaction.type === "achat"
                                    ? "Coût total"
                                    : "Produit net"
                            } :
                        </strong>

                        ${formatEuro(
                            montantNet
                        )}
                    </p>


                    <p>
                        <strong>Source frais :</strong>

                        ${echapperHTML(
                            transaction.sourceFrais ||
                            "inconnu"
                        )}
                    </p>


                    <p>
                        <strong>Source transaction :</strong>

                        ${echapperHTML(
                            transaction.sourceTransaction ||
                            "—"
                        )}
                    </p>


                    <p>
                        <strong>Qualité :</strong>

                        ${echapperHTML(
                            transaction.qualiteTransaction ||
                            "—"
                        )}
                    </p>

                </div>


                <div class="position-actions">

                    <button
                        type="button"
                        class="modifier-transaction"
                        data-index="${index}"
                    >
                        Modifier
                    </button>


                    <button
                        type="button"
                        class="supprimer-transaction"
                        data-index="${index}"
                    >
                        Supprimer
                    </button>

                </div>
            `;


            listeTransactions.appendChild(
                carte
            );
        }
    );
}


/* =========================================================
   MODIFIER UNE TRANSACTION
========================================================= */

function modifierTransaction(index) {
    const tx =
        transactions[index];


    if (!tx) {
        return;
    }


    indexTransactionEnModification =
        index;


    if (courtierSelect) {
        courtierSelect.value =
            tx.courtier;
    }


    if (typeTransactionSelect) {
        typeTransactionSelect.value =
            tx.type;
    }


    if (modeExecutionSelect) {
        modeExecutionSelect.value =
            tx.modeExecution;
    }


    if (nomActionInput) {
        nomActionInput.value =
            tx.entreprise;
    }


    if (tickerInput) {
        tickerInput.value =
            tx.ticker;
    }


    if (prixAchatInput) {
        prixAchatInput.value =
            Number(
                tx.prixExecution
            ).toFixed(4);
    }


    if (modeSaisieSelect) {
        modeSaisieSelect.value =
            "quantite";
    }


    if (quantiteInput) {
        quantiteInput.value =
            tx.quantite;
    }


    if (montantInvestiInput) {
        montantInvestiInput.value =
            Number(
                tx.montantBrut
            ).toFixed(2);
    }


    if (fraisTransactionInput) {
        fraisTransactionInput.value =
            Number(
                tx.frais
            ).toFixed(2);
    }


    if (sourceFraisSelect) {
        sourceFraisSelect.value =
            tx.sourceFrais ||
            "inconnu";
    }


    if (
        dateTransactionInput &&
        tx.date
    ) {
        const date =
            new Date(
                tx.date
            );


        const decalage =
            date.getTimezoneOffset() *
            60000;


        dateTransactionInput.value =
            new Date(
                date.getTime() -
                decalage
            )
                .toISOString()
                .slice(0, 16);
    }


    if (ajouterPositionButton) {
        ajouterPositionButton.textContent =
            "Enregistrer les modifications";
    }


    mettreAJourModeSaisie();

    mettreAJourInformationFraction();

    recalculerTransaction();


    if (nomActionInput) {
        nomActionInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =========================================================
   SUPPRIMER UNE TRANSACTION
========================================================= */

function supprimerTransaction(index) {
    const tx =
        transactions[index];


    if (!tx) {
        return;
    }


    const confirmation =
        confirm(
            `Supprimer cette transaction ${tx.type} ${tx.ticker} ?`
        );


    if (!confirmation) {
        return;
    }


    transactions.splice(
        index,
        1
    );


    indexTransactionEnModification =
        null;


    sauvegarderTransactions();

    recalculerPositions();

    afficherPositions();

    afficherTransactions();

    reinitialiserFormulaire();
}


/* =========================================================
   RÉINITIALISATION DU FORMULAIRE
========================================================= */

function reinitialiserFormulaire() {
    if (nomActionInput) {
        nomActionInput.value =
            "";
    }


    if (tickerInput) {
        tickerInput.value =
            "";
    }


    if (prixAchatInput) {
        prixAchatInput.value =
            "0";
    }


    if (quantiteInput) {
        quantiteInput.value =
            "0";
    }


    if (montantInvestiInput) {
        montantInvestiInput.value =
            "0";
    }


    if (modeSaisieSelect) {
        modeSaisieSelect.value =
            "quantite";
    }


    if (typeTransactionSelect) {
        typeTransactionSelect.value =
            "achat";
    }


    indexTransactionEnModification =
        null;


    if (dateTransactionInput) {
        dateTransactionInput.value =
            "";
    }


    initialiserDateTransaction();

    determinerFraisAutomatiques();

    mettreAJourModeSaisie();

    mettreAJourInformationFraction();


    if (calculPosition) {
        calculPosition.textContent =
            "Renseignez la transaction.";
    }


    if (ajouterPositionButton) {
        ajouterPositionButton.textContent =
            "Enregistrer la transaction";
    }
}


/* =========================================================
   ÉVÉNEMENT BOUTON PRINCIPAL
========================================================= */

if (ajouterPositionButton) {
    ajouterPositionButton.addEventListener(
        "click",
        enregistrerTransaction
    );
}


/* =========================================================
   MODE DE SAISIE
========================================================= */

if (modeSaisieSelect) {
    modeSaisieSelect.addEventListener(
        "change",
        mettreAJourModeSaisie
    );
}


/* =========================================================
   COURTIER
========================================================= */

if (courtierSelect) {
    courtierSelect.addEventListener(
        "change",
        () => {

            determinerFraisAutomatiques();

            mettreAJourInformationFraction();

            recalculerTransaction();
        }
    );
}


/* =========================================================
   MODE D'EXÉCUTION
========================================================= */

if (modeExecutionSelect) {
    modeExecutionSelect.addEventListener(
        "change",
        () => {

            determinerFraisAutomatiques();

            recalculerTransaction();
        }
    );
}


/* =========================================================
   TYPE DE TRANSACTION
========================================================= */

if (typeTransactionSelect) {
    typeTransactionSelect.addEventListener(
        "change",
        recalculerTransaction
    );
}


/* =========================================================
   TICKER
========================================================= */

if (tickerInput) {
    tickerInput.addEventListener(
        "input",
        () => {

            tickerInput.value =
                tickerInput.value
                    .toUpperCase()
                    .replace(
                        /\s+/g,
                        ""
                    );


            mettreAJourInformationFraction();
        }
    );
}


/* =========================================================
   PRIX
========================================================= */

if (prixAchatInput) {
    prixAchatInput.addEventListener(
        "input",
        recalculerTransaction
    );
}


/* =========================================================
   QUANTITÉ
========================================================= */

if (quantiteInput) {
    quantiteInput.addEventListener(
        "input",
        () => {

            if (
                !modeSaisieSelect ||
                modeSaisieSelect.value ===
                    "quantite"
            ) {
                recalculerTransaction();
            }
        }
    );
}


/* =========================================================
   MONTANT
========================================================= */

if (montantInvestiInput) {
    montantInvestiInput.addEventListener(
        "input",
        () => {

            if (
                modeSaisieSelect &&
                modeSaisieSelect.value ===
                    "montant"
            ) {
                recalculerTransaction();
            }
        }
    );
}


/* =========================================================
   FRAIS MANUELS
========================================================= */

if (fraisTransactionInput) {
    fraisTransactionInput.addEventListener(
        "input",
        () => {

            if (sourceFraisSelect) {
                sourceFraisSelect.value =
                    "manuel";
            }

            recalculerTransaction();
        }
    );
}


/* =========================================================
   HISTORIQUE :
   MODIFIER / SUPPRIMER
========================================================= */

if (listeTransactions) {
    listeTransactions.addEventListener(
        "click",
        event => {

            const boutonModifier =
                event.target.closest(
                    ".modifier-transaction"
                );


            if (boutonModifier) {
                const index =
                    Number(
                        boutonModifier.dataset.index
                    );


                if (
                    Number.isInteger(index)
                ) {
                    modifierTransaction(
                        index
                    );
                }

                return;
            }


            const boutonSupprimer =
                event.target.closest(
                    ".supprimer-transaction"
                );


            if (boutonSupprimer) {
                const index =
                    Number(
                        boutonSupprimer.dataset.index
                    );


                if (
                    Number.isInteger(index)
                ) {
                    supprimerTransaction(
                        index
                    );
                }
            }
        }
    );
}


/* =========================================================
   TOUCHE ENTRÉE
========================================================= */

const champsTransaction = [
    nomActionInput,
    tickerInput,
    prixAchatInput,
    quantiteInput,
    montantInvestiInput,
    fraisTransactionInput
].filter(Boolean);


champsTransaction.forEach(
    champ => {

        champ.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();


                    if (
                        ajouterPositionButton &&
                        !ajouterPositionButton.disabled
                    ) {
                        enregistrerTransaction();
                    }
                }
            }
        );
    }
);


/* =========================================================
   INITIALISATION
========================================================= */

function initialiserApplication() {

    chargerTransactions();

    migrerAnciennesPositionsSiNecessaire();

    recalculerPositions();

    initialiserDateTransaction();

    determinerFraisAutomatiques();

    mettreAJourModeSaisie();

    mettreAJourInformationFraction();

    afficherPositions();

    afficherTransactions();


    console.log(
        "Application initialisée — architecture transactions -> positions."
    );
}


/* =========================================================
   DÉMARRAGE
========================================================= */

initialiserApplication();


/* =========================================================
   OUTILS ACCESSIBLES DEPUIS LA CONSOLE
========================================================= */

window.recalculerPositions =
    recalculerPositions;

window.modifierTransaction =
    modifierTransaction;

window.supprimerTransaction =
    supprimerTransaction;


/* =========================================================
   FIN DU BLOC 2/2
========================================================= */
