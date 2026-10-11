/**
 * Interface texts for a language; throws for a language the engine has no texts for.
 * @param {string} lang
 * @returns {UiText}
 */
export function ui(lang: string): UiText;
/**
 * Fills `{name}` placeholders.
 * @param {string} text
 * @param {Record<string, string | number>} vars
 */
export function fmt(text: string, vars: Record<string, string | number>): string;
export namespace UI {
    export { EN as en };
    export { RU as ru };
}
/** Languages the engine can show its interface in. */
export const UI_LANGS: (keyof typeof UI)[];
/** UI text keys of the relation names per edge type. */
export const REL_KEY: {
    readonly 'built-on': {
        readonly rel: "relBuiltOn";
        readonly wire: "wireBuiltOn";
    };
    readonly 'is-a': {
        readonly rel: "relIsA";
        readonly wire: "wireIsA";
    };
    readonly 'part-of': {
        readonly rel: "relPartOf";
        readonly wire: "wirePartOf";
    };
    readonly uses: {
        readonly rel: "relUses";
        readonly wire: "wireUses";
    };
    readonly related: {
        readonly rel: "relRelated";
        readonly wire: "wireRelated";
    };
};
export type UiText = typeof EN;
declare namespace EN {
    let home: string;
    let roadmap: string;
    let reference: string;
    let glossary: string;
    let moduleOverview: string;
    let optional: string;
    let eyebrowLesson: string;
    let eyebrowModule: string;
    let progress: string;
    let markComplete: string;
    let completed: string;
    let completedSummary: string;
    let coreProgress: string;
    let describeCore: string;
    let describeOptional: string;
    let storageBlocked: string;
    let yourProgress: string;
    let progressLocal: string;
    let lessonNotDone: string;
    let lessonDone: string;
    let exportJson: string;
    let importFile: string;
    let resetProgress: string;
    let resetConfirm: string;
    let resetYes: string;
    let cancel: string;
    let progressReset: string;
    let storageBlockedChange: string;
    let imported: string;
    let errNotJson: string;
    let errVersion: string;
    let errProgressObject: string;
    let errUnknownLesson: string;
    let errBoolean: string;
    let errTooLarge: string;
    let selfCheck: string;
    let checkUnderstanding: string;
    let score: string;
    let answered: string;
    let reset: string;
    let reviewSection: string;
    let colNum: string;
    let colLesson: string;
    let colCovers: string;
    let moduleTitle: string;
    let moduleCount: string;
    let moduleStart: string;
    let moduleLessonMap: string;
    let modulesNav: string;
    let prevModule: string;
    let nextModule: string;
    let allModules: string;
    let roadmapDescription: string;
    let roadmapIntro: string;
    let roadmapCaption: string;
    let knowledgeMap: string;
    let knowledgeMapIntro: string;
    let lessons: string;
    let glossaryDescription: string;
    let alsoCalled: string;
    let taughtIn: string;
    let lessonRef: string;
    let notFound: string;
    let notFoundTagline: string;
    let startCourse: string;
    let resetLayout: string;
    let resetLayoutHint: string;
    let fullScreen: string;
    let closeFullScreen: string;
    let treeView: string;
    let treeModeSpine: string;
    let treeModeCollapse: string;
    let treeModeTree: string;
    let treeModeOutline: string;
    let treeExpandAll: string;
    let treeCollapseAll: string;
    let treeShow: string;
    let treeHide: string;
    let treeAlso: string;
    let treeFrom: string;
    let treeClose: string;
    let treeHint: string;
    let treeLegendNote: string;
    let treeLessonRoot: string;
    let treeLessonRootDef: string;
    let treeFromLesson: string;
    let mapAsText: string;
    let lessonLink: string;
    let glossaryLink: string;
    let relBuiltOn: string;
    let relIsA: string;
    let relPartOf: string;
    let relUses: string;
    let relRelated: string;
    let wireBuiltOn: string;
    let wireIsA: string;
    let wirePartOf: string;
    let wireUses: string;
    let wireRelated: string;
    let labs: string;
    let allLabs: string;
    let labsDescription: string;
    let labsIntro: string;
    let labsAhead: string;
    let lessonLabs: string;
    let eyebrowLab: string;
    let eyebrowLabLesson: string;
    let scrubControls: string;
    let scrubReset: string;
    let scrubBack: string;
    let scrubPlay: string;
    let scrubPause: string;
    let scrubForward: string;
    let scrubSlider: string;
    let scrubStep: string;
    let trainerUndo: string;
    let trainerRestart: string;
    let trainerLast: string;
    let trainerProgress: string;
    let trainerGoals: string;
    let trainerMet: string;
    let trainerNotMet: string;
    let trainerComplete: string;
    let trainerEmpty: string;
    let trainerConsole: string;
    let trainerLocked: string;
    let trainerReady: string;
    let trainerDone: string;
    let trainerError: string;
    let trainerTagLocked: string;
    let trainerTagReady: string;
    let trainerTagDone: string;
    let trainerTagError: string;
    let trainerActions: string;
    let trainerNone: string;
    let trainerUndone: string;
    let trainerRestarted: string;
    let trainerRestore: string;
    let trainerRestored: string;
    let trainerStale: string;
    let trainerStalePart: string;
}
/** @type {UiText} */
declare const RU: UiText;
export {};
