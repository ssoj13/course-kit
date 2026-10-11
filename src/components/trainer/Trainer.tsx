/**
 * Trainer: a "build it yourself" exercise on a concept tree (graph/TreeView.tsx, all four views). The course hands in
 * a scenario (lib/trainer.ts: items, verbs with their rules, statuses, goals) plus the tree's items and groups; this
 * component adds what every trainer shares:
 *   cards     colored by status (locked / ready / done / error) in every view;
 *   window    the course's details (`body`), the status with the reasons a locked item is locked, the verbs as buttons
 *             (options as checkboxes), the result of the last action taken on this item;
 *   console   under the map: progress, goals, completion message, Undo / Start over, every line printed so far.
 * The run (the reader's actions) is stored per page and exercise (lib/store.ts `trainerKey`) and replayed on load.
 * Scenarios hold functions, so a trainer is rendered from a course island (React), not from an .astro file.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import TreeView, { type TreeGroup, type TreeItem, type TreeMode } from '../graph/TreeView';
import './trainer.css';
import { act, begin, complete, counts, decode, encode, goalsOf, optsOf, replay, undo, why, type Counts, type Entry, type Scenario, type Status, type Verb } from '../../lib/trainer';
import { fmt, ui } from '../../i18n.mjs';
import { load, save, trainerKey } from '../../lib/store';

export interface TrainerProps<S> {
	lang: string;
	scenario: Scenario<S>;
	/** Tree cards; the ones in `scenario.items` take part in the exercise. */
	items: TreeItem[];
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
	/** Progress line over the console (default: "Done n/total · errors: e"). */
	progressText?: (c: Counts, state: S) => string;
	/** Newest console lines kept on screen. */
	lines?: number;
}

const STATUS_KEY = { locked: 'trainerLocked', ready: 'trainerReady', done: 'trainerDone', error: 'trainerError' } as const;

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

export default function Trainer<S>({ lang, scenario: sc, items, groups, label, hint, reveal = 'all', prefer, body, startHint, statusText, progressText, lines = 40 }: TrainerProps<S>) {
	const t = ui(lang);
	const key = trainerKey(location.pathname, sc.id);
	const [run, setRun] = useState(() => {
		const acts = decode(load<unknown>(key, null));
		return acts ? replay(sc, acts) : begin(sc);
	});
	useEffect(() => {
		save(key, encode(run));
	}, [key, run]);

	// Option checkboxes per item and verb; unset = the option's initial value.
	const [optVals, setOptVals] = useState<Record<string, boolean>>({});
	const optKey = (item: string, v: Verb<S>, o: string) => `${item}|${v.id}|${o}`;
	const valuesOf = (item: string, v: Verb<S>) => optsOf(v, Object.fromEntries((v.options ?? []).flatMap((o) => (optKey(item, v, o.id) in optVals ? [[o.id, optVals[optKey(item, v, o.id)]!]] : []))));

	const inPlay = useMemo(() => new Set(sc.items), [sc]);
	const status = (id: string) => sc.status(run.state, id);
	const c = counts(sc, run);
	const goals = goalsOf(sc, run.state);
	const done = complete(sc, run.state);

	const panel = (it: TreeItem) => {
		const s = status(it.id);
		const reasons = why(sc, run.state, it.id);
		const verbs = sc.verbs(run.state, it.id);
		return (
			<div className="ck-tr-panel">
				<p className={`ck-tr-state is-${s}`}>{statusText?.(s, it) ?? t[STATUS_KEY[s]]}</p>
				{reasons.length > 0 && <Lines log={reasons} />}
				<div className="lab-row ck-tr-actions">
					{verbs.flatMap((v) =>
						(v.options ?? []).map((o) => (
							<label key={`${v.id}|${o.id}`} className="ck-tr-check">
								<input type="checkbox" checked={valuesOf(it.id, v)[o.id]} onChange={(e) => setOptVals((m) => ({ ...m, [optKey(it.id, v, o.id)]: e.target.checked }))} /> {o.label}
							</label>
						)),
					)}
					{verbs.map((v) => (
						<button key={v.id} type="button" className={`lab-button${v.primary ? ' is-primary' : ''}`} onClick={() => setRun((r) => act(sc, r, { item: it.id, verb: v.id, opts: valuesOf(it.id, v) }))}>
							{v.label}
						</button>
					))}
				</div>
				{run.last?.item === it.id && (
					<div aria-live="polite">
						<p className="ck-tr-last">{t.trainerLast}</p>
						<Lines log={run.last.log} />
					</div>
				)}
			</div>
		);
	};

	return (
		// not-content: Starlight's Markdown spacing would otherwise push siblings (buttons, lines) apart.
		<div className="ck-trainer not-content">
			<TreeView
				lang={lang}
				items={items}
				groups={groups}
				label={label}
				hint={hint}
				reveal={reveal}
				prefer={prefer}
				cardClass={(it) => (inPlay.has(it.id) ? `is-${status(it.id)}` : '')}
				renderDetails={(it) => (
					<>
						{body?.(it)}
						{inPlay.has(it.id) && panel(it)}
					</>
				)}
			>
				<div className="ck-tr-console">
					<div className="lab-row ck-tr-head">
						<span>{progressText?.(c, run.state) ?? fmt(t.trainerProgress, { done: c.done, total: c.total, errors: c.errors })}</span>
						<span className="lab-row ck-tr-buttons">
							<button type="button" className="lab-button" onClick={() => setRun((r) => undo(sc, r))}>
								{t.trainerUndo}
							</button>
							<button type="button" className="lab-button" onClick={() => setRun(begin(sc))}>
								{t.trainerRestart}
							</button>
						</span>
					</div>
					{goals.length > 0 && (
						<ul className="ck-tr-goals" aria-label={t.trainerGoals}>
							{goals.map((g) => (
								<li key={g.id} className={g.met ? 'is-met' : undefined}>
									<span aria-hidden="true">{g.met ? '✓' : '○'}</span> {g.label} <span className="sr-only">({g.met ? t.trainerMet : t.trainerNotMet})</span>
								</li>
							))}
						</ul>
					)}
					{done && (
						<p className="ck-tr-done lab-flash-ok" role="status">
							{t.trainerComplete}
						</p>
					)}
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
