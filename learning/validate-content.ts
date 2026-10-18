import { promises as fs } from "fs";
import path from "path";
import ts from "typescript";
import { ZodError } from "zod";
import { Catalog, Challenge, Track, Unit } from "./schema";
import { TIERS } from "./tiers";
import { Taxonomy, TAXONOMY, TAXONOMY_SLUGS } from "./taxonomy";
import { RUNNER_DEPENDENCIES, SANDBOX_PACKAGES } from "./sandbox";
import { parseFrontmatter } from "../lib/frontmatter";

/**
 * Every content check that needs the filesystem — the schema (learning/schema.ts) covers what a
 * single JSON file can get wrong; this covers what only shows up across files and folders.
 * `scripts/validate.ts` (`pnpm validate`) prints the report; `validate-content.test.ts` runs it
 * against small broken fixtures so no check can be disabled without a test failing.
 *
 * Kept free of `@/` imports so the tsx-run CLI can load it.
 */

export type ReportLine = { kind: "info" | "error" | "warning"; text: string };

/** Lines in the order they were found, so the CLI can print errors under their unit. */
export type ValidationReport = {
  lines: ReportLine[];
  errors: string[];
  warnings: string[];
};

/** Mutable state for one run, threaded through the checks below. */
type Run = {
  root: string;
  report: ValidationReport;
  /** Every skill referenced by content that resolves in the taxonomy, for the orphan check. */
  referencedTags: Set<string>;
  /** In-app links (`](/learn/<track>/<unit>)`) seen in content, resolved once every unit is known. */
  appLinks: { where: string; href: string }[];
};

const info = (run: Run, text: string) => run.report.lines.push({ kind: "info", text });
const fail = (run: Run, text: string) => {
  run.report.lines.push({ kind: "error", text });
  run.report.errors.push(text);
};
const warn = (run: Run, text: string) => {
  run.report.lines.push({ kind: "warning", text });
  run.report.warnings.push(text);
};

/**
 * One line per problem. A ZodError's own `.message` is a JSON dump of every issue, which buries
 * the field path and the reason in escaped quotes; `blocks.1.questions.0.answer: …` reads at a
 * glance. Anything else (a JSON syntax error, a missing file) keeps its message.
 */
