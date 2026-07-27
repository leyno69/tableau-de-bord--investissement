/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 1/2
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
const modeSaisieSelect = document.getElementById("modeSaisie");

const champQuantite = document.getElementById("champQuantite");
const champMontant = document.getElementById("champMontant");

const fractionStatus = document.getElementById("fractionStatus");
const calculPosition = document.getElementById("calculPosition");

const ajouterPositionButton =
    document.getElementById("ajouterPosition");


/* =========================================================
   ÉLÉMENTS DU PORTEFEUILLE
========================================================= */

const listePositions =
    document.getElementById("listePositions");

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

let positions = [];

try {
    const positionsSauvegardees =
        JSON.parse(localStorage.getItem("positions"));

    if (Array.isArray(positionsSauvegardees)) {
        positions = positionsSauvegardees;
    }
} catch (error) {
    console.error(
        "Impossible de lire les positions sauvegardées :",
        error
    );

    positions = [];
}

let indexEnModification = null;


/* =========================================================
   FORMATAGE
========================================================= */

function formatEuro(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "0,00 €";
    }

    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(nombre);
}


function formatPourcentage(valeur) {
    const nombre = Number(valeur);

    if (!Number.isFinite(nombre)) {
        return "0,00 %";
    }

    return (
        new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(nombre) + " %"
    );
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
        case "revolut":
            return "Revolut";

        case "trade-republic":
            return "Trade Republic";

        default:
            return courtier
                ? String(courtier)
                : "Non renseigné";
    }
}


/* =========================================================
   NETTOYAGE / MIGRATION DES ANCIENNES DONNÉES
========================================================= */

function nettoyerPositions() {
    positions = positions
        .filter(position => {
            if (!position) {
                return false;
            }

            const quantite =
                Number(position.quantite);

            const montantInvesti =
                Number(position.montantInvesti);

            const cours =
                Number(position.cours);

            return (
                Number.isFinite(quantite) &&
                quantite > 0 &&
                Number.isFinite(montantInvesti) &&
                montantInvesti > 0 &&
                Number.isFinite(cours) &&
                cours > 0
            );
        })
        .map(position => {
            return {
                entreprise:
                    String(
                        position.entreprise || position.ticker || ""
                    ),

                ticker:
                    String(position.ticker || "")
                        .trim()
                        .toUpperCase(),

                montantInvesti:
                    Number(position.montantInvesti),

                quantite:
                    Number(position.quantite),

                cours:
                    Number(position.cours),

                courtier:
                    position.courtier ||
                    "trade-republic"
            };
        });
}


/* =========================================================
   STOCKAGE LOCAL
========================================================= */

function sauvegarderPositions() {
    try {
        localStorage.setItem(
            "positions",
            JSON.stringify(positions)
        );
    } catch (error) {
        console.error(
            "Impossible de sauvegarder le portefeuille :",
            error
        );
    }
}


nettoyerPositions();
sauvegarderPositions();


/* =========================================================
   RÉCUPÉRATION DU COURS
========================================================= */

async function recupererCours(ticker) {
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
        data = await response.json();
    } catch (error) {
        throw new Error(
            "La réponse du serveur est invalide."
        );
    }

    if (!response.ok) {
        const message =
            data &&
            typeof data.error === "string"
                ? data.error
                : "Impossible de récupérer le cours.";

        throw new Error(message);
    }

    const prix = Number(data.price);

    if (
        !Number.isFinite(prix) ||
        prix <= 0
    ) {
        throw new Error(
            "Cours indisponible pour ce ticker."
        );
    }

    return prix;
}


/* =========================================================
   FRACTIONS D'ACTIONS
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

    /*
       On ne prétend pas connaître automatiquement
       l'éligibilité exacte aux fractions d'actions.

       Celle-ci dépend notamment du courtier et
       de l'instrument disponible sur son catalogue.
    */

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
            champMontant.style.display = "flex";
        }

        if (champQuantite) {
            champQuantite.style.display = "none";
        }

    } else {

        if (champQuantite) {
            champQuantite.style.display = "flex";
        }

        if (champMontant) {
            champMontant.style.display = "none";
        }
    }

    recalculerPosition();
}


/* =========================================================
   CALCUL DE LA POSITION
========================================================= */

