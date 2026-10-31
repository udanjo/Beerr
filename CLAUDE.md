# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BeeRR is a gym-workout tracker (Expo SDK 58 / React Native 0.88 / React 19, TypeScript strict), UI in pt-BR, dark theme with neon green, modeled on the BeFit app. It is meant to run on a phone via Expo Go. `AGENTS.md` holds the Expo rules (use `npx expo install`, fetch versioned docs instead of trusting memory); read it too.

## Commands

```bash
npx expo start                      # dev server; scan QR with Expo Go
npx tsc --noEmit                    # typecheck — the only automated check
npx expo export --platform android  # bundle check (catches Metro/import errors tsc misses)
```

There is no lint config and no test runner set up, so `expo lint` and test commands don't apply yet. Typecheck before calling a task done. The Chrome extension was not connected in past sessions, so UI changes have usually been verified only by tsc/bundle; say so when that is the case.

## Architecture

**Navigation is state-based, not Expo Router** (despite what `AGENTS.md` says). `src/app/AppShell.tsx` owns the tab state (`plan` / `history` / `progress` / `library`; progress is computed only from saved sessions via `sessions/services/progressStats.ts`) and an `ActiveTraining` state. All three tabs stay mounted and are hidden with `display: 'none'` so plan/day selection and search state survive tab switches; the workout session is an absolute overlay on top. Don't introduce routes without changing this deliberately.

Feature folders under `src/features/` (`plans`, `exercises`, `sessions`) each have `screens/ components/ hooks/ services/ types.ts`. `src/shared/` has the theme tokens (`theme/index.ts`: `darkColors`/`lightColors` palettes, spacing, radius, fontSize, fonts — always use these; colors are NOT a static import: components call `useThemedStyles(makeStyles)` from `theme/ThemeContext.tsx` and define `const makeStyles = (colors: Palette) => StyleSheet.create(...)`. Use `colors.accent` for text/icons/borders in the highlight green and `colors.primary` only as a fill) and reusable components (`BottomSheet`, `PrimaryButton`, `SegmentedTabs`, `TabBar`, `WheelPicker`, `SetValueSheet`).

**Data flow**
- `usePlans` (owned by `PlanScreen`) and `useSessions` (owned by `AppShell`) persist to AsyncStorage under `@beerr/plans` and `@beerr/sessions`. Plan → days (`PlanDay`, with muscle groups) → exercises → per-set `PlannedSet {reps, weight}` plus `restSeconds` and optional `notes`.
- `planStorage.normalizeExercise` migrates the legacy stored shape (`sets: number`, shared reps/weight). When adding a field to `Exercise`, default it there so old saved plans keep loading.
- Starting a workout copies the day's exercises into session drafts; values are prefilled from the last session of the same exercise (`useSessions.lastSetsFor`), falling back to the plan, then to 12 reps / 0 kg (`DEFAULT_REPS`/`DEFAULT_WEIGHT` in `SetValueSheet`). Finishing writes a `WorkoutSession` and jumps to the history tab.
- Rest timer (`useRestTimer`) is timestamp-based (`endsAt`, 250 ms tick), not a decrementing counter; it starts when a set is checked, using that exercise's `restSeconds`.

**Exercise library** (`features/exercises`): `data/exercises.json` is a bundled, trimmed copy (873 exercises, already in Portuguese) of free-exercise-db (Unlicense) with the CC0 PT-BR translation `gugeldev/exercicios-bd-ptbr`. Source muscles are mapped to 12 app groups (`MUSCLE_GROUPS` in `plans/types.ts`). Images are not bundled: they load from the free-exercise-db GitHub raw URL (internet needed on first view). The "GIF" is two still frames alternated every 800 ms in `ExerciseAnimation`. `exerciseLibrary.ts` is the only access layer (search strips accents; `listExercises` supports `group`, `query`, `preferred` ordering and `onlyGroups` filtering). When picking exercises for a plan day, the library defaults to only that day's muscle groups, with a toggle to show all.

**Settings** (`features/settings`): opened from the gear in the plan header as an overlay in `AppShell`. Theme preference (dark/light/system, default dark) persists under `@beerr/theme`; the plan-expiry reminder toggle under `@beerr/settings`. Reminders are local notifications (`expo-notifications`) rescheduled from `PlanScreen` via `syncExpiryReminders` (2 days before `Plan.expiresAt`, 09:00). Plans have an optional `expiresAt` (AAAA-MM-DD, local date); expired plans live in a collapsed "Vencidos" section of the plan switcher (`plans/services/planExpiry.ts`).

**Contas e backup** (`features/auth`, `features/backup`, `shared/firebase`): `App.tsx` renders `app/AccountGate.tsx`, which shows `LoginScreen` (Firebase Auth e-mail/senha, accounts created by the owner in the console, no sign-up in the app), then `RestoreScreen` for an empty device, then `AppShell` (remounted by `key={uid}`). Local data is per account (`@beerr/u/{uid}/plans|sessions|backup`); the app is offline-first and Firestore (`users/{uid}/plans|sessions/{id}`) is only a backup, sent on Wi-Fi by `useBackup` (dirty flag + `rev` in `backupMeta`; only new sessions are uploaded, deletions mirror `synced*Ids`; restore never overwrites local data). Firebase config comes from `EXPO_PUBLIC_FIREBASE_*` (`.env.local`, GitHub Actions *Variables*); without it the app runs local-only (`uid` `local`). `tsconfig` maps `firebase/auth` to the RN typings. Roadmap in `docs/ROADMAP.md`.

## Gotchas

- `ScrollView` refs are typed `ScrollViewInstance` in this RN version, not `ScrollView`.
- Horizontal `ScrollView`s inside column layouts stretch vertically unless given `flexGrow: 0` (this broke the day tabs once).
- `BottomSheet` is a transparent RN `Modal`; nested sheets (e.g. `SetValueSheet` inside `ExerciseSheet`) are Modals inside a Modal.
- Fonts (Barlow Condensed for display, Inter for body) must be loaded in `App.tsx` before rendering; use names from `theme.fonts`, never raw family strings.
- Set values (reps/weight) are edited via the wheel sheet, with typing as a fallback; the weight wheel steps by 1 kg like reps (decimals only by typing; the wheel keeps an off-step saved value such as 52.5). Editing a set copies reps/weight to all following sets (in a workout, only the ones not yet done).

## UX review workflow

For any request that changes what the user sees or taps, follow the `ux-review` skill (`.claude/skills/ux-review/SKILL.md`): consult the read-only `ux-designer` agent (`.claude/agents/ux-designer.md`) before implementing, and end the summary with a "UX:" line. Skip it for non-visual changes and say so.

## Release workflow

Sempre que o usuário pedir para "subir"/enviar as alterações (push), criar também uma tag nova `vX.Y.Z` (o workflow `build-apk.yml` só roda em tags `v*`). Antes de taguear:

- Decidir o tipo pela mudança e, se não for óbvio, perguntar ao usuário: **major** (quebra de compatibilidade ou mudança grande de produto), **minor** (funcionalidade nova), **patch** (correção ou ajuste pequeno).
- Subir `version` em `app.json` e `package.json` e incrementar `android.versionCode` em `app.json`; commitar isso antes da tag.
- Enviar commits e tag (`git push` e `git push origin vX.Y.Z`).
