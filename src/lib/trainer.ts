/**
 * Pure core of the trainers ("build it yourself" exercises on a concept tree, components/trainer/Trainer.tsx).
 *
 * A course describes an exercise as a `Scenario`: the items in play (the cards of the tree, fixed or derived from the
 * state), the actions (verbs) each item offers in the current state plus global actions that belong to no card, the
 * rules that refuse an action (`check`, returning typed failures with the rule's id, e.g. a VUID), the state
 * transition of an accepted action (`apply`, with the console lines it prints), the status of every item, and the
 * goals. The engine knows nothing about the subject: states are opaque values of type `S`, texts arrive already
 * worded in the reader's language.
 *
 * The run is the list of actions the reader took (`Act`): state, console and "last result" are a fold of that list
 * over the scenario (`replay`). So undo = replay without the last act, start over = no acts, and persistence stores
 * only the acts (`encode` / `decode`), tagged with the scenario's `version`: a run stored for other rules or data is
 * dropped as a whole, and an act that no longer applies (`StaleAct`) ends a replay there. This only works when every
 * scenario function is deterministic and pure: the same acts must always rebuild the same state.
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

/**
 * An act that does not fit the scenario: unknown item, a verb the item does not offer in that state, an option value
 * the verb does not accept. Expected for stored or queued acts (the data changed, a second click raced the first);
 * `replay` stops at it, the UI ignores it. Any other exception is a bug in the scenario and propagates.
 */
export class StaleAct extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StaleAct';
	}
}

/** Value of one verb option. */
export type OptValue = boolean | number | string;
/** Values of a verb's options, by option id. */
export type Opts = Readonly<Record<string, OptValue>>;

interface OptionBase {
	/** Stable id: stored with the act. */
	id: string;
	label: string;
}

/**
 * An input next to a verb's button. Kinds:
 *   flag    checkbox (e.g. "enable VK_EXT_debug_utils" on vkCreateInstance);
 *   choice  one of fixed values (e.g. a present mode, an image layout);
 *   number  a number in [min, max], multiples of `step` from `min` when given (e.g. frames in flight);
 *   item    one of the items `of(state)` returns (e.g. the semaphore a submit waits on); '' = none picked, which the
 *           verb's `check` should refuse when it needs one.
 */
export type VerbOption<S> =
	| (OptionBase & { kind: 'flag'; initial: boolean })
	| (OptionBase & { kind: 'choice'; choices: readonly { id: string; label: string }[]; initial: string })
	| (OptionBase & { kind: 'number'; min: number; max: number; step?: number; initial: number })
	| (OptionBase & { kind: 'item'; of: (state: S) => readonly string[] });

/** The result of an accepted action. */
export interface Transition<S> {
	state: S;
	log: readonly Entry[];
}

/** One action: a button in an item's details window, or in the trainer's toolbar for a global action. */
export interface Verb<S> {
	/** Stable id: stored in the reader's history. Renaming it makes stored runs stale at that act. */
	id: string;
	label: string;
	/** The main action of the item: its `check` explains a `locked` status, its button is emphasized. */
	primary?: boolean;
	options?: readonly VerbOption<S>[];
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
	/**
	 * Version of the rules and data the exercise runs on (e.g. a hash of the data files, computed at build time).
	 * A stored run of another version is not replayed: the reader starts fresh and is told why.
	 */
	version: string;
	init: S;
	/** Item ids in play (the tree's cards): fixed, or derived from the state for exercises that create instances. */
	items: readonly string[] | ((state: S) => readonly string[]);
	/** Verbs an item offers in a state (the first `primary` one is the item's main action). */
	verbs: (state: S, item: string) => readonly Verb<S>[];
	/** Global actions (toolbar over the console, stored with item `GLOBAL`): steps that belong to no card. */
	actions?: (state: S) => readonly Verb<S>[];
	/** Must agree with the main verb's `check` (see `consistency`). */
	status: (state: S, item: string) => Status;
	/** A short state word on the card and in its window (e.g. the current image layout). */
	badge?: (state: S, item: string) => string | undefined;
	goals?: readonly Goal<S>[];
}

/** Item id of global actions (`Scenario.actions`). */
export const GLOBAL = '';

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
	/** The last act's item (`GLOBAL` for a global action), its lines, and whether it was accepted. */
	last: { item: string; log: readonly Entry[]; ok: boolean } | null;
}

/** Item ids in play in a state. */
export function itemsOf<S>(sc: Scenario<S>, state: S): readonly string[] {
	return typeof sc.items === 'function' ? sc.items(state) : sc.items;
}

/** A run before any action. */
export function begin<S>(sc: Scenario<S>): Run<S> {
	return { state: sc.init, acts: [], log: [], last: null };
}

/** The verb `id` of an item (or of the global actions) in a state; throws `StaleAct` when there is no such verb. */
export function verbOf<S>(sc: Scenario<S>, state: S, item: string, id: string): Verb<S> {
	let verbs: readonly Verb<S>[];
	if (item === GLOBAL) verbs = sc.actions?.(state) ?? [];
	else if (itemsOf(sc, state).includes(item)) verbs = sc.verbs(state, item);
	else throw new StaleAct(`trainer: unknown item "${item}"`);
	const v = verbs.find((x) => x.id === id);
	if (!v) throw new StaleAct(item === GLOBAL ? `trainer: no global action "${id}"` : `trainer: item "${item}" has no verb "${id}"`);
	return v;
}