function describeError(e: unknown): string {
  if (e instanceof ZodError)
    return e.issues
      .map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`)
      .join("; ");
  return (e as Error).message;
}

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

/** Names of the subdirectories of `dir` (a stray file such as .DS_Store is not a track/unit). */
async function subdirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

/** Every file under `dir`, as paths relative to it. Challenge folders may nest. */
async function walk(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), rel)));
    else out.push(rel);
  }
  return out;
}

function checkSkills(run: Run, label: string, skills: string[]) {
  for (const s of skills) {
    if (!TAXONOMY_SLUGS.has(s))
      fail(run, `${label}: skill "${s}" is not in the taxonomy (learning/taxonomy.ts)`);
    else run.referencedTags.add(s);
  }
}

/**
 * Characters that render as nothing (or as a line break the author never typed) and so can't be
 * seen in review: C0 controls other than tab/newline/CR, DEL, the Unicode line/paragraph
 * separators, and every format character (`\p{Cf}`: zero-width spaces and joiners, the word
 * joiner, the BOM, the soft hyphen, bidi controls). They get into content through shell heredocs
 * and copy-paste. A whole category, not a list, so a character nobody thought to list (U+2060)
 * can't slip through.
 */
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]|\p{Cf}/u;

/** Checks one piece of content text: no invisible characters, and remember its in-app links. */
function checkText(run: Run, where: string, text: string) {
  const bad = INVISIBLE.exec(text);
  if (bad) {
    const code = bad[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
    fail(run, `${where}: contains the invisible character U+${code} — delete it (it renders as nothing or as a stray line break)`);
  }
  for (const m of text.matchAll(/\]\((\/learn\/[^)\s#?]*)/g)) run.appLinks.push({ where, href: m[1] });
}

/** Calls `visit` on every string inside parsed JSON. */
function eachString(value: unknown, visit: (s: string) => void) {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((v) => eachString(v, visit));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => eachString(v, visit));
}

/**
 * Reads one content JSON file (catalog, track, unit or challenge meta) and parses it with `schema`.
 * Every string is checked (checkText) BEFORE the schema runs, so an invisible character is still
 * reported in a file the schema rejects. A read, JSON or schema error is reported under `label`
 * and returns null; `where` names the file in a text problem.
 */
async function readContentJson<T>(
  run: Run,
  file: string,
  schema: { parse(data: unknown): T },
  { label, where }: { label: string; where: string },
): Promise<T | null> {
  try {
    const raw: unknown = await readJson(file);
    eachString(raw, (text) => checkText(run, where, text));
    return schema.parse(raw);
  } catch (e) {
    fail(run, `${label}: ${describeError(e)}`);
    return null;
  }
}

/** "@scope/pkg/sub" -> "@scope/pkg"; "react-dom/client" -> "react-dom". */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * jest-dom's matchers. Sandpack loads no `expect` extensions, so each one is a runtime
 * TypeError in the iframe — assert on plain values (`…textContent`, `…value`, `…disabled`).
 */
const JEST_DOM_MATCHERS = new Set([
  "toBeInTheDocument",
  "toBeVisible",
  "toBeEmptyDOMElement",
  "toBeDisabled",
  "toBeEnabled",
  "toBeInvalid",
  "toBeValid",
  "toBeRequired",
  "toBeChecked",
  "toBePartiallyChecked",
  "toHaveAttribute",
  "toHaveClass",
  "toHaveFocus",
  "toHaveFormValues",
  "toHaveStyle",
  "toHaveTextContent",
  "toHaveValue",
  "toHaveDisplayValue",
  "toHaveDescription",
  "toHaveAccessibleDescription",
  "toHaveAccessibleErrorMessage",
  "toHaveAccessibleName",
  "toHaveErrorMessage",
  "toContainElement",
  "toContainHTML",
]);

/** The globals a test registers through: `it("name", fn)` and `test("name", fn)`. */
const TEST_FUNCTIONS = new Set(["it", "test"]);
/** `it.only("name", fn)` and `it.skip("name", fn)` still register a test with that name. */
const TEST_MODIFIERS = new Set(["only", "skip"]);
/** The spy/mock/fake-timer namespaces. Sandpack's runner defines neither. */
const TEST_HELPER_GLOBALS = new Set(["vi", "jest"]);

/** Whether calling `callee` registers one test: `it`, `test.only`, `it.each(table)`, … */
function isTestFunction(callee: ts.Expression): boolean {
  if (ts.isIdentifier(callee)) return TEST_FUNCTIONS.has(callee.text);
  if (ts.isPropertyAccessExpression(callee) && TEST_MODIFIERS.has(callee.name.text))
    return isTestFunction(callee.expression);
  // `it.each(table)` returns the function that registers the test, so `it.each(table)("name", fn)`
  // is a test call; `it.each(table)` itself is not (its argument is the table, not a name).
  if (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression))
    return callee.expression.name.text === "each" && isTestFunction(callee.expression.expression);
  return false;
}

/** What the grader and import checks need from one challenge source file. */
type SourceScan = {
  /** Every module specifier: `import … from`, `import "x"`, `export … from`, `import("x")`, `require("x")`. */
  imports: string[];
  /** The name of every test call, in order, when written as a plain string (a template with `${}` is skipped). */
  testNames: string[];
  callsJestMock: boolean;
  /** Any member of `vi` or `jest` is read (`vi.fn`, `jest.spyOn`, `jest.useFakeTimers`, …). */
  usesTestHelpers: boolean;
  /** The first jest-dom matcher called, as written after `expect(…).` (`toBeVisible` or `not.toBeVisible`). */
  jestDomMatcher: string | null;
};

/**
 * Reads a challenge source file with TypeScript's own parser, so a comment, a string, template or
 * JSX text, or a regex literal is never read as code (a regex like `/\/*$/` or `/:\/\//` looks like
 * a comment opening to anything less than a parser). Each check below reads the same parse.
 */
function scanSource(fileName: string, src: string): SourceScan {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, false, kind);
  const scan: SourceScan = {
    imports: [],
    testNames: [],
    callsJestMock: false,
    usesTestHelpers: false,
    jestDomMatcher: null,
  };
  let jestDomMatcherAt = Infinity;
  const firstStringArgument = (call: ts.CallExpression) => {
    const first = call.arguments[0];
    return first && ts.isStringLiteralLike(first) ? first.text : null;
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) scan.imports.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node)) {
      // import x = require("y")
      const ref = node.moduleReference;
      if (ts.isExternalModuleReference(ref) && ts.isStringLiteralLike(ref.expression)) scan.imports.push(ref.expression.text);
    } else if (ts.isImportTypeNode(node)) {
      // typeof import("y")
      const arg = node.argument;
      if (ts.isLiteralTypeNode(arg) && ts.isStringLiteralLike(arg.literal)) scan.imports.push(arg.literal.text);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const firstString = firstStringArgument(node);
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === "require")) {
        if (firstString !== null) scan.imports.push(firstString);
      } else if (isTestFunction(callee)) {
        if (firstString !== null) scan.testNames.push(firstString);
      } else if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        const receiver = callee.expression;
        if (method === "mock" && ts.isIdentifier(receiver) && receiver.text === "jest") scan.callsJestMock = true;
        if (JEST_DOM_MATCHERS.has(method) && callee.name.pos < jestDomMatcherAt) {
          jestDomMatcherAt = callee.name.pos;
          const negated = ts.isPropertyAccessExpression(receiver) && receiver.name.text === "not";
          scan.jestDomMatcher = negated ? `not.${method}` : method;
        }
      }
    } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && TEST_HELPER_GLOBALS.has(node.expression.text)) scan.usesTestHelpers = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return scan;
}

