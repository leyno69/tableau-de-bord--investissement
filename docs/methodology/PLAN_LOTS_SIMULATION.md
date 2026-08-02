# Exécution par lots

Les grandes campagnes sont découpées en lots déterministes afin de limiter la mémoire, rendre la progression observable, permettre l’annulation et reprendre un traitement sans recommencer les lots validés. La concurrence maximale est explicite et ne doit pas modifier les résultats d’une graine donnée.
