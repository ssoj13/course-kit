/**
 * Trainer: a "build it yourself" exercise on a concept tree (graph/TreeView.tsx, all four views). The course hands in
 * a scenario (lib/trainer.ts: items, verbs with their rules, global actions, statuses, goals) plus the tree's items
 * (fixed, or derived from the state) and groups; this component adds what every trainer shares:
 *   cards     colored by status (locked / ready / done / error) in every view, the status and the scenario's badge
 *             also in words on the card;
 *   window    the course's details (`body`), the status with the reasons a locked item is locked, the verbs (a
 *             fieldset with its inputs per verb that has options), the result of the last action taken on this item;
 *   console   under the map: global actions, progress, goals, completion message, Undo / Start over / Restore,
 *             every line printed so far (the one live region for results; Undo/Start over/Restore are announced by
 *             a separate polite status).
 * The run (the reader's actions) is stored per page and exercise (lib/store.ts `trainerKey`) with the scenario's
 * version, replayed on load, and written only after the reader acted. Scenarios hold functions, so a trainer is
 * rendered from a course island (React), not from an .astro file.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import TreeView, { type TreeGroup, type TreeItem, type TreeMode } from '../graph/TreeView';
import './trainer.css';
import {
	GLOBAL,
	StaleAct,
	act,
	begin,
	complete,
	counts,
	decode,
	encode,
	goalsOf,
	itemsOf,
	optOk,
	optsOf,
	replay,
	undo,
	why,
	type Act,
	type Counts,
	type Entry,
	type OptValue,
	type Run,
	type Scenario,
	type Status,
	type Verb,
	type VerbOption,
} from '../../lib/trainer';
import { fmt, ui, type UiText } from '../../i18n.mjs';
import { load, save, trainerKey } from '../../lib/store';

export interface TrainerProps<S> {
	lang: string;
	scenario: Scenario<S>;
	/** Tree cards (or a function of the state, for scenarios whose items come and go); the ones the scenario has in
	 *  play take part in the exercise. */
	items: TreeItem[] | ((state: S) => TreeItem[]);
	groups: TreeGroup[];
	/** Accessible name of the map. */
	label: string;
	hint?: string;
	/** Default: every card visible. */
	reveal?: string[] | 'all';
	prefer?: TreeMode;
	/** The course's details of a card, above the exercise controls. */
	body?: (item: TreeItem) => ReactNode;
	/** Console text before the first action (default: the engine's). */
	startHint?: string;
	/** Status sentence in the window (default: the engine's, per status). */
	statusText?: (status: Status, item: TreeItem) => string;
	/** Status word on the card (default: the engine's, per status). */
	statusTag?: (status: Status, item: TreeItem) => string;
	/** Progress line over the console (default: "Done n/total · errors: e"). */
	progressText?: (c: Counts, state: S) => string;
	/** Newest console lines kept on screen. */
	lines?: number;
}

const STATUS_KEY = { locked: 'trainerLocked', ready: 'trainerReady', done: 'trainerDone', error: 'trainerError' } as const;
const TAG_KEY = { locked: 'trainerTagLocked', ready: 'trainerTagReady', done: 'trainerTagDone', error: 'trainerTagError' } as const;

/** Console lines: verbatim texts, colored by kind; `ref` (the quoted rule) travels as a data attribute. */
function Lines({ log }: { log: readonly Entry[] }) {
	return (
		<ol className="ck-tr-log">
			{log.map((l, i) => (
				<li key={i} className={`is-${l.kind}`} data-ref={l.ref}>
					{l.text}
				</li>
			))}
		</ol>
	);
}

/** Everything the trainer keeps between renders. `sc` + `key` say which exercise the run belongs to. */
interface Session<S> {
	sc: Scenario<S>;
	key: string;
	run: Run<S>;
	/** True once the reader acted: untouched runs are never written (a stale stored run stays until then). */
	touched: boolean;
	/** Acts before the last "Start over", offered back by "Restore" until the reader acts again. */
	restore: readonly Act[] | null;
	/** Visible note about the stored run (stale version, partly replayed). */
	notice: string | null;
	/** Text of the polite status region; `n` alternates a trailing space so a repeated message is announced again. */
	said: { text: string; n: number };
}

function open<S>(sc: Scenario<S>, key: string, t: UiText): Session<S> {
	const raw = load<unknown>(key, null);
	const acts = decode(raw, sc.version);
	const run = acts ? replay(sc, acts) : begin(sc);
	const notice = raw !== null && !acts ? t.trainerStale : acts && run.acts.length < acts.length ? fmt(t.trainerStalePart, { n: run.acts.length, total: acts.length }) : null;
	return { sc, key, run, touched: false, restore: null, notice, said: { text: '', n: 0 } };
}