/** Whether `x` is a value option `o` accepts in `state`. */
export function optOk<S>(o: VerbOption<S>, x: unknown, state: S): boolean {
	switch (o.kind) {
		case 'flag':
			return typeof x === 'boolean';
		case 'choice':
			return typeof x === 'string' && o.choices.some((c) => c.id === x);
		case 'number': {
			if (typeof x !== 'number' || !Number.isFinite(x) || x < o.min || x > o.max) return false;
			if (!o.step) return true;
			const k = (x - o.min) / o.step;
			return Math.abs(k - Math.round(k)) < 1e-9;
		}
		case 'item':
			return typeof x === 'string' && (x === '' || o.of(state).includes(x));
	}
}

/** Default value of an option in a state (an item option picks the first candidate, '' when there is none). */
export function optInitial<S>(o: VerbOption<S>, state: S): OptValue {
	return o.kind === 'item' ? (o.of(state)[0] ?? '') : o.initial;
}

/**
 * The verb's option values in `state`: defaults, overridden by `given` for the options the verb declares (others are
 * dropped). A given value the option does not accept throws `StaleAct`.
 */
export function optsOf<S>(v: Verb<S>, state: S, given: Opts = {}): Record<string, OptValue> {
	return Object.fromEntries(
		(v.options ?? []).map((o) => {
			const x = given[o.id];
			if (x === undefined) return [o.id, optInitial(o, state)];
			if (!optOk(o, x, state)) throw new StaleAct(`trainer: option "${o.id}" of "${v.id}" does not accept ${JSON.stringify(x)}`);
			return [o.id, x];
		}),
	);
}

/** Takes one action: runs the verb's rules, then its transition when no rule failed. Throws `StaleAct` for an act
 *  that does not fit the scenario in this state. */
export function act<S>(sc: Scenario<S>, run: Run<S>, a: Act): Run<S> {
	const v = verbOf(sc, run.state, a.item, a.verb);
	const opts = optsOf(v, run.state, a.opts);
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

/** Replays acts from the start. Stops at the first `StaleAct` (the result then holds fewer acts than given); any
 *  other exception is a scenario bug and propagates. */
export function replay<S>(sc: Scenario<S>, acts: readonly Act[]): Run<S> {
	let run = begin(sc);
	for (const a of acts) {
		try {
			run = act(sc, run, a);
		} catch (e) {
			if (e instanceof StaleAct) break;
			throw e;
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

/** The main verb's failures with default options (remarks included). */
function mainFailures<S>(sc: Scenario<S>, state: S, item: string): { verb?: Verb<S>; fails: readonly Failure[] } {
	const verb = primaryVerb(sc.verbs(state, item));
	return { verb, fails: verb ? (verb.check?.(state, optsOf(verb, state)) ?? []) : [] };
}

/** Why a locked item is locked: the failures of its main verb, without remarks (`info`). Empty for other states. */
export function why<S>(sc: Scenario<S>, state: S, item: string): Failure[] {
	if (sc.status(state, item) !== 'locked') return [];
	return mainFailures(sc, state, item).fails.filter((f) => f.kind !== 'info');
}

/**
 * Disagreements between `status` and the main verb's rules in `state` (empty = consistent): a `locked` item must be
 * refused by its main verb with at least one non-remark failure (that is what `why` shows), a `ready` item must be
 * accepted. `done` / `error` are the scenario's business. The status stays the scenario's own function (it alone knows
 * done and broken); courses assert `consistency(sc, state)` is empty over the states their tests reach.
 */
export function consistency<S>(sc: Scenario<S>, state: S): string[] {
	const out: string[] = [];
	for (const item of itemsOf(sc, state)) {
		const s = sc.status(state, item);
		if (s !== 'locked' && s !== 'ready') continue;
		const { verb, fails } = mainFailures(sc, state, item);
		if (!verb) out.push(`${item}: ${s}, but it has no verb`);
		else if (s === 'locked' && !fails.some((f) => f.kind !== 'info')) out.push(`${item}: locked, but "${verb.id}" gives no reason`);
		else if (s === 'ready' && fails.length) out.push(`${item}: ready, but "${verb.id}" is refused: ${fails.map((f) => f.text).join(' | ')}`);
	}
	return out;
}

const ctxOf = <S>(sc: Scenario<S>, state: S): GoalContext => ({ items: itemsOf(sc, state), status: (id) => sc.status(state, id) });

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
	const items = itemsOf(sc, run.state);
	return {
		done: items.filter((i) => sc.status(run.state, i) === 'done').length,
		total: items.length,
		errors: run.log.filter((l) => l.kind === 'error').length,
	};
}

/** Version of the stored format (`encode`). 2: scenario version `sv`, option values of any `OptValue` type. */
const FORMAT = 2;

/** What a run stores: the format, the scenario version and the acts. */
export interface Stored {
	v: number;
	sv: string;
	acts: readonly Act[];
}

export function encode<S>(sc: Scenario<S>, run: Run<S>): Stored {
	return { v: FORMAT, sv: sc.version, acts: run.acts };
}

const isOptValue = (x: unknown) => typeof x === 'boolean' || typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x));

/**
 * Acts from stored data (anything: storage is not trusted). Null when it is not a run of this format and of scenario
 * `version`. Only the shape is checked here; whether each act still fits the scenario is `replay`'s job.
 */
export function decode(raw: unknown, version: string): Act[] | null {
	if (!raw || typeof raw !== 'object') return null;
	const { v, sv, acts } = raw as { v?: unknown; sv?: unknown; acts?: unknown };
	if (v !== FORMAT || sv !== version || !Array.isArray(acts)) return null;
	const isOpts = (o: unknown) => o === undefined || (!!o && typeof o === 'object' && !Array.isArray(o) && Object.values(o).every(isOptValue));
	const ok = acts.every((a) => !!a && typeof a === 'object' && typeof a.item === 'string' && typeof a.verb === 'string' && isOpts(a.opts));
	return ok ? (acts as Act[]) : null;
}