function recalculerPosition() {
    if (
        !prixAchatInput ||
        !quantiteInput
    ) {
        return;
    }

    const prixAchat =
        parseFloat(prixAchatInput.value);

    const mode =
        modeSaisieSelect
            ? modeSaisieSelect.value
            : "quantite";

    if (
        !Number.isFinite(prixAchat) ||
        prixAchat <= 0
    ) {
        if (calculPosition) {
            calculPosition.textContent =
                "Renseignez un prix d’achat valide.";
        }

        return;
    }


    /* -----------------------------------------------------
       SAISIE PAR MONTANT INVESTI
    ----------------------------------------------------- */

    if (
        mode === "montant" &&
        montantInvestiInput
    ) {
        const montantInvesti =
            parseFloat(
                montantInvestiInput.value
            );

        if (
            !Number.isFinite(montantInvesti) ||
            montantInvesti <= 0
        ) {
            quantiteInput.value = "0";

            if (calculPosition) {
                calculPosition.textContent =
                    "Renseignez le montant investi.";
            }

            return;
        }

        const quantite =
            montantInvesti / prixAchat;

        quantiteInput.value =
            quantite.toFixed(8);

        if (calculPosition) {
            calculPosition.textContent =
                `${formatEuro(montantInvesti)} ÷ ` +
                `${formatEuro(prixAchat)} = ` +
                `${formatQuantite(quantite)} action(s)`;
        }

        return;
    }


    /* -----------------------------------------------------
       SAISIE PAR NOMBRE D'ACTIONS
    ----------------------------------------------------- */

    const quantite =
        parseFloat(
            quantiteInput.value
        );

    if (
        !Number.isFinite(quantite) ||
        quantite <= 0
    ) {
        if (montantInvestiInput) {
            montantInvestiInput.value = "0";
        }

        if (calculPosition) {
            calculPosition.textContent =
                "Renseignez le nombre d’actions.";
        }

        return;
    }

    const montantInvesti =
        prixAchat * quantite;

    if (montantInvestiInput) {
        montantInvestiInput.value =
            montantInvesti.toFixed(2);
    }

    if (calculPosition) {
        calculPosition.textContent =
            `${formatQuantite(quantite)} action(s) × ` +
            `${formatEuro(prixAchat)} = ` +
            `${formatEuro(montantInvesti)}`;
    }
}


/* =========================================================
   CALCUL D'UNE POSITION
========================================================= */

function calculerStatistiquesPosition(position) {
    const quantite =
        Number(position.quantite);

    const cours =
        Number(position.cours);

    const montantInvesti =
        Number(position.montantInvesti);

    const valeurActuelle =
        quantite * cours;

    const gain =
        valeurActuelle - montantInvesti;

    const prixAchatMoyen =
        quantite > 0
            ? montantInvesti / quantite
            : 0;

    const rendement =
        montantInvesti > 0
            ? (gain / montantInvesti) * 100
            : 0;

    return {
        valeurActuelle,
        gain,
        prixAchatMoyen,
        rendement
    };
}


/* =========================================================
   AFFICHAGE DES POSITIONS
========================================================= */

