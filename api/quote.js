export default async function handler(req, res) {
    const symbol = String(
        req.query.symbol || ""
    )
        .trim()
        .toUpperCase();

    if (!symbol) {
        return res.status(400).json({
            error: "Le ticker est obligatoire."
        });
    }

    const apiKey =
        process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Clé Finnhub non configurée."
        });
    }

    try {
        /* =====================================================
           1. COURS ACTUEL FINNHUB
        ===================================================== */

        const quoteUrl =
            "https://finnhub.io/api/v1/quote" +
            `?symbol=${encodeURIComponent(symbol)}` +
            `&token=${encodeURIComponent(apiKey)}`;

        const quoteResponse =
            await fetch(quoteUrl);

        if (!quoteResponse.ok) {
            const errorText =
                await quoteResponse.text();

            return res
                .status(quoteResponse.status)
                .json({
                    error:
                        "Erreur Finnhub lors de la récupération du cours.",
                    details:
                        errorText
                });
        }

        const quoteData =
            await quoteResponse.json();

        const priceOriginal =
            Number(quoteData.c);

        if (
            !Number.isFinite(priceOriginal) ||
            priceOriginal <= 0
        ) {
            return res.status(404).json({
                error:
                    "Cours indisponible pour ce ticker."
            });
        }


        /* =====================================================
           2. PROFIL ENTREPRISE / DEVISE
        ===================================================== */

        let currencyOriginal = null;
        let currencyStatus =
            "impossible_a_confirmer";

        let companyName = null;
        let exchange = null;
        let country = null;

        try {
            const profileUrl =
                "https://finnhub.io/api/v1/stock/profile2" +
                `?symbol=${encodeURIComponent(symbol)}` +
                `&token=${encodeURIComponent(apiKey)}`;

            const profileResponse =
                await fetch(profileUrl);

            if (profileResponse.ok) {
                const profileData =
                    await profileResponse.json();

                if (
                    profileData &&
                    typeof profileData === "object"
                ) {
                    if (
                        typeof profileData.currency ===
                            "string" &&
                        profileData.currency.trim()
                    ) {
                        currencyOriginal =
                            profileData.currency
                                .trim()
                                .toUpperCase();

                        /*
                           ATTENTION :
                           Finnhub décrit ce champ comme
                           "Currency used in company filings".

                           On l'utilise donc comme indication
                           documentée, mais PAS comme preuve absolue
                           de la devise de cotation.
                        */
                        currencyStatus =
                            "devise_finnhub_profile_non_garantie_comme_devise_de_cotation";
                    }

                    if (
                        typeof profileData.name ===
                        "string"
                    ) {
                        companyName =
                            profileData.name;
                    }

                    if (
                        typeof profileData.exchange ===
                        "string"
                    ) {
                        exchange =
                            profileData.exchange;
                    }

                    if (
                        typeof profileData.country ===
                        "string"
                    ) {
                        country =
                            profileData.country;
                    }
                }
            }
        } catch (profileError) {
            console.error(
                "Erreur profil Finnhub :",
                profileError
            );
        }


        /* =====================================================
           3. CAS PARTICULIER DES ACTIONS US
        ===================================================== */

        /*
           Finnhub documente /quote comme endpoint de
           cotation temps réel pour les actions US.

           Pour un profil US avec devise USD,
           on peut renforcer notre niveau de confiance,
           sans prétendre disposer du taux exact du courtier.
        */

        if (
            country === "US" &&
            currencyOriginal === "USD"
        ) {
            currencyStatus =
                "forte_confiance_usd_action_us";
        }


        /* =====================================================
           4. CONVERSION VERS EUR
        ===================================================== */

        let priceEUR = null;
        let fxRateToEUR = null;
        let fxDate = null;
        let fxProvider = null;
        let fxStatus = null;

        /*
           Si la devise est déjà EUR :
           aucune conversion.
        */

        if (currencyOriginal === "EUR") {
            priceEUR =
                priceOriginal;

            fxRateToEUR =
                1;

            fxProvider =
                "Aucune conversion";

            fxStatus =
                "aucune_conversion_necessaire";
        }


        /*
           Si une devise est connue et différente de EUR :
           taux de référence BCE via Frankfurter.
        */

        else if (currencyOriginal) {
            try {
                const fxUrl =
                    "https://api.frankfurter.dev/v2/rates" +
                    `?base=${encodeURIComponent(currencyOriginal)}` +
                    "&quotes=EUR" +
                    "&providers=ECB";

                const fxResponse =
                    await fetch(fxUrl);

                if (fxResponse.ok) {
                    const fxData =
                        await fxResponse.json();

                    /*
                       Frankfurter v2 renvoie normalement
                       un tableau de taux.
                    */

                    const taux =
                        Array.isArray(fxData)
                            ? fxData.find(
                                item =>
                                    item &&
                                    item.base ===
                                        currencyOriginal &&
                                    item.quote === "EUR"
                            )
                            : null;

                    if (
                        taux &&
                        Number.isFinite(
                            Number(taux.rate)
                        ) &&
                        Number(taux.rate) > 0
                    ) {
                        fxRateToEUR =
                            Number(taux.rate);

                        fxDate =
                            taux.date || null;

                        fxProvider =
                            "ECB";

                        fxStatus =
                            "taux_reference_bce";

                        priceEUR =
                            priceOriginal *
                            fxRateToEUR;
                    }
                }
            } catch (fxError) {
                console.error(
                    "Erreur conversion FX :",
                    fxError
                );
            }
        }


        /* =====================================================
           5. SI CONVERSION IMPOSSIBLE
        ===================================================== */

        if (
            currencyOriginal !== "EUR" &&
            !Number.isFinite(priceEUR)
        ) {
            fxStatus =
                "conversion_impossible_a_confirmer";
        }


        /* =====================================================
           6. RÉPONSE API
        ===================================================== */

        return res.status(200).json({
            symbol,

            companyName,
            exchange,
            country,

            /*
             * Cours brut Finnhub
             */
            priceOriginal,

            /*
             * Compatibilité avec ton ancien script.
             * Pour l'instant :
             * - EUR si conversion disponible
             * - sinon cours brut
             *
             * On modifiera ensuite script.js pour utiliser
             * explicitement priceEUR et ne plus dépendre
             * de ce champ générique.
             */
            price:
                Number.isFinite(priceEUR)
                    ? priceEUR
                    : priceOriginal,

            /*
             * Devise
             */
            currencyOriginal,
            currencyStatus,

            /*
             * Conversion EUR
             */
            priceEUR:
                Number.isFinite(priceEUR)
                    ? priceEUR
                    : null,

            fxRateToEUR,
            fxDate,
            fxProvider,
            fxStatus,

            /*
             * Taux exact courtier :
             * volontairement NON inventé.
             */
            brokerRateConfirmed:
                false,

            brokerRate:
                null,

            brokerRateMessage:
                "Impossible à confirmer sans donnée de transaction ou justificatif du courtier.",

            /*
             * Données de marché Finnhub
             */
            change:
                Number(quoteData.d),

            changePercent:
                Number(quoteData.dp),

            high:
                Number(quoteData.h),

            low:
                Number(quoteData.l),

            open:
                Number(quoteData.o),

            previousClose:
                Number(quoteData.pc),

            timestamp:
                quoteData.t || null
        });

    } catch (error) {
        console.error(
            "Erreur quote API :",
            error
        );

        return res.status(500).json({
            error:
                "Impossible de récupérer les données de marché."
        });
    }
}
