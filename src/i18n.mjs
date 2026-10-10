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
	knowledgeMapIntro: 'Every concept of the course and what it is built on. Foundations sit at the top; drag boxes to untangle.',
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
	graphHint: 'Click a box to see what it is, how it connects and where it is taught. Drag boxes to untangle.',
	graphLegendNote: 'Foundations on top; wires run down to what is built on them.',
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
};

/** @type {UiText} */
const RU = {
	home: 'Главная',
	roadmap: 'Карта курса',
	reference: 'Справочник',
	glossary: 'Глоссарий',
	moduleOverview: 'Обзор модуля',
	optional: '(необязательный)',
	eyebrowLesson: 'Урок {n}',
	eyebrowModule: 'Модуль {n} — {title}',
	progress: 'Прогресс',
	markComplete: 'Отметить урок пройденным',
	completed: '✓ Пройден',
	completedSummary: 'Пройдено: {summary}',
	coreProgress: 'Прогресс по основной программе',
	describeCore: '{done}/{total} основных',
	describeOptional: '{done}/{total} необязательных',
	storageBlocked: 'Хранилище браузера заблокировано, поэтому прогресс не сохранится после ухода со страницы.',
	yourProgress: 'Ваш прогресс по курсу',
	progressLocal: 'Прогресс хранится только в этом браузере. Выгрузите его в файл, чтобы сохранить копию или перенести на другое устройство.',
	lessonNotDone: 'не пройден',
	lessonDone: 'пройден',
	exportJson: 'Скачать прогресс (JSON)',
	importFile: 'Загрузить из файла…',
	resetProgress: 'Сбросить прогресс',
	resetConfirm: 'Стереть все отметки о пройденных уроках в этом браузере?',
	resetYes: 'Да, сбросить',
	cancel: 'Отмена',
	progressReset: 'Прогресс сброшен.',
	storageBlockedChange: 'Хранилище браузера заблокировано: изменение действует только до ухода со страницы.',
	imported: 'Загружено пройденных уроков: {n} (из {file}).',
	errNotJson: 'Файл не является корректным JSON.',
	errVersion: 'Неподдерживаемый файл: ожидается выгрузка с "version": {v}.',
	errProgressObject: 'Поле "progress" должно быть объектом.',
	errUnknownLesson: 'Неизвестный урок "{id}".',
	errBoolean: 'Урок {id}: значение должно быть true или false.',
	errTooLarge: 'Файл слишком большой для выгрузки прогресса.',
	selfCheck: 'Самопроверка',
	checkUnderstanding: 'Проверьте себя',
	score: 'Верно: {right}/{total}',
	answered: ' (отвечено: {n})',
	reset: 'Сбросить',
	reviewSection: 'Перечитать: {title}',
	colNum: '№',
	colLesson: 'Урок',
	colCovers: 'О чём',
	moduleTitle: 'Модуль {n}: {title}',
	moduleCount: 'Уроков: {count}, с {first} по {last}.',
	moduleStart: 'Начать с урока {n}: {title}',
	moduleLessonMap: 'Карта урока {n}: {title}',
	modulesNav: 'Модули',
	prevModule: '← Модуль {n}: {title}',
	nextModule: 'Модуль {n}: {title} →',
	allModules: 'Все модули',
	roadmapDescription: 'Все модули и уроки курса «{course}».',
	roadmapIntro: 'Весь курс на одной странице. Каждый шаг опирается на те, что выше; щёлкните по блоку, чтобы открыть его.',
	roadmapCaption: 'Модули идут сверху вниз, уроки модуля — под ним. Пройденные уроки становятся зелёными.',
	knowledgeMap: 'Карта понятий',
	knowledgeMapIntro: 'Все понятия курса и то, на чём они построены. Основы наверху; блоки можно растаскивать мышью.',
	lessons: 'Уроки',
	glossaryDescription: 'Все термины курса: что это и на чём построено.',
	alsoCalled: 'Другие названия: {names}',
	taughtIn: 'Объясняется в',
	lessonRef: 'уроке {n}: {title}',
	notFound: 'Страница не найдена',
	notFoundTagline: 'Такой страницы нет. Адреса уроков устроены как модуль/урок/ — полный список на карте курса.',
	startCourse: 'Начать курс',
	resetLayout: 'Вернуть раскладку',
	resetLayoutHint: 'Вернуть передвинутые блоки на место',
	fullScreen: 'На весь экран ⤢',
	closeFullScreen: 'Закрыть ✕',
	graphHint: 'Щёлкните по блоку: что это, с чем связано и где объясняется. Блоки можно растаскивать мышью.',
	graphLegendNote: 'Основы наверху; связи идут вниз — к тому, что на них построено.',
	mapAsText: 'Эта карта текстом',
	lessonLink: 'Урок {n}: {title} →',
	glossaryLink: 'В глоссарий →',
	relBuiltOn: 'построен на',
	relIsA: 'является разновидностью',
	relPartOf: 'входит в',
	relUses: 'использует',
	relRelated: 'связан с',
	wireBuiltOn: 'основа для',
	wireIsA: 'обобщает',
	wirePartOf: 'содержит',
	wireUses: 'используется в',
	wireRelated: 'связан с',
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