function afficherPositions() {
    if (!listePositions) {
        return;
    }

    listePositions.innerHTML = "";

    let totalInvesti = 0;
    let totalValeur = 0;

    if (positions.length === 0) {
        const messageVide =
            document.createElement("div");

        messageVide.className =
            "portfolio-empty";

        messageVide.innerHTML = `
            <p>
                Aucune position enregistrée pour le moment.
            </p>
        `;

        listePositions.appendChild(
            messageVide
        );
    }


    positions.forEach(
        (position, index) => {

            const statistiques =
                calculerStatistiquesPosition(
                    position
                );

            totalInvesti +=
                position.montantInvesti;

            totalValeur +=
                statistiques.valeurActuelle;

            const positionElement =
                document.createElement("div");

            positionElement.className =
                "position-card";

            const entreprise =
                echapperHTML(
                    position.entreprise
                );

            const ticker =
                echapperHTML(
                    position.ticker
                );

            const courtier =
                echapperHTML(
                    nomCourtier(
                        position.courtier
                    )
                );

            const classeGain =
                statistiques.gain > 0
                    ? "positif"
                    : statistiques.gain < 0
                        ? "negatif"
                        : "neutre";

            positionElement.innerHTML = `
                <div class="position-header">

                    <div>
                        <h3>
                            ${entreprise}
                        </h3>

                        <p class="position-ticker">
                            ${ticker}
                        </p>
                    </div>

                    <span class="courtier-badge">
                        ${courtier}
                    </span>

                </div>

                <div class="position-details">

                    <p>
                        <strong>Nombre d’actions :</strong>
                        ${formatQuantite(position.quantite)}
                    </p>

                    <p>
                        <strong>Prix d’achat moyen :</strong>
                        ${formatEuro(
                            statistiques.prixAchatMoyen
                        )}
                    </p>

                    <p>
                        <strong>Cours actuel :</strong>
                        ${formatEuro(position.cours)}
                    </p>

                    <p>
                        <strong>Montant investi :</strong>
                        ${formatEuro(
                            position.montantInvesti
                        )}
                    </p>

                    <p>
                        <strong>Valeur actuelle :</strong>
                        ${formatEuro(
                            statistiques.valeurActuelle
                        )}
                    </p>

                    <p class="${classeGain}">
                        <strong>Gain / Perte :</strong>
                        ${formatEuro(
                            statistiques.gain
                        )}
                    </p>

                    <p class="${classeGain}">
                        <strong>Rendement :</strong>
                        ${formatPourcentage(
                            statistiques.rendement
                        )}
                    </p>

                </div>

                <div class="position-actions">

                    <button
                        type="button"
                        class="modifier-position"
                        data-index="${index}"
                    >
                        Modifier
                    </button>

                    <button
                        type="button"
                        class="supprimer-position"
                        data-index="${index}"
                    >
                        Supprimer
                    </button>

                </div>
            `;

            listePositions.appendChild(
                positionElement
            );
        }
    );


    /* =====================================================
       TOTAUX DU PORTEFEUILLE
    ===================================================== */

    const totalGain =
        totalValeur - totalInvesti;

    const totalRendement =
        totalInvesti > 0
            ? (totalGain / totalInvesti) * 100
            : 0;


    if (totalInvestiElement) {
        totalInvestiElement.textContent =
            formatEuro(totalInvesti);
    }


    if (totalValeurElement) {
        totalValeurElement.textContent =
            formatEuro(totalValeur);
    }


    if (totalGainElement) {
        totalGainElement.textContent =
            formatEuro(totalGain);

        totalGainElement.classList.remove(
            "positif",
            "negatif",
            "neutre"
        );

        if (totalGain > 0) {
            totalGainElement.classList.add(
                "positif"
            );
        } else if (totalGain < 0) {
            totalGainElement.classList.add(
                "negatif"
            );
        } else {
            totalGainElement.classList.add(
                "neutre"
            );
        }
    }


    if (totalRendementElement) {
        totalRendementElement.textContent =
            formatPourcentage(
                totalRendement
            );

        totalRendementElement.classList.remove(
            "positif",
            "negatif",
            "neutre"
        );

        if (totalRendement > 0) {
            totalRendementElement.classList.add(
                "positif"
            );
        } else if (totalRendement < 0) {
            totalRendementElement.classList.add(
                "negatif"
            );
        } else {
            totalRendementElement.classList.add(
                "neutre"
            );
        }
    }
}


/* =========================================================
   FIN DU BLOC 1/2
   NE RIEN AJOUTER ICI POUR L'INSTANT.
   LE BLOC 2/2 SE COLLE DIRECTEMENT À LA SUITE.
========================================================= */
/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 2/2
========================================================= */


/* =========================================================
   LECTURE ET VALIDATION DU FORMULAIRE
========================================================= */

function lireFormulairePosition() {
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

    const prixAchat =
        prixAchatInput
            ? parseFloat(prixAchatInput.value)
            : NaN;

    const courtier =
        courtierSelect
            ? courtierSelect.value
            : "trade-republic";

    const mode =
        modeSaisieSelect
            ? modeSaisieSelect.value
            : "quantite";

    let quantite = NaN;
    let montantInvesti = NaN;


    /* -----------------------------------------------------
       MODE : SAISIE PAR MONTANT
    ----------------------------------------------------- */

    if (
        mode === "montant" &&
        montantInvestiInput
    ) {
        montantInvesti =
            parseFloat(
                montantInvestiInput.value
            );

        if (
            Number.isFinite(prixAchat) &&
            prixAchat > 0 &&
            Number.isFinite(montantInvesti) &&
            montantInvesti > 0
        ) {
            quantite =
                montantInvesti / prixAchat;
        }
    }


    /* -----------------------------------------------------
       MODE : SAISIE PAR QUANTITÉ
    ----------------------------------------------------- */

    else {
        quantite =
            quantiteInput
                ? parseFloat(
                    quantiteInput.value
                )
                : NaN;

        if (
            Number.isFinite(prixAchat) &&
            prixAchat > 0 &&
            Number.isFinite(quantite) &&
            quantite > 0
        ) {
            montantInvesti =
                prixAchat * quantite;
        }
    }


    return {
        entreprise,
        ticker,
        prixAchat,
        quantite,
        montantInvesti,
        courtier,
        mode
    };
}


