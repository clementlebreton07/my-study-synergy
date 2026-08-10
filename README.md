# Study Navigator

Je veux créer une application web personnelle de gestion complète de mes études.

IMPORTANT :

Je ne suis pas développeur.

Je veux une application réellement fonctionnelle, pas seulement une maquette.

Construis l'application progressivement et proprement.

L'interface doit être moderne, claire, très intuitive et agréable à utiliser quotidiennement.

L'application doit être responsive pour ordinateur, tablette et téléphone.

Ne me demande pas de coder moi-même.

Quand une décision technique est nécessaire, choisis la solution la plus simple, fiable et adaptée à une application personnelle.

Ne crée pas de fonctionnalités fictives ou de faux boutons : les fonctionnalités affichées doivent fonctionner.

OBJECTIF DE L'APPLICATION

Je veux une sorte de "système d'exploitation personnel pour mes études".

Je veux pouvoir importer mes cours, exercices et documents, les organiser automatiquement par matière et chapitre, suivre ma progression, renseigner mon emploi du temps et mes examens, puis laisser l'application me dire chaque jour exactement ce que je dois faire pour rester à jour et être prêt pour mes examens.

L'objectif final est que je n'aie quasiment plus rien à organiser moi-même.

STRUCTURE PRINCIPALE

L'application doit avoir une navigation principale avec :

Accueil

Mes matières

Mes cours

Exercices

Planning

Tâches

Examens

Progression

Assistant IA

Paramètres

1. PAGE D'ACCUEIL

Créer un tableau de bord personnel.

Afficher :

Bonjour + prénom

Date du jour

Résumé de la journée

Nombre d'heures de travail prévues

Tâches du jour

Prochain cours

Prochain examen

Progression globale

Progression par matière

Tâches en retard

Alertes importantes

Bouton "Importer un cours"

Bouton "Ajouter une tâche"

Bouton "Ajouter un examen"

La page doit répondre visuellement à la question :

"Qu'est-ce que je dois faire aujourd'hui ?"

2. MATIÈRES

Créer une page permettant de créer et gérer mes matières.

Chaque matière doit avoir :

Nom

Description

Couleur

Professeur éventuellement

Nombre de chapitres

Progression

Prochaine échéance

Quand j'ouvre une matière, je dois voir ses chapitres.

Exemple :

Mathématiques

Chapitre 1 — Fonctions

Chapitre 2 — Dérivées

Chapitre 3 — Intégrales

Chaque chapitre doit pouvoir contenir :

Cours

Documents

Exercices

Notes

Fiches de révision

Flashcards

Progression

3. IMPORT DES COURS

Créer une fonctionnalité permettant d'importer des fichiers.

Formats à prévoir :

PDF

DOCX

PPTX

Images

Je dois pouvoir glisser-déposer un document.

Lorsqu'un document est importé, l'application doit prévoir un processus d'analyse IA permettant à terme de :

identifier la matière

identifier le chapitre

identifier les sous-parties

extraire les notions importantes

détecter les définitions

détecter les formules

générer un résumé

générer une fiche de révision

générer des flashcards

générer des questions de révision

Pour la V1, construis déjà toute l'interface et la structure de données nécessaires à cette fonctionnalité.

Ne prétends pas que l'analyse IA fonctionne si elle n'est pas encore connectée à une API.

4. EXERCICES

Créer une section dédiée aux exercices.

Chaque exercice doit pouvoir être associé à :

une matière

un chapitre

une difficulté

une date

un statut

Statuts :

À faire

En cours

Réussi

À revoir

Je veux pouvoir noter mes difficultés.

Exemple :

"Je n'ai pas compris la question 3."

Ces informations devront pouvoir être utilisées plus tard par le système de progression et l'IA.

5. PLANNING

Créer un calendrier permettant d'afficher :

mes cours

mes sessions de travail

mes examens

mes devoirs

mes tâches

Prévoir des vues :

journée

