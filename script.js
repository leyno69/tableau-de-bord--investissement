/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 1/2
   VERSION DEVISES + CONVERSION EUR + TRAÇABILITÉ FX
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
let indexEnModification = null;

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
   STATUTS DE DEVISE / FX
========================================================= */

function libelleStatutDevise(status) {
    switch (status) {
        case "forte_confiance_usd_action_us":
            return "Devise détectée avec forte confiance";

        case "devise_finnhub_profile_non_garantie_comme_devise_de_cotation":
            return "Devise indiquée par Finnhub, devise de cotation à confirmer";

        case "impossible_a_confirmer":
        default:
            return "Devise impossible à confirmer";
    }
}


function libelleStatutFX(status) {
    switch (status) {
        case "aucune_conversion_necessaire":
            return "Aucune conversion nécessaire";

        case "taux_reference_bce":
            return "Taux de référence BCE";

        case "conversion_impossible_a_confirmer":
            return "Conversion impossible à confirmer";

        default:
            return "Statut de conversion non confirmé";
    }
}


/* =========================================================
   NETTOYAGE / MIGRATION DES ANCIENNES POSITIONS
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

            const coursEUR =
                Number(
                    position.coursEUR ??
                    position.priceEUR ??
                    position.cours
                );

            return (
                Number.isFinite(quantite) &&
                quantite > 0 &&
                Number.isFinite(montantInvesti) &&
                montantInvesti > 0 &&
                Number.isFinite(coursEUR) &&
                coursEUR > 0
            );
        })
        .map(position => {
            const coursEUR =
                Number(
                    position.coursEUR ??
                    position.priceEUR ??
                    position.cours
                );

            const coursOriginal =
                Number(
                    position.coursOriginal ??
                    position.priceOriginal ??
                    position.cours
                );

            const deviseOriginale =
                position.deviseOriginale ||
                position.currencyOriginal ||
                null;

            return {
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

                montantInvesti:
                    Number(position.montantInvesti),

                quantite:
                    Number(position.quantite),

                courtier:
                    position.courtier ||
                    "trade-republic",

                coursEUR,

                coursOriginal:
                    Number.isFinite(coursOriginal)
                        ? coursOriginal
                        : null,

                deviseOriginale,

                deviseStatus:
                    position.deviseStatus ||
                    position.currencyStatus ||
                    "impossible_a_confirmer",

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
                    position.fxStatus ||
                    (
                        deviseOriginale === "EUR"
                            ? "aucune_conversion_necessaire"
                            : "conversion_impossible_a_confirmer"
                    ),

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
                    "Impossible à confirmer sans donnée de transaction ou justificatif du courtier.",

                companyName:
                    position.companyName || null,

                exchange:
                    position.exchange || null,

                country:
                    position.country || null,

                lastMarketTimestamp:
                    position.lastMarketTimestamp || null
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
   RÉCUPÉRATION DES DONNÉES DE MARCHÉ
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

    const priceOriginal =
        Number(data.priceOriginal);

    const priceEUR =
        Number(data.priceEUR);

    const fallbackPrice =
        Number(data.price);

    const deviseOriginale =
        typeof data.currencyOriginal === "string"
            ? data.currencyOriginal
                .trim()
                .toUpperCase()
            : null;


    /*
       IMPORTANT :
       On utilise le prix EUR uniquement si l'API
       a réellement fourni une conversion valide.

       Si la devise est EUR, le prix brut peut servir
       directement.

       Pour une autre devise, aucun prix brut ne sera
       présenté comme un prix EUR.
    */

    const coursEUR =
        Number.isFinite(priceEUR) &&
        priceEUR > 0
            ? priceEUR
            : (
                deviseOriginale === "EUR" &&
                Number.isFinite(fallbackPrice) &&
                fallbackPrice > 0
                    ? fallbackPrice
                    : null
            );


    if (
        !Number.isFinite(priceOriginal) ||
        priceOriginal <= 0
    ) {
        throw new Error(
            "Cours d’origine indisponible pour ce ticker."
        );
    }


    if (
        !Number.isFinite(coursEUR) ||
        coursEUR <= 0
    ) {
        throw new Error(
            "Conversion en euros indisponible ou impossible à confirmer pour ce ticker."
        );
    }


    return {
        symbol:
            data.symbol || symbole,

        companyName:
            data.companyName || null,

        exchange:
            data.exchange || null,

        country:
            data.country || null,

        coursOriginal:
            priceOriginal,

        deviseOriginale,

        deviseStatus:
            data.currencyStatus ||
            "impossible_a_confirmer",

        coursEUR,

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
            data.fxStatus ||
            "conversion_impossible_a_confirmer",

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
            "Impossible à confirmer sans donnée de transaction ou justificatif du courtier.",

        change:
            Number.isFinite(Number(data.change))
                ? Number(data.change)
                : null,

        changePercent:
            Number.isFinite(
                Number(data.changePercent)
            )
                ? Number(data.changePercent)
                : null,

        high:
            Number.isFinite(Number(data.high))
                ? Number(data.high)
                : null,

        low:
            Number.isFinite(Number(data.low))
                ? Number(data.low)
                : null,

        open:
            Number.isFinite(Number(data.open))
                ? Number(data.open)
                : null,

        previousClose:
            Number.isFinite(
                Number(data.previousClose)
            )
                ? Number(data.previousClose)
                : null,

        lastMarketTimestamp:
            data.timestamp || null
    };
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
   CALCUL DE LA POSITION SAISIE
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
       MODE MONTANT
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
       MODE QUANTITÉ
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
   STATISTIQUES D'UNE POSITION
