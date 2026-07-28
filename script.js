/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 1/2

   ARCHITECTURE :
   TRANSACTIONS -> POSITIONS CALCULÉES

   PRINCIPES :
   - transactions réelles / transactions de test séparées
   - seules les transactions réelles alimentent le portefeuille
   - dates historiques non inventées
   - frais conservés séparément
   - données de marché et FX traçables
========================================================= */


/* =========================================================
   ÉLÉMENTS DU FORMULAIRE
========================================================= */

const statutTransactionSelect =
    document.getElementById("statutTransaction");

const nomActionInput =
    document.getElementById("nomAction");

const tickerInput =
    document.getElementById("ticker");

const prixAchatInput =
    document.getElementById("prixAchat");

const quantiteInput =
    document.getElementById("quantite");

const montantInvestiInput =
    document.getElementById("montantInvesti");

const courtierSelect =
    document.getElementById("courtier");

const typeTransactionSelect =
    document.getElementById("typeTransaction");

const modeExecutionSelect =
    document.getElementById("modeExecution");

const dateTransactionInput =
    document.getElementById("dateTransaction");

const modeSaisieSelect =
    document.getElementById("modeSaisie");

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

        if (
            Array.isArray(
                donnees
            )
        ) {
            transactions =
                donnees;
        } else {
            transactions =
                [];
        }

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
        transactions.length > 0
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

                        /*
                           Une ancienne position réelle
                           est conservée comme réelle.

                           On ne la transforme pas en test.
                        */

                        statutTransaction:
                            "reelle",

                        type:
                            "achat",

                        courtier:
                            position.courtier ||
                            "trade-republic",

                        modeExecution:
                            "autre",

                        /*
                           IMPORTANT :
                           aucune date historique n'est
                           inventée pendant la migration.
                        */

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
                            String(
                                position.ticker ||
                                ""
                            )
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

                       Les anciennes transactions n'ayant pas
                       encore ce champ sont conservées comme
                       réelles pour éviter de les faire
                       disparaître du portefeuille.
                    ----------------------------------------- */

                    if (
                        tx.statutTransaction !==
                            "reelle" &&
                        tx.statutTransaction !==
                            "test"
                    ) {
                        tx.statutTransaction =
                            "reelle";

                        modification =
                            true;
                    }


                    /* -----------------------------------------
                       NORMALISATION DU TICKER
                    ----------------------------------------- */

                    const tickerNormalise =
                        String(
                            tx.ticker ||
                            ""
                        )
                            .trim()
                            .toUpperCase();


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
                       DATE DES ANCIENNES MIGRATIONS

                       Les anciennes versions pouvaient avoir
                       attribué artificiellement "maintenant"
                       à une position migrée.

                       Une transaction issue d'une ancienne
                       position ne possède pas de date
                       historique vérifiée.

                       On la marque donc explicitement inconnue.
                    ----------------------------------------- */

                    if (
                        tx.sourceTransaction ===
                        "migration-ancienne-position"
                    ) {
                        if (
                            tx.date !== null ||
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
                       DATE PRÉSENTE MAIS ANCIEN FORMAT
                    ----------------------------------------- */

                    else if (
                        !tx.dateStatus
                    ) {
                        /*
                           On ne peut pas confirmer
                           automatiquement la provenance
                           d'une ancienne date.

                           Elle reste donc à vérifier.
                        */

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
   STATUT D'UNE TRANSACTION
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
        typeof devise ===
            "string" &&
        devise.trim()
            ? devise
                .trim()
                .toUpperCase()
            : null;


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
   COURTIERS
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
        !dateTransactionInput
    ) {
        return;
    }


    if (
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


    /* -----------------------------------------------------
       TRADE REPUBLIC
    ----------------------------------------------------- */

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
                    "Trade Republic — plan d’épargne : 0 € de frais de transaction appliqué par défaut.";
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
                    "Trade Republic — ordre classique : 1 € de frais appliqué par défaut. Un justificatif réel primera toujours sur cette règle.";
            }

            return;
        }
    }


    /* -----------------------------------------------------
       REVOLUT
    ----------------------------------------------------- */

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
                "Revolut : frais non supposés automatiquement. Utiliser les données réelles du justificatif lorsqu'elles sont disponibles.";
        }

        return;
    }


    if (
        fraisInfo
    ) {
        fraisInfo.textContent =
            "Frais à confirmer selon le courtier et le justificatif.";
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
            ? tickerInput.value
                .trim()
                .toUpperCase()
            : "";


    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "";


    if (
        !ticker
    ) {
        fractionStatus.textContent =
            "Saisissez un ticker pour identifier l’instrument.";

        return;
    }


    fractionStatus.textContent =
        `${ticker} — ${nomCourtier(
            courtier
        )} : éligibilité aux fractions à vérifier auprès du courtier.`;
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


    /* -----------------------------------------------------
       MODE MONTANT
    ----------------------------------------------------- */

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


        const type =
            typeTransactionSelect
                ? typeTransactionSelect.value
                : "achat";


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
                )} action(s) — ` +
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


    /* -----------------------------------------------------
       MODE QUANTITÉ
    ----------------------------------------------------- */

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
                "Renseignez le nombre d’actions.";
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


    const type =
        typeTransactionSelect
            ? typeTransactionSelect.value
            : "achat";


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
            )} action(s) × ` +
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
   RÉCUPÉRATION DES DONNÉES DE MARCHÉ
