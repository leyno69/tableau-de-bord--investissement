const nomActionInput = document.getElementById("nomAction");
const tickerInput = document.getElementById("ticker");
const montantInvestiInput = document.getElementById("montantInvesti");
const quantiteInput = document.getElementById("quantite");
const ajouterPositionButton = document.getElementById("ajouterPosition");

const listePositions = document.getElementById("listePositions");
const totalInvestiElement = document.getElementById("totalInvesti");
const totalValeurElement = document.getElementById("totalValeur");
const totalGainElement = document.getElementById("totalGain");
const totalRendementElement = document.getElementById("totalRendement");

let positions = JSON.parse(localStorage.getItem("positions")) || [];

function sauvegarderPositions() {
    localStorage.setItem("positions", JSON.stringify(positions));
}

async function recupererCours(ticker) {
    const response = await fetch(
        `/api/quote?symbol=${encodeURIComponent(ticker)}`
    );

    if (!response.ok) {
        throw new Error("Impossible de récupérer le cours.");
    }

    const data = await response.json();

    if (!data.price || data.price <= 0) {
        throw new Error("Cours indisponible.");
    }

    return data.price;
}

function afficherPositions() {
    listePositions.innerHTML = "";

    let totalInvesti = 0;
    let totalValeur = 0;

    positions.forEach((position, index) => {
        const valeurActuelle = position.quantite * position.cours;
        const gain = valeurActuelle - position.montantInvesti;

        const rendement =
            position.montantInvesti > 0
                ? (gain / position.montantInvesti) * 100
                : 0;

        totalInvesti += position.montantInvesti;
        totalValeur += valeurActuelle;

        const positionElement = document.createElement("div");

        positionElement.innerHTML = `
            <h3>${position.entreprise} (${position.ticker})</h3>
            <p>Nombre d'actions : ${position.quantite}</p>
            <p>Cours actuel : ${position.cours.toFixed(2)} €</p>
            <p>Investi : ${position.montantInvesti.toFixed(2)} €</p>
            <p>Valeur actuelle : ${valeurActuelle.toFixed(2)} €</p>
            <p>Gain / Perte : ${gain.toFixed(2)} €</p>
            <p>Rendement : ${rendement.toFixed(2)} %</p>
            <button onclick="supprimerPosition(${index})">Supprimer</button>
            <hr>
        `;

        listePositions.appendChild(positionElement);
    });

    const totalGain = totalValeur - totalInvesti;

    const totalRendement =
        totalInvesti > 0
            ? (totalGain / totalInvesti) * 100
            : 0;

    totalInvestiElement.textContent = `${totalInvesti.toFixed(2)} €`;
    totalValeurElement.textContent = `${totalValeur.toFixed(2)} €`;
    totalGainElement.textContent = `${totalGain.toFixed(2)} €`;
    totalRendementElement.textContent = `${totalRendement.toFixed(2)} %`;
}

async function ajouterPosition() {
    const entreprise = nomActionInput.value.trim();
    const ticker = tickerInput.value.trim().toUpperCase();
    const montantInvesti = parseFloat(montantInvestiInput.value);
    const quantite = parseFloat(quantiteInput.value);

    if (
        entreprise === "" ||
        ticker === "" ||
        isNaN(montantInvesti) ||
        montantInvesti <= 0 ||
        isNaN(quantite) ||
        quantite <= 0
    ) {
        alert("Merci de remplir correctement tous les champs.");
        return;
    }

    ajouterPositionButton.disabled = true;
    ajouterPositionButton.textContent = "Récupération du cours...";

    try {
        const cours = await recupererCours(ticker);

        positions.push({
            entreprise,
            ticker,
            montantInvesti,
            quantite,
            cours
        });

        sauvegarderPositions();
        afficherPositions();

        nomActionInput.value = "";
        tickerInput.value = "";
        montantInvestiInput.value = "0";
        quantiteInput.value = "0";
   } catch (error) {
   alert(`Erreur : ${error.message}`);
    console.error(error);
} finally {
        ajouterPositionButton.disabled = false;
        ajouterPositionButton.textContent = "Ajouter la position";
    }
}

function supprimerPosition(index) {
    positions.splice(index, 1);
    sauvegarderPositions();
    afficherPositions();
}

ajouterPositionButton.addEventListener("click", ajouterPosition);

afficherPositions();
