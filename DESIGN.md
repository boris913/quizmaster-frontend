# DESIGN.md — Design system Kwizora

Kwizora est un outil de classe : l'enseignant prépare et pilote, les élèves répondent depuis leur téléphone, la classe regarde la projection. L'interface vise la clarté et la sobriété. Elle doit ressembler à un outil durable, pas à une maquette générée.

Les tokens vivent dans [`src/app/globals.css`](src/app/globals.css), en triplets RGB, et sont exposés dans [`tailwind.config.ts`](tailwind.config.ts). Aucune couleur, taille ou ombre ne doit être écrite en dur dans un composant.

## 1. Interdits

- **Aucun emoji dans l'UI** : ni titres, ni boutons, ni badges, ni messages d'état. Utiliser des icônes `lucide-react` (trait uniforme) ou du texte. Les rangs utilisent `RankBadge`.
- **Pas de dégradés décoratifs**, d'ombres lourdes ou de « glass ». Les classes `gradient-primary`, `gradient-text` et `glass` ont été supprimées.
- **Aucune valeur hors tokens** : pas de `#hex`, `bg-white`, `text-gray-*`, `bg-black/…`. Pour un voile neutre, utiliser `bg-ink/[0.04]`, qui s'inverse en mode sombre.
- **Pas de tics de gabarit** : pas de libellés en MAJUSCULES espacées, pas de police à chasse fixe pour les chiffres (`font-display tabular-nums` à la place), pas de mouvement au survol des cartes et des boutons.

## 2. Couleurs

Répartition : 85 à 90 % de neutres, un accent unique, des couleurs sémantiques réservées aux états réels.

| Rôle | Classe Tailwind | Clair | Sombre |
|---|---|---|---|
| Fond de page | `bg-background` | `#f8f9fa` | `#0e1217` |
| Surface (cartes, panneaux) | `bg-surface` | `#ffffff` | `#151a21` |
| Zone secondaire, survol | `bg-subtle` | `#f1f3f5` | `#1b212a` |
| Badge neutre, inactif | `bg-muted` | `#e9ecef` | `#242b35` |
| Bordure standard | `border-borderc` | `#e5e7eb` | `#262d37` |
| Bordure d'input | `border-borderc-strong` | `#d1d5db` | `#353e4a` |
| Texte principal | `text-ink` | `#111827` | `#e8ecf1` |
| Texte secondaire | `text-ink-secondary` | `#4b5563` | `#a3adba` |
| Légendes, placeholders | `text-ink-tertiary` | `#6b7280` | `#8590a0` |
| **Accent** (action, focus, sélection) | `bg-primary`, `text-primary` | `#0b6b7d` | `#5cc3d4` |
| Texte sur accent | `text-on-primary` | blanc | `#062a31` |
| Fond d'état sélectionné | `bg-primary-50` + `text-primary-700` | | |

**Accent bleu pétrole** : il évoque l'encre et le tableau. Son contraste est de 6,2:1 sur blanc. Il se distingue du vert « succès » et du bleu de la réponse B.

**États sémantiques** : `success`, `warning`, `danger`, chacun avec `DEFAULT` (texte), `50` (fond), `100` (bordure) et `solid` (fond plein sous texte blanc, identique dans les deux thèmes).

### Teintes de réponses (le seul endroit expressif)

Les réponses A/B/C/D ont chacune une teinte. Elle sert sur l'écran joueur, la projection et l'histogramme, et nulle part ailleurs. La lettre est **toujours** affichée : la couleur aide à repérer, elle ne porte jamais seule l'information. Toutes les teintes passent 4,5:1 sous du texte blanc.

| | Token | Valeur |
|---|---|---|
| A | `bg-answer-a` | `#c2410c` orange brûlé |
| B | `bg-answer-b` | `#1d4ed8` bleu |
| C | `bg-answer-c` | `#a16207` ocre |
| D | `bg-answer-d` | `#be185d` framboise |

Pour récupérer les classes d'une réponse, passer par `answerTone(id)` ([`src/lib/answerTone.ts`](src/lib/answerTone.ts)).

Médailles du podium : `bg-medal-gold`, `bg-medal-silver`, `bg-medal-bronze`, via `RankBadge`.

## 3. Typographie

- **Titres et chiffres** : Bricolage Grotesque (`font-display`, appliquée d'office à `h1`–`h3`).
- **Texte** : Instrument Sans (`font-sans`, par défaut).
- Échelle : `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-card-title`, `text-body`, `text-small`, `text-caption`.
- Les scores, minuteurs et codes de session s'écrivent en `font-display tabular-nums`.
- Les phrases restent en casse normale, à la voix active, avec le même verbe tout au long d'un parcours.

Ces tailles nommées sont déclarées dans `cn()` ([`src/lib/utils.ts`](src/lib/utils.ts)). Toute nouvelle taille doit y être ajoutée aussi : sinon tailwind-merge la prend pour une couleur et efface la vraie couleur du texte.

## 4. Formes, élévation, mouvement

- Rayons : `rounded-sm` 4 px, `rounded-md` 6 px (contrôles), `rounded-lg` 8 px (cartes). `rounded-xl` (12 px) est réservé aux tuiles de réponse et à la projection.
- Ombres : `shadow-xs` et `shadow-sm` pour les surfaces. `shadow-md` uniquement pour ce qui flotte (menus, modales, aperçu).
- Mouvement : il répond à une action (appui, sélection, révélation du résultat). Le podium final est le moment orchestré. Il n'y a ni effet de survol décoratif ni animation en boucle, et `prefers-reduced-motion` est respecté partout.

## 5. Thèmes

- `next-themes` pose la classe `dark` sur `<html>`. Le thème par défaut suit le système et `ThemeToggle` fixe le choix.
- `.dark` peut aussi être posé sur un conteneur. L'écran de projection et l'aperçu de la page d'accueil sont toujours sombres : c'est plus lisible au vidéoprojecteur.
- Un composant ne teste jamais le thème : il utilise des tokens.

## 6. Logo

Le symbole est la grille de réponses d'un quiz : trois carrés neutres et un disque accent, la bonne réponse. Le nom « kwizora » est en minuscules, en Bricolage Grotesque 700.

- Composants : `<Logo withWordmark />` ou `<LogoMark />` ([`src/components/ui/Logo.tsx`](src/components/ui/Logo.tsx)). Les couleurs suivent le thème.
- Favicon : [`public/favicon.svg`](public/favicon.svg), qui s'adapte au mode sombre du système.
- Taille minimale : 16 px. Ne pas déformer le symbole, ne pas changer la position du disque, ne pas l'ombrer.

## 7. Accessibilité

- Contraste AA minimum : 4,5:1 pour le texte, 3:1 pour les composants.
- Focus clavier visible : anneau accent de 2 px.
- Cibles tactiles d'au moins 44 px.
- La couleur n'est jamais le seul indice (lettres des réponses, libellé « Bonne réponse », icônes de statut).
