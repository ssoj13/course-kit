/**
 * Pure core of the trainers ("build it yourself" exercises on a concept tree, components/trainer/Trainer.tsx).
 *
 * A course describes an exercise as a `Scenario`: the items in play (the cards of the tree), the actions (verbs) each
 * item offers in the current state, the rules that refuse an action (`check`, returning typed failures with the rule's
 * id, e.g. a VUID), the state transition of an accepted action (`apply`, with the console lines it prints), the status
 * of every item, and the goals. The engine knows nothing about the subject: states are opaque values of type `S`,
 * texts arrive already worded in the reader's language.
 *
 * The run is the list of actions the reader took (`Act`): state, console and "last result" are a fold of that list
 * over the scenario (`replay`). So undo = replay without the last act, start over = no acts, and persistence stores
 * only the acts (`encode` / `decode`): data changes after a course update cannot leave a stored state that the rules
 * would never produce; a stored act that no longer applies ends the replay there.
 * No DOM, no React: tested with `bun test` (tests/trainer.test.ts).
 */

/** Kind of a console line: an accepted call, a refusal or problem (error/warn), or a remark (info). */
export type EntryKind = 'call' | 'error' | 'warn' | 'info';

/** One console line. `text` is shown as is (validation reports stay verbatim); `ref` = id of the rule it quotes. */
export interface Entry {
	kind: EntryKind;
	text: string;
	ref?: string;
}

/** Why an action is refused: an `Entry` returned by a rule. Any failure refuses the action, whatever its kind. */
export type Failure = Entry;

/** Card status: cannot be acted on yet, can be done now, done, broken (e.g. made from something that is gone). */
export type Status = 'locked' | 'ready' | 'done' | 'error';
export const STATUSES: readonly Status[] = ['locked', 'ready', 'done', 'error'];

/** Values of a verb's options (checkboxes shown next to its button). */
export type Opts = Readonly<Record<string, boolean>>;

/** A checkbox of a verb (e.g. "enable VK_EXT_debug_utils" on vkCreateInstance). */
export interface VerbOption {
	id: string;
	label: string;
	initial: boolean;
}

/** The result of an accepted action. */
export interface Transition<S> {
	state: S;
	log: readonly Entry[];
}

/** One action on an item: a button in its details window. */
export interface Verb<S> {
	/** Stable id: stored in the reader's history, so renaming it drops stored runs at that act. */
	id: string;
	label: string;
	/** The main action of the item: its `check` explains a `locked` status, its button is emphasized. */
	primary?: boolean;
	options?: readonly VerbOption[];
	/** Rules: every failure is reported and the state stays as it was. Absent = always allowed. */
	check?: (state: S, opts: Opts) => readonly Failure[];
	apply: (state: S, opts: Opts) => Transition<S>;
}

/** What a goal can look at besides the state. */
export interface GoalContext {
	items: readonly string[];
	status: (id: string) => Status;
}

export interface Goal<S> {
	id: string;
	label: string;
	met: (state: S, ctx: GoalContext) => boolean;
}

export interface Scenario<S> {
	/** Storage id of the exercise (unique on its page). */
	id: string;
	init: S;
	/** Item ids in play: the tree's cards. */
	items: readonly string[];
	/** Verbs an item offers in a state (the first `primary` one is the item's main action). */
	verbs: (state: S, item: string) => readonly Verb<S>[];
	status: (state: S, item: string) => Status;
	goals?: readonly Goal<S>[];
}

/** One action the reader took. `opts` holds the values of the verb's options at that moment. */
export interface Act {
	item: string;
	verb: string;
	opts?: Opts;
}

/** A console line with the index of the act that printed it. */
export interface Logged extends Entry {
	act: number;
}

export interface Run<S> {
	state: S;
	acts: readonly Act[];
	log: readonly Logged[];
	/** The last act's item, its lines, and whether it was accepted. */
	last: { item: string; log: readonly Entry[]; ok: boolean } | null;
}

/** A run before any action. */
export function begin<S>(sc: Scenario<S>): Run<S> {
	return { state: sc.init, acts: [], log: [], last: null };
}

/** The verb `id` of an item in a state; throws when the item has no such verb (an unknown or stale act). */
export function verbOf<S>(sc: Scenario<S>, state: S, item: string, id: string): Verb<S> {
	if (!sc.items.includes(item)) throw new Error(`trainer: unknown item "${item}"`);
	const v = sc.verbs(state, item).find((x) => x.id === id);
	if (!v) throw new Error(`trainer: item "${item}" has no verb "${id}"`);
	return v;
}