/* =========================================================
   VALIDATION
========================================================= */

function validerPosition(donnees) {
    if (!donnees.entreprise) {
        throw new Error(
            "Indiquez le nom de l’entreprise."
        );
    }

    if (!donnees.ticker) {
        throw new Error(
            "Indiquez le ticker de l’action."
        );
    }

    if (
        !Number.isFinite(donnees.prixAchat) ||
        donnees.prixAchat <= 0
    ) {
        throw new Error(
            "Le prix d’achat doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(donnees.quantite) ||
        donnees.quantite <= 0
    ) {
        throw new Error(
            "Le nombre d’actions doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(donnees.montantInvesti) ||
        donnees.montantInvesti <= 0
    ) {
        throw new Error(
            "Le montant investi doit être supérieur à 0."
        );
    }

    return true;
}


/* =========================================================
   REMISE À ZÉRO DU FORMULAIRE
========================================================= */

function reinitialiserFormulaire() {
    if (nomActionInput) {
        nomActionInput.value = "";
    }

    if (tickerInput) {
        tickerInput.value = "";
    }

    if (prixAchatInput) {
        prixAchatInput.value = "0";
    }

    if (quantiteInput) {
        quantiteInput.value = "0";
    }

    if (montantInvestiInput) {
        montantInvestiInput.value = "0";
    }

    if (modeSaisieSelect) {
        modeSaisieSelect.value = "quantite";
    }

    indexEnModification = null;

    if (ajouterPositionButton) {
        ajouterPositionButton.textContent =
            "Ajouter la position";
    }

    if (calculPosition) {
        calculPosition.textContent =
            "Renseignez votre position.";
    }

    mettreAJourModeSaisie();
    mettreAJourInformationFraction();
}


/* =========================================================
   AJOUT / MODIFICATION D'UNE POSITION
========================================================= */

async function ajouterPosition() {
    if (!ajouterPositionButton) {
        return;
    }

    const donnees =
        lireFormulairePosition();

    try {
        validerPosition(donnees);
    } catch (error) {
        alert(error.message);
        return;
    }


    /* -----------------------------------------------------
       ÉTAT DU BOUTON PENDANT LE CHARGEMENT
    ----------------------------------------------------- */

    ajouterPositionButton.disabled = true;

    ajouterPositionButton.textContent =
        "Récupération du cours...";


    try {

        /* -------------------------------------------------
           RÉCUPÉRATION DU COURS ACTUEL
        ------------------------------------------------- */

        const cours =
            await recupererCours(
                donnees.ticker
            );


        const nouvellePosition = {
            entreprise:
                donnees.entreprise,

            ticker:
                donnees.ticker,

            montantInvesti:
                donnees.montantInvesti,

            quantite:
                donnees.quantite,

            cours,

            courtier:
                donnees.courtier
        };


        /* -------------------------------------------------
           MODIFICATION D'UNE POSITION EXISTANTE
        ------------------------------------------------- */

        if (indexEnModification !== null) {

            if (
                positions[indexEnModification]
            ) {
                positions[indexEnModification] =
                    nouvellePosition;
            }

            indexEnModification = null;
        }


        /* -------------------------------------------------
           AJOUT D'UNE NOUVELLE POSITION
        ------------------------------------------------- */

        else {

            /*
               On considère comme même ligne :
               - même ticker
               - même courtier

               Ainsi, NVDA chez Revolut et NVDA chez
               Trade Republic restent deux positions
               distinctes.
            */

            const indexExistant =
                positions.findIndex(
                    position =>
                        position.ticker ===
                            donnees.ticker &&
                        position.courtier ===
                            donnees.courtier
                );


            /* ---------------------------------------------
               POSITION DÉJÀ EXISTANTE :
               CALCUL DU NOUVEAU PRIX MOYEN
               PAR AGRÉGATION DU CAPITAL INVESTI
            --------------------------------------------- */

            if (indexExistant !== -1) {

                const positionExistante =
                    positions[indexExistant];

                const nouveauMontantInvesti =
                    Number(
                        positionExistante.montantInvesti
                    ) +
                    donnees.montantInvesti;

                const nouvelleQuantite =
                    Number(
                        positionExistante.quantite
                    ) +
                    donnees.quantite;

                positions[indexExistant] = {
                    entreprise:
                        donnees.entreprise,

                    ticker:
                        donnees.ticker,

                    montantInvesti:
                        nouveauMontantInvesti,

                    quantite:
                        nouvelleQuantite,

                    cours,

                    courtier:
                        donnees.courtier
                };
            }


            /* ---------------------------------------------
               NOUVELLE POSITION
            --------------------------------------------- */

            else {
                positions.push(
                    nouvellePosition
                );
            }
        }


        sauvegarderPositions();
        afficherPositions();
        reinitialiserFormulaire();

    } catch (error) {

        console.error(
            "Erreur pendant l'ajout de la position :",
            error
        );

        alert(
            `Erreur : ${error.message}`
        );

    } finally {

        ajouterPositionButton.disabled = false;

        if (indexEnModification !== null) {
            ajouterPositionButton.textContent =
                "Enregistrer les modifications";
        } else {
            ajouterPositionButton.textContent =
                "Ajouter la position";
        }
    }
}


/* =========================================================
   MODIFICATION D'UNE POSITION
========================================================= */

function modifierPosition(index) {
    const position =
        positions[index];

    if (!position) {
        return;
    }

    indexEnModification = index;


    /* -----------------------------------------------------
       REMPLISSAGE DU FORMULAIRE
    ----------------------------------------------------- */

    if (nomActionInput) {
        nomActionInput.value =
            position.entreprise;
    }

    if (tickerInput) {
        tickerInput.value =
            position.ticker;
    }

    if (courtierSelect) {
        courtierSelect.value =
            position.courtier ||
            "trade-republic";
    }


    const prixAchatMoyen =
        position.quantite > 0
            ? position.montantInvesti /
                position.quantite
            : 0;


    if (prixAchatInput) {
        prixAchatInput.value =
            prixAchatMoyen.toFixed(2);
    }


    if (quantiteInput) {
        quantiteInput.value =
            Number(
                position.quantite
            ).toFixed(8);
    }


    if (montantInvestiInput) {
        montantInvestiInput.value =
            Number(
                position.montantInvesti
            ).toFixed(2);
    }


    if (modeSaisieSelect) {
        modeSaisieSelect.value =
            "quantite";
    }


    if (ajouterPositionButton) {
        ajouterPositionButton.textContent =
            "Enregistrer les modifications";
    }


    mettreAJourModeSaisie();
    mettreAJourInformationFraction();
    recalculerPosition();


    /* -----------------------------------------------------
       REMONTER VERS LE FORMULAIRE
    ----------------------------------------------------- */

    if (nomActionInput) {
        nomActionInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(() => {
            nomActionInput.focus();
        }, 400);
    }
}


/* =========================================================
   SUPPRESSION D'UNE POSITION
========================================================= */

function supprimerPosition(index) {
    const position =
        positions[index];

    if (!position) {
        return;
    }

    const entreprise =
        position.entreprise ||
        position.ticker;

    const confirmation =
        confirm(
            `Supprimer la position ${entreprise} (${position.ticker}) ?`
        );

    if (!confirmation) {
        return;
    }

    positions.splice(index, 1);


    /* -----------------------------------------------------
       SI ON MODIFIAIT CETTE POSITION
    ----------------------------------------------------- */

    if (indexEnModification === index) {
        reinitialiserFormulaire();
    }

    /*
       Si une position située avant celle en cours
       de modification est supprimée, son index change.
    */

    else if (
        indexEnModification !== null &&
        index < indexEnModification
    ) {
        indexEnModification--;
    }


    sauvegarderPositions();
    afficherPositions();
}


/* =========================================================
   ACTUALISATION DES COURS
========================================================= */

async function actualiserTousLesCours() {
    if (positions.length === 0) {
        return;
    }

    const tickersUniques = [
        ...new Set(
            positions.map(
                position =>
                    position.ticker
            )
        )
    ];


    const coursParTicker = {};


    for (
        const ticker of tickersUniques
    ) {
        try {
            coursParTicker[ticker] =
                await recupererCours(
                    ticker
                );
        } catch (error) {
            console.error(
                `Impossible d'actualiser ${ticker} :`,
                error
            );
        }
    }


    positions = positions.map(
        position => {

            const nouveauCours =
                coursParTicker[
                    position.ticker
                ];

            if (
                Number.isFinite(
                    nouveauCours
                ) &&
                nouveauCours > 0
            ) {
                return {
                    ...position,
                    cours:
                        nouveauCours
                };
            }

            return position;
        }
    );


    sauvegarderPositions();
    afficherPositions();
}


/* =========================================================
   GESTION DES BOUTONS MODIFIER / SUPPRIMER
========================================================= */

if (listePositions) {

    listePositions.addEventListener(
        "click",
        event => {

            const boutonModifier =
                event.target.closest(
                    ".modifier-position"
                );

            if (boutonModifier) {
                const index =
                    Number(
                        boutonModifier.dataset.index
                    );

                if (
                    Number.isInteger(index)
                ) {
                    modifierPosition(index);
                }

                return;
            }


            const boutonSupprimer =
                event.target.closest(
                    ".supprimer-position"
                );

            if (boutonSupprimer) {
                const index =
                    Number(
                        boutonSupprimer.dataset.index
                    );

                if (
                    Number.isInteger(index)
                ) {
                    supprimerPosition(index);
                }
            }
        }
    );
}


/* =========================================================
   ÉVÉNEMENTS DU FORMULAIRE
========================================================= */

if (ajouterPositionButton) {
    ajouterPositionButton.addEventListener(
        "click",
        ajouterPosition
    );
}


if (tickerInput) {

    tickerInput.addEventListener(
        "input",
        () => {

            /*
               Le ticker est automatiquement
               converti en majuscules.
            */

            tickerInput.value =
                tickerInput.value
                    .toUpperCase()
                    .replace(/\s+/g, "");

            mettreAJourInformationFraction();
        }
    );
}


if (courtierSelect) {
    courtierSelect.addEventListener(
        "change",
        mettreAJourInformationFraction
    );
}


if (modeSaisieSelect) {
    modeSaisieSelect.addEventListener(
        "change",
        mettreAJourModeSaisie
    );
}


if (prixAchatInput) {
    prixAchatInput.addEventListener(
        "input",
        recalculerPosition
    );
}


if (quantiteInput) {
    quantiteInput.addEventListener(
        "input",
        () => {

            const mode =
                modeSaisieSelect
                    ? modeSaisieSelect.value
                    : "quantite";

            if (mode === "quantite") {
                recalculerPosition();
            }
        }
    );
}


if (montantInvestiInput) {
    montantInvestiInput.addEventListener(
        "input",
        () => {

            const mode =
                modeSaisieSelect
                    ? modeSaisieSelect.value
                    : "quantite";

            if (mode === "montant") {
                recalculerPosition();
            }
        }
    );
}


/* =========================================================
   TOUCHE ENTRÉE
========================================================= */

const champsFormulaire = [
    nomActionInput,
    tickerInput,
    prixAchatInput,
    quantiteInput,
    montantInvestiInput
].filter(Boolean);


champsFormulaire.forEach(
    champ => {

        champ.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    if (
                        ajouterPositionButton &&
                        !ajouterPositionButton.disabled
                    ) {
                        ajouterPosition();
                    }
                }
            }
        );
    }
);


/* =========================================================
   ACTUALISATION LORSQUE L'APPLICATION REDEVIENT VISIBLE
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {
            /*
               On réaffiche immédiatement les données
               déjà disponibles.

               On ne lance pas automatiquement une
               requête réseau à chaque retour dans
               l'onglet afin d'éviter des appels inutiles.
            */

            afficherPositions();
        }
    }
);


/* =========================================================
   INITIALISATION DE L'APPLICATION
========================================================= */

function initialiserApplication() {

    nettoyerPositions();
    sauvegarderPositions();

    mettreAJourModeSaisie();
    mettreAJourInformationFraction();

    afficherPositions();

    console.log(
        "Tableau de bord d'investissement initialisé."
    );
}


/* =========================================================
   DÉMARRAGE
========================================================= */

initialiserApplication();


/* =========================================================
   FONCTIONS ACCESSIBLES DEPUIS LA CONSOLE
   (UTILE POUR TESTER)
========================================================= */

window.actualiserTousLesCours =
    actualiserTousLesCours;

window.modifierPosition =
    modifierPosition;

window.supprimerPosition =
    supprimerPosition;


/* =========================================================
   FIN DE SCRIPT.JS
========================================================= */