/**
 * The headless grader (`pnpm test:challenges`) resolves challenge imports from this repo's
 * node_modules, so every package the sandbox installs must also be a devDependency at the SAME
 * exact version — otherwise the headless run passes against a different version than the one
 * the learner's browser loads.
 */
function checkPinnedDevDependency(
  run: Run,
  label: string,
  pkg: string,
  version: string,
  devDependencies: Record<string, string>,
) {
  const installed = devDependencies[pkg];
  if (installed !== version)
    fail(
      run,
      `${label}: "${pkg}" is pinned to ${version} for the sandbox, but package.json devDependencies has ${installed ?? "nothing"} — add it with \`pnpm add -D -E ${pkg}@${version}\``,
    );
}

/**
 * A fenced code block. Global, but only ever used with `replace`/`match`, which reset
 * `lastIndex`, so sharing one instance is safe.
 */
const FENCED_CODE = /```[\s\S]*?```/g;

/**
 * Readings, cards and challenge READMEs are rendered with react-markdown
 * (components/markdown.tsx), NOT compiled as MDX — the `.mdx` extension is historical. A
 * JSX/HTML tag or an `import`/`export` line outside code therefore shows up as literal text on
 * the page. Code is stripped first: tags inside fenced or inline code are fine. `<!--more-->`
 * (the "Go deeper" split) is an HTML comment, not a tag.
 */