/** One input of a verb option. Values arrive validated; an input that cannot hold a valid value keeps the last one. */
function OptInput<S>({ o, value, state, itemLabel, none, set }: { o: VerbOption<S>; value: OptValue; state: S; itemLabel: (id: string) => string; none: string; set: (x: OptValue) => void }) {
	if (o.kind === 'flag')
		return (
			<label className="ck-tr-opt">
				<input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} /> {o.label}
			</label>
		);
	if (o.kind === 'number')
		return (
			<label className="ck-tr-opt">
				{o.label}{' '}
				<input
					type="number"
					min={o.min}
					max={o.max}
					step={o.step ?? 'any'}
					// Uncontrolled: a half-typed number must not be clamped under the reader's fingers; only valid values are kept.
					defaultValue={value as number}
					onChange={(e) => optOk(o, e.target.valueAsNumber, state) && set(e.target.valueAsNumber)}
				/>
			</label>
		);
	const choices = o.kind === 'choice' ? o.choices : o.of(state).map((id) => ({ id, label: itemLabel(id) }));
	return (
		<label className="ck-tr-opt">
			{o.label}{' '}
			<select value={value as string} disabled={choices.length === 0} onChange={(e) => set(e.target.value)}>
				{choices.length ? choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>) : <option value="">{none}</option>}
			</select>
		</label>
	);
}

