/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — VERSION CONSOLIDÉE
   BLOC 1/4

   ARCHITECTURE :
   COURTIER
      -> ENVELOPPE
         -> INSTRUMENT
            -> TRANSACTIONS
               -> POSITIONS CALCULÉES

   PRINCIPES :
   - transactions RÉELLES / TEST séparées
   - PEA / CTO séparés
   - Action / ETF
   - identité renforcée de l'instrument
   - anciennes données jamais inventées
   - dates historiques non inventées
   - frais conservés séparément
   - préparation XIRR
   - préparation fiche instrument
   - préparation données live / graphiques
========================================================= */


/* =========================================================
   ÉLÉMENTS DU FORMULAIRE
========================================================= */

const statutTransactionSelect =
    document.getElementById("statutTransaction");

const courtierSelect =
    document.getElementById("courtier");

const enveloppeSelect =
    document.getElementById("enveloppe");

const typeInstrumentSelect =
    document.getElementById("typeInstrument");

const typeTransactionSelect =
    document.getElementById("typeTransaction");

const modeExecutionSelect =
    document.getElementById("modeExecution");

const dateTransactionInput =
    document.getElementById("dateTransaction");

const nomActionInput =
    document.getElementById("nomAction");

const tickerInput =
    document.getElementById("ticker");

const isinInput =
    document.getElementById("isin");

const placeCotationInput =
    document.getElementById("placeCotation");

const deviseCotationSelect =
    document.getElementById("deviseCotation");

const eligibilitePEASelect =
    document.getElementById("eligibilitePEA");

const prixAchatInput =
    document.getElementById("prixAchat");

const modeSaisieSelect =
    document.getElementById("modeSaisie");

const quantiteInput =
    document.getElementById("quantite");

const montantInvestiInput =
    document.getElementById("montantInvesti");

const champQuantite =
    document.getElementById("champQuantite");

const champMontant =
    document.getElementById("champMontant");

const fraisTransactionInput =
    document.getElementById("fraisTransaction");

const sourceFraisSelect =
    document.getElementById("sourceFrais");

const fractionStatus =
    document.getElementById("fractionStatus");

const fraisInfo =
    document.getElementById("fraisInfo");

const calculPosition =
    document.getElementById("calculPosition");

const ajouterPositionButton =
    document.getElementById("ajouterPosition");


/* =========================================================
   ZONES D'AFFICHAGE
========================================================= */

const listePositions =
    document.getElementById("listePositions");

const listeTransactions =
    document.getElementById("listeTransactions");

const totalInvestiElement =
    document.getElementById("totalInvesti");

const totalValeurElement =
    document.getElementById("totalValeur");

const totalGainElement =
    document.getElementById("totalGain");

const totalRendementElement =
    document.getElementById("totalRendement");


/* =========================================================
   DONNÉES
========================================================= */

let transactions = [];

let positions = [];

let indexTransactionEnModification =
    null;


/* =========================================================
   CONSTANTES MÉTIER
========================================================= */

const ENVELOPPES_VALIDES = [
    "pea",
    "cto"
];

const TYPES_INSTRUMENT_VALIDES = [
    "action",
    "etf"
];

const STATUTS_TRANSACTION_VALIDES = [
    "reelle",
    "test"
];

const TYPES_TRANSACTION_VALIDES = [
    "achat",
    "vente"
];


/* =========================================================
   NORMALISATION TEXTE
========================================================= */

function normaliserTexte(
    valeur
) {
    return String(
        valeur ??
        ""
    ).trim();
}


function normaliserTicker(
    valeur
) {
    return normaliserTexte(
        valeur
    )
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );
}


function normaliserISIN(
    valeur
) {
    return normaliserTexte(
        valeur
    )
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );
}


function normaliserDevise(
    valeur
) {
    const devise =
        normaliserTexte(
            valeur
        ).toUpperCase();

    return devise ||
        null;
}


/* =========================================================
   VALIDATION SIMPLE D'UN ISIN

   Format uniquement :
   2 lettres + 9 caractères alphanumériques + 1 chiffre.

   Cette fonction ne prétend pas confirmer que l'ISIN
   correspond réellement à l'instrument.
========================================================= */

function formatISINValide(
    valeur
) {
    const isin =
        normaliserISIN(
            valeur
        );

    if (
        !isin
    ) {
        return true;
    }

    return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(
        isin
    );
}


/* =========================================================
   CHARGEMENT LOCALSTORAGE
========================================================= */

function chargerTransactions() {
    try {
        const donnees =
            JSON.parse(
                localStorage.getItem(
                    "transactions"
                )
            );

        transactions =
            Array.isArray(
                donnees
            )
                ? donnees
                : [];

    } catch (error) {
        console.error(
            "Impossible de charger les transactions :",
            error
        );

        transactions =
            [];
    }
}


/* =========================================================
   SAUVEGARDE LOCALSTORAGE
========================================================= */