function markdownProblem(body: string): string | null {
  const prose = body.replace(FENCED_CODE, "").replace(/`[^`\n]*`/g, "");
  const tag = /<\/?[A-Za-z][\w.-]*(?=[\s/>])[^>]*>?/.exec(prose);
  if (tag)
    return `"${tag[0].slice(0, 40)}" outside code — this is Markdown, not MDX, so it renders as literal text; put code in backticks`;
  const mdx = /^\s*(import|export)\s/m.exec(prose);
  if (mdx)
    return `an "${mdx[1]}" line — this is Markdown, not MDX, so it renders as literal text`;
  return null;
}

/**
 * The app renders a challenge's title, its "Your task" heading and the acceptance checklist
 * from meta.json (components/challenge-block.tsx). A README that repeats any of them shows the
 * learner two copies, and the copies drift — three of ten did before this check existed.
 * It also rejects a "Running" section and Markdown the renderer would show literally
 * (markdownProblem).
 */
function readmeProblems(readme: string): string[] {
  const prose = readme.replace(FENCED_CODE, "");
  const problems: string[] = [];
  if (/^#\s/m.test(prose)) problems.push("has a top-level # heading — the title comes from meta.json");
  if (/^\s*[-*]\s+\[[ xX]\]/m.test(prose))
    problems.push("has a - [ ] checklist — the acceptance criteria come from meta.json");
  if (/^#{1,6}\s+your task\b/im.test(prose))
    problems.push('has a "Your task" heading — the app renders that section from meta.json');
  if (/^#{1,6}\s+running\b/im.test(prose))
    problems.push('has a "Running" section — how a challenge runs is the app\'s to say, not each README\'s');
  const markdown = markdownProblem(readme);
  if (markdown) problems.push(markdown);
  return problems;
}

/**
 * A challenge's declared packages next to the repo's devDependencies. Passed as one named object
 * because the two maps have the same type, so swapping them as positional arguments would compile.
 */
type ChallengeDependencies = {
  declaredDependencies: Record<string, string>; // meta.json "dependencies"
  devDependencies: Record<string, string>; // package.json devDependencies
};

/**
 * Re-declaring a runner-provided package would silently swap the version every other challenge
 * is tested against, so only genuinely extra packages may be declared — each pinned to the same
 * version as its devDependency.
 */
function checkDeclaredDependencies(
  run: Run,
  label: string,
  { declaredDependencies, devDependencies }: ChallengeDependencies,
) {
  for (const [pkg, version] of Object.entries(declaredDependencies)) {
    if (SANDBOX_PACKAGES.has(pkg))
      fail(run, `${label}: meta.json dependencies re-declares "${pkg}", which the runner always provides`);
    else checkPinnedDevDependency(run, label, pkg, version, devDependencies);
  }
}

/** One challenge file's bare imports that the sandbox can't resolve (relative imports are fine). */
function importProblems(imports: string[], resolvable: Set<string>): string[] {
  const problems: string[] = [];
  for (const specifier of imports) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
    const pkg = packageName(specifier);
    if (resolvable.has(pkg)) continue;
    if (pkg === "vitest") {
      problems.push(`imports "${specifier}" — Sandpack tests are jest-style globals, not Vitest`);
      continue;
    }
    problems.push(
      `imports "${specifier}" — the sandbox only resolves ${[...resolvable].join(", ")}; declare it in meta.json "dependencies" or hand-roll a support module`,
    );
  }
  return problems;
}

/**
 * What one grader uses that Sandpack's runner doesn't have. The runner is jest-style, not
 * Vitest, and ships no jest-dom / spies / module mocking.
 */
function graderProblems(scan: SourceScan): string[] {
  const problems: string[] = [];
  // No spy/mock/fake-timer library is loaded: `vi` and `jest` are undefined at runtime, so
  // *any* member access on either throws — don't enumerate, reject the whole namespace.
  if (scan.callsJestMock) {
    problems.push("uses jest.mock — unavailable; add a settable seam module instead");
  } else if (scan.usesTestHelpers) {
    problems.push(
      "uses a spy/fake-timer helper (vi.* / jest.*) — unavailable in the sandbox; patch the global by hand or add a settable seam",
    );
  }
  // Sandpack keys its results list by test name alone (not describe + name), so a repeated
  // name across describe blocks logs a React duplicate-key error and can drop a result row.
  const seen = new Set<string>();
  for (const name of scan.testNames) {
    if (seen.has(name))
      problems.push(`two tests are named "${name}" — Sandpack keys its results by test name, so every name in the file must be unique`);
    seen.add(name);
  }
  if (scan.jestDomMatcher)
    problems.push(`uses the jest-dom matcher ${scan.jestDomMatcher} — only plain matchers are available`);
  return problems;
}

/**
 * The in-browser (Sandpack) challenge contract — see learning/PLAYBOOK.md. These used to be
 * browser-only discoveries: a missing App.tsx or a `vitest` import fails at *runtime*, inside
 * an iframe, long after authoring. Cheap to check here, so check here. Whether the starter
 * fails and the solution passes is `pnpm test:challenges`' job (scripts/check-challenges.ts).
 */
async function checkInBrowserChallenge(
  run: Run,
  slug: string,
  cDir: string,
  names: string[], // every file in the folder (walk), since Sandpack loads nested files too
  entry: string,
  dependencies: ChallengeDependencies,
) {
  const label = `challenge ${slug}`;
  checkDeclaredDependencies(run, label, dependencies);
  const resolvable = new Set([...SANDBOX_PACKAGES, ...Object.keys(dependencies.declaredDependencies)]);
  const read = (n: string) => fs.readFile(path.join(cDir, n), "utf8");

  for (const required of ["App.tsx", "solution.tsx"]) {
    if (!names.includes(required)) fail(run, `${label}: missing ${required} (in-browser contract)`);
  }

  const tests = names.filter((n) => n.endsWith(".test.tsx") || n.endsWith(".test.ts"));
  if (tests.length === 0) fail(run, `${label}: no *.test.tsx or *.test.ts grader`);

  if (names.includes("solution.tsx")) {
    const [starter, solution] = await Promise.all([read(entry), read("solution.tsx")]);
    if (starter.trim() === solution.trim())
      fail(run, `${label}: solution.tsx is identical to the starter`);
  }

  // Every file in the folder is loaded into the sandbox, so every file's imports must resolve.
  for (const f of names.filter((n) => /\.(ts|tsx)$/.test(n))) {
    const src = await read(f);
    checkText(run, `${label}/${f}`, src);
    const scan = scanSource(f, src);
    for (const problem of importProblems(scan.imports, resolvable)) fail(run, `${label}/${f}: ${problem}`);
    if (tests.includes(f)) for (const problem of graderProblems(scan)) fail(run, `${label}/${f}: ${problem}`);
  }
}

/**
 * The files loadChallenge (lib/content.ts) keeps out of a challenge's editable file set: README.md
 * and solution.tsx are served separately, meta.json not at all.
 */
const HELD_BACK_FILES = new Set(["meta.json", "README.md", "solution.tsx"]);

/** Validate one challenge folder: meta.json, README.md, its tags, its entry, the runner contract. */
async function checkChallenge(run: Run, slug: string, devDependencies: Record<string, string>) {
  const cDir = path.join(run.root, "content", "challenges", slug);
  const meta = await readContentJson(run, path.join(cDir, "meta.json"), Challenge, {
    label: `challenge ${slug}`,
    where: `challenge ${slug}/meta.json`,
  });
  if (!meta) return;
  checkSkills(run, `challenge ${slug}`, meta.skills);
  if (meta.slug !== slug) fail(run, `challenge ${slug}: meta.slug "${meta.slug}" does not match folder`);

  let readme: string | null = null;
  try {
    readme = await fs.readFile(path.join(cDir, "README.md"), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    fail(run, `challenge ${slug}: missing README.md (the problem statement and hint)`);
  }
  if (readme !== null) {
    for (const problem of readmeProblems(readme)) fail(run, `challenge ${slug}/README.md: ${problem}`);
    checkText(run, `challenge ${slug}/README.md`, readme);
  }

  // Mirror loadChallenge's contract: meta.entry must resolve inside the challenge dir, and must be
  // the exact key (forward-slash path) of one of the files the loader serves as editable.
  const base = path.resolve(cDir);
  const entryPath = path.resolve(cDir, meta.entry);
  if (entryPath !== base && !entryPath.startsWith(base + path.sep)) {
    fail(run, `challenge ${slug}: entry "${meta.entry}" escapes the challenge directory`);
    return;
  }
  const names = await walk(cDir);
  const entryFile = path.relative(base, entryPath).split(path.sep).join("/");
  if (!names.includes(entryFile)) {
    fail(run, `challenge ${slug}: entry file "${meta.entry}" not found`);
    return;
  }
  if (meta.entry !== entryFile) {
    fail(run, `challenge ${slug}: entry "${meta.entry}" must be written "${entryFile}" — the loader looks the entry up by its exact path in the folder`);
    return;
  }
  if (HELD_BACK_FILES.has(entryFile)) {
    fail(run, `challenge ${slug}: entry "${meta.entry}" is not a starter file — the loader keeps ${[...HELD_BACK_FILES].join(", ")} out of the editable files`);
    return;
  }
  if (meta.runner === "in-browser") {
    await checkInBrowserChallenge(run, slug, cDir, names, meta.entry, {
      declaredDependencies: meta.dependencies ?? {},
      devDependencies,
    });
  } else if (meta.dependencies) {
    fail(run, `challenge ${slug}: "dependencies" only applies to runner "in-browser"`);
  }
}

/**
 * One folder of example files — a reading tier or a deck of cards: only numbered `.mdx` files,
 * `id` + `title` frontmatter (unquoted, nothing else), Markdown rather than MDX, ids unique
 * across the unit. Returns the files' bodies so callers can add their own checks.
 */
async function checkExampleFolder(
  run: Run,
  label: string,
  dir: string,
  seenIds: Set<string>,
): Promise<{ file: string; body: string }[]> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(dir)).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  // The loader reads only *.mdx files, so anything else here would silently never render.
  for (const f of entries) {
    if (!f.endsWith(".mdx") && f !== ".DS_Store")
      fail(run, `${label}/${f}: not a .mdx file, so it is never shown`);
  }
  const examples: { file: string; body: string }[] = [];
  for (const f of entries.filter((e) => e.endsWith(".mdx"))) {
    const where = `${label}/${f}`;
    // Examples are ordered by filename; an unnumbered file sorts unpredictably.
    if (!/^\d{2}-/.test(f)) fail(run, `${where}: filename must start with a two-digit number (01-…)`);
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    checkText(run, where, raw);
    const { data, body } = parseFrontmatter(raw);
    if (!data.id || !data.title) fail(run, `${where}: missing id/title frontmatter`);
    for (const [key, value] of Object.entries(data)) {
      if (key !== "id" && key !== "title")
        fail(run, `${where}: frontmatter key "${key}" is not read — only id and title are`);
      // lib/frontmatter.ts is not YAML: quotes are kept as part of the value.
      if (/^(["']).*\1$/.test(value))
        fail(run, `${where}: frontmatter ${key} is wrapped in quotes, which would be shown — drop them`);
    }
    if (data.id) {
      if (seenIds.has(data.id)) fail(run, `${where}: duplicate id "${data.id}" in this unit`);
      seenIds.add(data.id);
    }
    const problem = markdownProblem(body);
    if (problem) fail(run, `${where}: ${problem}`);
    examples.push({ file: f, body });
  }
  return examples;
}

/** Every reading example under one reading block's tier folders. */
async function checkReadingTiers(run: Run, label: string, dir: string, seenIds: Set<string>) {
  for (const tier of TIERS) {
    const examples = await checkExampleFolder(run, `${label}/${tier}`, path.join(dir, tier), seenIds);
    if (examples.length === 0) fail(run, `${label}: reading tier "${tier}" has no examples`);
  }
}

/** A card is one idea and one example; past these it has become a reading example. */
const CARD_MAX_WORDS = 150;
const CARD_MAX_CODE_BLOCKS = 1;

async function checkCards(run: Run, label: string, dir: string, seenIds: Set<string>) {
  const cards = await checkExampleFolder(run, `${label}/cards`, dir, seenIds);
  if (cards.length === 0) fail(run, `${label}: cards block has no card files in ${path.basename(dir)}/`);
  for (const { file, body } of cards) {
    const codeBlocks = body.match(FENCED_CODE) ?? [];
    const words = body.replace(FENCED_CODE, "").split(/\s+/).filter(Boolean).length;
    // A warning, not an error: the limit is a nudge toward the right block type, not a rule.
    if (words > CARD_MAX_WORDS || codeBlocks.length > CARD_MAX_CODE_BLOCKS)
      warn(
        run,
        `${label}/cards/${file}: ${words} words and ${codeBlocks.length} code block(s) — a card is one idea and one example (≤${CARD_MAX_WORDS} words, ≤${CARD_MAX_CODE_BLOCKS} code block); split it, or make it a reading`,
      );
  }
}

/**
 * content/catalog.json lists the tracks in display order. It is the only thing that makes a
 * track visible, so a folder missing from it — or a listed track with no folder — is an error.
 */
async function checkCatalog(run: Run, trackFolders: string[]) {
  const catalog = await readContentJson(run, path.join(run.root, "content", "catalog.json"), Catalog, {
    label: "content/catalog.json",
    where: "content/catalog.json",
  });
  if (!catalog) return;
  const listed = new Set<string>();
  for (const t of catalog.tracks) {
    if (listed.has(t)) fail(run, `content/catalog.json: track "${t}" is listed twice`);
    listed.add(t);
    if (!trackFolders.includes(t))
      fail(run, `content/catalog.json: track "${t}" has no folder in content/tracks/`);
  }
  for (const folder of trackFolders) {
    if (!listed.has(folder))
      fail(run, `content/tracks/${folder} is not in content/catalog.json, so it is never shown`);
  }
}

async function checkTrack(
  run: Run,
  trackSlug: string,
  unitOwner: Map<string, string>,
  challengeSlugs: Set<string>,
  referencedChallenges: Set<string>,
) {
  const trackDir = path.join(run.root, "content", "tracks", trackSlug);
  const track = await readContentJson(run, path.join(trackDir, "track.json"), Track, {
    label: `track ${trackSlug}`,
    where: `track ${trackSlug}/track.json`,
  });
  if (!track) return;
  info(run, `track: ${track.slug}`);
  // The description is rendered as plain text on the cards, so Markdown shows up literally.
  if (/`|\*\*|\]\(/.test(track.description))
    warn(run, `track ${trackSlug}: description contains Markdown (\`, ** or a link), which is shown as literal text`);
  // Links are built from the slug in the JSON and routes from the folder name, so a
  // mismatch builds fine and then 404s.
  if (track.slug !== trackSlug) fail(run, `track ${trackSlug}: slug "${track.slug}" does not match its folder`);

  // track.units is the ONLY thing that makes a unit visible: a folder left out of it is never
  // validated, built or shown.
  const listed = new Set<string>();
  for (const unitSlug of track.units) {
    if (listed.has(unitSlug)) fail(run, `track ${trackSlug}: unit "${unitSlug}" is listed twice`);
    listed.add(unitSlug);
  }
  for (const folder of await subdirs(path.join(trackDir, "units"))) {
    if (!listed.has(folder))
      fail(run, `track ${trackSlug}: units/${folder} is not in track.json "units", so it is never shown`);
  }

  for (const unitSlug of listed) {
    const unitDir = path.join(trackDir, "units", unitSlug);
    // Unit slugs are unique across ALL tracks, so a unit can be addressed by its slug alone
    // (a cross-track feed, ratings) and can move between tracks without a slug collision.
    // Progress and drill history are still stored under track/unit, so a move orphans them
    // until they are re-keyed (docs/handoff.md).
    const owner = unitOwner.get(unitSlug);
    if (owner) fail(run, `unit ${trackSlug}/${unitSlug}: slug "${unitSlug}" is already used by track ${owner}`);
    unitOwner.set(unitSlug, trackSlug);

    const unit = await readContentJson(run, path.join(unitDir, "unit.json"), Unit, {
      label: `unit ${trackSlug}/${unitSlug}`,
      where: `unit ${trackSlug}/${unitSlug}/unit.json`,
    });
    if (!unit) continue;
    if (unit.slug !== unitSlug) fail(run, `unit ${trackSlug}/${unitSlug}: slug "${unit.slug}" does not match its folder`);
    checkSkills(run, `unit ${trackSlug}/${unitSlug}`, unit.skills);

    const exampleIds = new Set<string>(); // reading examples and cards share one id space
    for (const b of unit.blocks) {
      if (b.type === "reading") await checkReadingTiers(run, unitSlug, path.join(unitDir, b.dir), exampleIds);
      if (b.type === "cards") await checkCards(run, unitSlug, path.join(unitDir, b.dir), exampleIds);
      if (b.type === "challenge") {
        referencedChallenges.add(b.challengeSlug);
        if (!challengeSlugs.has(b.challengeSlug))
          fail(run, `unit ${trackSlug}/${unitSlug}: challenge "${b.challengeSlug}" has no folder in content/challenges/`);
      }
    }
    info(run, `  unit: ${unitSlug} — ${unit.blocks.length} blocks ✓`);
  }
}

