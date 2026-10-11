/**
 * Interface texts of the engine in every supported language: sidebar, generated pages, progress, quizzes, graphs.
 * One table, so a language is complete or caught by the test that compares key sets. Course content (lessons,
 * manifests) is translated in the course's own files; this is only the engine's chrome.
 * Plain ESM: the sidebar labels are needed in astro.config.mjs under Node (see data.mjs).
 * Placeholders: `{name}`, filled by `fmt()`.
 */

/** @typedef {typeof EN} UiText */

const EN = {
	home: 'Home',
	roadmap: 'Course roadmap',
	reference: 'Reference',
	glossary: 'Glossary',
	moduleOverview: 'Module overview',
	optional: '(optional)',
	// Page title eyebrow on lesson pages
	eyebrowLesson: 'Lesson {n}',
	eyebrowModule: 'Module {n} — {title}',
	// Progress
	progress: 'Progress',
	markComplete: 'Mark lesson complete',
	completed: '✓ Completed',
	completedSummary: 'Completed: {summary}',
	coreProgress: 'Core course progress',
	describeCore: '{done}/{total} core',
	describeOptional: '{done}/{total} optional',
	storageBlocked: 'Browser storage is blocked, so progress will not be remembered after you leave this page.',
	yourProgress: 'Your course progress',
	progressLocal: 'Progress is stored only in this browser. Export it to keep a copy or move it to another device.',
	lessonNotDone: 'not done',
	lessonDone: 'completed',
	exportJson: 'Download progress JSON',
	importFile: 'Import from file…',
	resetProgress: 'Reset progress',
	resetConfirm: 'Erase all completion marks in this browser?',
	resetYes: 'Yes, reset',
	cancel: 'Cancel',
	progressReset: 'Progress reset.',
	storageBlockedChange: 'Browser storage is blocked: the change applies to this page view only and will not be remembered.',
	imported: 'Imported {n} completed lessons from {file}.',
	errNotJson: 'The file is not valid JSON.',
	errVersion: 'Unsupported file: expected an export with "version": {v}.',
	errProgressObject: '"progress" must be an object.',
	errUnknownLesson: 'Unknown lesson id "{id}".',
	errBoolean: 'Lesson {id}: value must be true or false.',
	errTooLarge: 'The file is too large to be a progress export.',
	// Quiz
	selfCheck: 'Self-check',
	checkUnderstanding: 'Check your understanding',
	score: 'Score: {right}/{total}',
	answered: ' ({n} answered)',
	reset: 'Reset',
	reviewSection: 'Read again: {title}',
	// Course map tables
	colNum: '#',
	colLesson: 'Lesson',
	colCovers: 'What it covers',
	// Module overview page
	moduleTitle: 'Module {n}: {title}',
	moduleCount: '{count} lessons, {first}–{last} of the course.',
	moduleStart: 'Start with lesson {n}: {title}',
	moduleLessonMap: 'Map of lesson {n}: {title}',
	modulesNav: 'Modules',
	prevModule: '← Module {n}: {title}',
	nextModule: 'Module {n}: {title} →',
	allModules: 'All modules',
	// Roadmap page
	roadmapDescription: 'Every module and lesson of {course}.',
	roadmapIntro: 'The whole course on one page. Each step builds on the ones above it; click any box to open it.',
	roadmapCaption: "Modules run top to bottom; each module's lessons follow it. Completed lessons turn green.",
	knowledgeMap: 'Knowledge map',
	knowledgeMapIntro: 'Every concept of the course, each hung off the concept it is built on. Open a branch with the round button next to a card; click a card for what it is.',
	lessons: 'Lessons',
	// Glossary page
	glossaryDescription: 'Every term of the course, what it is and what it is built on.',
	alsoCalled: 'Also called: {names}',
	taughtIn: 'Taught in',
	lessonRef: 'lesson {n}: {title}',
	// 404
	notFound: 'Page not found',
	notFoundTagline: 'This page does not exist. Lesson URLs follow the pattern module/lesson/ - see the roadmap for the full list.',
	startCourse: 'Start the course',
	// Graphs
	resetLayout: 'Reset layout',
	resetLayoutHint: 'Put moved nodes back',
	fullScreen: 'Full screen ⤢',
	closeFullScreen: 'Close ✕',
	// Concept trees (graph/TreeView.tsx)
	treeView: 'Map view',
	treeModeSpine: 'Spine',
	treeModeCollapse: 'Tree + collapse',
	treeModeTree: 'Tree',
	treeModeOutline: 'Outline',
	treeExpandAll: 'Expand all',
	treeCollapseAll: 'Collapse',
	treeShow: 'Show what hangs off {label} ({n})',
	treeHide: 'Hide what hangs off {label}',
	treeAlso: '+ from {list}',
	treeFrom: 'from {list}',
	treeClose: 'Close',
	treeHint: 'Click a card for what it is and how it connects. Switch the view above: Spine reads top to bottom; in the trees the round button next to a card opens or closes its branch.',
	treeLegendNote: 'Solid line: what a card hangs off. Dashed line or "+" note: a second relation.',
	treeLessonRoot: 'Lesson {n}: {title}',
	treeLessonRootDef: 'The root of this map. Each term hangs off the term it is built on; terms of other lessons are dimmed and link to their lesson.',
	treeFromLesson: 'lesson {n}',
	mapAsText: 'This map as text',
	lessonLink: 'Lesson {n}: {title} →',
	glossaryLink: 'Glossary entry →',
	// Relations, read from the term that has them ("device is built on physical device")
	relBuiltOn: 'is built on',
	relIsA: 'is a kind of',
	relPartOf: 'is part of',
	relUses: 'uses',
	relRelated: 'is related to',
	// The same relations named as wires, read top to bottom ("physical device is the base of device")
	wireBuiltOn: 'is the base of',
	wireIsA: 'has the kind',
	wirePartOf: 'contains',
	wireUses: 'is used by',
	wireRelated: 'is related to',
	// Labs: sidebar group, catalog page, lesson box, lab page eyebrow
	labs: 'Labs',
	allLabs: 'All labs',
	labsDescription: 'Interactive simulations of {course}.',
	labsIntro: 'Simulations to work with by hand: step through them, scrub back and forth, change the inputs. Each lab is listed under the module of its lesson.',
	labsAhead: 'Ahead in the course',
	lessonLabs: 'Labs for this lesson',
	eyebrowLab: 'Lab',
	eyebrowLabLesson: 'Lesson {n} — {title}',
	// Timeline controls (lab Scrubber)
	scrubControls: 'Timeline controls',
	scrubReset: 'Back to the start',
	scrubBack: 'Step back',
	scrubPlay: 'Play',
	scrubPause: 'Pause',
	scrubForward: 'Step forward',
	scrubSlider: 'Timeline position',
	scrubStep: 'Step {i} of {n}',
};