========================================================= */

function calculerStatistiquesPosition(position) {
    const quantite =
        Number(position.quantite);

    const coursEUR =
        Number(position.coursEUR);

    const montantInvesti =
        Number(position.montantInvesti);

    const valorisationDisponible =
        Number.isFinite(coursEUR) &&
        coursEUR > 0;

    const valeurActuelle =
        valorisationDisponible
            ? quantite * coursEUR
            : null;

    const gain =
        valorisationDisponible
            ? valeurActuelle - montantInvesti
            : null;

    const prixAchatMoyen =
        quantite > 0
            ? montantInvesti / quantite
            : 0;

    const rendement =
        valorisationDisponible &&
        montantInvesti > 0
            ? (gain / montantInvesti) * 100
            : null;

    return {
        valorisationDisponible,
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

    let toutesValorisationsDisponibles = true;


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
                Number(position.montantInvesti);

            if (
                statistiques.valorisationDisponible
            ) {
                totalValeur +=
                    statistiques.valeurActuelle;
            } else {
                toutesValorisationsDisponibles =
                    false;
            }


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
                !statistiques.valorisationDisponible
                    ? "neutre"
                    : statistiques.gain > 0
                        ? "positif"
                        : statistiques.gain < 0
                            ? "negatif"
                            : "neutre";


            const deviseOriginale =
                position.deviseOriginale
                    ? echapperHTML(
                        position.deviseOriginale
                    )
                    : "Non confirmée";


            const coursOriginalAffiche =
                Number.isFinite(
                    Number(position.coursOriginal)
                )
                    ? formatMonnaie(
                        position.coursOriginal,
                        position.deviseOriginale
                    )
                    : "—";


            const coursEURAffiche =
                Number.isFinite(
                    Number(position.coursEUR)
                )
                    ? formatEuro(
                        position.coursEUR
                    )
                    : "Impossible à confirmer";


            const fxAffiche =
                Number.isFinite(
                    Number(position.fxRateToEUR)
                )
                    ? formatTaux(
                        position.fxRateToEUR
                    )
                    : "—";


            const fxDate =
                position.fxDate
                    ? echapperHTML(
                        position.fxDate
                    )
                    : "—";


            const fxProvider =
                position.fxProvider
                    ? echapperHTML(
                        position.fxProvider
                    )
                    : "—";


            const brokerRateText =
                position.brokerRateConfirmed
                    ? (
                        Number.isFinite(
                            Number(
                                position.brokerRate
                            )
                        )
                            ? formatTaux(
                                position.brokerRate
                            )
                            : "Confirmé"
                    )
                    : "Impossible à confirmer";


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
                        <strong>Montant investi :</strong>
                        ${formatEuro(
                            position.montantInvesti
                        )}
                    </p>

                    <p>
                        <strong>Cours d’origine :</strong>
                        ${coursOriginalAffiche}
                    </p>

                    <p>
                        <strong>Devise d’origine :</strong>
                        ${deviseOriginale}
                    </p>

                    <p>
                        <strong>Statut devise :</strong>
                        ${echapperHTML(
                            libelleStatutDevise(
                                position.deviseStatus
                            )
                        )}
                    </p>

                    <p>
                        <strong>Cours converti en EUR :</strong>
                        ${coursEURAffiche}
                    </p>

                    <p>
                        <strong>Taux FX utilisé :</strong>
                        ${fxAffiche}
                    </p>

                    <p>
                        <strong>Source FX :</strong>
                        ${fxProvider}
                    </p>

                    <p>
                        <strong>Date du taux FX :</strong>
                        ${fxDate}
                    </p>

                    <p>
                        <strong>Statut conversion :</strong>
                        ${echapperHTML(
                            libelleStatutFX(
                                position.fxStatus
                            )
                        )}
                    </p>

                    <p>
                        <strong>Taux exact courtier :</strong>
                        ${brokerRateText}
                    </p>

                    <p>
                        <strong>Valeur actuelle :</strong>
                        ${
                            statistiques.valorisationDisponible
                                ? formatEuro(
                                    statistiques.valeurActuelle
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p class="${classeGain}">
                        <strong>Gain / Perte :</strong>
                        ${
                            statistiques.valorisationDisponible
                                ? formatEuro(
                                    statistiques.gain
                                )
                                : "Impossible à confirmer"
                        }
                    </p>

                    <p class="${classeGain}">
                        <strong>Rendement :</strong>
                        ${
                            statistiques.valorisationDisponible
                                ? formatPourcentage(
                                    statistiques.rendement
                                )
                                : "Impossible à confirmer"
                        }
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
       TOTAUX
    ===================================================== */

    const totalGain =
        toutesValorisationsDisponibles
            ? totalValeur - totalInvesti
            : null;

    const totalRendement =
        toutesValorisationsDisponibles &&
        totalInvesti > 0
            ? (totalGain / totalInvesti) * 100
            : null;


    if (totalInvestiElement) {
        totalInvestiElement.textContent =
            formatEuro(totalInvesti);
    }


    if (totalValeurElement) {
        totalValeurElement.textContent =
            toutesValorisationsDisponibles
                ? formatEuro(totalValeur)
                : "Partiellement indisponible";
    }


    if (totalGainElement) {
        totalGainElement.textContent =
            toutesValorisationsDisponibles
                ? formatEuro(totalGain)
                : "Impossible à confirmer";

        totalGainElement.classList.remove(
            "positif",
            "negatif",
            "neutre"
        );

        if (
            toutesValorisationsDisponibles &&
            totalGain > 0
        ) {
            totalGainElement.classList.add(
                "positif"
            );
        } else if (
            toutesValorisationsDisponibles &&
            totalGain < 0
        ) {
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
            toutesValorisationsDisponibles
                ? formatPourcentage(
                    totalRendement
                )
                : "Impossible à confirmer";

        totalRendementElement.classList.remove(
            "positif",
            "negatif",
            "neutre"
        );

        if (
            toutesValorisationsDisponibles &&
            totalRendement > 0
        ) {
            totalRendementElement.classList.add(
                "positif"
            );
        } else if (
            toutesValorisationsDisponibles &&
            totalRendement < 0
        ) {
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

   COLLER LE BLOC 2/2 DIRECTEMENT À LA SUITE.
========================================================= */
/* =========================================================
   TABLEAU DE BORD D'INVESTISSEMENT
   SCRIPT.JS — BLOC 2/2
========================================================= */


/* =========================================================
   LECTURE DU FORMULAIRE
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
            ? parseFloat(
                prixAchatInput.value
            )
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
       MODE MONTANT
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
                montantInvesti /
                prixAchat;
        }
    }


    /* -----------------------------------------------------
       MODE QUANTITÉ
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
                prixAchat *
                quantite;
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
        !Number.isFinite(
            donnees.prixAchat
        ) ||
        donnees.prixAchat <= 0
    ) {
        throw new Error(
            "Le prix d’achat doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(
            donnees.quantite
        ) ||
        donnees.quantite <= 0
    ) {
        throw new Error(
            "Le nombre d’actions doit être supérieur à 0."
        );
    }

    if (
        !Number.isFinite(
            donnees.montantInvesti
        ) ||
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
        modeSaisieSelect.value =
            "quantite";
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
   CONSTRUCTION D'UNE POSITION AVEC DONNÉES DE MARCHÉ
========================================================= */

function construirePosition(
    donnees,
    marche
) {
    return {
        entreprise:
            donnees.entreprise,

        ticker:
            donnees.ticker,

        montantInvesti:
            donnees.montantInvesti,

        quantite:
            donnees.quantite,

        courtier:
            donnees.courtier,

        coursOriginal:
            marche.coursOriginal,

        deviseOriginale:
            marche.deviseOriginale,

        deviseStatus:
            marche.deviseStatus,

        coursEUR:
            marche.coursEUR,

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

        companyName:
            marche.companyName,

        exchange:
            marche.exchange,

        country:
            marche.country,

        lastMarketTimestamp:
            marche.lastMarketTimestamp
    };
}


/* =========================================================
   AJOUT / MODIFICATION
========================================================= */

async function ajouterPosition() {
    if (!ajouterPositionButton) {
        return;
    }

    const donnees =
        lireFormulairePosition();

    try {
        validerPosition(
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

        /* -------------------------------------------------
           DONNÉES DE MARCHÉ
        ------------------------------------------------- */

        const marche =
            await recupererCours(
                donnees.ticker
            );


        const nouvellePosition =
            construirePosition(
                donnees,
                marche
            );


        /* -------------------------------------------------
           MODIFICATION
        ------------------------------------------------- */

        if (
            indexEnModification !== null
        ) {
            if (
                positions[
                    indexEnModification
                ]
            ) {
                positions[
                    indexEnModification
                ] =
                    nouvellePosition;
            }

            indexEnModification =
                null;
        }


        /* -------------------------------------------------
           AJOUT
        ------------------------------------------------- */

        else {

            /*
               Une même action détenue chez deux
               courtiers reste séparée.

               Même ticker + même courtier =
               agrégation dans la même position.
            */

            const indexExistant =
                positions.findIndex(
                    position =>
                        position.ticker ===
                            donnees.ticker &&
                        position.courtier ===
                            donnees.courtier
                );


            if (indexExistant !== -1) {
                const positionExistante =
                    positions[
                        indexExistant
                    ];


                const nouveauMontantInvesti =
                    Number(
                        positionExistante
                            .montantInvesti
                    ) +
                    donnees.montantInvesti;


                const nouvelleQuantite =
                    Number(
                        positionExistante
                            .quantite
                    ) +
                    donnees.quantite;


                positions[
                    indexExistant
                ] = {
                    ...nouvellePosition,

                    montantInvesti:
                        nouveauMontantInvesti,

                    quantite:
                        nouvelleQuantite
                };
            } else {
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

        ajouterPositionButton.disabled =
            false;

        if (
            indexEnModification !== null
        ) {
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

    indexEnModification =
        index;


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
        Number(position.quantite) > 0
            ? Number(
                position.montantInvesti
            ) /
            Number(
                position.quantite
            )
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


    if (nomActionInput) {
        nomActionInput.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        setTimeout(
            () => {
                nomActionInput.focus();
            },
            400
        );
    }
}


/* =========================================================
   SUPPRESSION
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


    positions.splice(
        index,
        1
    );


    if (
        indexEnModification === index
    ) {
        reinitialiserFormulaire();
    } else if (
        indexEnModification !== null &&
        index < indexEnModification
    ) {
        indexEnModification--;
    }


    sauvegarderPositions();
    afficherPositions();
}


/* =========================================================
   ACTUALISATION DE TOUS LES COURS
========================================================= */

async function actualiserTousLesCours() {
    if (
        positions.length === 0
    ) {
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


    const marcheParTicker = {};


    for (
        const ticker of tickersUniques
    ) {
        try {
            marcheParTicker[
                ticker
            ] =
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


    positions =
        positions.map(
            position => {

                const marche =
                    marcheParTicker[
                        position.ticker
                    ];


                if (!marche) {
                    return position;
                }


                return {
                    ...position,

                    coursOriginal:
                        marche.coursOriginal,

                    deviseOriginale:
                        marche.deviseOriginale,

                    deviseStatus:
                        marche.deviseStatus,

                    coursEUR:
                        marche.coursEUR,

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

                    companyName:
                        marche.companyName,

                    exchange:
                        marche.exchange,

                    country:
                        marche.country,

                    lastMarketTimestamp:
                        marche.lastMarketTimestamp
                };
            }
        );


    sauvegarderPositions();
    afficherPositions();
}


/* =========================================================
   BOUTONS MODIFIER / SUPPRIMER
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
                        boutonModifier
                            .dataset
                            .index
                    );

                if (
                    Number.isInteger(index)
                ) {
                    modifierPosition(
                        index
                    );
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
                        boutonSupprimer
                            .dataset
                            .index
                    );

                if (
                    Number.isInteger(index)
                ) {
                    supprimerPosition(
                        index
                    );
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

            if (
                mode === "quantite"
            ) {
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

            if (
                mode === "montant"
            ) {
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

                if (
                    event.key === "Enter"
                ) {
                    event.preventDefault();

                    if (
                        ajouterPositionButton &&
                        !ajouterPositionButton
                            .disabled
                    ) {
                        ajouterPosition();
                    }
                }
            }
        );
    }
);


/* =========================================================
   RETOUR SUR L'APPLICATION
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {
            afficherPositions();
        }
    }
);


/* =========================================================
   INITIALISATION
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
