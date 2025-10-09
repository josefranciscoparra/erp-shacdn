import fs from "fs";
import path from "path";

const LINT_FILE = "lint-results.json";
const NULLISH_RULE = "@typescript-eslint/prefer-nullish-coalescing";

const lintPath = path.resolve(LINT_FILE);

if (!fs.existsSync(lintPath)) {
  console.error(`No se encontró ${LINT_FILE}. Ejecuta el lint con --format json --output-file primero.`);
  process.exit(1);
}

const lintResults = JSON.parse(fs.readFileSync(lintPath, "utf8"));

/** @type {Map<string, Array<{start:number,end:number,text:string}>>} */
const fixesByFile = new Map();

for (const result of lintResults) {
  if (!result.messages) continue;
  for (const message of result.messages) {
    if (message.ruleId !== NULLISH_RULE) continue;
    const suggestion = message.suggestions?.[0]?.fix;
    if (!suggestion) continue;
    const [start, end] = suggestion.range;
    const text = suggestion.text;
    if (!fixesByFile.has(result.filePath)) {
      fixesByFile.set(result.filePath, []);
    }
    fixesByFile.get(result.filePath).push({ start, end, text });
  }
}

if (fixesByFile.size === 0) {
  console.log("No hay fixes para aplicar.");
  process.exit(0);
}

for (const [filePath, fixes] of fixesByFile) {
  const original = fs.readFileSync(filePath, "utf8");
  // Aplicamos de derecha a izquierda para no desplazar offsets
  fixes.sort((a, b) => b.start - a.start);
  let result = original;
  for (const fix of fixes) {
    result = result.slice(0, fix.start) + fix.text + result.slice(fix.end);
  }
  fs.writeFileSync(filePath, result, "utf8");
  console.log(`Aplicadas ${fixes.length} correcciones en ${path.relative(process.cwd(), filePath)}`);
}