/** @type {UiText} */
const RU = {
	home: 'Главная',
	roadmap: 'Карта курса',
	reference: 'Справочник',
	glossary: 'Глоссарий',
	moduleOverview: 'Обзор модуля',
	optional: '(дополнительный)',
	eyebrowLesson: 'Урок {n}',
	eyebrowModule: 'Модуль {n} — {title}',
	progress: 'Прогресс',
	markComplete: 'Отметить как пройденный',
	completed: '✓ Пройдено',
	completedSummary: 'Пройдено: {summary}',
	coreProgress: 'Прогресс по основному курсу',
	describeCore: '{done}/{total} основных',
	describeOptional: '{done}/{total} дополнительных',
	storageBlocked: 'Браузер блокирует хранилище сайта, поэтому прогресс пропадёт, как только вы уйдёте с этой страницы.',
	yourProgress: 'Ваш прогресс по курсу',
	progressLocal: 'Прогресс хранится только в этом браузере. Экспортируйте его в файл, чтобы сохранить копию или перенести на другое устройство.',
	lessonNotDone: 'не пройден',
	lessonDone: 'пройден',
	exportJson: 'Скачать прогресс (JSON)',
	importFile: 'Импортировать из файла…',
	resetProgress: 'Сбросить прогресс',
	resetConfirm: 'Удалить все отметки о пройденных уроках в этом браузере?',
	resetYes: 'Да, сбросить',
	cancel: 'Отмена',
	progressReset: 'Прогресс сброшен.',
	storageBlockedChange: 'Браузер блокирует хранилище сайта: изменение пропадёт, как только вы уйдёте с этой страницы.',
	imported: 'Из {file} импортировано пройденных уроков: {n}.',
	errNotJson: 'В файле некорректный JSON.',
	errVersion: 'Неподдерживаемый файл: нужен экспорт прогресса с "version": {v}.',
	errProgressObject: 'Поле "progress" должно быть объектом.',
	errUnknownLesson: 'Неизвестный урок "{id}".',
	errBoolean: 'Урок {id}: значение должно быть true или false.',
	errTooLarge: 'Файл слишком большой: это не экспорт прогресса.',
	selfCheck: 'Самопроверка',
	checkUnderstanding: 'Проверьте себя',
	score: 'Верно: {right}/{total}',
	answered: ' (отвечено: {n})',
	reset: 'Сбросить',
	reviewSection: 'Перечитать: {title}',
	colNum: '№',
	colLesson: 'Урок',
	colCovers: 'Содержание',
	moduleTitle: 'Модуль {n}: {title}',
	moduleCount: 'Уроки {first}–{last}, всего {count}.',
	moduleStart: 'Начать с урока {n}: {title}',
	moduleLessonMap: 'Карта урока {n}: {title}',
	modulesNav: 'Модули',
	prevModule: '← Модуль {n}: {title}',
	nextModule: 'Модуль {n}: {title} →',
	allModules: 'Все модули',
	roadmapDescription: 'Все модули и уроки курса «{course}».',
	roadmapIntro: 'Весь курс на одной странице. Каждый шаг опирается на предыдущие; нажмите на блок, чтобы открыть его.',
	roadmapCaption: 'Модули идут сверху вниз, уроки — под своим модулем. Пройденные уроки подсвечиваются зелёным.',
	knowledgeMap: 'Карта понятий',
	knowledgeMapIntro: 'Все понятия курса; каждое подвешено к тому, на чём построено. Ветка раскрывается круглой кнопкой рядом с карточкой, а щелчок по карточке объясняет понятие.',
	lessons: 'Уроки',
	glossaryDescription: 'Все термины курса: что они означают и на чём построены.',
	alsoCalled: 'Другие названия: {names}',
	taughtIn: 'Объясняется в',
	lessonRef: 'уроке {n}: {title}',
	notFound: 'Страница не найдена',
	notFoundTagline: 'Такой страницы нет. Адреса уроков имеют вид модуль/урок/, полный список — на карте курса.',
	startCourse: 'Начать курс',
	resetLayout: 'Сбросить расположение',
	resetLayoutHint: 'Вернуть передвинутые блоки на место',
	fullScreen: 'На весь экран ⤢',
	closeFullScreen: 'Закрыть ✕',
	treeView: 'Вид карты',
	treeModeSpine: 'Ствол',
	treeModeCollapse: 'Дерево со свёрткой',
	treeModeTree: 'Дерево',
	treeModeOutline: 'Список',
	treeExpandAll: 'Раскрыть всё',
	treeCollapseAll: 'Свернуть',
	treeShow: 'Показать, что висит на «{label}» ({n})',
	treeHide: 'Скрыть, что висит на «{label}»',
	treeAlso: '+ из {list}',
	treeFrom: 'из {list}',
	treeClose: 'Закрыть',
	treeHint: 'Щелчок по карточке объясняет, что это и с чем связано. Вид переключается сверху: «Ствол» читается сверху вниз, а в деревьях круглая кнопка рядом с карточкой раскрывает и сворачивает ветку.',
	treeLegendNote: 'Сплошная линия: к чему подвешена карточка. Пунктир или приписка «+»: вторая связь.',
	treeLessonRoot: 'Урок {n}: {title}',
	treeLessonRootDef: 'Корень этой карты. Каждый термин подвешен к тому, на чём построен; термины других уроков приглушены и ведут на свой урок.',
	treeFromLesson: 'урок {n}',
	mapAsText: 'Текстовая версия карты',
	lessonLink: 'Урок {n}: {title} →',
	glossaryLink: 'Открыть в глоссарии →',
	relBuiltOn: 'строится на',
	relIsA: 'является разновидностью',
	relPartOf: 'входит в',
	relUses: 'использует',
	relRelated: 'см. также',
	wireBuiltOn: 'основа',
	wireIsA: 'разновидность',
	wirePartOf: 'часть',
	wireUses: 'использование',
	wireRelated: 'связь',
	labs: 'Интерактивы',
	allLabs: 'Все интерактивы',
	labsDescription: 'Интерактивные модели курса «{course}».',
	labsIntro: 'Модели, с которыми можно поработать руками: проходите их по шагам, перематывайте вперёд и назад, меняйте входные данные. Каждый интерактив стоит в разделе модуля, к уроку которого он относится.',
	labsAhead: 'Дальше в курсе',
	lessonLabs: 'Интерактивы к уроку',
	eyebrowLab: 'Интерактив',
	eyebrowLabLesson: 'Урок {n} — {title}',
	scrubControls: 'Управление воспроизведением',
	scrubReset: 'Сначала',
	scrubBack: 'Шаг назад',
	scrubPlay: 'Воспроизвести',
	scrubPause: 'Пауза',
	scrubForward: 'Шаг вперёд',
	scrubSlider: 'Положение на шкале',
	scrubStep: 'Шаг {i} из {n}',
};

/** Interface texts per language code. */
export const UI = { en: EN, ru: RU };

/** Languages the engine can show its interface in. */
export const UI_LANGS = /** @type {(keyof typeof UI)[]} */ (Object.keys(UI));

/**
 * Interface texts for a language; throws for a language the engine has no texts for.
 * @param {string} lang
 * @returns {UiText}
 */
export function ui(lang) {
	const t = /** @type {Record<string, UiText>} */ (UI)[lang];
	if (!t) throw new Error(`course-kit has no interface texts for "${lang}" (known: ${UI_LANGS.join(', ')}); add them to src/i18n.mjs`);
	return t;
}

/**
 * Fills `{name}` placeholders.
 * @param {string} text
 * @param {Record<string, string | number>} vars
 */
export function fmt(text, vars) {
	return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** UI text keys of the relation names per edge type. */
export const REL_KEY = /** @type {const} */ ({
	'built-on': { rel: 'relBuiltOn', wire: 'wireBuiltOn' },
	'is-a': { rel: 'relIsA', wire: 'wireIsA' },
	'part-of': { rel: 'relPartOf', wire: 'wirePartOf' },
	uses: { rel: 'relUses', wire: 'wireUses' },
	related: { rel: 'relRelated', wire: 'wireRelated' },
});
