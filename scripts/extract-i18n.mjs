import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
for (const dir of ['client/src', 'server/src', 'shared/src']) {
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts') && !p.endsWith('shared/src/i18n/zh.ts')) files.push(p); } };
    walk(path.join(root, dir));
}
const found = new Set();
const forced = new Set();
const templates = new Set();
const overrides = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/zh-overrides.json'), 'utf8'))));
const demographics = JSON.parse(fs.readFileSync(path.join(root, 'data/demographics.json'), 'utf8'));
const countryNames = new Set((demographics.countries ?? []).map((c) => c.name));
const presentation = new Set(['label', 'title', 'description', 'text', 'message', 'name', 'summary', 'placeholder', 'note', 'hint', 'copy', 'caption', 'headline', 'subtitle', 'body', 'detail', 'reason', 'impact', 'example', 'eyebrow', 'tooltip', 'alt', 'prompt', 'question', 'answer', 'explanation', 'legend']);
function clean(s) {
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    if (s.length < 2 || s.length > 600) return null;
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(s) || !/[a-záéíóúüñ]/.test(s)) return null;
    if (/[{}<>=`\\]|\b(const|let|var|function|return|import|export|require|className|undefined|null|true|false)\b/.test(s)) return null;
    if (/^[\W_]+$/.test(s)) return null;
    if (/^(https?:|data:|blob:|\/api\/|\.\.?\/)/.test(s)) return null;
    if (/^[a-z0-9_./:-]+$/.test(s)) return null;
    if (/^[A-Z][A-Z0-9_./:-]+$/.test(s)) return null;
    if (/^[#.][\w-]+$/.test(s)) return null;
    if (/^[a-z]+(-[a-z0-9]+)+$/.test(s)) return null;
    if (/[\u4e00-\u9fff]/.test(s)) return null;
    if (/sans-serif|Arial|Inter,|Roboto|system-ui|monospace/.test(s)) return null;
    if (/^M\d[\d\s.,+\-a-zA-Z]*$/.test(s)) return null;
    if (/^(?:[a-z-]+:)?[a-z0-9-]+(?:\s+(?:[a-z-]+:)?[a-z0-9-]+)+$/.test(s) && /(?:^|\s)(?:sm:|md:|lg:|xl:)?(?:p|m|w|h|text|bg|grid|flex)-/.test(s)) return null;
    if (/(?:^|\s)(?:flex|grid|block|inline|absolute|relative|sticky|hidden|container-page|glass|uppercase|truncate|sr-only)(?:\s|$)/.test(s)) return null;
    if (/(?:^|\s)(?:text|bg|border|ring|shadow|from|to|via|px|py|pt|pb|pl|pr|mt|mb|ml|mr|mx|my|w|h|gap|font|tracking|leading|rounded|justify|items|min-h|max-h|max-w|min-w|z|top|bottom|left|right|sm|md|lg|xl)-\S+/.test(s)) return null;
    if (/\$\{|\{\{/.test(s)) return null;
    return s;
}
function templateClean(s) {
    s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (s.length < 12 || s.length > 900) return null;
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(s) || !/[a-záéíóúüñ]/.test(s)) return null;
    const withoutTokens = s.replace(/\{\{x\}\}/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutTokens.length < 18) return null;
    if ((s.match(/\{\{x\}\}/g) ?? []).length > 6) return null;
    if (!/[ÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(withoutTokens) && !/\b(el|la|los|las|un|una|de|del|que|con|por|para|en|tu|tus|su|sus|se|no|y|es|son|ha|fue|como|más|pero|sin|sobre|entre|cuando|desde|hasta)\b/i.test(withoutTokens)) return null;
    if (/https?:|\/api\/|\.(png|jpg|svg)|scaleX|partner-|migracion_|encuentro_|mobile-relative|\.css|\.tsx/.test(s)) return null;
    if (/[{}<>=`\\]|\b(const|let|var|function|return|import|export|require|className|undefined|null|true|false)\b/.test(withoutTokens)) return null;
    if (/sans-serif|Arial|Inter,|Roboto|system-ui|monospace/.test(s)) return null;
    if (/(?:^|\s)(?:flex|grid|block|inline|absolute|relative|sticky|hidden|container-page|glass|uppercase|truncate|sr-only)(?:\s|$)/.test(s)) return null;
    if (/(?:^|\s)(?:text|bg|border|ring|shadow|from|to|via|px|py|pt|pb|pl|pr|mt|mb|ml|mr|mx|my|w|h|gap|font|tracking|leading|rounded|justify|items|min-h|max-h|max-w|min-w|z|top|bottom|left|right|sm|md|lg|xl)-\S+/.test(s)) return null;
    return s;
}

function add(s, force = false) { const c = clean(s); if (!c) return; found.add(c); if (force) forced.add(c); }
function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) visit(item, parent); return; }
    if (!node.type) return;
    const parentProp = (parent?.type === 'ObjectProperty' || parent?.type === 'ClassProperty') ? (parent.key?.name ?? parent.key?.value) : null;
    if (node.type === 'JSXText') add(node.value, true);
    else if (node.type === 'TemplateLiteral') {
        const source = node.quasis.map((q, index) => `${q.value.cooked ?? q.value.raw}${index < node.expressions.length ? '{{x}}' : ''}`).join('');
        if (!node.expressions.length) add(source, true);
        else {
            const candidate = templateClean(source);
            if (candidate) templates.add(candidate);
        }
    }
    else if (node.type === 'StringLiteral') {
        add(node.value, !!(parentProp && presentation.has(parentProp)));
    }
    for (const [key, value] of Object.entries(node)) {
        if (['loc', 'start', 'end', 'leadingComments', 'trailingComments', 'innerComments', 'extra'].includes(key)) continue;
        visit(value, node);
    }
}
for (const p of files) {
    let ast; try { ast = parse(fs.readFileSync(p, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'], errorRecovery: true }); } catch { continue; }
    visit(ast, null);
}
for (const f of ['data/demographics.json', 'data/country-context.json', 'data/economy-model.json', 'data/realism-model.json', 'data/mortality-model.json']) {
    const walk = (v) => { if (typeof v === 'string') add(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')));
}
const arr = [...found].filter((s) => {
    if (/^[\s,.;:·/()\[\]-]/.test(s)) return false;
    return s.includes(' ') || forced.has(s) || overrides.has(s) || countryNames.has(s);
});
arr.sort((a, b) => a.length - b.length || a.localeCompare(b));
const templateArr = [...templates].sort((a, b) => a.length - b.length || a.localeCompare(b));
fs.writeFileSync(path.join(root, 'data/i18n/spanish-templates.json'), JSON.stringify(templateArr, null, 1) + '\n');
const outFile = path.join(root, 'data/i18n/spanish-strings.json');
fs.writeFileSync(outFile, JSON.stringify(arr, null, 1) + '\n');
console.log('found', found.size, 'kept', arr.length, 'templates', templateArr.length, 'forced', forced.size, 'bytes', fs.statSync(outFile).size);
console.log(arr.slice(0, 25));