========================================================= */

async function recupererDonneesMarche(
    ticker
) {
    const symbole =
        String(
            ticker
        )
            .trim()
            .toUpperCase();


    if (
        !symbole
    ) {
        throw new Error(
            "Le ticker est obligatoire."
        );
    }


    const response =
        await fetch(
            `/api/quote?symbol=${encodeURIComponent(
                symbole
            )}`,
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
            "La réponse du serveur est invalide."
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
            null
    };
}


/* =========================================================
   CALCUL DES POSITIONS À PARTIR DES TRANSACTIONS RÉELLES
========================================================= */

function recalculerPositions() {
    const groupes =
        new Map();


    /*
       POINT ESSENTIEL :

       Les transactions de test restent enregistrées
       dans l'historique mais n'entrent JAMAIS dans
       le calcul du portefeuille réel.
    */

    const transactionsReelles =
        transactions.filter(
            transactionEstReelle
        );


    /*
       Les transactions datées sont traitées
       chronologiquement.

       Les transactions historiques sans date fiable
       restent exploitables pour le PRU et la quantité,
       mais leur absence de date sera signalée
       séparément pour les calculs temporels.
    */

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
            `${tx.courtier}::${tx.ticker}`;


        if (
            !groupes.has(
                cle
            )
        ) {
            groupes.set(
                cle,
                {
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
                            : null
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


        /* -------------------------------------------------
           QUALITÉ DES DATES
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           DONNÉES DE MARCHÉ LES PLUS RÉCENTES DISPONIBLES
        ------------------------------------------------- */

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
        }


        /* -------------------------------------------------
           ACHAT
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           VENTE
        ------------------------------------------------- */

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


    /* =====================================================
       CONSTRUCTION DES POSITIONS FINALES
    ===================================================== */

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
   FIN DU BLOC 1/2

   IMPORTANT :
   LE BLOC 2 DOIT ÊTRE ADAPTÉ AVANT DE TESTER.
========================================================= */
/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 2/2

   VERSION CONSOLIDÉE :
   - transactions réelles / test
   - portefeuille réel uniquement
   - dates fiabilisées
   - frais
   - historique complet
   - performances réalisées / non réalisées
   - moteur XIRR sécurisé
========================================================= */


/* =========================================================
   LECTURE FORMULAIRE
========================================================= */

function lireFormulaireTransaction() {

    const statutTransaction =
        statutTransactionSelect
            ? statutTransactionSelect.value
            : "reelle";


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


    /* -----------------------------------------------------
       DATE
    ----------------------------------------------------- */

    let date = null;

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


    /* -----------------------------------------------------
       PRIX
    ----------------------------------------------------- */

    const prixExecution =
        prixAchatInput
            ? parseFloat(
                prixAchatInput.value
            )
            : NaN;


    /* -----------------------------------------------------
       MODE DE SAISIE
    ----------------------------------------------------- */

    const mode =
        modeSaisieSelect
            ? modeSaisieSelect.value
            : "quantite";


    /* -----------------------------------------------------
       FRAIS
    ----------------------------------------------------- */

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


    /* =====================================================
       SAISIE PAR MONTANT
    ===================================================== */

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
    }


    /* =====================================================
       SAISIE PAR QUANTITÉ
    ===================================================== */

    else {

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

        entreprise,

        ticker,

        courtier,

        type,

        modeExecution,

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
        donnees.statutTransaction !==
            "reelle" &&
        donnees.statutTransaction !==
            "test"
    ) {

        throw new Error(
            "Le statut de la transaction est invalide."
        );
    }


    if (
        !donnees.entreprise
    ) {

        throw new Error(
            "Indiquez le nom de l’entreprise."
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


    /* =====================================================
       CONTRÔLE D'UNE VENTE RÉELLE
    ===================================================== */

    if (
        donnees.type ===
            "vente" &&
        donnees.statutTransaction ===
            "reelle"
    ) {

        recalculerPositions();


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
            indexTransactionEnModification ===
                null &&
            donnees.quantite >
                quantiteDisponible +
                    1e-8
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
                donnees.ticker
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
                transactionExistante
                    ? (
                        transactionExistante
                            .qualiteTransaction ||
                        "declaree-utilisateur"
                    )
                    : "declaree-utilisateur",


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


        /* =================================================
           MODIFICATION
        ================================================= */

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

            /* =================================================
               NOUVELLE TRANSACTION
            ================================================= */

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
   MOTEUR XIRR
========================================================= */


/* =========================================================
   DIFFÉRENCE EN JOURS
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


/* =========================================================
   VALEUR ACTUALISÉE XIRR

   On recherche le taux r tel que :

   Somme [
       Flux_i /
       (1 + r) ^ (jours_i / 365)
   ] = 0
========================================================= */

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


/* =========================================================
   RECHERCHE DES RACINES XIRR

   Le moteur :
   - ne suppose pas qu'une racine existe
   - recherche les changements de signe
   - utilise ensuite une dichotomie
   - détecte plusieurs solutions éventuelles
========================================================= */

function trouverRacinesXIRR(
    flux
) {

    const racines =
        [];


    /*
       Transformation :

       y = ln(1 + taux)

       donc :

       taux = exp(y) - 1

       Cela empêche automatiquement
       d'aller sous -100 %.
    */


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

    /*
       RÈGLE ABSOLUE :
       une transaction TEST n'entre jamais
       dans le XIRR réel.
    */

    const transactionsReelles =
        transactions.filter(
            transactionEstReelle
        );


    if (
        transactionsReelles.length === 0
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


    /* =====================================================
       CONTRÔLE DES DATES
    ===================================================== */

    const datesNonFiables =
        transactionsReelles.filter(
            transaction =>
                !dateTransactionEstFiable(
                    transaction
                )
        );


    if (
        datesNonFiables.length > 0
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


    /* =====================================================
       FLUX HISTORIQUES
    ===================================================== */

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


        /* -------------------------------------------------
           ACHAT

           Sortie d'argent :
           montant négatif.

           Les frais sont inclus.
        ------------------------------------------------- */

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
                        "Le coût total d’un achat réel est invalide.",

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


        /* -------------------------------------------------
           VENTE

           Entrée d'argent :
           montant positif.

           Les frais sont déjà déduits.
        ------------------------------------------------- */

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
                        "Le produit net d’une vente réelle est invalide.",

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


    /* =====================================================
       VALORISATION FINALE
    ===================================================== */

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


    /*
       La valeur des positions encore ouvertes
       constitue le dernier flux positif.

       Si toutes les positions sont fermées,
       valeurFinale peut légitimement être égale à zéro.
    */

    if (
        valeurFinale > 0
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


    /* =====================================================
       TRI CHRONOLOGIQUE
    ===================================================== */

    flux.sort(
        (
            a,
            b
        ) =>
            a.date.getTime() -
            b.date.getTime()
    );


    /* =====================================================
       CONTRÔLE DES SIGNES
    ===================================================== */

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


/* =========================================================
   CALCUL XIRR DU PORTEFEUILLE
========================================================= */

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
        racines.length === 0
    ) {

        return {

            statut:
                "indisponible",

            taux:
                null,

            raison:
                "Aucune solution XIRR n’a été trouvée dans la plage de calcul contrôlée.",

            nombreFlux:
                preparation.flux.length
        };
    }


    /*
       Certains ensembles de flux peuvent
       mathématiquement produire plusieurs TRI.

       Dans ce cas on refuse d'en sélectionner
       arbitrairement un.
    */

    if (
        racines.length > 1
    ) {

        return {

            statut:
                "ambigu",

            taux:
                null,

            raison:
                `${racines.length} solutions XIRR possibles ont été détectées. Aucun taux unique n’est affiché.`,

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
                "Le résultat XIRR obtenu n’est pas exploitable.",

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
   LIBELLÉS DE QUALITÉ DES DATES
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

            return "Date déclarée par l’utilisateur";


        case "a-verifier":

            return "Date à vérifier";


        case "date-inconnue":

            return "Date historique inconnue";


        default:

            return "Date à vérifier";
    }
}


/* =========================================================
   LIBELLÉ STATUT TRANSACTION
========================================================= */

function libelleStatutTransaction(
    transaction
) {

    return transactionEstTest(
        transaction
    )
        ? "TEST"
        : "RÉELLE";
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


    /* =====================================================
       TOTAUX RÉELS
    ===================================================== */

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


    /* =====================================================
       PORTEFEUILLE VIDE
    ===================================================== */

    if (
        positions.length === 0
    ) {

        listePositions.innerHTML = `

            <div class="portfolio-empty">

                <p>
                    Aucune position réelle ouverte.
                </p>

                <p>
                    Les transactions de test sont conservées
                    dans l'historique mais ne sont pas incluses
                    dans le portefeuille.
                </p>

            </div>
        `;
    }


    /* =====================================================
       POSITIONS
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
                valeurActuelle !== null &&
                gainNonRealise !== null &&
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
                gainNonRealise !== null &&
                gainNonRealise > 0
                    ? "positif"
                    : gainNonRealise !== null &&
                      gainNonRealise < 0
                        ? "negatif"
                        : "neutre";


            const classeGainRealise =
                gainsRealises > 0
                    ? "positif"
                    : gainsRealises < 0
                        ? "negatif"
                        : "neutre";


            const nombreDatesNonFiables =
                Number(
                    position.nombreDatesNonFiables
                ) || 0;


            const texteQualiteDates =
                nombreDatesNonFiables === 0
                    ? "Toutes les dates sont exploitables"
                    : `${nombreDatesNonFiables} date(s) inconnue(s) ou à vérifier`;


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
                            Portefeuille :
                        </strong>

                        Réel
                    </p>


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
                            Nombre de transactions réelles :
                        </strong>

                        ${position.nombreTransactions}
                    </p>


                    <p>
                        <strong>
                            Qualité des dates :
                        </strong>

                        ${echapperHTML(
                            texteQualiteDates
                        )}
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

                        ${
                            valeurActuelle !== null
                                ? formatEuro(
                                    valeurActuelle
                                )
                                : "Impossible à confirmer"
                        }
                    </p>


                    <p class="${classeGain}">

                        <strong>
                            Gain / Perte non réalisé :
                        </strong>

                        ${
                            gainNonRealise !== null
                                ? formatEuro(
                                    gainNonRealise
                                )
                                : "Impossible à confirmer"
                        }

                    </p>


                    <p class="${classeGain}">

                        <strong>
                            Rendement non réalisé :
                        </strong>

                        ${
                            position.rendement !== null
                                ? formatPourcentage(
                                    position.rendement
                                )
                                : "Impossible à confirmer"
                        }

                    </p>


                    <p class="${classeGainRealise}">

                        <strong>
                            Gains réalisés cumulés :
                        </strong>

                        ${formatEuro(
                            gainsRealises
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
       CAPITAL
    ===================================================== */

    if (
        totalInvestiElement
    ) {

        totalInvestiElement.textContent =
            formatEuro(
                totalCapitalRestant
            );
    }


    /* =====================================================
       VALEUR
    ===================================================== */

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


    /* =====================================================
       GAINS
    ===================================================== */

    if (
        totalGainElement
    ) {

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
            performanceTotale !== null &&
            performanceTotale > 0
                ? "positif"
                : performanceTotale !== null &&
                  performanceTotale < 0
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
       XIRR
    ===================================================== */

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
                pourcentageXIRR > 0
                    ? "positif"
                    : pourcentageXIRR < 0
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

            const raison =
                resultatXIRR.raison ||
                "Calcul indisponible.";


            totalRendementElement.innerHTML = `

                <div class="neutre">

                    <strong>
                        XIRR indisponible
                    </strong>

                </div>

                <small>
                    ${echapperHTML(
                        raison
                    )}
                </small>
            `;
        }
    }
}


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
        transactions.length === 0
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
                        tempsA === tempsB
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


                    <div>

                        <span class="courtier-badge">

                            ${echapperHTML(
                                nomCourtier(
                                    transaction.courtier
                                )
                            )}

                        </span>

                    </div>

                </div>


                <div class="position-details">

                    <p>

                        <strong>
                            Statut :
                        </strong>

                        ${
                            transactionEstTest(
                                transaction
                            )
                                ? `<span class="neutre"><strong>TEST</strong></span>`
                                : `<span class="positif"><strong>RÉELLE</strong></span>`
                        }

                    </p>


                    <p>

                        <strong>
                            Date :
                        </strong>

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

                        <strong>
                            Type :
                        </strong>

                        ${typeLabel}

                    </p>


                    <p>

                        <strong>
                            Mode :
                        </strong>

                        ${echapperHTML(
                            transaction.modeExecution ||
                            "—"
                        )}

                    </p>


                    <p>

                        <strong>
                            Quantité :
                        </strong>

                        ${formatQuantite(
                            transaction.quantite
                        )}

                    </p>


                    <p>

                        <strong>
                            Prix d’exécution :
                        </strong>

                        ${formatEuro(
                            transaction.prixExecution
                        )}

                    </p>


                    <p>

                        <strong>
                            Montant brut :
                        </strong>

                        ${formatEuro(
                            transaction.montantBrut
                        )}

                    </p>


                    <p>

                        <strong>
                            Frais :
                        </strong>

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

                        <strong>
                            Source frais :
                        </strong>

                        ${echapperHTML(
                            transaction.sourceFrais ||
                            "inconnu"
                        )}

                    </p>


                    <p>

                        <strong>
                            Source transaction :
                        </strong>

                        ${echapperHTML(
                            transaction.sourceTransaction ||
                            "—"
                        )}

                    </p>


                    <p>

                        <strong>
                            Qualité :
                        </strong>

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


    /* =====================================================
       STATUT
    ===================================================== */

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


    /* =====================================================
       COURTIER
    ===================================================== */

    if (
        courtierSelect
    ) {

        courtierSelect.value =
            tx.courtier ||
            "trade-republic";
    }


    /* =====================================================
       TYPE
    ===================================================== */

    if (
        typeTransactionSelect
    ) {

        typeTransactionSelect.value =
            tx.type ||
            "achat";
    }


    /* =====================================================
       MODE
    ===================================================== */

    if (
        modeExecutionSelect
    ) {

        modeExecutionSelect.value =
            tx.modeExecution ||
            "autre";
    }


    /* =====================================================
       ENTREPRISE
    ===================================================== */

    if (
        nomActionInput
    ) {

        nomActionInput.value =
            tx.entreprise ||
            "";
    }


    /* =====================================================
       TICKER
    ===================================================== */

    if (
        tickerInput
    ) {

        tickerInput.value =
            tx.ticker ||
            "";
    }


    /* =====================================================
       PRIX
    ===================================================== */

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
                ? prix.toFixed(4)
                : "0";
    }


    /* =====================================================
       MODE DE SAISIE
    ===================================================== */

    if (
        modeSaisieSelect
    ) {

        modeSaisieSelect.value =
            "quantite";
    }


    /* =====================================================
       QUANTITÉ
    ===================================================== */

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


    /* =====================================================
       MONTANT
    ===================================================== */

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
                ? montantBrut.toFixed(2)
                : "0";
    }


    /* =====================================================
       FRAIS
    ===================================================== */

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
                ? frais.toFixed(2)
                : "0";
    }


    /* =====================================================
       SOURCE FRAIS
    ===================================================== */

    if (
        sourceFraisSelect
    ) {

        sourceFraisSelect.value =
            tx.sourceFrais ||
            "inconnu";
    }


    /* =====================================================
       DATE

       Une date inconnue reste inconnue.
       On ne fabrique jamais la date du jour.
    ===================================================== */

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


    /* =====================================================
       BOUTON
    ===================================================== */

    if (
        ajouterPositionButton
    ) {

        ajouterPositionButton.textContent =
            "Enregistrer les modifications";
    }


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
   RÉINITIALISATION DU FORMULAIRE
========================================================= */

function reinitialiserFormulaire() {

    if (
        statutTransactionSelect
    ) {

        statutTransactionSelect.value =
            "reelle";
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
   ÉVÉNEMENT PRINCIPAL
========================================================= */

if (
    ajouterPositionButton
) {

    ajouterPositionButton.addEventListener(
        "click",
        enregistrerTransaction
    );
}


/* =========================================================
   STATUT RÉEL / TEST
========================================================= */

if (
    statutTransactionSelect
) {

    statutTransactionSelect.addEventListener(
        "change",
        recalculerTransaction
    );
}


/* =========================================================
   MODE DE SAISIE
========================================================= */

if (
    modeSaisieSelect
) {

    modeSaisieSelect.addEventListener(
        "change",
        mettreAJourModeSaisie
    );
}


/* =========================================================
   COURTIER
========================================================= */

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


/* =========================================================
   MODE D'EXÉCUTION
========================================================= */

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


/* =========================================================
   TYPE
========================================================= */

if (
    typeTransactionSelect
) {

    typeTransactionSelect.addEventListener(
        "change",
        recalculerTransaction
    );
}


/* =========================================================
   TICKER
========================================================= */

if (
    tickerInput
) {

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

if (
    prixAchatInput
) {

    prixAchatInput.addEventListener(
        "input",
        recalculerTransaction
    );
}


/* =========================================================
   QUANTITÉ
========================================================= */

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


/* =========================================================
   MONTANT
========================================================= */

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


/* =========================================================
   FRAIS
========================================================= */

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
   TOUCHE ENTRÉE
========================================================= */

const champsTransaction = [

    nomActionInput,

    tickerInput,

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

    /* =====================================================
       1. CHARGEMENT
    ===================================================== */

    chargerTransactions();


    /* =====================================================
       2. MIGRATION
    ===================================================== */

    migrerAnciennesPositionsSiNecessaire();


    /* =====================================================
       3. NORMALISATION
    ===================================================== */

    normaliserTransactions();


    /* =====================================================
       4. POSITIONS RÉELLES
    ===================================================== */

    recalculerPositions();


    /* =====================================================
       5. FORMULAIRE
    ===================================================== */

    if (
        statutTransactionSelect
    ) {

        statutTransactionSelect.value =
            "reelle";
    }


    initialiserDateTransaction();


    determinerFraisAutomatiques();


    mettreAJourModeSaisie();


    mettreAJourInformationFraction();


    /* =====================================================
       6. AFFICHAGE
    ===================================================== */

    afficherPositions();


    afficherTransactions();


    /* =====================================================
       7. DIAGNOSTIC
    ===================================================== */

    const nombreReelles =
        transactions.filter(
            transactionEstReelle
        ).length;


    const nombreTests =
        transactions.filter(
            transactionEstTest
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


window.construireFluxXIRR =
    construireFluxXIRR;


window.calculerXIRRPortefeuille =
    calculerXIRRPortefeuille;


window.trouverRacinesXIRR =
    trouverRacinesXIRR;


/* =========================================================
   FIN DU BLOC 2/2
   FIN DU SCRIPT.JS
========================================================= */
