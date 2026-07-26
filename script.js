const investiInput = document.getElementById("investi");
const valeurInput = document.getElementById("valeur");
const gainElement = document.getElementById("gain");
const rendementElement = document.getElementById("rendement");

function calculerPortefeuille() {
    const investi = parseFloat(investiInput.value) || 0;
    const valeur = parseFloat(valeurInput.value) || 0;

    const gain = valeur - investi;
    const rendement = investi > 0 ? (gain / investi) * 100 : 0;

    gainElement.textContent = `${gain.toFixed(2)} €`;
    rendementElement.textContent = `${rendement.toFixed(2)} %`;
}

investiInput.addEventListener("input", calculerPortefeuille);
valeurInput.addEventListener("input", calculerPortefeuille);

calculerPortefeuille();