export default function Trainer<S>({ lang, scenario: sc, items, groups, label, hint, reveal = 'all', prefer, body, startHint, statusText, statusTag, progressText, lines = 40 }: TrainerProps<S>) {
	const t = ui(lang);
	const key = trainerKey(location.pathname, sc.id);
	const [stored, setSes] = useState(() => open(sc, key, t));
	// Another exercise (scenario or page key changed): load its own run instead of carrying this one over.
	const ses = stored.sc === sc && stored.key === key ? stored : open(sc, key, t);
	if (ses !== stored) setSes(ses);
	const run = ses.run;
	useEffect(() => {
		if (ses.touched) save(ses.key, encode(ses.sc, ses.run));
	}, [ses]);

	/** A change made by the reader: marks the run touched; `said` is announced by the status region. */
	const change = (f: (s: Session<S>) => Partial<Session<S>> | null, said?: (s: Session<S>, n: Partial<Session<S>>) => string) =>
		setSes((s) => {
			let n: Partial<Session<S>> | null;
			try {
				n = f(s);
			} catch (e) {
				// A second click queued behind the first can find its item or option gone: ignore it, like a replay would.
				if (e instanceof StaleAct) return s;
				throw e;
			}
			if (!n) return s;
			const text = said?.(s, n) ?? '';
			return { ...s, ...n, touched: true, notice: null, said: text ? { text, n: s.said.n + 1 } : s.said };
		});
	const doAct = (a: Act) =>
		change(
			(s) => ({ run: act(s.sc, s.run, a), restore: null }),
			(s, n) => (n.run && complete(s.sc, n.run.state) && !complete(s.sc, s.run.state) ? t.trainerComplete : ''),
		);

	// Option inputs per item and verb; unset (or no longer valid in this state) = the option's default.
	const [optVals, setOptVals] = useState<Record<string, OptValue>>({});
	const optKey = (item: string, v: Verb<S>, o: string) => `${item}|${v.id}|${o}`;
	const valuesOf = (item: string, v: Verb<S>) => optsOf(v, run.state, Object.fromEntries((v.options ?? []).flatMap((o) => (optKey(item, v, o.id) in optVals && optOk(o, optVals[optKey(item, v, o.id)], run.state) ? [[o.id, optVals[optKey(item, v, o.id)]!]] : []))));

	const cards = useMemo(() => (typeof items === 'function' ? items(run.state) : items), [items, run.state]);
	const labelOf = useMemo(() => new Map(cards.map((c) => [c.id, c.label])), [cards]);
	const inPlay = useMemo(() => new Set(itemsOf(sc, run.state)), [sc, run.state]);
	const status = (id: string) => sc.status(run.state, id);
	const c = counts(sc, run);
	const goals = goalsOf(sc, run.state);
	const done = complete(sc, run.state);
	const globals = sc.actions?.(run.state) ?? [];

	/** A verb's button, with its options in a fieldset named after the verb. */
	const verbUI = (item: string, v: Verb<S>) => {
		const vals = valuesOf(item, v);
		const button = (
			<button type="button" className={`lab-button${v.primary ? ' is-primary' : ''}`} onClick={() => doAct({ item, verb: v.id, opts: vals })}>
				{v.label}
			</button>
		);
		if (!v.options?.length) return <span key={`${item}|${v.id}`}>{button}</span>;
		return (
			<fieldset key={`${item}|${v.id}`} className="ck-tr-verb">
				<legend className="sr-only">{v.label}</legend>
				{v.options.map((o) => (
					<OptInput key={o.id} o={o} value={vals[o.id]!} state={run.state} itemLabel={(id) => labelOf.get(id) ?? id} none={t.trainerNone} set={(x) => setOptVals((m) => ({ ...m, [optKey(item, v, o.id)]: x }))} />
				))}
				{button}
			</fieldset>
		);
	};

	const panel = (it: TreeItem) => {
		const s = status(it.id);
		const reasons = why(sc, run.state, it.id);
		const badge = sc.badge?.(run.state, it.id);
		return (
			<div className="ck-tr-panel">
				<p className={`ck-tr-state is-${s}`}>{statusText?.(s, it) ?? t[STATUS_KEY[s]]}</p>
				{badge && <p className="ck-tr-badge-line">{badge}</p>}
				{reasons.length > 0 && <Lines log={reasons} />}
				<div className="lab-row ck-tr-actions">{sc.verbs(run.state, it.id).map((v) => verbUI(it.id, v))}</div>
				{run.last?.item === it.id && (
					<div>
						<p className="ck-tr-last">{t.trainerLast}</p>
						<Lines log={run.last.log} />
					</div>
				)}
			</div>
		);
	};

	const note = (it: TreeItem) => {
		if (!inPlay.has(it.id)) return null;
		const s = status(it.id);
		const badge = sc.badge?.(run.state, it.id);
		return (
			<>
				<span className={`ck-tr-tag is-${s}`}>{statusTag?.(s, it) ?? t[TAG_KEY[s]]}</span>
				{badge && <span className="ck-tr-badge">{badge}</span>}
			</>
		);
	};

	return (
		// not-content: Starlight's Markdown spacing would otherwise push siblings (buttons, lines) apart.
		<div className="ck-trainer not-content">
			<TreeView
				lang={lang}
				items={cards}
				groups={groups}
				label={label}
				hint={hint}
				reveal={reveal}
				prefer={prefer}
				cardClass={(it) => (inPlay.has(it.id) ? `is-${status(it.id)}` : '')}
				cardNote={note}
				renderDetails={(it) => (
					<>
						{body?.(it)}
						{inPlay.has(it.id) && panel(it)}
					</>
				)}
			>
				<div className="ck-tr-console">
					{globals.length > 0 && (
						<div className="lab-row ck-tr-global" role="group" aria-label={t.trainerActions}>
							{globals.map((v) => verbUI(GLOBAL, v))}
						</div>
					)}
					<div className="lab-row ck-tr-head">
						<span>{progressText?.(c, run.state) ?? fmt(t.trainerProgress, { done: c.done, total: c.total, errors: c.errors })}</span>
						<span className="lab-row ck-tr-buttons">
							<button type="button" className="lab-button" disabled={run.acts.length === 0} onClick={() => change((s) => (s.run.acts.length ? { run: undo(s.sc, s.run) } : null), () => t.trainerUndone)}>
								{t.trainerUndo}
							</button>
							<button type="button" className="lab-button" disabled={run.acts.length === 0} onClick={() => change((s) => (s.run.acts.length ? { run: begin(s.sc), restore: s.run.acts } : null), () => t.trainerRestarted)}>
								{t.trainerRestart}
							</button>
							{ses.restore && run.acts.length === 0 && (
								<button type="button" className="lab-button" onClick={() => change((s) => (s.restore ? { run: replay(s.sc, s.restore), restore: null } : null), () => t.trainerRestored)}>
									{t.trainerRestore}
								</button>
							)}
						</span>
					</div>
					{ses.notice && <p className="ck-tr-notice">{ses.notice}</p>}
					{goals.length > 0 && (
						<ul className="ck-tr-goals" aria-label={t.trainerGoals}>
							{goals.map((g) => (
								<li key={g.id} className={g.met ? 'is-met' : undefined}>
									<span aria-hidden="true">{g.met ? '✓' : '○'}</span> {g.label} <span className="sr-only">({g.met ? t.trainerMet : t.trainerNotMet})</span>
								</li>
							))}
						</ul>
					)}
					{done && <p className="ck-tr-done lab-flash-ok">{t.trainerComplete}</p>}
					<p className="sr-only" role="status">
						{ses.said.text + (ses.said.n % 2 ? ' ' : '')}
					</p>
					<ol className="ck-tr-log" aria-live="polite" aria-label={t.trainerConsole}>
						{run.log.length === 0 && <li className="is-info">{startHint ?? t.trainerEmpty}</li>}
						{run.log.slice(-lines).map((l, i) => (
							<li key={Math.max(0, run.log.length - lines) + i} className={`is-${l.kind}`} data-ref={l.ref}>
								{l.text}
							</li>
						))}
					</ol>
				</div>
			</TreeView>
		</div>
	);
}
