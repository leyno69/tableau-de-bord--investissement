# Contrôle d’exécution des simulations

Chaque exécution expose un statut, le nombre de lots terminés, la progression, le dernier lot validé, une éventuelle demande d’annulation et un code d’erreur. Une campagne annulée ou échouée ne doit jamais être présentée comme complète. La reprise s’appuie uniquement sur des lots déjà validés.