/** Orphan tags: defined but neither used by content nor an ancestor of a used tag. */
function checkOrphanTags(run: Run) {
  const bySlug = new Map(TAXONOMY.map((n) => [n.slug, n] as const));
  const alive = new Set<string>();
  const markSelfAndAncestors = (slug: string) => {
    if (alive.has(slug)) return;
    alive.add(slug);
    for (const p of bySlug.get(slug)?.parents ?? []) markSelfAndAncestors(p);
  };
  for (const s of run.referencedTags) markSelfAndAncestors(s);
  for (const n of TAXONOMY) {
    // A warning, not an error — a dead branch is worth surfacing, not worth failing.
    if (!alive.has(n.slug))
      warn(run, `taxonomy: tag "${n.slug}" is unused (no content references it or any descendant)`);
  }
}

/** Validate all content under `root` (the repo root: it holds content/ and package.json). */
export async function validateContent(root: string): Promise<ValidationReport> {
  const run: Run = {
    root,
    report: { lines: [], errors: [], warnings: [] },
    referencedTags: new Set(),
    appLinks: [],
  };

  // Structural integrity of the tag registry itself: unique slugs, parents resolve, acyclic.
  try {
    Taxonomy.parse(TAXONOMY);
  } catch (e) {
    fail(run, `taxonomy (learning/taxonomy.ts): ${describeError(e)}`);
  }

  const devDependencies: Record<string, string> =
    (await readJson(path.join(root, "package.json"))).devDependencies ?? {};
  for (const [pkg, version] of Object.entries(RUNNER_DEPENDENCIES))
    checkPinnedDevDependency(run, "learning/sandbox.ts", pkg, version, devDependencies);

  const trackFolders = await subdirs(path.join(root, "content", "tracks"));
  await checkCatalog(run, trackFolders);

  const challengeSlugs = new Set(await subdirs(path.join(root, "content", "challenges")));
  const referencedChallenges = new Set<string>();
  const unitOwner = new Map<string, string>();
  for (const trackSlug of trackFolders) await checkTrack(run, trackSlug, unitOwner, challengeSlugs, referencedChallenges);

  // Every challenge folder is validated, referenced or not, so a standalone challenge (such as
  // one imported from the job-test archive before a unit uses it) is still held to the contract.
  for (const slug of challengeSlugs) {
    await checkChallenge(run, slug, devDependencies);
    if (!referencedChallenges.has(slug))
      warn(run, `challenge ${slug}: no unit references it, so learners can't reach it`);
  }
  info(run, `challenges: ${challengeSlugs.size} checked`);

  // A link to /learn/<track>/<unit> that names no real unit 404s; the build can't catch it,
  // because the page it's on still renders.
  for (const { where, href } of run.appLinks) {
    const [, , track, unit, ...rest] = href.split("/");
    const isKnownTarget = rest.length === 0 && (unit ? unitOwner.get(unit) === track : trackFolders.includes(track));
    if (!isKnownTarget) fail(run, `${where}: links to ${href}, which is not a track or unit (expected /learn/<track>/<unit>)`);
  }

  checkOrphanTags(run);
  return run.report;
}