semaine

mois

Je dois pouvoir renseigner mes horaires habituels de cours et mes périodes disponibles pour travailler.

6. TÂCHES

Créer une vraie to-do list liée aux études.

Chaque tâche doit avoir :

titre

matière

chapitre éventuellement

durée estimée

priorité

date prévue

échéance

statut

Priorités :

faible

normale

importante

urgente

Statuts :

à faire

en cours

terminée

Je veux pouvoir marquer rapidement une tâche comme terminée.

7. EXAMENS

Créer une section permettant d'ajouter mes examens.

Chaque examen doit avoir :

matière

date

heure éventuellement

lieu éventuellement

chapitres concernés

importance

niveau de préparation

L'application doit afficher un compte à rebours avant chaque examen.

Exemple :

"Mathématiques — dans 23 jours"

8. PROGRESSION

Créer un système de progression.

Pour chaque matière :

progression globale

chapitres maîtrisés

chapitres en cours

chapitres non commencés

exercices réalisés

exercices à revoir

Créer une visualisation claire.

Je veux pouvoir voir rapidement où je suis en retard.

Prévoir également un niveau de maîtrise par chapitre :

Non commencé

Découverte

En apprentissage

Compris

Maîtrisé

9. PLANIFICATION INTELLIGENTE

C'est une fonctionnalité centrale de l'application.

À terme, l'application devra être capable de prendre en compte :

mon emploi du temps

mes disponibilités

mes examens

mes devoirs

mes tâches

mes chapitres

ma progression

mes difficultés

le temps estimé pour chaque tâche

la priorité des matières

Puis proposer automatiquement un planning quotidien.

Exemple :

AUJOURD'HUI

17h30 — 18h15
Mathématiques
Exercices chapitre 3

18h25 — 19h00
Économie
Réviser chapitre 2

19h00 — 19h20
Révision espacée

Afficher le temps total prévu.

L'application doit chercher à éviter de surcharger une journée.

À terme, si une tâche n'est pas réalisée, le système devra pouvoir réorganiser automatiquement les jours suivants.

10. ASSISTANT IA

Créer une interface d'assistant IA.

Je veux pouvoir lui poser des questions sur mes cours.

Exemples :

"Explique-moi cette notion."

"Résume ce chapitre."

"Donne-moi 10 questions pour vérifier si j'ai compris."

"Qu'est-ce que je dois travailler aujourd'hui ?"

"Je suis en retard, réorganise mon planning."

"Mon examen est dans 15 jours, suis-je prêt ?"

L'assistant devra à terme pouvoir utiliser mes cours et mes données personnelles d'études comme contexte.

11. DESIGN

Je veux un design :

moderne

minimaliste

professionnel

très lisible

pas surchargé

orienté productivité

agréable à utiliser tous les jours

Créer une vraie hiérarchie visuelle.

Le tableau de bord doit mettre en avant les informations importantes.

Prévoir un mode sombre.

12. ARCHITECTURE DES DONNÉES

Prévoir une structure propre pour :

utilisateurs

matières

chapitres

cours

documents

exercices

tâches

examens

événements

sessions de travail

progression

notes

flashcards

questions

préférences utilisateur

Les relations entre ces données doivent être cohérentes.

13. PRIORITÉ DE DÉVELOPPEMENT

Ne cherche pas à tout développer simultanément.

Construis d'abord une V1 fonctionnelle avec :

authentification

tableau de bord

matières

chapitres

import de documents

tâches

examens

calendrier

progression

Puis nous ajouterons :

analyse IA des documents

assistant IA

génération de fiches

flashcards

quiz

planification automatique

réorganisation automatique du planning

Je veux pouvoir tester chaque étape avant de passer à la suivante.

COMMENCE PAR CONSTRUIRE LA V1 FONCTIONNELLE.
Ne fais pas seulement une présentation visuelle.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2d05a389-df33-403d-95a3-bafbaf990660).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