/** The verb's option values: its defaults, overridden by `given` for options it declares (others are dropped). */
export function optsOf<S>(v: Verb<S>, given: Opts = {}): Record<string, boolean> {
	return Object.fromEntries((v.options ?? []).map((o) => [o.id, given[o.id] ?? o.initial]));
}

/** Takes one action: runs the verb's rules, then its transition when no rule failed. */
export function act<S>(sc: Scenario<S>, run: Run<S>, a: Act): Run<S> {
	const v = verbOf(sc, run.state, a.item, a.verb);
	const opts = optsOf(v, a.opts);
	const fails = v.check?.(run.state, opts) ?? [];
	const ok = fails.length === 0;
	const t = ok ? v.apply(run.state, opts) : { state: run.state, log: fails };
	const n = run.acts.length;
	const stored: Act = Object.keys(opts).length ? { item: a.item, verb: a.verb, opts } : { item: a.item, verb: a.verb };
	return {
		state: t.state,
		acts: [...run.acts, stored],
		log: [...run.log, ...t.log.map((e) => ({ ...e, act: n }))],
		last: { item: a.item, log: t.log, ok },
	};
}

/** Replays acts from the start. Stops at the first act the scenario no longer accepts as an action (stale data). */
export function replay<S>(sc: Scenario<S>, acts: readonly Act[]): Run<S> {
	let run = begin(sc);
	for (const a of acts) {
		try {
			run = act(sc, run, a);
		} catch {
			break;
		}
	}
	return run;
}

/** The run without its last act. */
export function undo<S>(sc: Scenario<S>, run: Run<S>): Run<S> {
	return replay(sc, run.acts.slice(0, -1));
}

/** The item's main verb: the first `primary` one, else the first. */
export function primaryVerb<S>(verbs: readonly Verb<S>[]): Verb<S> | undefined {
	return verbs.find((v) => v.primary) ?? verbs[0];
}

/** Why a locked item is locked: the failures of its main verb, without remarks (`info`). Empty for other states. */
export function why<S>(sc: Scenario<S>, state: S, item: string): Failure[] {
	if (sc.status(state, item) !== 'locked') return [];
	const v = primaryVerb(sc.verbs(state, item));
	if (!v) return [];
	return (v.check?.(state, optsOf(v)) ?? []).filter((f) => f.kind !== 'info');
}

const ctxOf = <S>(sc: Scenario<S>, state: S): GoalContext => ({ items: sc.items, status: (id) => sc.status(state, id) });

/** Every goal with whether it is met now. */
export function goalsOf<S>(sc: Scenario<S>, state: S): { id: string; label: string; met: boolean }[] {
	const ctx = ctxOf(sc, state);
	return (sc.goals ?? []).map((g) => ({ id: g.id, label: g.label, met: g.met(state, ctx) }));
}

/** True when the scenario has goals and all of them are met. */
export function complete<S>(sc: Scenario<S>, state: S): boolean {
	const gs = goalsOf(sc, state);
	return gs.length > 0 && gs.every((g) => g.met);
}

/** Goal: every item of `ids` (default: every item in play) is `done`. */
export function allDone<S>(label: string, ids?: readonly string[], id = 'all-done'): Goal<S> {
	return { id, label, met: (_s, ctx) => (ids ?? ctx.items).every((i) => ctx.status(i) === 'done') };
}

export interface Counts {
	done: number;
	total: number;
	/** Console lines of kind `error` in the run. */
	errors: number;
}

export function counts<S>(sc: Scenario<S>, run: Run<S>): Counts {
	return {
		done: sc.items.filter((i) => sc.status(run.state, i) === 'done').length,
		total: sc.items.length,
		errors: run.log.filter((l) => l.kind === 'error').length,
	};
}

/** Version of the stored format (`encode`). */
const FORMAT = 1;

/** What a run stores: its acts only. */
export function encode<S>(run: Run<S>): { v: number; acts: readonly Act[] } {
	return { v: FORMAT, acts: run.acts };
}

/** Acts from stored data (anything: storage is not trusted); null when it is not a stored run of this format. */
export function decode(raw: unknown): Act[] | null {
	if (!raw || typeof raw !== 'object') return null;
	const { v, acts } = raw as { v?: unknown; acts?: unknown };
	if (v !== FORMAT || !Array.isArray(acts)) return null;
	const isOpts = (o: unknown) => o === undefined || (!!o && typeof o === 'object' && Object.values(o).every((x) => typeof x === 'boolean'));
	const ok = acts.every((a) => !!a && typeof a === 'object' && typeof a.item === 'string' && typeof a.verb === 'string' && isOpts(a.opts));
	return ok ? (acts as Act[]) : null;
}