function sauvegarderTransactions() {
    try {
        localStorage.setItem(
            "transactions",
            JSON.stringify(
                transactions
            )
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
    if (
        transactions.length >
        0
    ) {
        return;
    }

    let anciennesPositions =
        [];

    try {
        const donnees =
            JSON.parse(
                localStorage.getItem(
                    "positions"
                )
            );

        if (
            Array.isArray(
                donnees
            )
        ) {
            anciennesPositions =
                donnees;
        }

    } catch (error) {
        anciennesPositions =
            [];
    }

    if (
        anciennesPositions.length ===
        0
    ) {
        return;
    }

    transactions =
        anciennesPositions
            .filter(
                position =>
                    position &&
                    Number(
                        position.quantite
                    ) > 0 &&
                    Number(
                        position.montantInvesti
                    ) > 0
            )
            .map(
                (
                    position,
                    index
                ) => {
                    const quantite =
                        Number(
                            position.quantite
                        );

                    const montantInvesti =
                        Number(
                            position.montantInvesti
                        );

                    const prixExecution =
                        quantite > 0
                            ? montantInvesti /
                              quantite
                            : 0;

                    return {
                        id:
                            `migration-${Date.now()}-${index}`,

                        statutTransaction:
                            "reelle",

                        type:
                            "achat",

                        courtier:
                            position.courtier ||
                            "trade-republic",

                        /*
                           Une ancienne position ne permet pas
                           de déduire PEA ou CTO.

                           On ne l'invente donc pas.
                        */

                        enveloppe:
                            null,

                        enveloppeStatus:
                            "a-confirmer",

                        typeInstrument:
                            null,

                        typeInstrumentStatus:
                            "a-confirmer",

                        modeExecution:
                            "autre",

                        date:
                            null,

                        dateStatus:
                            "date-inconnue",

                        dateSource:
                            "migration-sans-date-fiable",

                        entreprise:
                            String(
                                position.entreprise ||
                                position.ticker ||
                                ""
                            ),

                        ticker:
                            normaliserTicker(
                                position.ticker
                            ),

                        isin:
                            null,

                        isinStatus:
                            "inconnu",

                        placeCotation:
                            null,

                        placeCotationStatus:
                            "inconnue",

                        deviseCotation:
                            normaliserDevise(
                                position.deviseOriginale
                            ),

                        eligibilitePEA:
                            "inconnue",

                        eligibilitePEAStatus:
                            "non-verifiee",

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

                        produitNet:
                            null,

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
                                Number(
                                    position.fxRateToEUR
                                )
                            )
                                ? Number(
                                    position.fxRateToEUR
                                )
                                : null,

                        fxDate:
                            position.fxDate ||
                            null,

                        fxProvider:
                            position.fxProvider ||
                            null,

                        fxStatus:
                            position.fxStatus ||
                            null,

                        brokerRateConfirmed:
                            position.brokerRateConfirmed ===
                            true,

                        brokerRate:
                            Number.isFinite(
                                Number(
                                    position.brokerRate
                                )
                            )
                                ? Number(
                                    position.brokerRate
                                )
                                : null,

                        brokerRateMessage:
                            position.brokerRateMessage ||
                            "Impossible à confirmer pour cette transaction migrée.",

                        marketTimestamp:
                            position.marketTimestamp ||
                            null
                    };
                }
            );

    sauvegarderTransactions();
}


/* =========================================================
   NORMALISATION DES TRANSACTIONS
========================================================= */

function normaliserTransactions() {
    let modification =
        false;

    transactions =
        transactions
            .filter(
                transaction =>
                    transaction &&
                    typeof transaction ===
                        "object"
            )
            .map(
                transaction => {
                    const tx = {
                        ...transaction
                    };

                    /* -----------------------------------------
                       STATUT RÉEL / TEST
                    ----------------------------------------- */

                    if (
                        !STATUTS_TRANSACTION_VALIDES.includes(
                            tx.statutTransaction
                        )
                    ) {
                        /*
                           Compatibilité avec l'ancienne version.

                           Une transaction historique sans champ
                           statut était auparavant considérée
                           comme réelle.
                        */

                        tx.statutTransaction =
                            "reelle";

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       TYPE ACHAT / VENTE
                    ----------------------------------------- */

                    if (
                        !TYPES_TRANSACTION_VALIDES.includes(
                            tx.type
                        )
                    ) {
                        tx.type =
                            "achat";

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       TICKER
                    ----------------------------------------- */

                    const tickerNormalise =
                        normaliserTicker(
                            tx.ticker
                        );

                    if (
                        tickerNormalise !==
                        tx.ticker
                    ) {
                        tx.ticker =
                            tickerNormalise;

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       ISIN
                    ----------------------------------------- */

                    const isinNormalise =
                        normaliserISIN(
                            tx.isin
                        );

                    if (
                        isinNormalise
                    ) {
                        if (
                            tx.isin !==
                            isinNormalise
                        ) {
                            tx.isin =
                                isinNormalise;

                            modification =
                                true;
                        }

                        if (
                            !tx.isinStatus
                        ) {
                            tx.isinStatus =
                                "declare-utilisateur";

                            modification =
                                true;
                        }

                    } else {
                        if (
                            tx.isin !==
                            null
                        ) {
                            tx.isin =
                                null;

                            modification =
                                true;
                        }

                        if (
                            !tx.isinStatus
                        ) {
                            tx.isinStatus =
                                "inconnu";

                            modification =
                                true;
                        }
                    }

                    /* -----------------------------------------
                       ENVELOPPE PEA / CTO

                       Une ancienne donnée sans enveloppe
                       ne doit PAS être transformée
                       arbitrairement en CTO.
                    ----------------------------------------- */

                    if (
                        !ENVELOPPES_VALIDES.includes(
                            tx.enveloppe
                        )
                    ) {
                        tx.enveloppe =
                            null;

                        tx.enveloppeStatus =
                            tx.enveloppeStatus ||
                            "a-confirmer";

                        modification =
                            true;

                    } else if (
                        !tx.enveloppeStatus
                    ) {
                        tx.enveloppeStatus =
                            "declaree-utilisateur";

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       TYPE D'INSTRUMENT
                    ----------------------------------------- */

                    if (
                        !TYPES_INSTRUMENT_VALIDES.includes(
                            tx.typeInstrument
                        )
                    ) {
                        tx.typeInstrument =
                            null;

                        tx.typeInstrumentStatus =
                            tx.typeInstrumentStatus ||
                            "a-confirmer";

                        modification =
                            true;

                    } else if (
                        !tx.typeInstrumentStatus
                    ) {
                        tx.typeInstrumentStatus =
                            "declare-utilisateur";

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       PLACE DE COTATION
                    ----------------------------------------- */

                    const place =
                        normaliserTexte(
                            tx.placeCotation
                        );

                    if (
                        place
                    ) {
                        if (
                            tx.placeCotation !==
                            place
                        ) {
                            tx.placeCotation =
                                place;

                            modification =
                                true;
                        }

                        if (
                            !tx.placeCotationStatus
                        ) {
                            tx.placeCotationStatus =
                                "declaree-utilisateur";

                            modification =
                                true;
                        }

                    } else {
                        if (
                            tx.placeCotation !==
                            null
                        ) {
                            tx.placeCotation =
                                null;

                            modification =
                                true;
                        }

                        if (
                            !tx.placeCotationStatus
                        ) {
                            tx.placeCotationStatus =
                                "inconnue";

                            modification =
                                true;
                        }
                    }

                    /* -----------------------------------------
                       DEVISE DE COTATION
                    ----------------------------------------- */

                    const devise =
                        normaliserDevise(
                            tx.deviseCotation ||
                            tx.deviseOriginale
                        );

                    if (
                        devise !==
                        tx.deviseCotation
                    ) {
                        tx.deviseCotation =
                            devise;

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       ÉLIGIBILITÉ PEA

                       On ne déduit jamais automatiquement
                       l'éligibilité à partir du ticker.
                    ----------------------------------------- */

                    if (
                        ![
                            "eligible",
                            "non-eligible",
                            "inconnue"
                        ].includes(
                            tx.eligibilitePEA
                        )
                    ) {
                        tx.eligibilitePEA =
                            "inconnue";

                        modification =
                            true;
                    }

                    if (
                        !tx.eligibilitePEAStatus
                    ) {
                        tx.eligibilitePEAStatus =
                            "non-verifiee";

                        modification =
                            true;
                    }

                    /* -----------------------------------------
                       ANCIENNES MIGRATIONS :
                       DATE NON INVENTÉE
                    ----------------------------------------- */

                    if (
                        tx.sourceTransaction ===
                        "migration-ancienne-position"
                    ) {
                        if (
                            tx.date !==
                                null ||
                            tx.dateStatus !==
                                "date-inconnue"
                        ) {
                            tx.date =
                                null;

                            tx.dateStatus =
                                "date-inconnue";

                            tx.dateSource =
                                "migration-sans-date-fiable";

                            modification =
                                true;
                        }
                    }

                    /* -----------------------------------------
                       DATE ABSENTE
                    ----------------------------------------- */

                    if (
                        !tx.date
                    ) {
                        if (
                            tx.dateStatus !==
                            "date-inconnue"
                        ) {
                            tx.dateStatus =
                                "date-inconnue";

                            modification =
                                true;
                        }

                        if (
                            !tx.dateSource
                        ) {
                            tx.dateSource =
                                "inconnue";

                            modification =
                                true;
                        }
                    }

                    /* -----------------------------------------
                       DATE PRÉSENTE, ANCIEN FORMAT
                    ----------------------------------------- */

                    else if (
                        !tx.dateStatus
                    ) {
                        tx.dateStatus =
                            "a-verifier";

                        tx.dateSource =
                            tx.dateSource ||
                            "ancienne-donnee";

                        modification =
                            true;
                    }

                    return tx;
                }
            );

    if (
        modification
    ) {
        sauvegarderTransactions();
    }
}


/* =========================================================
   FIABILITÉ D'UNE DATE
========================================================= */

function dateTransactionEstFiable(
    transaction
) {
    if (
        !transaction ||
        !transaction.date
    ) {
        return false;
    }

    const date =
        new Date(
            transaction.date
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    return (
        transaction.dateStatus ===
            "confirmee" ||
        transaction.dateStatus ===
            "declaree-utilisateur"
    );
}


/* =========================================================
   TEMPS D'UNE TRANSACTION
========================================================= */

function obtenirTempsTransaction(
    transaction
) {
    if (
        !transaction ||
        !transaction.date
    ) {
        return Number.NEGATIVE_INFINITY;
    }

    const temps =
        new Date(
            transaction.date
        ).getTime();

    if (
        Number.isNaN(
            temps
        )
    ) {
        return Number.NEGATIVE_INFINITY;
    }

    return temps;
}


/* =========================================================
   STATUT RÉEL / TEST
========================================================= */

function transactionEstReelle(
    transaction
) {
    return (
        transaction &&
        transaction.statutTransaction !==
            "test"
    );
}


function transactionEstTest(
    transaction
) {
    return (
        transaction &&
        transaction.statutTransaction ===
            "test"
    );
}


/* =========================================================
   IDENTITÉ D'UN INSTRUMENT

   L'ISIN est prioritaire lorsqu'il est connu.

   À défaut :
   ticker + place de cotation + devise.

   Cette clé évite autant que possible de fusionner
   deux instruments différents partageant un ticker.
========================================================= */

function construireCleInstrument(
    transaction
) {
    const isin =
        normaliserISIN(
            transaction?.isin
        );

    if (
        isin
    ) {
        return `ISIN:${isin}`;
    }

    const ticker =
        normaliserTicker(
            transaction?.ticker
        ) ||
        "TICKER-INCONNU";

    const place =
        normaliserTexte(
            transaction?.placeCotation
        )
            .toUpperCase() ||
        "PLACE-INCONNUE";

    const devise =
        normaliserDevise(
            transaction?.deviseCotation ||
            transaction?.deviseOriginale
        ) ||
        "DEVISE-INCONNUE";

    return (
        `TICKER:${ticker}` +
        `|PLACE:${place}` +
        `|DEVISE:${devise}`
    );
}


/* =========================================================
   CLÉ D'UNE POSITION

   Une position est séparée par :
   - courtier
   - enveloppe
   - instrument

   Une même action détenue en PEA et en CTO produit donc
   deux positions distinctes.
========================================================= */

function construireClePosition(
    transaction
) {
    const courtier =
        normaliserTexte(
            transaction?.courtier
        ) ||
        "courtier-inconnu";

    const enveloppe =
        ENVELOPPES_VALIDES.includes(
            transaction?.enveloppe
        )
            ? transaction.enveloppe
            : "enveloppe-inconnue";

    const instrument =
        construireCleInstrument(
            transaction
        );

    return (
        `${courtier}::` +
        `${enveloppe}::` +
        `${instrument}`
    );
}


/* =========================================================
   FORMATAGE
========================================================= */

function formatEuro(
    valeur
) {
    const nombre =
        Number(
            valeur
        );

    if (
        !Number.isFinite(
            nombre
        )
    ) {
        return "—";
    }

    return new Intl.NumberFormat(
        "fr-FR",
        {
            style:
                "currency",

            currency:
                "EUR",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    ).format(
        nombre
    );
}


function formatMonnaie(
    valeur,
    devise
) {
    const nombre =
        Number(
            valeur
        );

    if (
        !Number.isFinite(
            nombre
        )
    ) {
        return "—";
    }

    const currency =
        normaliserDevise(
            devise
        );

    if (
        !currency
    ) {
        return nombre.toLocaleString(
            "fr-FR",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    4
            }
        );
    }

    try {
        return new Intl.NumberFormat(
            "fr-FR",
            {
                style:
                    "currency",

                currency,

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    4
            }
        ).format(
            nombre
        );

    } catch (error) {
        return (
            nombre.toLocaleString(
                "fr-FR",
                {
                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        4
                }
            ) +
            " " +
            currency
        );
    }
}


function formatQuantite(
    valeur
) {
    const nombre =
        Number(
            valeur
        );

    if (
        !Number.isFinite(
            nombre
        )
    ) {
        return "0";
    }

    return new Intl.NumberFormat(
        "fr-FR",
        {
            minimumFractionDigits:
                0,

            maximumFractionDigits:
                8
        }
    ).format(
        nombre
    );
}


function formatPourcentage(
    valeur
) {
    const nombre =
        Number(
            valeur
        );

    if (
        !Number.isFinite(
            nombre
        )
    ) {
        return "—";
    }

    return (
        new Intl.NumberFormat(
            "fr-FR",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        ).format(
            nombre
        ) +
        " %"
    );
}


function formatTaux(
    valeur
) {
    const nombre =
        Number(
            valeur
        );

    if (
        !Number.isFinite(
            nombre
        )
    ) {
        return "—";
    }

    return new Intl.NumberFormat(
        "fr-FR",
        {
            minimumFractionDigits:
                4,

            maximumFractionDigits:
                8
        }
    ).format(
        nombre
    );
}


function formatDateHeure(
    valeur
) {
    if (
        !valeur
    ) {
        return "Date historique inconnue";
    }

    const date =
        new Date(
            valeur
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Date historique inconnue";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short"
        }
    ).format(
        date
    );
}


/* =========================================================
   PROTECTION HTML
========================================================= */

function echapperHTML(
    texte
) {
    return String(
        texte ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   LIBELLÉS
========================================================= */

function nomCourtier(
    courtier
) {
    switch (
        courtier
    ) {
        case "trade-republic":
            return "Trade Republic";

        case "revolut":
            return "Revolut";

        default:
            return (
                courtier ||
                "Non renseigné"
            );
    }
}


function nomEnveloppe(
    enveloppe
) {
    switch (
        enveloppe
    ) {
        case "pea":
            return "PEA";

        case "cto":
            return "Compte-titres";

        default:
            return "À confirmer";
    }
}


function nomTypeInstrument(
    typeInstrument
) {
    switch (
        typeInstrument
    ) {
        case "action":
            return "Action";

        case "etf":
            return "ETF";

        default:
            return "À confirmer";
    }
}


function libelleEligibilitePEA(
    valeur
) {
    switch (
        valeur
    ) {
        case "eligible":
            return "Éligible PEA";

        case "non-eligible":
            return "Non éligible PEA";

        default:
            return "Éligibilité PEA non confirmée";
    }
}


/* =========================================================
   ID TRANSACTION
========================================================= */

function genererIdTransaction() {
    if (
        typeof crypto !==
            "undefined" &&
        typeof crypto.randomUUID ===
            "function"
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
    if (
        !dateTransactionInput ||
        dateTransactionInput.value
    ) {
        return;
    }

    const maintenant =
        new Date();

    const decalage =
        maintenant.getTimezoneOffset() *
        60000;

    const localISO =
        new Date(
            maintenant.getTime() -
            decalage
        )
            .toISOString()
            .slice(
                0,
                16
            );

    dateTransactionInput.value =
        localISO;
}


/* =========================================================
   COHÉRENCE PEA

   ATTENTION :
   on contrôle seulement les informations saisies.

   Cette fonction ne prétend jamais vérifier juridiquement
   l'éligibilité réelle d'un titre au PEA.
========================================================= */

function verifierCoherenceEnveloppe() {
    if (
        !enveloppeSelect ||
        !eligibilitePEASelect
    ) {
        return;
    }

    const enveloppe =
        enveloppeSelect.value;

    const eligibilite =
        eligibilitePEASelect.value;

    if (
        enveloppe ===
            "pea" &&
        eligibilite ===
            "non-eligible"
    ) {
        eligibilitePEASelect.setCustomValidity(
            "Incohérence : l'instrument est indiqué comme non éligible au PEA alors que l'enveloppe sélectionnée est un PEA."
        );

    } else {
        eligibilitePEASelect.setCustomValidity(
            ""
        );
    }
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

    if (
        courtier ===
        "trade-republic"
    ) {
        if (
            modeExecution ===
            "plan-epargne"
        ) {
            fraisTransactionInput.value =
                "0.00";

            sourceFraisSelect.value =
                "regle-courtier";

            if (
                fraisInfo
            ) {
                fraisInfo.textContent =
                    "Trade Republic — plan d’épargne : 0 € appliqué par défaut dans l’application. Le justificatif réel reste prioritaire.";
            }

            return;
        }

        if (
            modeExecution ===
            "ordre-classique"
        ) {
            fraisTransactionInput.value =
                "1.00";

            sourceFraisSelect.value =
                "regle-courtier";

            if (
                fraisInfo
            ) {
                fraisInfo.textContent =
                    "Trade Republic — ordre classique : 1 € appliqué par défaut dans l’application. Le justificatif réel reste prioritaire.";
            }

            return;
        }
    }

    if (
        courtier ===
        "revolut"
    ) {
        sourceFraisSelect.value =
            "inconnu";

        if (
            fraisInfo
        ) {
            fraisInfo.textContent =
                "Revolut : aucun montant de frais n'est supposé automatiquement. Utiliser le justificatif réel lorsqu'il est disponible.";
        }

        return;
    }

    if (
        fraisInfo
    ) {
        fraisInfo.textContent =
            "Frais à confirmer selon le courtier, le mode d'exécution et le justificatif.";
    }
}


/* =========================================================
   INFORMATION FRACTIONS
========================================================= */

function mettreAJourInformationFraction() {
    if (
        !fractionStatus
    ) {
        return;
    }

    const ticker =
        tickerInput
            ? normaliserTicker(
                tickerInput.value
            )
            : "";

    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "";

    const typeInstrument =
        typeInstrumentSelect
            ? typeInstrumentSelect.value
            : null;

    if (
        !ticker
    ) {
        fractionStatus.textContent =
            "Saisissez un ticker pour identifier l’instrument.";

        return;
    }

    fractionStatus.textContent =
        `${ticker} — ${nomTypeInstrument(
            typeInstrument
        )} — ${nomCourtier(
            courtier
        )} : disponibilité des fractions à vérifier auprès du courtier.`;
}


/* =========================================================
   MODE DE SAISIE
========================================================= */

function mettreAJourModeSaisie() {
    if (
        !modeSaisieSelect
    ) {
        return;
    }

    const mode =
        modeSaisieSelect.value;

    if (
        mode ===
        "montant"
    ) {
        if (
            champMontant
        ) {
            champMontant.style.display =
                "flex";
        }

        if (
            champQuantite
        ) {
            champQuantite.style.display =
                "none";
        }

    } else {
        if (
            champQuantite
        ) {
            champQuantite.style.display =
                "flex";
        }

        if (
            champMontant
        ) {
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
        !Number.isFinite(
            prixExecution
        ) ||
        prixExecution <= 0
    ) {
        if (
            calculPosition
        ) {
            calculPosition.textContent =
                "Renseignez un prix d’exécution valide.";
        }

        return;
    }

    const fraisValides =
        Number.isFinite(
            frais
        ) &&
        frais >= 0
            ? frais
            : 0;

    const type =
        typeTransactionSelect
            ? typeTransactionSelect.value
            : "achat";

    if (
        mode ===
        "montant"
    ) {
        const montantBrut =
            montantInvestiInput
                ? parseFloat(
                    montantInvestiInput.value
                )
                : NaN;

        if (
            !Number.isFinite(
                montantBrut
            ) ||
            montantBrut <= 0
        ) {
            quantiteInput.value =
                "0";

            if (
                calculPosition
            ) {
                calculPosition.textContent =
                    "Renseignez le montant brut.";
            }

            return;
        }

        const quantite =
            montantBrut /
            prixExecution;

        quantiteInput.value =
            quantite.toFixed(
                8
            );

        const fluxNet =
            type ===
                "achat"
                ? montantBrut +
                  fraisValides
                : montantBrut -
                  fraisValides;

        if (
            calculPosition
        ) {
            calculPosition.textContent =
                `${formatQuantite(
                    quantite
                )} unité(s) — ` +
                `montant brut ${formatEuro(
                    montantBrut
                )} — ` +
                `frais ${formatEuro(
                    fraisValides
                )} — ` +
                `${type === "achat"
                    ? "coût total"
                    : "produit net"} ${formatEuro(
                        fluxNet
                    )}`;
        }

        return;
    }

    const quantite =
        parseFloat(
            quantiteInput.value
        );

    if (
        !Number.isFinite(
            quantite
        ) ||
        quantite <= 0
    ) {
        if (
            montantInvestiInput
        ) {
            montantInvestiInput.value =
                "0";
        }

        if (
            calculPosition
        ) {
            calculPosition.textContent =
                "Renseignez la quantité.";
        }

        return;
    }

    const montantBrut =
        prixExecution *
        quantite;

    if (
        montantInvestiInput
    ) {
        montantInvestiInput.value =
            montantBrut.toFixed(
                2
            );
    }

    const fluxNet =
        type ===
            "achat"
            ? montantBrut +
              fraisValides
            : montantBrut -
              fraisValides;

    if (
        calculPosition
    ) {
        calculPosition.textContent =
            `${formatQuantite(
                quantite
            )} unité(s) × ` +
            `${formatEuro(
                prixExecution
            )} = ` +
            `${formatEuro(
                montantBrut
            )} brut — ` +
            `frais ${formatEuro(
                fraisValides
            )} — ` +
            `${type === "achat"
                ? "coût total"
                : "produit net"} ${formatEuro(
                    fluxNet
                )}`;
    }
}


/* =========================================================
   FIN DU BLOC 1/4
   COLLER LE BLOC 2/4 JUSTE EN DESSOUS
========================================================= */
/* =========================================================
   SCRIPT.JS — BLOC 2/4
========================================================= */


/* =========================================================
   RÉCUPÉRATION DES DONNÉES DE MARCHÉ
========================================================= */

async function recupererDonneesMarche(
    ticker,
    options = {}
) {
    const symbole =
        normaliserTicker(
            ticker
        );

    if (
        !symbole
    ) {
        throw new Error(
            "Le ticker est obligatoire."
        );
    }

    const parametres =
        new URLSearchParams();

    parametres.set(
        "symbol",
        symbole
    );

    /*
       Ces informations préparent le backend à identifier
       plus précisément l'instrument.

       Le serveur peut les ignorer tant que l'API actuelle
       ne les exploite pas encore.
    */

    if (
        options.isin
    ) {
        parametres.set(
            "isin",
            normaliserISIN(
                options.isin
            )
        );
    }

    if (
        options.placeCotation
    ) {
        parametres.set(
            "exchange",
            normaliserTexte(
                options.placeCotation
            )
        );
    }

    if (
        options.deviseCotation
    ) {
        parametres.set(
            "currency",
            normaliserDevise(
                options.deviseCotation
            )
        );
    }

    const response =
        await fetch(
            `/api/quote?${parametres.toString()}`,
            {
                method:
                    "GET",

                headers: {
                    Accept:
                        "application/json"
                },

                cache:
                    "no-store"
            }
        );

    let data =
        null;

    try {
        data =
            await response.json();

    } catch (error) {
        throw new Error(
            "La réponse du serveur de marché est invalide."
        );
    }

    if (
        !response.ok
    ) {
        throw new Error(
            data?.error ||
            "Impossible de récupérer les données de marché."
        );
    }

    const coursOriginal =
        Number(
            data.priceOriginal
        );

    const coursEUR =
        Number(
            data.priceEUR
        );

    if (
        !Number.isFinite(
            coursOriginal
        ) ||
        coursOriginal <= 0
    ) {
        throw new Error(
            "Cours d'origine indisponible."
        );
    }

    if (
        !Number.isFinite(
            coursEUR
        ) ||
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
            options.deviseCotation ||
            null,

        coursEUR,

        deviseStatus:
            data.currencyStatus ||
            "impossible_a_confirmer",

        fxRateToEUR:
            Number.isFinite(
                Number(
                    data.fxRateToEUR
                )
            )
                ? Number(
                    data.fxRateToEUR
                )
                : null,

        fxDate:
            data.fxDate ||
            null,

        fxProvider:
            data.fxProvider ||
            null,

        fxStatus:
            data.fxStatus ||
            null,

        brokerRateConfirmed:
            data.brokerRateConfirmed ===
            true,

        brokerRate:
            Number.isFinite(
                Number(
                    data.brokerRate
                )
            )
                ? Number(
                    data.brokerRate
                )
                : null,

        brokerRateMessage:
            data.brokerRateMessage ||
            "Impossible à confirmer.",

        timestamp:
            data.timestamp ||
            null,

        marketProvider:
            data.provider ||
            data.marketProvider ||
            null,

        instrumentName:
            data.instrumentName ||
            null,

        instrumentISIN:
            normaliserISIN(
                data.isin
            ) ||
            null,

        instrumentExchange:
            data.exchange ||
            null
    };
}


/* =========================================================
   CALCUL DES POSITIONS
========================================================= */

function recalculerPositions() {
    const groupes =
        new Map();

    const transactionsReelles =
        transactions.filter(
            transactionEstReelle
        );

    const transactionsTriees =
        transactionsReelles
            .map(
                (
                    transaction,
                    index
                ) => ({
                    transaction,
                    index
                })
            )
            .sort(
                (
                    a,
                    b
                ) => {
                    const tempsA =
                        obtenirTempsTransaction(
                            a.transaction
                        );

                    const tempsB =
                        obtenirTempsTransaction(
                            b.transaction
                        );

                    if (
                        tempsA ===
                        tempsB
                    ) {
                        return (
                            a.index -
                            b.index
                        );
                    }

                    return (
                        tempsA -
                        tempsB
                    );
                }
            )
            .map(
                element =>
                    element.transaction
            );

    for (
        const tx of
        transactionsTriees
    ) {
        const cle =
            construireClePosition(
                tx
            );

        if (
            !groupes.has(
                cle
            )
        ) {
            groupes.set(
                cle,
                {
                    clePosition:
                        cle,

                    entreprise:
                        tx.entreprise,

                    ticker:
                        tx.ticker,

                    isin:
                        tx.isin ||
                        null,

                    placeCotation:
                        tx.placeCotation ||
                        null,

                    deviseCotation:
                        tx.deviseCotation ||
                        tx.deviseOriginale ||
                        null,

                    typeInstrument:
                        tx.typeInstrument ||
                        null,

                    eligibilitePEA:
                        tx.eligibilitePEA ||
                        "inconnue",

                    eligibilitePEAStatus:
                        tx.eligibilitePEAStatus ||
                        "non-verifiee",

                    courtier:
                        tx.courtier,

                    enveloppe:
                        tx.enveloppe ||
                        null,

                    enveloppeStatus:
                        tx.enveloppeStatus ||
                        "a-confirmer",

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

                    nombreDatesNonFiables:
                        0,

                    historiqueDatesComplet:
                        true,

                    coursOriginal:
                        Number(
                            tx.coursOriginal
                        ) || null,

                    deviseOriginale:
                        tx.deviseOriginale ||
                        null,

                    coursEUR:
                        Number(
                            tx.coursEUR
                        ) || null,

                    fxRateToEUR:
                        Number.isFinite(
                            Number(
                                tx.fxRateToEUR
                            )
                        )
                            ? Number(
                                tx.fxRateToEUR
                            )
                            : null,

                    fxDate:
                        tx.fxDate ||
                        null,

                    fxProvider:
                        tx.fxProvider ||
                        null,

                    fxStatus:
                        tx.fxStatus ||
                        null,

                    brokerRateConfirmed:
                        tx.brokerRateConfirmed ===
                        true,

                    brokerRate:
                        Number.isFinite(
                            Number(
                                tx.brokerRate
                            )
                        )
                            ? Number(
                                tx.brokerRate
                            )
                            : null,

                    marketTimestamp:
                        tx.marketTimestamp ||
                        null,

                    marketProvider:
                        tx.marketProvider ||
                        null
                }
            );
        }

        const position =
            groupes.get(
                cle
            );

        position.nombreTransactions +=
            1;

        position.fraisCumules +=
            Number(
                tx.frais
            ) || 0;

        if (
            !dateTransactionEstFiable(
                tx
            )
        ) {
            position.nombreDatesNonFiables +=
                1;

            position.historiqueDatesComplet =
                false;
        }

        /*
           On enrichit les métadonnées lorsqu'une transaction
           plus récente contient une information auparavant
           inconnue.
        */

        if (
            !position.isin &&
            tx.isin
        ) {
            position.isin =
                tx.isin;
        }

        if (
            !position.placeCotation &&
            tx.placeCotation
        ) {
            position.placeCotation =
                tx.placeCotation;
        }

        if (
            !position.typeInstrument &&
            tx.typeInstrument
        ) {
            position.typeInstrument =
                tx.typeInstrument;
        }

        if (
            position.eligibilitePEA ===
                "inconnue" &&
            tx.eligibilitePEA &&
            tx.eligibilitePEA !==
                "inconnue"
        ) {
            position.eligibilitePEA =
                tx.eligibilitePEA;

            position.eligibilitePEAStatus =
                tx.eligibilitePEAStatus ||
                "non-verifiee";
        }

        if (
            Number(
                tx.coursEUR
            ) > 0
        ) {
            position.coursEUR =
                Number(
                    tx.coursEUR
                );

            position.coursOriginal =
                Number(
                    tx.coursOriginal
                );

            position.deviseOriginale =
                tx.deviseOriginale ||
                null;

            position.fxRateToEUR =
                Number.isFinite(
                    Number(
                        tx.fxRateToEUR
                    )
                )
                    ? Number(
                        tx.fxRateToEUR
                    )
                    : null;

            position.fxDate =
                tx.fxDate ||
                null;

            position.fxProvider =
                tx.fxProvider ||
                null;

            position.fxStatus =
                tx.fxStatus ||
                null;

            position.brokerRateConfirmed =
                tx.brokerRateConfirmed ===
                true;

            position.brokerRate =
                Number.isFinite(
                    Number(
                        tx.brokerRate
                    )
                )
                    ? Number(
                        tx.brokerRate
                    )
                    : null;

            position.marketTimestamp =
                tx.marketTimestamp ||
                null;

            position.marketProvider =
                tx.marketProvider ||
                null;
        }

        /* =================================================
           ACHAT
        ================================================= */

        if (
            tx.type ===
            "achat"
        ) {
            const quantiteAchetee =
                Number(
                    tx.quantite
                );

            const coutTotal =
                Number(
                    tx.coutTotal
                );

            if (
                !Number.isFinite(
                    quantiteAchetee
                ) ||
                quantiteAchetee <= 0
            ) {
                continue;
            }

            if (
                !Number.isFinite(
                    coutTotal
                ) ||
                coutTotal <= 0
            ) {
                continue;
            }

            position.quantite +=
                quantiteAchetee;

            position.coutAcquisitionNet +=
                coutTotal;
        }

        /* =================================================
           VENTE
        ================================================= */

        if (
            tx.type ===
            "vente"
        ) {
            const quantiteAvant =
                position.quantite;

            if (
                quantiteAvant <= 0
            ) {
                continue;
            }

            const quantiteTransaction =
                Number(
                    tx.quantite
                );

            if (
                !Number.isFinite(
                    quantiteTransaction
                ) ||
                quantiteTransaction <= 0
            ) {
                continue;
            }

            const quantiteVendue =
                Math.min(
                    quantiteTransaction,
                    quantiteAvant
                );

            const pruAvantVente =
                position.coutAcquisitionNet /
                quantiteAvant;

            const coutSorti =
                pruAvantVente *
                quantiteVendue;

            const produitNet =
                Number(
                    tx.produitNet
                );

            if (
                !Number.isFinite(
                    produitNet
                )
            ) {
                continue;
            }

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
                Math.abs(
                    position.quantite
                ) <
                1e-10
            ) {
                position.quantite =
                    0;

                position.coutAcquisitionNet =
                    0;
            }
        }
    }

    positions =
        Array.from(
            groupes.values()
        )
            .filter(
                position =>
                    position.quantite >
                    0
            )
            .map(
                position => {
                    const pru =
                        position.quantite >
                        0
                            ? position
                                .coutAcquisitionNet /
                              position
                                .quantite
                            : 0;

                    const coursEUR =
                        Number(
                            position.coursEUR
                        );

                    const valeurActuelle =
                        Number.isFinite(
                            coursEUR
                        ) &&
                        coursEUR > 0
                            ? position.quantite *
                              coursEUR
                            : null;

                    const gainNonRealise =
                        valeurActuelle !==
                        null
                            ? valeurActuelle -
                              position
                                .coutAcquisitionNet
                            : null;

                    const rendement =
                        gainNonRealise !==
                            null &&
                        position
                            .coutAcquisitionNet >
                            0
                            ? (
                                gainNonRealise /
                                position
                                    .coutAcquisitionNet
                            ) *
                              100
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
   LECTURE DU FORMULAIRE
========================================================= */

function lireFormulaireTransaction() {
    const statutTransaction =
        statutTransactionSelect
            ? statutTransactionSelect.value
            : "reelle";

    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "trade-republic";

    const enveloppe =
        enveloppeSelect
            ? enveloppeSelect.value
            : null;

    const typeInstrument =
        typeInstrumentSelect
            ? typeInstrumentSelect.value
            : null;

    const type =
        typeTransactionSelect
            ? typeTransactionSelect.value
            : "achat";

    const modeExecution =
        modeExecutionSelect
            ? modeExecutionSelect.value
            : "ordre-classique";

    const entreprise =
        nomActionInput
            ? normaliserTexte(
                nomActionInput.value
            )
            : "";

    const ticker =
        tickerInput
            ? normaliserTicker(
                tickerInput.value
            )
            : "";

    const isin =
        isinInput
            ? normaliserISIN(
                isinInput.value
            )
            : "";

    const placeCotation =
        placeCotationInput
            ? normaliserTexte(
                placeCotationInput.value
            )
            : "";

    const deviseCotation =
        deviseCotationSelect
            ? normaliserDevise(
                deviseCotationSelect.value
            )
            : null;

    const eligibilitePEA =
        eligibilitePEASelect
            ? eligibilitePEASelect.value
            : "inconnue";

    let date =
        null;

    let dateStatus =
        "date-inconnue";

    let dateSource =
        "inconnue";

    if (
        dateTransactionInput &&
        dateTransactionInput.value
    ) {
        const dateSaisie =
            new Date(
                dateTransactionInput.value
            );

        if (
            !Number.isNaN(
                dateSaisie.getTime()
            )
        ) {
            date =
                dateSaisie.toISOString();

            dateStatus =
                "declaree-utilisateur";

            dateSource =
                "saisie-utilisateur";
        }
    }

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

    let quantite =
        NaN;

    let montantBrut =
        NaN;

    if (
        mode ===
        "montant"
    ) {
        montantBrut =
            montantInvestiInput
                ? parseFloat(
                    montantInvestiInput.value
                )
                : NaN;

        if (
            Number.isFinite(
                prixExecution
            ) &&
            prixExecution > 0 &&
            Number.isFinite(
                montantBrut
            ) &&
            montantBrut > 0
        ) {
            quantite =
                montantBrut /
                prixExecution;
        }

    } else {
        quantite =
            quantiteInput
                ? parseFloat(
                    quantiteInput.value
                )
                : NaN;

        if (
            Number.isFinite(
                prixExecution
            ) &&
            prixExecution > 0 &&
            Number.isFinite(
                quantite
            ) &&
            quantite > 0
        ) {
            montantBrut =
                prixExecution *
                quantite;
        }
    }

    return {
        statutTransaction,
        courtier,
        enveloppe,
        typeInstrument,
        type,
        modeExecution,
        entreprise,
        ticker,
        isin:
            isin ||
            null,
        placeCotation:
            placeCotation ||
            null,
        deviseCotation,
        eligibilitePEA,
        date,
        dateStatus,
        dateSource,
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

function validerTransaction(
    donnees
) {
    if (
        !STATUTS_TRANSACTION_VALIDES.includes(
            donnees.statutTransaction
        )
    ) {
        throw new Error(
            "Le statut de la transaction est invalide."
        );
    }

    if (
        !ENVELOPPES_VALIDES.includes(
            donnees.enveloppe
        )
    ) {
        throw new Error(
            "Sélectionnez l'enveloppe : PEA ou compte-titres."
        );
    }

    if (
        !TYPES_INSTRUMENT_VALIDES.includes(
            donnees.typeInstrument
        )
    ) {
        throw new Error(
            "Sélectionnez le type d'instrument : action ou ETF."
        );
    }

    if (
        !donnees.entreprise
    ) {
        throw new Error(
            "Indiquez le nom de l'entreprise ou de l'ETF."
        );
    }

    if (
        !donnees.ticker
    ) {
        throw new Error(
            "Indiquez le ticker."
        );
    }

    if (
        donnees.isin &&
        !formatISINValide(
            donnees.isin
        )
    ) {
        throw new Error(
            "Le format de l'ISIN semble invalide. Vérifiez les 12 caractères avant l'enregistrement."
        );
    }

    if (
        donnees.enveloppe ===
            "pea" &&
        donnees.eligibilitePEA ===
            "non-eligible"
    ) {
        throw new Error(
            "Incohérence : cet instrument est indiqué comme non éligible au PEA."
        );
    }

    if (
        !Number.isFinite(
            donnees.prixExecution
        ) ||
        donnees.prixExecution <= 0
    ) {
        throw new Error(
            "Le prix d'exécution doit être supérieur à 0."
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

    /* =====================================================
       CONTRÔLE VENTE RÉELLE
    ===================================================== */

    if (
        donnees.type ===
            "vente" &&
        donnees.statutTransaction ===
            "reelle"
    ) {
        recalculerPositions();

        const cleRecherche =
            construireClePosition(
                donnees
            );

        const position =
            positions.find(
                element =>
                    element.clePosition ===
                    cleRecherche
            );

        const quantiteDisponible =
            position
                ? Number(
                    position.quantite
                )
                : 0;

        if (
            indexTransactionEnModification ===
                null &&
            donnees.quantite >
                quantiteDisponible +
                    1e-8
        ) {
            throw new Error(
                `Vente impossible : seulement ${formatQuantite(
                    quantiteDisponible
                )} unité(s) disponible(s) dans ${nomEnveloppe(
                    donnees.enveloppe
                )} chez ${nomCourtier(
                    donnees.courtier
                )}.`
            );
        }
    }

    return true;
}


/* =========================================================
   ENREGISTREMENT
========================================================= */

async function enregistrerTransaction() {
    if (
        !ajouterPositionButton
    ) {
        return;
    }

    const donnees =
        lireFormulaireTransaction();

    try {
        validerTransaction(
            donnees
        );

    } catch (error) {
        alert(
            error.message
        );

        return;
    }

    ajouterPositionButton.disabled =
        true;

    ajouterPositionButton.textContent =
        "Récupération des données de marché...";

    try {
        const marche =
            await recupererDonneesMarche(
                donnees.ticker,
                {
                    isin:
                        donnees.isin,

                    placeCotation:
                        donnees.placeCotation,

                    deviseCotation:
                        donnees.deviseCotation
                }
            );

        const frais =
            Number(
                donnees.frais
            );

        const coutTotal =
            donnees.type ===
                "achat"
                ? donnees.montantBrut +
                  frais
                : null;

        const produitNet =
            donnees.type ===
                "vente"
                ? donnees.montantBrut -
                  frais
                : null;

        const transactionExistante =
            indexTransactionEnModification !==
                null
                ? transactions[
                    indexTransactionEnModification
                ]
                : null;

        const transaction = {
            id:
                transactionExistante?.id ||
                genererIdTransaction(),

            statutTransaction:
                donnees.statutTransaction,

            type:
                donnees.type,

            courtier:
                donnees.courtier,

            enveloppe:
                donnees.enveloppe,

            enveloppeStatus:
                "declaree-utilisateur",

            typeInstrument:
                donnees.typeInstrument,

            typeInstrumentStatus:
                "declare-utilisateur",

            modeExecution:
                donnees.modeExecution,

            date:
                donnees.date,

            dateStatus:
                donnees.dateStatus,

            dateSource:
                donnees.dateSource,

            entreprise:
                donnees.entreprise,

            ticker:
                donnees.ticker,

            isin:
                donnees.isin,

            isinStatus:
                donnees.isin
                    ? "declare-utilisateur"
                    : "inconnu",

            placeCotation:
                donnees.placeCotation,

            placeCotationStatus:
                donnees.placeCotation
                    ? "declaree-utilisateur"
                    : "inconnue",

            deviseCotation:
                donnees.deviseCotation,

            eligibilitePEA:
                donnees.eligibilitePEA,

            eligibilitePEAStatus:
                "declaree-utilisateur",

            prixExecution:
                donnees.prixExecution,

            quantite:
                Number(
                    donnees.quantite
                        .toFixed(8)
                ),

            montantBrut:
                Number(
                    donnees.montantBrut
                        .toFixed(8)
                ),

            frais,

            sourceFrais:
                donnees.sourceFrais,

            coutTotal,

            produitNet,

            sourceTransaction:
                transactionExistante
                    ? (
                        transactionExistante
                            .sourceTransaction ||
                        "saisie-manuelle"
                    )
                    : "saisie-manuelle",

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
                marche.timestamp,

            marketProvider:
                marche.marketProvider
        };

        if (
            indexTransactionEnModification !==
            null
        ) {
            transactions[
                indexTransactionEnModification
            ] =
                transaction;

            indexTransactionEnModification =
                null;

        } else {
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
            indexTransactionEnModification !==
                null
                ? "Enregistrer les modifications"
                : "Enregistrer la transaction";
    }
}


/* =========================================================
   FIN DU BLOC 2/4
   COLLER LE BLOC 3/4 JUSTE EN DESSOUS
========================================================= */
/* =========================================================
   SCRIPT.JS — BLOC 3/4
========================================================= */


/* =========================================================
   MOTEUR XIRR
========================================================= */

function differenceJours(
    dateDepart,
    dateArrivee
) {
    const millisecondesParJour =
        24 *
        60 *
        60 *
        1000;

    return (
        dateArrivee.getTime() -
        dateDepart.getTime()
    ) /
        millisecondesParJour;
}


function valeurActualiseeXIRR(
    flux,
    taux
) {
    if (
        !Array.isArray(
            flux
        ) ||
        flux.length < 2
    ) {
        return NaN;
    }

    if (
        !Number.isFinite(
            taux
        ) ||
        taux <= -1
    ) {
        return NaN;
    }

    const dateReference =
        flux[0].date;

    let resultat =
        0;

    for (
        const element of flux
    ) {
        const jours =
            differenceJours(
                dateReference,
                element.date
            );

        const exposant =
            jours /
            365;

        const denominateur =
            Math.pow(
                1 + taux,
                exposant
            );

        if (
            !Number.isFinite(
                denominateur
            ) ||
            denominateur === 0
        ) {
            return NaN;
        }

        resultat +=
            element.montant /
            denominateur;
    }

    return resultat;
}


function trouverRacinesXIRR(
    flux
) {
    const racines =
        [];

    const yMinimum =
        Math.log(
            0.000001
        );

    const yMaximum =
        Math.log(
            1001
        );

    const nombreEtapes =
        2000;

    let yPrecedent =
        yMinimum;

    let tauxPrecedent =
        Math.exp(
            yPrecedent
        ) -
        1;

    let valeurPrecedente =
        valeurActualiseeXIRR(
            flux,
            tauxPrecedent
        );

    for (
        let index = 1;
        index <= nombreEtapes;
        index++
    ) {
        const progression =
            index /
            nombreEtapes;

        const yActuel =
            yMinimum +
            (
                yMaximum -
                yMinimum
            ) *
            progression;

        const tauxActuel =
            Math.exp(
                yActuel
            ) -
            1;

        const valeurActuelle =
            valeurActualiseeXIRR(
                flux,
                tauxActuel
            );

        if (
            Number.isFinite(
                valeurPrecedente
            ) &&
            Number.isFinite(
                valeurActuelle
            )
        ) {
            if (
                Math.abs(
                    valeurActuelle
                ) <
                1e-10
            ) {
                const doublon =
                    racines.some(
                        racine =>
                            Math.abs(
                                racine -
                                tauxActuel
                            ) <
                            1e-7
                    );

                if (
                    !doublon
                ) {
                    racines.push(
                        tauxActuel
                    );
                }

            } else if (
                valeurPrecedente *
                    valeurActuelle <
                0
            ) {
                let borneBasse =
                    yPrecedent;

                let borneHaute =
                    yActuel;

                let valeurBasse =
                    valeurPrecedente;

                for (
                    let iteration = 0;
                    iteration < 120;
                    iteration++
                ) {
                    const milieu =
                        (
                            borneBasse +
                            borneHaute
                        ) /
                        2;

                    const tauxMilieu =
                        Math.exp(
                            milieu
                        ) -
                        1;

                    const valeurMilieu =
                        valeurActualiseeXIRR(
                            flux,
                            tauxMilieu
                        );

                    if (
                        !Number.isFinite(
                            valeurMilieu
                        )
                    ) {
                        break;
                    }

                    if (
                        Math.abs(
                            valeurMilieu
                        ) <
                        1e-10
                    ) {
                        borneBasse =
                            milieu;

                        borneHaute =
                            milieu;

                        break;
                    }

                    if (
                        valeurBasse *
                            valeurMilieu <=
                        0
                    ) {
                        borneHaute =
                            milieu;

                    } else {
                        borneBasse =
                            milieu;

                        valeurBasse =
                            valeurMilieu;
                    }
                }

                const yRacine =
                    (
                        borneBasse +
                        borneHaute
                    ) /
                    2;

                const tauxRacine =
                    Math.exp(
                        yRacine
                    ) -
                    1;

                if (
                    Number.isFinite(
                        tauxRacine
                    )
                ) {
                    const doublon =
                        racines.some(
                            racine =>
                                Math.abs(
                                    racine -
                                    tauxRacine
                                ) <
                                1e-7
                        );

                    if (
                        !doublon
                    ) {
                        racines.push(
                            tauxRacine
                        );
                    }
                }
            }
        }

        yPrecedent =
            yActuel;

        valeurPrecedente =
            valeurActuelle;
    }

    return racines;
}


/* =========================================================
   CONSTRUCTION DES FLUX XIRR
========================================================= */

function construireFluxXIRR() {
    const transactionsReelles =
        transactions.filter(
            transactionEstReelle
        );

    if (
        transactionsReelles.length ===
        0
    ) {
        return {
            statut:
                "indisponible",

            raison:
                "Aucune transaction réelle.",

            flux:
                []
        };
    }

    const datesNonFiables =
        transactionsReelles.filter(
            transaction =>
                !dateTransactionEstFiable(
                    transaction
                )
        );

    if (
        datesNonFiables.length >
        0
    ) {
        return {
            statut:
                "indisponible",

            raison:
                `${datesNonFiables.length} date(s) de transaction réelle restent à fiabiliser.`,

            flux:
                []
        };
    }

    const flux =
        [];

    for (
        const transaction of
        transactionsReelles
    ) {
        const date =
            new Date(
                transaction.date
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return {
                statut:
                    "indisponible",

                raison:
                    "Une date de transaction réelle est invalide.",

                flux:
                    []
            };
        }

        if (
            transaction.type ===
            "achat"
        ) {
            const cout =
                Number(
                    transaction.coutTotal
                );

            if (
                !Number.isFinite(
                    cout
                ) ||
                cout <= 0
            ) {
                return {
                    statut:
                        "indisponible",

                    raison:
                        "Le coût total d'un achat réel est invalide.",

                    flux:
                        []
                };
            }

            flux.push({
                date,

                montant:
                    -cout,

                type:
                    "achat",

                transactionId:
                    transaction.id
            });
        }

        else if (
            transaction.type ===
            "vente"
        ) {
            const produit =
                Number(
                    transaction.produitNet
                );

            if (
                !Number.isFinite(
                    produit
                ) ||
                produit < 0
            ) {
                return {
                    statut:
                        "indisponible",

                    raison:
                        "Le produit net d'une vente réelle est invalide.",

                    flux:
                        []
                };
            }

            flux.push({
                date,

                montant:
                    produit,

                type:
                    "vente",

                transactionId:
                    transaction.id
            });
        }
    }

    recalculerPositions();

    let valeurFinale =
        0;

    for (
        const position of
        positions
    ) {
        if (
            position.valeurActuelle ===
            null
        ) {
            return {
                statut:
                    "indisponible",

                raison:
                    "La valorisation actuelle du portefeuille est incomplète.",

                flux:
                    []
            };
        }

        const valeur =
            Number(
                position.valeurActuelle
            );

        if (
            !Number.isFinite(
                valeur
            ) ||
            valeur < 0
        ) {
            return {
                statut:
                    "indisponible",

                raison:
                    "Une valorisation actuelle est invalide.",

                flux:
                    []
            };
        }

        valeurFinale +=
            valeur;
    }

    if (
        valeurFinale >
        0
    ) {
        flux.push({
            date:
                new Date(),

            montant:
                valeurFinale,

            type:
                "valorisation-finale",

            transactionId:
                null
        });
    }

    flux.sort(
        (
            a,
            b
        ) =>
            a.date.getTime() -
            b.date.getTime()
    );

    const possedeFluxNegatif =
        flux.some(
            element =>
                element.montant < 0
        );

    const possedeFluxPositif =
        flux.some(
            element =>
                element.montant > 0
        );

    if (
        !possedeFluxNegatif ||
        !possedeFluxPositif
    ) {
        return {
            statut:
                "indisponible",

            raison:
                "Les flux réels ne permettent pas encore de calculer un XIRR.",

            flux
        };
    }

    return {
        statut:
            "pret",

        raison:
            null,

        flux,

        valeurFinale
    };
}


function calculerXIRRPortefeuille() {
    const preparation =
        construireFluxXIRR();

    if (
        preparation.statut !==
        "pret"
    ) {
        return {
            statut:
                "indisponible",

            taux:
                null,

            raison:
                preparation.raison,

            nombreFlux:
                preparation.flux.length
        };
    }

    const racines =
        trouverRacinesXIRR(
            preparation.flux
        );

    if (
        racines.length ===
        0
    ) {
        return {
            statut:
                "indisponible",

            taux:
                null,

            raison:
                "Aucune solution XIRR n'a été trouvée dans la plage de calcul contrôlée.",

            nombreFlux:
                preparation.flux.length
        };
    }

    if (
        racines.length >
        1
    ) {
        return {
            statut:
                "ambigu",

            taux:
                null,

            raison:
                `${racines.length} solutions XIRR possibles ont été détectées. Aucun taux unique n'est affiché.`,

            nombreFlux:
                preparation.flux.length
        };
    }

    const taux =
        racines[0];

    if (
        !Number.isFinite(
            taux
        )
    ) {
        return {
            statut:
                "indisponible",

            taux:
                null,

            raison:
                "Le résultat XIRR obtenu n'est pas exploitable.",

            nombreFlux:
                preparation.flux.length
        };
    }

    return {
        statut:
            "calcule",

        taux,

        raison:
            null,

        nombreFlux:
            preparation.flux.length,

        valeurFinale:
            preparation.valeurFinale,

        dateCalcul:
            new Date().toISOString()
    };
}


/* =========================================================
   LIBELLÉS QUALITÉ
========================================================= */

function libelleStatutDate(
    transaction
) {
    if (
        !transaction ||
        !transaction.date
    ) {
        return "Date historique inconnue";
    }

    switch (
        transaction.dateStatus
    ) {
        case "confirmee":
            return "Date confirmée";

        case "declaree-utilisateur":
            return "Date déclarée par l'utilisateur";

        case "a-verifier":
            return "Date à vérifier";

        case "date-inconnue":
            return "Date historique inconnue";

        default:
            return "Date à vérifier";
    }
}


/* =========================================================
   AFFICHAGE DES POSITIONS
========================================================= */

function afficherPositions() {
    if (
        !listePositions
    ) {
        return;
    }

    listePositions.innerHTML =
        "";

    recalculerPositions();

    let totalCapitalRestant =
        0;

    let totalValeurActuelle =
        0;

    let totalGainNonRealise =
        0;

    let totalGainsRealises =
        0;

    let valorisationComplete =
        true;

    if (
        positions.length ===
        0
    ) {
        listePositions.innerHTML = `
            <div class="portfolio-empty">
                <p>
                    Aucune position réelle ouverte.
                </p>

                <p>
                    Les transactions de test sont conservées
                    dans l'historique mais exclues du portefeuille réel.
                </p>
            </div>
        `;
    }

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
                position.valeurActuelle ===
                    null
                    ? null
                    : Number(
                        position.valeurActuelle
                    );

            const gainNonRealise =
                position.gainNonRealise ===
                    null
                    ? null
                    : Number(
                        position.gainNonRealise
                    );

            if (
                valeurActuelle !==
                    null &&
                gainNonRealise !==
                    null &&
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
                gainNonRealise !==
                    null &&
                gainNonRealise >
                    0
                    ? "positif"
                    : gainNonRealise !==
                        null &&
                      gainNonRealise <
                        0
                        ? "negatif"
                        : "neutre";

            const classeGainRealise =
                gainsRealises >
                    0
                    ? "positif"
                    : gainsRealises <
                        0
                        ? "negatif"
                        : "neutre";

            const nombreDatesNonFiables =
                Number(
                    position.nombreDatesNonFiables
                ) || 0;

            const texteQualiteDates =
                nombreDatesNonFiables ===
                    0
                    ? "Toutes les dates sont exploitables"
                    : `${nombreDatesNonFiables} date(s) inconnue(s) ou à vérifier`;

            const carte =
                document.createElement(
                    "div"
                );

            carte.className =
                "position-card";

            /*
               data-position-key prépare l'ouverture future
               de la fiche instrument et du graphique.
            */

            carte.dataset.positionKey =
                position.clePosition;

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

                    <div class="position-badges">
                        <span class="courtier-badge">
                            ${echapperHTML(
                                nomCourtier(
                                    position.courtier
                                )
                            )}
                        </span>

                        <span class="courtier-badge">
                            ${echapperHTML(
                                nomEnveloppe(
                                    position.enveloppe
                                )
                            )}
                        </span>

                        <span class="courtier-badge">
                            ${echapperHTML(
                                nomTypeInstrument(
                                    position.typeInstrument
                                )
                            )}
                        </span>
                    </div>

                </div>

                <div class="position-details">

                    <p>
                        <strong>Enveloppe :</strong>
                        ${echapperHTML(
                            nomEnveloppe(
                                position.enveloppe
                            )
                        )}
                    </p>

                    <p>
                        <strong>Instrument :</strong>
                        ${echapperHTML(
                            nomTypeInstrument(
                                position.typeInstrument
                            )
                        )}
                    </p>

                    <p>
                        <strong>ISIN :</strong>
                        ${echapperHTML(
                            position.isin ||
                            "Non renseigné"
                        )}
                    </p>

                    <p>
                        <strong>Place de cotation :</strong>
                        ${echapperHTML(
                            position.placeCotation ||
                            "Non renseignée"
                        )}
                    </p>

                    <p>
                        <strong>Devise de cotation :</strong>
                        ${echapperHTML(
                            position.deviseCotation ||
                            position.deviseOriginale ||
                            "Non confirmée"
                        )}
                    </p>

                    <p>
                        <strong>PEA :</strong>
                        ${echapperHTML(
                            libelleEligibilitePEA(
                                position.eligibilitePEA
                            )
                        )}
                    </p>

                    <p>
                        <strong>Quantité détenue :</strong>
                        ${formatQuantite(
                            position.quantite
                        )}
                    </p>

                    <p>
                        <strong>PRU net de frais :</strong>
                        ${formatEuro(
                            position.pru
                        )}
                    </p>

                    <p>
                        <strong>Capital restant investi :</strong>
                        ${formatEuro(
                            position.coutAcquisitionNet
                        )}
                    </p>

                    <p>
                        <strong>Frais cumulés :</strong>
                        ${formatEuro(
                            position.fraisCumules
                        )}
                    </p>

                    <p>
                        <strong>Transactions réelles :</strong>
                        ${position.nombreTransactions}
                    </p>

                    <p>
                        <strong>Qualité des dates :</strong>
                        ${echapperHTML(
                            texteQualiteDates
                        )}
                    </p>

                    <p>
                        <strong>Cours d'origine :</strong>
                        ${formatMonnaie(
                            position.coursOriginal,
                            position.deviseOriginale
                        )}
                    </p>

                    <p>
                        <strong>Cours de référence EUR :</strong>
                        ${formatEuro(
                            position.coursEUR
                        )}
                    </p>

                    <p>
                        <strong>Taux FX :</strong>
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
                        <strong>Source FX :</strong>
                        ${echapperHTML(
                            position.fxProvider ||
                            "—"
                        )}
                    </p>

                    <p>
                        <strong>Taux courtier exact :</strong>
                        ${
                            position.brokerRateConfirmed
                                ? formatTaux(
                                    position.brokerRate
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p>
                        <strong>Valeur actuelle :</strong>
                        ${
                            valeurActuelle !==
                            null
                                ? formatEuro(
                                    valeurActuelle
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p class="${classeGain}">
                        <strong>Gain / Perte non réalisé :</strong>
                        ${
                            gainNonRealise !==
                            null
                                ? formatEuro(
                                    gainNonRealise
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p class="${classeGain}">
                        <strong>Rendement non réalisé :</strong>
                        ${
                            position.rendement !==
                            null
                                ? formatPourcentage(
                                    position.rendement
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p class="${classeGainRealise}">
                        <strong>Gains réalisés cumulés :</strong>
                        ${formatEuro(
                            gainsRealises
                        )}
                    </p>

                </div>

                <div class="position-actions">

                    <button
                        type="button"
                        class="ouvrir-fiche-instrument"
                        data-position-key="${echapperHTML(
                            position.clePosition
                        )}"
                    >
                        Voir l'instrument
                    </button>

                </div>
            `;

            listePositions.appendChild(
                carte
            );
        }
    );

    const performanceTotale =
        valorisationComplete
            ? totalGainNonRealise +
              totalGainsRealises
            : null;

    if (
        totalInvestiElement
    ) {
        totalInvestiElement.textContent =
            formatEuro(
                totalCapitalRestant
            );
    }

    if (
        totalValeurElement
    ) {
        totalValeurElement.textContent =
            valorisationComplete
                ? formatEuro(
                    totalValeurActuelle
                )
                : "Partiellement indisponible";
    }

    if (
        totalGainElement
    ) {
        const classeLatente =
            totalGainNonRealise >
                0
                ? "positif"
                : totalGainNonRealise <
                    0
                    ? "negatif"
                    : "neutre";

        const classeRealisee =
            totalGainsRealises >
                0
                ? "positif"
                : totalGainsRealises <
                    0
                    ? "negatif"
                    : "neutre";

        const classeTotale =
            performanceTotale !==
                null &&
            performanceTotale >
                0
                ? "positif"
                : performanceTotale !==
                    null &&
                  performanceTotale <
                    0
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
                            performanceTotale !==
                            null
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

    if (
        totalRendementElement
    ) {
        const resultatXIRR =
            calculerXIRRPortefeuille();

        if (
            resultatXIRR.statut ===
            "calcule"
        ) {
            const pourcentageXIRR =
                resultatXIRR.taux *
                100;

            const classeXIRR =
                pourcentageXIRR >
                    0
                    ? "positif"
                    : pourcentageXIRR <
                        0
                        ? "negatif"
                        : "neutre";

            totalRendementElement.innerHTML = `
                <div class="${classeXIRR}">
                    <strong>
                        ${formatPourcentage(
                            pourcentageXIRR
                        )}
                    </strong>
                </div>

                <small>
                    XIRR annualisé —
                    ${resultatXIRR.nombreFlux}
                    flux réels pris en compte.
                    Les transactions TEST sont exclues.
                </small>
            `;

        } else {
            totalRendementElement.innerHTML = `
                <div class="neutre">
                    <strong>
                        XIRR indisponible
                    </strong>
                </div>

                <small>
                    ${echapperHTML(
                        resultatXIRR.raison ||
                        "Calcul indisponible."
                    )}
                </small>
            `;
        }
    }
}


/* =========================================================
   FIN DU BLOC 3/4
   COLLER LE BLOC 4/4 JUSTE EN DESSOUS
========================================================= */
/* =========================================================
   SCRIPT.JS — BLOC 4/4
========================================================= */


/* =========================================================
   AFFICHAGE HISTORIQUE DES TRANSACTIONS
========================================================= */

function afficherTransactions() {
    if (
        !listeTransactions
    ) {
        return;
    }

    listeTransactions.innerHTML =
        "";

    if (
        transactions.length ===
        0
    ) {
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
                (
                    transaction,
                    index
                ) => ({
                    transaction,
                    index
                })
            )
            .sort(
                (
                    a,
                    b
                ) => {
                    const tempsA =
                        obtenirTempsTransaction(
                            a.transaction
                        );

                    const tempsB =
                        obtenirTempsTransaction(
                            b.transaction
                        );

                    if (
                        tempsA ===
                        tempsB
                    ) {
                        return (
                            b.index -
                            a.index
                        );
                    }

                    return (
                        tempsB -
                        tempsA
                    );
                }
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
                transactionEstTest(
                    transaction
                )
                    ? "position-card transaction-card transaction-test"
                    : "position-card transaction-card";

            const typeLabel =
                transaction.type ===
                    "achat"
                    ? "Achat"
                    : "Vente";

            const montantNet =
                transaction.type ===
                    "achat"
                    ? transaction.coutTotal
                    : transaction.produitNet;

            const dateAffichee =
                formatDateHeure(
                    transaction.date
                );

            const statutDate =
                libelleStatutDate(
                    transaction
                );

            const classeDate =
                dateTransactionEstFiable(
                    transaction
                )
                    ? "positif"
                    : "neutre";

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

                    <div class="position-badges">

                        <span class="courtier-badge">
                            ${echapperHTML(
                                nomCourtier(
                                    transaction.courtier
                                )
                            )}
                        </span>

                        <span class="courtier-badge">
                            ${echapperHTML(
                                nomEnveloppe(
                                    transaction.enveloppe
                                )
                            )}
                        </span>

                        <span class="courtier-badge">
                            ${
                                transactionEstTest(
                                    transaction
                                )
                                    ? "TEST"
                                    : "RÉELLE"
                            }
                        </span>

                    </div>

                </div>

                <div class="position-details">

                    <p>
                        <strong>Statut :</strong>
                        ${
                            transactionEstTest(
                                transaction
                            )
                                ? `<span class="neutre"><strong>TEST</strong></span>`
                                : `<span class="positif"><strong>RÉELLE</strong></span>`
                        }
                    </p>

                    <p>
                        <strong>Enveloppe :</strong>
                        ${echapperHTML(
                            nomEnveloppe(
                                transaction.enveloppe
                            )
                        )}
                    </p>

                    <p>
                        <strong>Instrument :</strong>
                        ${echapperHTML(
                            nomTypeInstrument(
                                transaction.typeInstrument
                            )
                        )}
                    </p>

                    <p>
                        <strong>ISIN :</strong>
                        ${echapperHTML(
                            transaction.isin ||
                            "Non renseigné"
                        )}
                    </p>

                    <p>
                        <strong>Place de cotation :</strong>
                        ${echapperHTML(
                            transaction.placeCotation ||
                            "Non renseignée"
                        )}
                    </p>

                    <p>
                        <strong>Devise de cotation :</strong>
                        ${echapperHTML(
                            transaction.deviseCotation ||
                            transaction.deviseOriginale ||
                            "Non confirmée"
                        )}
                    </p>

                    <p>
                        <strong>Éligibilité PEA :</strong>
                        ${echapperHTML(
                            libelleEligibilitePEA(
                                transaction.eligibilitePEA
                            )
                        )}
                    </p>

                    <p>
                        <strong>Date :</strong>
                        ${echapperHTML(
                            dateAffichee
                        )}
                    </p>

                    <p class="${classeDate}">
                        <strong>
                            Fiabilité de la date :
                        </strong>

                        ${echapperHTML(
                            statutDate
                        )}
                    </p>

                    <p>
                        <strong>Type :</strong>
                        ${typeLabel}
                    </p>

                    <p>
                        <strong>Mode :</strong>
                        ${echapperHTML(
                            transaction.modeExecution ||
                            "—"
                        )}
                    </p>

                    <p>
                        <strong>Quantité :</strong>
                        ${formatQuantite(
                            transaction.quantite
                        )}
                    </p>

                    <p>
                        <strong>Prix d'exécution :</strong>
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
                                transaction.type ===
                                    "achat"
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

                    ${
                        transactionEstTest(
                            transaction
                        )
                            ? `
                                <p class="neutre">
                                    <strong>
                                        Impact portefeuille :
                                    </strong>

                                    Aucun — transaction de test
                                    exclue des calculs réels.
                                </p>
                            `
                            : ""
                    }

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

function modifierTransaction(
    index
) {
    const tx =
        transactions[
            index
        ];

    if (
        !tx
    ) {
        return;
    }

    indexTransactionEnModification =
        index;

    if (
        statutTransactionSelect
    ) {
        statutTransactionSelect.value =
            transactionEstTest(
                tx
            )
                ? "test"
                : "reelle";
    }

    if (
        courtierSelect
    ) {
        courtierSelect.value =
            tx.courtier ||
            "trade-republic";
    }

    if (
        enveloppeSelect
    ) {
        enveloppeSelect.value =
            ENVELOPPES_VALIDES.includes(
                tx.enveloppe
            )
                ? tx.enveloppe
                : "cto";
    }

    if (
        typeInstrumentSelect
    ) {
        typeInstrumentSelect.value =
            TYPES_INSTRUMENT_VALIDES.includes(
                tx.typeInstrument
            )
                ? tx.typeInstrument
                : "action";
    }

    if (
        typeTransactionSelect
    ) {
        typeTransactionSelect.value =
            tx.type ||
            "achat";
    }

    if (
        modeExecutionSelect
    ) {
        modeExecutionSelect.value =
            tx.modeExecution ||
            "autre";
    }

    if (
        nomActionInput
    ) {
        nomActionInput.value =
            tx.entreprise ||
            "";
    }

    if (
        tickerInput
    ) {
        tickerInput.value =
            tx.ticker ||
            "";
    }

    if (
        isinInput
    ) {
        isinInput.value =
            tx.isin ||
            "";
    }

    if (
        placeCotationInput
    ) {
        placeCotationInput.value =
            tx.placeCotation ||
            "";
    }

    if (
        deviseCotationSelect
    ) {
        const devise =
            tx.deviseCotation ||
            tx.deviseOriginale ||
            "EUR";

        /*
           On ne force la valeur que si l'option existe
           dans le HTML.
        */

        const optionExiste =
            Array.from(
                deviseCotationSelect.options
            ).some(
                option =>
                    option.value ===
                    devise
            );

        if (
            optionExiste
        ) {
            deviseCotationSelect.value =
                devise;
        }
    }

    if (
        eligibilitePEASelect
    ) {
        const valeur =
            [
                "eligible",
                "non-eligible",
                "inconnue"
            ].includes(
                tx.eligibilitePEA
            )
                ? tx.eligibilitePEA
                : "inconnue";

        eligibilitePEASelect.value =
            valeur;
    }

    if (
        prixAchatInput
    ) {
        const prix =
            Number(
                tx.prixExecution
            );

        prixAchatInput.value =
            Number.isFinite(
                prix
            )
                ? prix.toFixed(
                    4
                )
                : "0";
    }

    if (
        modeSaisieSelect
    ) {
        modeSaisieSelect.value =
            "quantite";
    }

    if (
        quantiteInput
    ) {
        quantiteInput.value =
            Number.isFinite(
                Number(
                    tx.quantite
                )
            )
                ? Number(
                    tx.quantite
                )
                : 0;
    }

    if (
        montantInvestiInput
    ) {
        const montantBrut =
            Number(
                tx.montantBrut
            );

        montantInvestiInput.value =
            Number.isFinite(
                montantBrut
            )
                ? montantBrut.toFixed(
                    2
                )
                : "0";
    }

    if (
        fraisTransactionInput
    ) {
        const frais =
            Number(
                tx.frais
            );

        fraisTransactionInput.value =
            Number.isFinite(
                frais
            )
                ? frais.toFixed(
                    2
                )
                : "0";
    }

    if (
        sourceFraisSelect
    ) {
        sourceFraisSelect.value =
            tx.sourceFrais ||
            "inconnu";
    }

    if (
        dateTransactionInput
    ) {
        if (
            tx.date
        ) {
            const date =
                new Date(
                    tx.date
                );

            if (
                !Number.isNaN(
                    date.getTime()
                )
            ) {
                const decalage =
                    date.getTimezoneOffset() *
                    60000;

                dateTransactionInput.value =
                    new Date(
                        date.getTime() -
                        decalage
                    )
                        .toISOString()
                        .slice(
                            0,
                            16
                        );

            } else {
                dateTransactionInput.value =
                    "";
            }

        } else {
            dateTransactionInput.value =
                "";
        }
    }

    if (
        ajouterPositionButton
    ) {
        ajouterPositionButton.textContent =
            "Enregistrer les modifications";
    }

    verifierCoherenceEnveloppe();

    mettreAJourModeSaisie();

    mettreAJourInformationFraction();

    recalculerTransaction();

    if (
        nomActionInput
    ) {
        nomActionInput.scrollIntoView({
            behavior:
                "smooth",

            block:
                "center"
        });
    }
}


/* =========================================================
   SUPPRIMER UNE TRANSACTION
========================================================= */

function supprimerTransaction(
    index
) {
    const tx =
        transactions[
            index
        ];

    if (
        !tx
    ) {
        return;
    }

    const statut =
        transactionEstTest(
            tx
        )
            ? "de test"
            : "réelle";

    const confirmation =
        confirm(
            `Supprimer cette transaction ${statut} ${tx.type} ${tx.ticker} ?`
        );

    if (
        !confirmation
    ) {
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
   FUTURE FICHE INSTRUMENT

   Pour l'instant :
   - la structure existe
   - aucune donnée historique n'est inventée
   - aucun faux graphique n'est produit

   Cette fonction sera remplacée par la vraie vue instrument
   lorsque l'API historique / temps réel sera branchée.
========================================================= */

function ouvrirFicheInstrument(
    clePosition
) {
    const position =
        positions.find(
            element =>
                element.clePosition ===
                clePosition
        );

    if (
        !position
    ) {
        return;
    }

    console.log(
        "Fiche instrument prête à être branchée :",
        {
            clePosition:
                position.clePosition,

            entreprise:
                position.entreprise,

            ticker:
                position.ticker,

            isin:
                position.isin,

            typeInstrument:
                position.typeInstrument,

            enveloppe:
                position.enveloppe,

            courtier:
                position.courtier,

            periodesGraphiquePrevues: [
                "1H",
                "1J",
                "1S",
                "1M",
                "6M",
                "1A",
                "MAX"
            ]
        }
    );

    alert(
        `${position.entreprise} (${position.ticker})\n\n` +
        `La fiche instrument est préparée dans l'architecture.\n` +
        `Prochaine étape : cours live et graphiques 1H, 1J, 1S, 1M, 6M, 1A et MAX.`
    );
}


/* =========================================================
   RÉINITIALISATION FORMULAIRE
========================================================= */

function reinitialiserFormulaire() {
    if (
        statutTransactionSelect
    ) {
        statutTransactionSelect.value =
            "reelle";
    }

    if (
        courtierSelect
    ) {
        courtierSelect.value =
            "trade-republic";
    }

    if (
        enveloppeSelect
    ) {
        enveloppeSelect.value =
            "cto";
    }

    if (
        typeInstrumentSelect
    ) {
        typeInstrumentSelect.value =
            "action";
    }

    if (
        nomActionInput
    ) {
        nomActionInput.value =
            "";
    }

    if (
        tickerInput
    ) {
        tickerInput.value =
            "";
    }

    if (
        isinInput
    ) {
        isinInput.value =
            "";
    }

    if (
        placeCotationInput
    ) {
        placeCotationInput.value =
            "";
    }

    if (
        deviseCotationSelect
    ) {
        const optionEUR =
            Array.from(
                deviseCotationSelect.options
            ).some(
                option =>
                    option.value ===
                    "EUR"
            );

        if (
            optionEUR
        ) {
            deviseCotationSelect.value =
                "EUR";
        }
    }

    if (
        eligibilitePEASelect
    ) {
        eligibilitePEASelect.value =
            "inconnue";
    }

    if (
        prixAchatInput
    ) {
        prixAchatInput.value =
            "0";
    }

    if (
        quantiteInput
    ) {
        quantiteInput.value =
            "0";
    }

    if (
        montantInvestiInput
    ) {
        montantInvestiInput.value =
            "0";
    }

    if (
        modeSaisieSelect
    ) {
        modeSaisieSelect.value =
            "quantite";
    }

    if (
        typeTransactionSelect
    ) {
        typeTransactionSelect.value =
            "achat";
    }

    if (
        dateTransactionInput
    ) {
        dateTransactionInput.value =
            "";
    }

    indexTransactionEnModification =
        null;

    initialiserDateTransaction();

    determinerFraisAutomatiques();

    mettreAJourModeSaisie();

    mettreAJourInformationFraction();

    verifierCoherenceEnveloppe();

    if (
        calculPosition
    ) {
        calculPosition.textContent =
            "Renseignez la transaction.";
    }

    if (
        ajouterPositionButton
    ) {
        ajouterPositionButton.textContent =
            "Enregistrer la transaction";
    }
}


/* =========================================================
   ÉVÉNEMENTS
========================================================= */

if (
    ajouterPositionButton
) {
    ajouterPositionButton.addEventListener(
        "click",
        enregistrerTransaction
    );
}


if (
    statutTransactionSelect
) {
    statutTransactionSelect.addEventListener(
        "change",
        recalculerTransaction
    );
}


if (
    enveloppeSelect
) {
    enveloppeSelect.addEventListener(
        "change",
        () => {
            verifierCoherenceEnveloppe();

            recalculerTransaction();
        }
    );
}


if (
    typeInstrumentSelect
) {
    typeInstrumentSelect.addEventListener(
        "change",
        mettreAJourInformationFraction
    );
}


if (
    eligibilitePEASelect
) {
    eligibilitePEASelect.addEventListener(
        "change",
        verifierCoherenceEnveloppe
    );
}


if (
    modeSaisieSelect
) {
    modeSaisieSelect.addEventListener(
        "change",
        mettreAJourModeSaisie
    );
}


if (
    courtierSelect
) {
    courtierSelect.addEventListener(
        "change",
        () => {
            determinerFraisAutomatiques();

            mettreAJourInformationFraction();

            recalculerTransaction();
        }
    );
}


if (
    modeExecutionSelect
) {
    modeExecutionSelect.addEventListener(
        "change",
        () => {
            determinerFraisAutomatiques();

            recalculerTransaction();
        }
    );
}


if (
    typeTransactionSelect
) {
    typeTransactionSelect.addEventListener(
        "change",
        recalculerTransaction
    );
}


if (
    tickerInput
) {
    tickerInput.addEventListener(
        "input",
        () => {
            tickerInput.value =
                normaliserTicker(
                    tickerInput.value
                );

            mettreAJourInformationFraction();
        }
    );
}


if (
    isinInput
) {
    isinInput.addEventListener(
        "input",
        () => {
            isinInput.value =
                normaliserISIN(
                    isinInput.value
                );
        }
    );
}


if (
    prixAchatInput
) {
    prixAchatInput.addEventListener(
        "input",
        recalculerTransaction
    );
}


if (
    quantiteInput
) {
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


if (
    montantInvestiInput
) {
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


if (
    fraisTransactionInput
) {
    fraisTransactionInput.addEventListener(
        "input",
        () => {
            if (
                sourceFraisSelect
            ) {
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

if (
    listeTransactions
) {
    listeTransactions.addEventListener(
        "click",
        event => {
            const boutonModifier =
                event.target.closest(
                    ".modifier-transaction"
                );

            if (
                boutonModifier
            ) {
                const index =
                    Number(
                        boutonModifier
                            .dataset
                            .index
                    );

                if (
                    Number.isInteger(
                        index
                    )
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

            if (
                boutonSupprimer
            ) {
                const index =
                    Number(
                        boutonSupprimer
                            .dataset
                            .index
                    );

                if (
                    Number.isInteger(
                        index
                    )
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
   POSITION :
   FUTURE FICHE INSTRUMENT
========================================================= */

if (
    listePositions
) {
    listePositions.addEventListener(
        "click",
        event => {
            const bouton =
                event.target.closest(
                    ".ouvrir-fiche-instrument"
                );

            if (
                !bouton
            ) {
                return;
            }

            const clePosition =
                bouton.dataset
                    .positionKey;

            if (
                clePosition
            ) {
                ouvrirFicheInstrument(
                    clePosition
                );
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
    isinInput,
    placeCotationInput,
    prixAchatInput,
    quantiteInput,
    montantInvestiInput,
    fraisTransactionInput
].filter(
    Boolean
);


champsTransaction.forEach(
    champ => {
        champ.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    if (
                        ajouterPositionButton &&
                        !ajouterPositionButton
                            .disabled
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

    normaliserTransactions();

    recalculerPositions();

    if (
        statutTransactionSelect
    ) {
        statutTransactionSelect.value =
            "reelle";
    }

    if (
        enveloppeSelect
    ) {
        enveloppeSelect.value =
            "cto";
    }

    if (
        typeInstrumentSelect
    ) {
        typeInstrumentSelect.value =
            "action";
    }

    initialiserDateTransaction();

    determinerFraisAutomatiques();

    mettreAJourModeSaisie();

    mettreAJourInformationFraction();

    verifierCoherenceEnveloppe();

    afficherPositions();

    afficherTransactions();

    const nombreReelles =
        transactions.filter(
            transactionEstReelle
        ).length;

    const nombreTests =
        transactions.filter(
            transactionEstTest
        ).length;

    const nombrePEA =
        transactions.filter(
            transaction =>
                transactionEstReelle(
                    transaction
                ) &&
                transaction.enveloppe ===
                    "pea"
        ).length;

    const nombreCTO =
        transactions.filter(
            transaction =>
                transactionEstReelle(
                    transaction
                ) &&
                transaction.enveloppe ===
                    "cto"
        ).length;

    const resultatXIRR =
        calculerXIRRPortefeuille();

    console.log(
        "Application initialisée.",
        {
            transactionsReelles:
                nombreReelles,

            transactionsTest:
                nombreTests,

            transactionsPEA:
                nombrePEA,

            transactionsCTO:
                nombreCTO,

            positionsReelles:
                positions.length,

            xirr:
                resultatXIRR
        }
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

window.normaliserTransactions =
    normaliserTransactions;

window.dateTransactionEstFiable =
    dateTransactionEstFiable;

window.transactionEstReelle =
    transactionEstReelle;

window.transactionEstTest =
    transactionEstTest;

window.construireCleInstrument =
    construireCleInstrument;

window.construireClePosition =
    construireClePosition;

window.construireFluxXIRR =
    construireFluxXIRR;

window.calculerXIRRPortefeuille =
    calculerXIRRPortefeuille;

window.trouverRacinesXIRR =
    trouverRacinesXIRR;

window.ouvrirFicheInstrument =
    ouvrirFicheInstrument;


/* =========================================================
   FIN DU BLOC 4/4
   FIN DU SCRIPT.JS
========================================================= */
