const nomActionInput = document.getElementById("nomAction");
const tickerInput = document.getElementById("ticker");
const montantInvestiInput = document.getElementById("montantInvesti");
const valeurActuelleInput = document.getElementById("valeurActuelle");
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

function afficherPositions() {
    listePositions.innerHTML = "";

    let totalInvesti = 0;
    let totalValeur = 0;

    positions.forEach((position, index) => {
        const gain = position.valeurActuelle - position.montantInvesti;
        const rendement =
            position.montantInvesti > 0
                ? (gain / position.montantInvesti) * 100
                : 0;

        totalInvesti += position.montantInvesti;
        totalValeur += position.valeurActuelle;

        const positionElement = document.createElement("div");

        positionElement.innerHTML = `
            <h3>${position.entreprise} (${position.ticker})</h3>
            <p>Investi : ${position.montantInvesti.toFixed(2)} €</p>
            <p>Valeur actuelle : ${position.valeurActuelle.toFixed(2)} €</p>
            <p>Gain / Perte : ${gain.toFixed(2)} €</p>
            <p>Rendement : ${rendement.toFixed(2)} %</p>
            <button onclick="supprimerPosition(${index})">Supprimer</button>
            <hr>
        `;

        listePositions.appendChild(positionElement);
    });

    const totalGain = totalValeur - totalInvesti;
    const totalRendement =
        totalInvesti > 0 ? (totalGain / totalInvesti) * 100 : 0;

    totalInvestiElement.textContent = `${totalInvesti.toFixed(2)} €`;
    totalValeurElement.textContent = `${totalValeur.toFixed(2)} €`;
    totalGainElement.textContent = `${totalGain.toFixed(2)} €`;
    totalRendementElement.textContent = `${totalRendement.toFixed(2)} %`;
}

function ajouterPosition() {
    const entreprise = nomActionInput.value.trim();
    const ticker = tickerInput.value.trim().toUpperCase();
    const montantInvesti = parseFloat(montantInvestiInput.value);
    const valeurActuelle = parseFloat(valeurActuelleInput.value);

    if (
        entreprise === "" ||
        ticker === "" ||
        isNaN(montantInvesti) ||
        isNaN(valeurActuelle)
    ) {
        alert("Merci de remplir tous les champs.");
        return;
    }

    positions.push({
        entreprise,
        ticker,
        montantInvesti,
        valeurActuelle
    });

    sauvegarderPositions();
    afficherPositions();

    nomActionInput.value = "";
    tickerInput.value = "";
    montantInvestiInput.value = "0";
    valeurActuelleInput.value = "0";
}

function supprimerPosition(index) {
    positions.splice(index, 1);
    sauvegarderPositions();
    afficherPositions();
}

ajouterPositionButton.addEventListener("click", ajouterPosition);

afficherPositions();
