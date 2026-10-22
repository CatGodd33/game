/* LIFE DUEL · mapa espacial de decisiones.
 * Se inyecta dentro del HTML generado por scripts/build-decision-map.ts.
 * No usa librerías externas: SVG para las aristas, HTML para los nodos y una
 * simulación de fuerzas sencilla para colocar las ramas.
 */
(() => {
    "use strict";

    const DATA = JSON.parse(document.getElementById("map-data").textContent);
    const DECISIONS = DATA.decisions;
    const BY_ID = new Map(DECISIONS.map((decision) => [decision.id, decision]));
    const EDUCATION_RANK = Object.fromEntries(
        Object.entries(DATA.education).map(([key, value]) => [key, value.rank]),
    );
    const EMPLOYMENT_LABEL = {
        child: "Infancia",
        student: "Estudiante",
        employed: "Empleado",
        "self-employed": "Autónomo",
        unemployed: "Desempleado",
        retired: "Jubilado",
        disabled: "Incapacitado",
    };
    const PRIORITY_ORDER = { recovery: 0, event: 1, major: 2, focus: 3 };
    const PRIORITY_LABEL = {
        recovery: "Salida de crisis",
        event: "Suceso del mundo",
        major: "Decisión de vida",
        focus: "Hábito o enfoque",
    };
    const STAT_LABEL = {
        health: "Salud",
        happiness: "Felicidad",
        knowledge: "Conocimiento",
        relationships: "Relaciones",
    };
    const STAGE_CLUSTER = {
        "Infancia": { x: 340, y: 280, label: "Infancia" },
        "Infancia y adolescencia": { x: 340, y: 280, label: "Primeros años" },
        "Adolescencia": { x: 1160, y: 280, label: "Adolescencia" },
        "Adultez": { x: 340, y: 760, label: "Adultez" },
        "Vejez": { x: 1160, y: 760, label: "Vejez" },
        "Toda la vida": { x: 760, y: 530, label: "Transversal" },
    };
    const AMP = String.fromCharCode(38);
    const ESCAPES = {
        "&": AMP + "amp;",
        "<": AMP + "lt;",
        ">": AMP + "gt;",
        '"': AMP + "quot;",
        "'": AMP + "#039;",
    };
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
    const money = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
    const number = new Intl.NumberFormat("es-ES");
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const moneyLabel = (value) => money.format(Math.round(value || 0));
    const uniq = (values) => [...new Set(values.filter(Boolean))];
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const nodeById = (id) => nodes.find((node) => node.id === id);

    const viewport = document.getElementById("map-viewport");
    const world = document.getElementById("world");
    const edgesLayer = document.getElementById("edges");
    const nodesLayer = document.getElementById("nodes");
    const details = document.getElementById("details");
    const detailsBody = document.getElementById("details-body");
    const toast = document.getElementById("toast");
    const zoomLabel = document.getElementById("zoom-level");
    const questionCount = document.getElementById("question-count");
    const branchCount = document.getElementById("branch-count");
    const minimap = document.getElementById("minimap-canvas");
    const constellation = document.getElementById("constellation");
    const constellationSvg = document.getElementById("constellation-svg");
    const constellationResults = document.getElementById("constellation-results");
    const constellationSearch = document.getElementById("constellation-search");
    const helpDialog = document.getElementById("help-dialog");

    let nodes = [];
    let edges = [];
    let selectedId = null;
    let sequence = 0;
    let freshlyAdded = new Set();
    let view = { x: 0, y: 0, scale: 1 };
    let animationFrame = 0;
    let toastTimer = 0;
    const pointers = new Map();
    let dragStart = null;
    let pinchStart = null;
    let fitAnimation = 0;
    let constellationBuilt = false;

    // ── Estado de una rama ─────────────────────────────────────────────
    function initialState(age, overrides = {}) {
        return {
            age,
            health: 72,
            happiness: 70,
            knowledge: 48,
            relationships: 64,
            livingStandard: 45,
            money: 0,
            education: "none",
            employment: "child",
            partner: false,
            business: false,
            parentsAlive: true,
            flags: [],
            ...overrides,
        };
    }

    function applyEffects(state, effect) {
        const next = clone(state);
        if (!effect) return next;
        for (const [key, value] of Object.entries(effect.stats ?? {})) {
            if (key in next) next[key] = clamp(next[key] + Number(value), 0, 100);
        }
        if (effect.moneyDelta) next.money = Math.max(0, next.money + effect.moneyDelta);
        if (effect.setPartner) next.partner = true;
        if (effect.education) next.education = effect.education;
        if (effect.employment) next.employment = effect.employment;
        if (effect.businessStart) next.business = true;
        for (const flag of effect.flags ?? []) {
            if (!next.flags.includes(flag)) next.flags.push(flag);
        }
        for (const flag of effect.clearFlags ?? []) {
            next.flags = next.flags.filter((item) => item !== flag);
        }
        return next;
    }

    function ageAfter(decision, state) {
        if (decision.id === DATA.guide.start) return 7;
        if (decision.id.startsWith("infancia_ruta_")) return 18;
        if (decision.id === DATA.guide.adultDecision) return 20;
        if (decision.id === "ruta_curso_proyecto") return 24;
        return Math.max(state.age + 1, decision.minAge);
    }

    function stageName(age) {
        if (age < 13) return "Infancia";
        if (age < 18) return "Adolescencia";
        if (age < 65) return "Adultez";
        return "Vejez";
    }

    // ── Etiquetas y tarjetas ────────────────────────────────────────────
    function requirementChips(requirements, extra = []) {
        const chips = [...extra];
        if (!requirements) return chips;
        if (requirements.minAge !== undefined || requirements.maxAge !== undefined) {
            chips.push(`Edad ${requirements.minAge ?? 0}–${requirements.maxAge ?? 106}`);
        }
        if (requirements.minEducation) chips.push(`Educación ≥ ${DATA.education[requirements.minEducation]?.label ?? requirements.minEducation}`);
        if (requirements.maxEducation) chips.push(`Educación ≤ ${DATA.education[requirements.maxEducation]?.label ?? requirements.maxEducation}`);
        if (requirements.employment) chips.push(`Situación: ${requirements.employment.map((item) => EMPLOYMENT_LABEL[item] ?? item).join(", ")}`);
        if (requirements.hasPartner === true) chips.push("Requiere pareja");
        if (requirements.hasPartner === false) chips.push("Sin pareja");
        if (requirements.childrenMin !== undefined) chips.push(`Hijos ≥ ${requirements.childrenMin}`);
        if (requirements.childrenMax !== undefined) chips.push(`Hijos ≤ ${requirements.childrenMax}`);
        if (requirements.hasBusiness === true) chips.push("Negocio activo");
        if (requirements.hasBusiness === false) chips.push("Sin negocio");
        if (requirements.minMoney !== undefined) chips.push(`Dinero ≥ ${moneyLabel(requirements.minMoney)}`);
        if (requirements.minIncome !== undefined) chips.push(`Ingresos ≥ ${moneyLabel(requirements.minIncome)}`);
        if (requirements.minDebt !== undefined) chips.push(`Deuda ≥ ${moneyLabel(requirements.minDebt)}`);
        if (requirements.maxDebt !== undefined) chips.push(`Deuda ≤ ${moneyLabel(requirements.maxDebt)}`);
        if (requirements.minHealth !== undefined) chips.push(`Salud ≥ ${requirements.minHealth}`);
        if (requirements.maxHealth !== undefined) chips.push(`Salud ≤ ${requirements.maxHealth}`);
        if (requirements.maxHappiness !== undefined) chips.push(`Felicidad ≤ ${requirements.maxHappiness}`);
        if (requirements.minLivingStandard !== undefined) chips.push(`Nivel de vida ≥ ${requirements.minLivingStandard}`);
        if (requirements.maxLivingStandard !== undefined) chips.push(`Nivel de vida ≤ ${requirements.maxLivingStandard}`);
        if (requirements.flagsAll?.length) chips.push(`Banderas: ${requirements.flagsAll.join(" + ")}`);
        if (requirements.flagsAny?.length) chips.push(`Una bandera: ${requirements.flagsAny.join(" / ")}`);
        if (requirements.flagsNone?.length) chips.push(`Sin banderas: ${requirements.flagsNone.join(", ")}`);
        if (requirements.country?.length) chips.push(`País: ${requirements.country.join(", ")}`);
        if (requirements.notCountry?.length) chips.push(`No en: ${requirements.notCountry.join(", ")}`);
        if (requirements.incomeGroup?.length) chips.push(`Ingresos del país: ${requirements.incomeGroup.join(", ")}`);
        if (requirements.parentsAlive === true) chips.push("Progenitores vivos");
        if (requirements.parentsAlive === false) chips.push("Sin progenitores vivos");
        if (requirements.sex?.length) chips.push(`Sexo: ${requirements.sex.join(" / ")}`);
        if (requirements.familyTierMin !== undefined) chips.push(`Familia nivel ≥ ${requirements.familyTierMin}`);
        if (requirements.familyTierMax !== undefined) chips.push(`Familia nivel ≤ ${requirements.familyTierMax}`);
        if (requirements.migrated === true) chips.push("Persona migrante");
        if (requirements.migrated === false) chips.push("Reside en su país de nacimiento");
        if (requirements.relativeRoleAlive) chips.push(`Pariente vivo: ${requirements.relativeRoleAlive}`);
        if (requirements.hasPet === true) chips.push("Mascota viva");
        if (requirements.hasPet === false) chips.push("Sin mascota");
        return uniq(chips);
    }

    function effectChips(effect, limit = 8) {
        if (!effect) return [];
        const chips = [];
        for (const [key, value] of Object.entries(effect.stats ?? {})) {
            if (value) chips.push(`${STAT_LABEL[key] ?? key} ${value > 0 ? "+" : ""}${value}`);
        }
        if (effect.moneyDelta) chips.push(`Dinero ${effect.moneyDelta > 0 ? "+" : ""}${moneyLabel(effect.moneyDelta)}`);
        if (effect.debtDelta) chips.push(`Deuda ${effect.debtDelta > 0 ? "+" : ""}${moneyLabel(effect.debtDelta)}`);
        if (effect.incomeModifierDelta) chips.push(`Ingresos ${Math.round(effect.incomeModifierDelta * 100)} %`);
        if (effect.expenseModifierDelta) chips.push(`Gastos ${Math.round(effect.expenseModifierDelta * 100)} %`);
        for (const flag of effect.flags ?? []) chips.push(`Bandera: ${flag}`);
        if (effect.clearFlags?.length) chips.push(`Retira: ${effect.clearFlags.join(", ")}`);
        if (effect.education) chips.push(`Educación: ${DATA.education[effect.education]?.label ?? effect.education}`);
        if (effect.employment) chips.push(`Situación: ${EMPLOYMENT_LABEL[effect.employment] ?? effect.employment}`);
        if (effect.occupation) chips.push(`Oficio: ${effect.occupation}`);
        if (effect.setPartner) chips.push("Nueva pareja");
        if (effect.childrenDelta) chips.push(`Hijos ${effect.childrenDelta > 0 ? "+" : ""}${effect.childrenDelta}`);
        if (effect.migrateTo) chips.push(`Migra a ${effect.migrateTo.countryCode === "RANDOM" ? "un país aleatorio" : effect.migrateTo.countryCode}`);
        if (effect.returnToBirthCountry) chips.push("Regresa al país de nacimiento");
        if (effect.businessStart) chips.push("Abre un negocio");
        if (effect.studyProgram) chips.push("Inicia estudios");
        if (effect.loan) chips.push(`Deuda: ${effect.loan.label}`);
        if (effect.businessChange) chips.push("Cambia el negocio");
        if (effect.milestone) chips.push(`Hito: ${effect.milestone}`);
        if (effect.schedule) chips.push(`${effect.schedule} consecuencia(s) futura(s)`);
        return chips.slice(0, limit);
    }

    function chipsMarkup(chips, className = "") {
        if (!chips.length) return "";
        return `<span class="chip-row ${className}">${chips.map((chip) => `<span class="chip">${esc(chip)}</span>`).join("")}</span>`;
    }

    function categoryColor(decision) {
        return decision.categoryColor || "#8da59c";
    }

    // ── Elegibilidad aproximada ─────────────────────────────────────────
    function eligibleApprox(decision, state) {
        const req = decision.requirements;
        const flags = new Set(state.flags ?? []);
        if (state.age < decision.minAge || state.age > decision.maxAge) return false;
        if (!req) return true;
        if (req.minAge !== undefined && state.age < req.minAge) return false;
        if (req.maxAge !== undefined && state.age > req.maxAge) return false;
        if (req.minEducation && EDUCATION_RANK[state.education] < EDUCATION_RANK[req.minEducation]) return false;
        if (req.maxEducation && EDUCATION_RANK[state.education] > EDUCATION_RANK[req.maxEducation]) return false;
        if (req.employment && !req.employment.includes(state.employment)) return false;
        if (req.hasPartner === true && !state.partner) return false;
        if (req.hasPartner === false && state.partner) return false;
        if (req.hasBusiness === true && !state.business) return false;
        if (req.hasBusiness === false && state.business) return false;
        if (req.minMoney !== undefined && state.money < req.minMoney) return false;
        if (req.minHealth !== undefined && state.health < req.minHealth) return false;
        if (req.maxHealth !== undefined && state.health > req.maxHealth) return false;
        if (req.minLivingStandard !== undefined && state.livingStandard < req.minLivingStandard) return false;
        if (req.maxLivingStandard !== undefined && state.livingStandard > req.maxLivingStandard) return false;
        if (req.flagsAll?.some((flag) => !flags.has(flag))) return false;
        if (req.flagsAny?.length && !req.flagsAny.some((flag) => flags.has(flag))) return false;
        if (req.flagsNone?.some((flag) => flags.has(flag))) return false;
        if (req.parentsAlive !== undefined && req.parentsAlive !== state.parentsAlive) return false;
        return true;
    }

    function candidateDecisions(state, excludeId) {
        const seen = new Set();
        const candidates = DECISIONS
            .filter((decision) => decision.id !== excludeId)
            .filter((decision) => !decision.id.startsWith("infancia_ruta_"))
            .filter((decision) => eligibleApprox(decision, state))
            .sort((a, b) => {
                const priority = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
                if (priority) return priority;
                return a.title.localeCompare(b.title, "es");
            });
        return candidates.filter((decision) => {
            if (seen.has(decision.category)) return false;
            seen.add(decision.category);
            return true;
        }).slice(0, 3);
    }

    // ── Nodos y aristas ─────────────────────────────────────────────────
    function uniqueNodeId(prefix) {
        sequence += 1;
        return `${prefix}-${sequence}`;
    }

    function addEdge(fromId, toId, kind = "contain") {
        const id = `edge-${fromId}-${toId}`;
        if (edges.some((edge) => edge.id === id)) return;
        edges.push({ id, from: fromId, to: toId, kind });
    }

    function addQuestion(decisionId, options = {}) {
        const decision = BY_ID.get(decisionId);
        if (!decision) return null;
        const node = {
            id: uniqueNodeId("q"),
            kind: "question",
            decision,
            decisionId,
            state: clone(options.state ?? initialState(decision.minAge)),
            x: options.x ?? 0,
            y: options.y ?? 0,
            vx: 0,
            vy: 0,
            fixed: Boolean(options.fixed),
            expanded: false,
            candidate: Boolean(options.candidate),
            root: Boolean(options.root),
            rootLabel: options.rootLabel ?? null,
            rootSublabel: options.rootSublabel ?? null,
            parentId: options.parentId ?? null,
            depth: options.depth ?? 0,
            selected: false,
        };
        nodes.push(node);
        freshlyAdded.add(node.id);
        addOptions(node, options.autoExpand !== false);
        return node;
    }

    function addOptions(question, autoExpand = true) {
        if (question.expanded || !autoExpand) return;
        question.expanded = true;
        const count = question.decision.options.length;
        const baseAngle = -Math.PI / 2;
        question.decision.options.forEach((option, index) => {
            const angle = baseAngle + (index / Math.max(count, 1)) * Math.PI * 2;
            const radius = 268 + (index % 2) * 18;
            const node = {
                id: uniqueNodeId("o"),
                kind: "option",
                decision: question.decision,
                decisionId: question.decisionId,
                option,
                optionId: option.id,
                state: clone(question.state),
                x: question.x + Math.cos(angle) * radius,
                y: question.y + Math.sin(angle) * radius,
                vx: 0,
                vy: 0,
                fixed: false,
                parentId: question.id,
                depth: question.depth + 1,
                chosenEffectId: null,
                selected: false,
            };
            nodes.push(node);
            freshlyAdded.add(node.id);
            addEdge(question.id, node.id, "contain");
        });
    }

    function addEffect(optionNode, stateAfter) {
        const node = {
            id: uniqueNodeId("e"),
            kind: "effect",
            decision: optionNode.decision,
            decisionId: optionNode.decisionId,
            option: optionNode.option,
            optionId: optionNode.optionId,
            state: stateAfter,
            x: optionNode.x,
            y: optionNode.y + 120,
            vx: 0,
            vy: 0,
            fixed: false,
            parentId: optionNode.id,
            depth: optionNode.depth + 1,
            selected: false,
        };
        nodes.push(node);
        freshlyAdded.add(node.id);
        addEdge(optionNode.id, node.id, "choose");
        return node;
    }

    function addEnd(effectNode, text) {
        const node = {
            id: uniqueNodeId("end"),
            kind: "end",
            decision: effectNode.decision,
            decisionId: effectNode.decisionId,
            option: effectNode.option,
            optionId: effectNode.optionId,
            state: clone(effectNode.state),
            text,
            x: effectNode.x,
            y: effectNode.y + 130,
            vx: 0,
            vy: 0,
            fixed: false,
            parentId: effectNode.id,
            depth: effectNode.depth + 1,
            selected: false,
        };
        nodes.push(node);
        freshlyAdded.add(node.id);
        addEdge(effectNode.id, node.id, "soft");
        return node;
    }

    function nextForOption(question, option, stateAfter) {
        const mappedByFlag = (option.success?.flags ?? [])
            .map((flag) => DATA.guide.childhoodByFlag[flag])
            .find(Boolean);
        if (mappedByFlag) return [mappedByFlag];
        if (question.decisionId.startsWith("infancia_ruta_")) {
            return [DATA.guide.adultDecision];
        }
        if (question.decisionId === DATA.guide.adultDecision) {
            const mapped = DATA.guide.adultByOption[option.id];
            if (mapped) return [mapped];
        }
        if (question.decisionId === "ruta_curso_proyecto") {
            const mapped = DATA.guide.learningByOption[option.id];
            if (mapped) return [mapped];
        }
        return candidateDecisions(stateAfter, question.decisionId).map((decision) => decision.id);
    }

    function chooseOption(optionNode) {
        if (!optionNode || optionNode.kind !== "option") return;
        if (optionNode.chosenEffectId) {
            const existing = nodeById(optionNode.chosenEffectId);
            if (existing) {
                selectNode(existing.id);
                focusNode(existing.id);
                showToast("Esta opción ya tiene su rama abierta; las demás siguen disponibles.");
                return;
            }
        }
        const question = nodeById(optionNode.parentId);
        if (!question) return;
        const stateAfter = applyEffects(optionNode.state, optionNode.option.success);
        stateAfter.age = ageAfter(question.decision, optionNode.state);
        const effect = addEffect(optionNode, stateAfter);
        optionNode.chosenEffectId = effect.id;
        const nextIds = nextForOption(question, optionNode.option, stateAfter);
        const nextNodes = [];
        if (nextIds.length) {
            nextIds.forEach((decisionId, index) => {
                const angle = -Math.PI / 2 + (index / Math.max(nextIds.length, 1)) * Math.PI * 2;
                const radius = nextIds.length === 1 ? 250 : 265;
                const next = addQuestion(decisionId, {
                    state: stateAfter,
                    x: effect.x + Math.cos(angle) * radius,
                    y: effect.y + Math.sin(angle) * radius,
                    parentId: effect.id,
                    depth: effect.depth + 1,
                    candidate: nextIds.length > 1,
                    autoExpand: true,
                });
                if (next) {
                    nextNodes.push(next);
                    addEdge(effect.id, next.id, nextIds.length > 1 ? "soft" : "unlock");
                }
            });
        } else {
            addEnd(effect, "Esta rama no tiene una siguiente pregunta clara en la muestra. En la partida, el selector volvería a filtrar el catálogo completo.");
        }
        layoutGraph();
        renderAll();
        selectNode(effect.id);
        focusNode(effect.id, Math.max(view.scale, 0.55));
        showToast(
            nextNodes.length
                ? "La rama se ha abierto. Las preguntas anteriores siguen en el mapa."
                : "Rama completada en esta muestra.",
        );
    }

    function expandQuestion(question) {
        if (!question || question.expanded) {
            selectNode(question.id);
            return;
        }
        addOptions(question, true);
        layoutGraph();
        renderAll();
        selectNode(question.id);
        focusNode(question.id, Math.max(view.scale, 0.55));
    }

    // ── Layout de fuerzas ───────────────────────────────────────────────
    function nodeRadius(node) {
        if (node.kind === "question") return 166;
        if (node.kind === "option") return 128;
        if (node.kind === "effect") return 146;
        return 128;
    }

    function layoutGraph() {
        const iterations = Math.min(420, 180 + nodes.length * 4);
        for (let tick = 0; tick < iterations; tick += 1) {
            for (let i = 0; i < nodes.length; i += 1) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j += 1) {
                    const b = nodes[j];
                    let dx = b.x - a.x;
                    let dy = b.y - a.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 1) {
                        dx = (i - j) * 2 + 1;
                        dy = (j - i) * 2 + 1;
                        distance = Math.sqrt(dx * dx + dy * dy);
                    }
                    const minDistance = nodeRadius(a) + nodeRadius(b) + 38;
                    if (distance < minDistance) {
                        const push = (minDistance - distance) * 0.06;
                        const nx = dx / distance;
                        const ny = dy / distance;
                        if (!a.fixed) {
                            a.vx -= nx * push;
                            a.vy -= ny * push;
                        }
                        if (!b.fixed) {
                            b.vx += nx * push;
                            b.vy += ny * push;
                        }
                    } else {
                        const repel = Math.min(2.2, 2800 / (distance * distance));
                        const nx = dx / distance;
                        const ny = dy / distance;
                        if (!a.fixed) {
                            a.vx -= nx * repel;
                            a.vy -= ny * repel;
                        }
                        if (!b.fixed) {
                            b.vx += nx * repel;
                            b.vy += ny * repel;
                        }
                    }
                }
            }
            for (const edge of edges) {
                const a = nodeById(edge.from);
                const b = nodeById(edge.to);
                if (!a || !b) continue;
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const target =
                    edge.kind === "unlock" ? 386 :
                        edge.kind === "soft" ? 352 :
                            edge.kind === "choose" ? 306 : 314;
                const force = (distance - target) * 0.006;
                const nx = dx / distance;
                const ny = dy / distance;
                if (!a.fixed) {
                    a.vx += nx * force;
                    a.vy += ny * force;
                }
                if (!b.fixed) {
                    b.vx -= nx * force;
                    b.vy -= ny * force;
                }
            }
            for (const node of nodes) {
                if (node.fixed) {
                    node.vx = 0;
                    node.vy = 0;
                    continue;
                }
                node.vx += (0 - node.x) * 0.0008;
                node.vy += (0 - node.y) * 0.0008;
                node.vx *= 0.82;
                node.vy *= 0.82;
                node.x += node.vx;
                node.y += node.vy;
            }
        }
    }

    function nodeStyle(node) {
        return `transform:translate3d(${node.x.toFixed(2)}px, ${node.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }

    function edgePath(edge) {
        const from = nodeById(edge.from);
        const to = nodeById(edge.to);
        if (!from || !to) return "";
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const curve = Math.min(70, distance * 0.18);
        const nx = -dy / distance;
        const ny = dx / distance;
        const c1x = from.x + dx * 0.32 + nx * curve;
        const c1y = from.y + dy * 0.32 + ny * curve;
        const c2x = from.x + dx * 0.72 + nx * curve;
        const c2y = from.y + dy * 0.72 + ny * curve;
        return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
    }

    function nodeMarkup(node) {
        const selected = selectedId === node.id ? " selected" : "";
        const fresh = freshlyAdded.has(node.id) ? " fresh" : "";
        const kindClass = `kind-${node.kind}`;
        if (node.kind === "question") {
            const decision = node.decision;
            const rootClass = node.root ? " is-root" : "";
            const candidateClass = node.candidate ? " is-candidate" : "";
            return `<button class="map-node node-card node-question ${kindClass}${selected}${fresh}${rootClass}${candidateClass}" type="button"
                data-node-id="${node.id}" data-kind="question" data-decision="${esc(decision.id)}"
                style="${nodeStyle(node)}" aria-label="Pregunta: ${esc(decision.title)}. ${node.expanded ? "Opciones desplegadas" : "Pulsa para desplegar opciones"}">
                <span class="node-card-inner">
                    <span class="node-topline">
                        <span class="node-category" style="--cat:${esc(categoryColor(decision))}">${esc(decision.categoryLabel)}</span>
                        <span class="node-stage">${esc(decision.stage)}</span>
                    </span>
                    ${node.root ? `<span class="root-label">${esc(node.rootLabel)}<small>${esc(node.rootSublabel)}</small></span>` : ""}
                    <strong class="node-title">${esc(decision.title)}</strong>
                    <span class="node-desc">${esc(decision.description)}</span>
                    <span class="node-foot">
                        <span>${decision.minAge}–${decision.maxAge} años</span>
                        <span>${decision.options.length} opciones</span>
                    </span>
                    <span class="node-action">${node.expanded ? "Opciones visibles" : "Desplegar opciones"}<span aria-hidden="true">→</span></span>
                </span>
            </button>`;
        }
        if (node.kind === "option") {
            const option = node.option;
            const chips = effectChips(node.option.success, 3);
            return `<button class="map-node node-card node-option ${kindClass}${selected}${fresh}${node.chosenEffectId ? " is-chosen" : ""}" type="button"
                data-node-id="${node.id}" data-kind="option" data-decision="${esc(node.decisionId)}" data-option="${esc(option.id)}"
                style="${nodeStyle(node)}" aria-label="Opción: ${esc(option.label)}. Pulsa para abrir la consecuencia y las siguientes preguntas.">
                <span class="node-card-inner">
                    <span class="node-topline">
                        <span class="option-index">${node.decision.options.findIndex((item) => item.id === option.id) + 1}</span>
                        <span class="node-stage">${node.chosenEffectId ? "rama abierta" : "opción"}</span>
                    </span>
                    <strong class="node-title small">${esc(option.label)}</strong>
                    <span class="node-desc">${esc(option.description)}</span>
                    ${chipsMarkup(chips)}
                    <span class="node-action">${node.chosenEffectId ? "Ver consecuencia" : "Elegir esta rama"}<span aria-hidden="true">→</span></span>
                </span>
            </button>`;
        }
        if (node.kind === "effect") {
            const chips = effectChips(node.option?.success, 6);
            return `<article class="map-node node-card node-effect ${kindClass}${selected}${fresh}"
                data-node-id="${node.id}" data-kind="effect" data-decision="${esc(node.decisionId)}" style="${nodeStyle(node)}"
                aria-label="Consecuencia de la opción ${esc(node.option?.label ?? "")}">
                <span class="node-card-inner">
                    <span class="node-topline">
                        <span class="node-category gold">Consecuencia</span>
                        <span class="node-stage">${esc(stageName(node.state.age))}</span>
                    </span>
                    <strong class="node-title small">${esc(node.option?.label ?? "Resultado")}</strong>
                    <span class="node-desc">${esc(node.option?.success?.narrative ?? "La decisión quedó registrada.")}</span>
                    ${chipsMarkup(chips)}
                    <span class="node-foot"><span>${node.state.age} años</span><span>${moneyLabel(node.state.money)}</span></span>
                </span>
            </article>`;
        }
        return `<article class="map-node node-card node-end ${kindClass}${selected}${fresh}"
            data-node-id="${node.id}" data-kind="end" data-decision="${esc(node.decisionId)}" style="${nodeStyle(node)}">
            <span class="node-card-inner">
                <span class="node-category gold">Fin de la muestra</span>
                <strong class="node-title small">La vida sigue en el siguiente año</strong>
                <span class="node-desc">${esc(node.text)}</span>
            </span>
        </article>`;
    }

    function renderAll() {
        edgesLayer.innerHTML = edges.map((edge) => {
            const from = nodeById(edge.from);
            const to = nodeById(edge.to);
            if (!from || !to) return "";
            const active = selectedId && (edge.from === selectedId || edge.to === selectedId) ? " active" : "";
            return `<path class="edge edge-${edge.kind}${active}" data-edge="${edge.id}" data-from="${edge.from}" data-to="${edge.to}" d="${edgePath(edge)}" />`;
        }).join("");
        nodesLayer.innerHTML = nodes.map(nodeMarkup).join("");
        freshlyAdded = new Set();
        questionCount.textContent = number.format(nodes.filter((node) => node.kind === "question").length);
        branchCount.textContent = number.format(nodes.filter((node) => node.kind === "effect").length);
        updateHud();
        drawMinimap();
    }

    function updateHud() {
        zoomLabel.textContent = `${Math.round(view.scale * 100)}%`;
        document.getElementById("map-node-count").textContent = number.format(nodes.length);
        world.style.transform = `translate3d(${view.x.toFixed(2)}px, ${view.y.toFixed(2)}px, 0) scale(${view.scale.toFixed(4)})`;
        drawMinimap();
    }

    // ── Selección y panel ───────────────────────────────────────────────
    function selectNode(id) {
        selectedId = id;
        const node = nodeById(id);
        if (!node) return;
        for (const item of nodes) item.selected = item.id === id;
        nodesLayer.querySelectorAll(".map-node").forEach((element) => {
            element.classList.toggle("selected", element.dataset.nodeId === id);
        });
        edgesLayer.querySelectorAll(".edge").forEach((path) => {
            path.classList.toggle("active", path.dataset.from === id || path.dataset.to === id);
        });
        const decision = node.decision;
        const title = decision?.title ?? "Nodo";
        details.classList.add("open");
        document.body.classList.add("inspecting");
        details.inert = false;
        details.setAttribute("aria-hidden", "false");
        if (node.kind === "question") {
            const requirementList = requirementChips(decision.requirements, [
                `${decision.minAge}–${decision.maxAge} años`,
                decision.once ? "Solo una vez" : "Repetible",
            ]);
            detailsBody.innerHTML = `
                <div class="detail-kicker"><span class="detail-dot" style="--cat:${esc(categoryColor(decision))}"></span>${esc(decision.categoryLabel)} · ${esc(decision.priorityLabel)}</div>
                <h2>${esc(title)}</h2>
                <p>${esc(decision.description)}</p>
                ${decision.contextNote ? `<p class="detail-note">${esc(decision.contextNote)}</p>` : ""}
                <div class="detail-badges"><span>${esc(decision.stage)}</span><span>${decision.options.length} opciones</span>${decision.cooldownYears ? `<span>Cooldown ${decision.cooldownYears} años</span>` : ""}</div>
                <h3>Requisitos</h3>
                <div class="detail-chips">${requirementList.map((chip) => `<span>${esc(chip)}</span>`).join("")}</div>
                <h3>Opciones de esta pregunta</h3>
                <div class="detail-option-list">
                    ${decision.options.map((option, index) => `<div class="detail-option"><span>${index + 1}</span><div><b>${esc(option.label)}</b><small>${esc(option.description)}</small></div></div>`).join("")}
                </div>
                <div class="detail-actions">
                    <button class="detail-btn primary" type="button" data-detail-action="expand" data-node-id="${node.id}">${node.expanded ? "Centrar rama" : "Desplegar opciones"}</button>
                    <button class="detail-btn" type="button" data-detail-action="focus" data-node-id="${node.id}">Centrar nodo</button>
                </div>`;
        } else if (node.kind === "option") {
            const option = node.option;
            detailsBody.innerHTML = `
                <div class="detail-kicker"><span class="detail-dot" style="--cat:${esc(categoryColor(decision))}"></span>Opción de ${esc(decision.title)}</div>
                <h2>${esc(option.label)}</h2>
                <p>${esc(option.description)}</p>
                <div class="detail-badges"><span>${esc(option.costLabel)}</span>${option.check ? `<span>Tirada ${esc(option.check.type)} · ${option.check.base} % base</span>` : "<span>Sin tirada</span>"}</div>
                <h3>Si sale bien</h3>
                <p>${esc(option.success?.narrative ?? "Sin narrativa adicional.")}</p>
                <div class="detail-chips">${effectChips(option.success, 12).map((chip) => `<span>${esc(chip)}</span>`).join("")}</div>
                ${option.failure ? `<h3>Si falla</h3><p>${esc(option.failure.narrative)}</p><div class="detail-chips">${effectChips(option.failure, 8).map((chip) => `<span>${esc(chip)}</span>`).join("")}</div>` : ""}
                <div class="detail-actions">
                    <button class="detail-btn primary" type="button" data-detail-action="choose" data-node-id="${node.id}">${node.chosenEffectId ? "Ver rama abierta" : "Abrir esta rama"}</button>
                    <button class="detail-btn" type="button" data-detail-action="focus" data-node-id="${node.id}">Centrar nodo</button>
                </div>`;
        } else if (node.kind === "effect") {
            const chips = effectChips(node.option?.success, 12);
            detailsBody.innerHTML = `
                <div class="detail-kicker"><span class="detail-dot gold"></span>Consecuencia · ${esc(stageName(node.state.age))}</div>
                <h2>${esc(node.option?.label ?? "Resultado")}</h2>
                <p>${esc(node.option?.success?.narrative ?? "La decisión quedó registrada.")}</p>
                <h3>Nueva foto del personaje</h3>
                <div class="detail-state">
                    <span>Edad <b>${node.state.age}</b></span>
                    <span>Dinero <b>${moneyLabel(node.state.money)}</b></span>
                    <span>Salud <b>${node.state.health}</b></span>
                    <span>Felicidad <b>${node.state.happiness}</b></span>
                    <span>Conocimiento <b>${node.state.knowledge}</b></span>
                    <span>Relaciones <b>${node.state.relationships}</b></span>
                </div>
                <div class="detail-chips">${chips.map((chip) => `<span>${esc(chip)}</span>`).join("")}</div>
                <h3>Banderas activas</h3>
                <div class="detail-chips flags">${node.state.flags.length ? node.state.flags.map((flag) => `<span>${esc(flag)}</span>`).join("") : "<span>Ninguna</span>"}</div>
                <div class="detail-actions"><button class="detail-btn" type="button" data-detail-action="focus" data-node-id="${node.id}">Centrar consecuencia</button></div>`;
        } else {
            detailsBody.innerHTML = `
                <div class="detail-kicker"><span class="detail-dot gold"></span>Fin de la muestra</div>
                <h2>La rama queda abierta</h2>
                <p>${esc(node.text)}</p>
                <div class="detail-actions"><button class="detail-btn" type="button" data-detail-action="focus" data-node-id="${node.id}">Centrar nodo</button></div>`;
        }
        details.querySelector(".detail-close").focus({ preventScroll: true });
    }

    function closeDetails() {
        details.classList.remove("open");
        document.body.classList.remove("inspecting");
        details.setAttribute("aria-hidden", "true");
        details.inert = true;
        selectedId = null;
        nodesLayer.querySelectorAll(".map-node").forEach((element) => element.classList.remove("selected"));
        edgesLayer.querySelectorAll(".edge").forEach((path) => path.classList.remove("active"));
    }

    function focusNode(id, scale = view.scale) {
        const node = nodeById(id);
        if (!node) return;
        const compact = viewport.clientWidth < 760;
        const panelOpen = details.classList.contains("open");
        const panelReserve = !compact && panelOpen ? 436 : 0;
        const topSafe = compact ? 142 : 100;
        const bottomSafe = compact ? 74 : 42;
        const centerX = (viewport.clientWidth - panelReserve) / 2;
        const centerY = compact && panelOpen
            ? Math.max(170, (viewport.clientHeight - Math.min(590, viewport.clientHeight * 0.66)) / 2 + 70)
            : topSafe + (viewport.clientHeight - topSafe - bottomSafe) / 2;
        animateViewTo(
            centerX - node.x * scale,
            centerY - node.y * scale,
            scale,
        );
    }

    document.querySelector(".detail-close").addEventListener("click", closeDetails);
    details.addEventListener("click", (event) => {
        const action = event.target.closest("[data-detail-action]");
        if (!action) return;
        const node = nodeById(action.dataset.nodeId);
        if (!node) return;
        if (action.dataset.detailAction === "choose") chooseOption(node);
        if (action.dataset.detailAction === "expand") expandQuestion(node);
        if (action.dataset.detailAction === "focus") focusNode(node.id);
    });

    // ── Interacción del mapa ────────────────────────────────────────────
    nodesLayer.addEventListener("click", (event) => {
        const element = event.target.closest("[data-node-id]");
        if (!element) return;
        event.stopPropagation();
        const node = nodeById(element.dataset.nodeId);
        if (!node) return;
        if (node.kind === "option") chooseOption(node);
        else if (node.kind === "question") {
            selectNode(node.id);
            if (!node.expanded) expandQuestion(node);
        } else {
            selectNode(node.id);
        }
    });

    viewport.addEventListener("click", (event) => {
        if (!event.target.closest("[data-node-id]")) closeDetails();
    });

    function animateViewTo(x, y, scale, duration = 420) {
        cancelAnimationFrame(fitAnimation);
        const from = { ...view };
        const to = {
            x,
            y,
            scale: clamp(scale, 0.25, 2.5),
        };
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || duration === 0) {
            view = to;
            updateHud();
            return;
        }
        const start = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            view.x = from.x + (to.x - from.x) * ease;
            view.y = from.y + (to.y - from.y) * ease;
            view.scale = from.scale + (to.scale - from.scale) * ease;
            updateHud();
            if (t < 1) fitAnimation = requestAnimationFrame(step);
        };
        fitAnimation = requestAnimationFrame(step);
    }

    function fitAll(animate = true) {
        if (!nodes.length) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of nodes) {
            const radius = nodeRadius(node);
            minX = Math.min(minX, node.x - radius);
            minY = Math.min(minY, node.y - radius);
            maxX = Math.max(maxX, node.x + radius);
            maxY = Math.max(maxY, node.y + radius);
        }
        const compact = viewport.clientWidth < 760;
        const topSafe = compact ? 142 : 96;
        const bottomSafe = compact ? 74 : 42;
        const sideSafe = compact ? 24 : 58;
        const graphWidth = Math.max(480, maxX - minX);
        const graphHeight = Math.max(360, maxY - minY);
        const panelOpen = !compact && details.classList.contains("open");
        const rightSafe = panelOpen ? 454 : sideSafe;
        const availableWidth = Math.max(260, viewport.clientWidth - sideSafe - rightSafe);
        const availableHeight = Math.max(260, viewport.clientHeight - topSafe - bottomSafe);
        const scale = clamp(
            Math.min(availableWidth / graphWidth, availableHeight / graphHeight),
            0.2,
            1.2,
        );
        const x = sideSafe + availableWidth / 2 - ((minX + maxX) / 2) * scale;
        const y = topSafe + availableHeight / 2 - ((minY + maxY) / 2) * scale;
        if (animate) animateViewTo(x, y, scale);
        else {
            view = { x, y, scale };
            updateHud();
        }
    }

    function zoomAt(factor, point) {
        const nextScale = clamp(view.scale * factor, 0.25, 2.5);
        if (Math.abs(nextScale - view.scale) < 0.0001) return;
        const px = point?.x ?? viewport.clientWidth / 2;
        const py = point?.y ?? viewport.clientHeight / 2;
        const wx = (px - view.x) / view.scale;
        const wy = (py - view.y) / view.scale;
        view.scale = nextScale;
        view.x = px - wx * nextScale;
        view.y = py - wy * nextScale;
        updateHud();
    }

    viewport.addEventListener("wheel", (event) => {
        event.preventDefault();
        zoomAt(event.deltaY < 0 ? 1.12 : 0.89, { x: event.clientX, y: event.clientY });
    }, { passive: false });

    viewport.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".hud") || event.target.closest(".details-panel") || event.target.closest(".map-node")) return;
        viewport.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1) {
            dragStart = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
            viewport.classList.add("dragging");
        } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchStart = {
                distance: Math.hypot(a.x - b.x, a.y - b.y),
                scale: view.scale,
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                vx: view.x,
                vy: view.y,
            };
            dragStart = null;
        }
    });

    viewport.addEventListener("pointermove", (event) => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 1 && dragStart) {
            view.x = dragStart.vx + (event.clientX - dragStart.x);
            view.y = dragStart.vy + (event.clientY - dragStart.y);
            updateHud();
        } else if (pointers.size === 2 && pinchStart) {
            const [a, b] = [...pointers.values()];
            const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
            const factor = distance / Math.max(1, pinchStart.distance);
            const nextScale = clamp(pinchStart.scale * factor, 0.25, 2.5);
            const midpointX = (a.x + b.x) / 2;
            const midpointY = (a.y + b.y) / 2;
            const wx = (pinchStart.x - pinchStart.vx) / pinchStart.scale;
            const wy = (pinchStart.y - pinchStart.vy) / pinchStart.scale;
            view.scale = nextScale;
            view.x = midpointX - wx * nextScale;
            view.y = midpointY - wy * nextScale;
            updateHud();
        }
    });

    function endPointer(event) {
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (pointers.size === 0) {
            dragStart = null;
            viewport.classList.remove("dragging");
        }
    }
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("pointerleave", (event) => {
        if (event.buttons === 0) endPointer(event);
    });

    // ── HUD ─────────────────────────────────────────────────────────────
    document.getElementById("zoom-in").addEventListener("click", () => zoomAt(1.18));
    document.getElementById("zoom-out").addEventListener("click", () => zoomAt(0.84));
    document.getElementById("zoom-reset").addEventListener("click", () => {
        animateViewTo(view.x, view.y, 1);
    });
    document.getElementById("fit-view").addEventListener("click", () => fitAll(true));
    document.getElementById("reset-map").addEventListener("click", () => {
        bootMap();
        showToast("Mapa reiniciado: vuelven las dos entradas y sus opciones.");
    });
    document.getElementById("help-open").addEventListener("click", () => helpDialog.showModal());
    document.getElementById("help-close-bottom").addEventListener("click", () => helpDialog.close());
    document.getElementById("zoom-level").addEventListener("click", () => animateViewTo(view.x, view.y, 1));
    document.getElementById("help-close").addEventListener("click", () => helpDialog.close());
    document.getElementById("constellation-open").addEventListener("click", openConstellation);
    document.getElementById("view-map").addEventListener("click", () => {
        closeConstellation();
        showToast("Vista de rama viva. Pulsa una opción para abrir su consecuencia.", 2200);
    });
    document.getElementById("fullscreen-toggle").addEventListener("click", async () => {
        try {
            if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
            else await document.exitFullscreen?.();
        } catch {
            showToast("El navegador no permite pantalla completa en este contexto.", 3000);
        }
    });
    document.addEventListener("fullscreenchange", () => {
        const button = document.getElementById("fullscreen-toggle");
        const active = Boolean(document.fullscreenElement);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", active ? "Salir de pantalla completa" : "Pantalla completa");
    });
    document.getElementById("constellation-close").addEventListener("click", closeConstellation);
    document.getElementById("constellation-search").addEventListener("input", (event) => {
        highlightConstellation(event.target.value);
    });

    function showToast(text, duration = 2800) {
        toast.textContent = text;
        toast.classList.add("visible");
        clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("visible"), duration);
    }

    // ── Minimapa ────────────────────────────────────────────────────────
    function drawMinimap() {
        if (!minimap || !nodes.length) return;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = minimap.clientWidth || 180;
        const cssHeight = minimap.clientHeight || 108;
        if (minimap.width !== Math.round(cssWidth * dpr) || minimap.height !== Math.round(cssHeight * dpr)) {
            minimap.width = Math.round(cssWidth * dpr);
            minimap.height = Math.round(cssHeight * dpr);
        }
        const ctx = minimap.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.fillStyle = "rgba(5, 12, 14, .72)";
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of nodes) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        }
        const viewRect = {
            x: -view.x / view.scale,
            y: -view.y / view.scale,
            w: viewport.clientWidth / view.scale,
            h: viewport.clientHeight / view.scale,
        };
        minX = Math.min(minX, viewRect.x);
        minY = Math.min(minY, viewRect.y);
        maxX = Math.max(maxX, viewRect.x + viewRect.w);
        maxY = Math.max(maxY, viewRect.y + viewRect.h);
        const pad = 10;
        const scale = Math.min((cssWidth - pad * 2) / Math.max(1, maxX - minX), (cssHeight - pad * 2) / Math.max(1, maxY - minY));
        const offsetX = (cssWidth - (maxX - minX) * scale) / 2 - minX * scale;
        const offsetY = (cssHeight - (maxY - minY) * scale) / 2 - minY * scale;
        for (const node of nodes) {
            ctx.fillStyle =
                node.kind === "question" ? "#86e0bd" :
                    node.kind === "option" ? "#e6bd78" : "rgba(177, 219, 206, .55)";
            ctx.beginPath();
            ctx.arc(offsetX + node.x * scale, offsetY + node.y * scale, node.kind === "question" ? 2 : 1.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = "rgba(134, 224, 189, .55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
            offsetX + viewRect.x * scale,
            offsetY + viewRect.y * scale,
            viewRect.w * scale,
            viewRect.h * scale,
        );
    }

    minimap?.addEventListener("click", (event) => {
        const rect = minimap.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of nodes) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        }
        const viewRect = {
            x: -view.x / view.scale,
            y: -view.y / view.scale,
            w: viewport.clientWidth / view.scale,
            h: viewport.clientHeight / view.scale,
        };
        minX = Math.min(minX, viewRect.x);
        minY = Math.min(minY, viewRect.y);
        maxX = Math.max(maxX, viewRect.x + viewRect.w);
        maxY = Math.max(maxY, viewRect.y + viewRect.h);
        const pad = 10;
        const scale = Math.min(
            (minimap.clientWidth - pad * 2) / Math.max(1, maxX - minX),
            (minimap.clientHeight - pad * 2) / Math.max(1, maxY - minY),
        );
        const offsetX = (minimap.clientWidth - (maxX - minX) * scale) / 2 - minX * scale;
        const offsetY = (minimap.clientHeight - (maxY - minY) * scale) / 2 - minY * scale;
        const worldX = (px - offsetX) / scale;
        const worldY = (py - offsetY) / scale;
        animateViewTo(viewport.clientWidth / 2 - worldX * view.scale, viewport.clientHeight / 2 - worldY * view.scale, view.scale);
    });

    // ── Constelación completa ───────────────────────────────────────────
    function buildConstellation() {
        if (constellationBuilt) return;
        const groups = new Map();
        for (const decision of DECISIONS) {
            const cluster = STAGE_CLUSTER[decision.stage] ?? STAGE_CLUSTER["Toda la vida"];
            const key = cluster.label;
            if (!groups.has(key)) groups.set(key, { ...cluster, items: [] });
            groups.get(key).items.push(decision);
        }
        const clusterMarkup = [...groups.values()].map((group) => {
            const items = group.items.map((decision, index) => {
                const angle = index * 2.399963;
                const radius = 18 + Math.sqrt(index + 1) * 29;
                const x = group.x + Math.cos(angle) * radius;
                const y = group.y + Math.sin(angle) * radius;
                const r = 6 + Math.min(8, decision.options.length * 1.15);
                return `<g class="constellation-node" data-decision="${esc(decision.id)}" tabindex="0" role="button" aria-label="${esc(decision.title)}. ${esc(decision.categoryLabel)}. ${decision.minAge}–${decision.maxAge} años">
                    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${esc(categoryColor(decision))}" />
                    <circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 8).toFixed(1)}" fill="none" stroke="${esc(categoryColor(decision))}" />
                    <title>${esc(decision.title)} · ${esc(decision.categoryLabel)} · ${decision.minAge}–${decision.maxAge} años</title>
                </g>`;
            }).join("");
            return `<g class="constellation-cluster">
                <circle cx="${group.x}" cy="${group.y}" r="210" fill="rgba(134,224,189,.025)" stroke="rgba(134,224,189,.12)" />
                <text x="${group.x}" y="${group.y - 224}" class="cluster-label">${esc(group.label.toUpperCase())}</text>
                ${items}
            </g>`;
        }).join("");
        constellationSvg.innerHTML = `
            <defs>
                <radialGradient id="spaceGlow"><stop offset="0%" stop-color="rgba(73,118,97,.18)"/><stop offset="100%" stop-color="rgba(73,118,97,0)"/></radialGradient>
            </defs>
            <rect width="1600" height="1100" fill="url(#spaceGlow)" />
            ${clusterMarkup}`;
        constellationResults.innerHTML = `
            <p class="constellation-intro">Cada punto es una de las 171 preguntas. Pulsa uno para añadirlo al mapa de ramas.</p>
            <div class="constellation-quick">
                ${["story_first_encounter", "tiempo_propio", "primer_billete", "respuesta_epidemia", "tech_lanzamiento", "ruta_beca_exterior"].map((id) => {
            const decision = BY_ID.get(id);
            return decision ? `<button type="button" data-add-decision="${esc(id)}">${esc(decision.title)}</button>` : "";
        }).join("")}
            </div>`;
        constellationBuilt = true;
    }

    function openConstellation() {
        buildConstellation();
        constellation.hidden = false;
        constellation.classList.add("open");
        document.body.classList.add("overlay-open");
        const constellationTab = document.getElementById("constellation-open");
        const mapTab = document.getElementById("view-map");
        constellationTab.setAttribute("aria-pressed", "true");
        constellationTab.classList.add("active");
        mapTab.setAttribute("aria-pressed", "false");
        mapTab.classList.remove("active");
        constellationSearch.value = "";
        highlightConstellation("");
        document.getElementById("constellation-close").focus({ preventScroll: true });
    }

    function closeConstellation() {
        constellation.classList.remove("open");
        constellation.hidden = true;
        document.body.classList.remove("overlay-open");
        const constellationTab = document.getElementById("constellation-open");
        const mapTab = document.getElementById("view-map");
        constellationTab.setAttribute("aria-pressed", "false");
        constellationTab.classList.remove("active");
        mapTab.setAttribute("aria-pressed", "true");
        mapTab.classList.add("active");
    }

    function highlightConstellation(query) {
        const term = query.trim().toLowerCase();
        const matches = DECISIONS.filter((decision) => {
            if (!term) return false;
            return `${decision.id} ${decision.title} ${decision.description} ${decision.categoryLabel}`.toLowerCase().includes(term);
        });
        constellationSvg.querySelectorAll(".constellation-node").forEach((element) => {
            const decision = BY_ID.get(element.dataset.decision);
            if (!term || !decision) {
                element.classList.remove("dim", "match");
                return;
            }
            const match = `${decision.id} ${decision.title} ${decision.description} ${decision.categoryLabel}`.toLowerCase().includes(term);
            element.classList.toggle("dim", !match);
            element.classList.toggle("match", match);
        });
        constellationResults.innerHTML = term
            ? (matches.length
                ? `<p class="constellation-intro">${matches.length} coincidencia(s). Pulsa para añadir al mapa.</p><div class="constellation-results-list">${matches.slice(0, 12).map((decision) => `<button type="button" data-add-decision="${esc(decision.id)}"><b>${esc(decision.title)}</b><span>${esc(decision.categoryLabel)} · ${decision.minAge}–${decision.maxAge} años</span></button>`).join("")}</div>`
                : '<p class="constellation-intro">No hay preguntas con ese texto.</p>')
            : `<p class="constellation-intro">Cada punto es una de las 171 preguntas. Pulsa uno para añadirlo al mapa de ramas.</p>
                <div class="constellation-quick">${["story_first_encounter", "tiempo_propio", "primer_billete", "respuesta_epidemia", "tech_lanzamiento", "ruta_beca_exterior"].map((id) => {
                const decision = BY_ID.get(id);
                return decision ? `<button type="button" data-add-decision="${esc(id)}">${esc(decision.title)}</button>` : "";
            }).join("")}</div>`;
    }

    constellation.addEventListener("click", (event) => {
        const element = event.target.closest("[data-decision], [data-add-decision]");
        if (!element) return;
        const decisionId = element.dataset.decision ?? element.dataset.addDecision;
        if (!decisionId) return;
        addDecisionFromConstellation(decisionId);
    });
    constellation.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const element = event.target.closest(".constellation-node");
        if (!element) return;
        event.preventDefault();
        addDecisionFromConstellation(element.dataset.decision);
    });

    function addDecisionFromConstellation(decisionId) {
        const decision = BY_ID.get(decisionId);
        if (!decision) return;
        const state = initialState(Math.max(decision.minAge, 18), {
            education: "secondary",
            employment: "employed",
            money: 18000,
            partner: true,
            parentsAlive: true,
        });
        const rightmost = nodes.length ? Math.max(...nodes.map((item) => item.x)) : 0;
        const averageY = nodes.length
            ? nodes.reduce((sum, item) => sum + item.y, 0) / nodes.length
            : 0;
        const node = addQuestion(decisionId, {
            state,
            x: rightmost + 510,
            y: averageY,
            autoExpand: true,
            candidate: false,
        });
        closeConstellation();
        if (node) {
            layoutGraph();
            renderAll();
            selectNode(node.id);
            focusNode(node.id, 0.55);
            showToast(`«${decision.title}» añadida al mapa.`);
        }
    }

    // ── Fondo estelar ───────────────────────────────────────────────────
    function drawStars() {
        const canvas = document.getElementById("stars");
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        let seed = 0x1f2e3d4c;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let index = 0; index < 260; index += 1) {
            const x = random() * width;
            const y = random() * height;
            const radius = random() * 1.25 + 0.22;
            const warmth = random();
            ctx.fillStyle =
                warmth > 0.92 ? "rgba(230, 189, 120, .8)" :
                    warmth > 0.84 ? "rgba(134, 224, 189, .75)" :
                        `rgba(222, 238, 232, ${0.18 + random() * 0.55})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let index = 0; index < 5; index += 1) {
            const x = width * (0.12 + index * 0.2);
            const y = height * (0.2 + (index % 2) * 0.54);
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 210);
            gradient.addColorStop(0, index % 2 ? "rgba(73, 118, 97, .10)" : "rgba(91, 130, 145, .08)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 210, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Arranque ────────────────────────────────────────────────────────
    function bootMap() {
        cancelAnimationFrame(fitAnimation);
        nodes = [];
        edges = [];
        sequence = 0;
        selectedId = null;
        freshlyAdded = new Set();
        closeDetails();
        for (const root of DATA.guide.roots) {
            const decision = BY_ID.get(root.decisionId);
            const rootState = root.decisionId === DATA.guide.start
                ? initialState(2)
                : initialState(18, {
                    education: "secondary",
                    employment: "employed",
                    money: 18000,
                    partner: true,
                });
            addQuestion(root.decisionId, {
                state: rootState,
                x: root.x,
                y: root.y,
                fixed: true,
                root: true,
                rootLabel: root.label,
                rootSublabel: root.sublabel,
                autoExpand: true,
            });
        }
        layoutGraph();
        renderAll();
        requestAnimationFrame(() => {
            if (viewport.clientWidth < 760) {
                const root = nodes.find((node) => node.root && node.decisionId === DATA.guide.start) ?? nodes[0];
                const scale = 0.62;
                view = {
                    x: viewport.clientWidth / 2 - root.x * scale,
                    y: (viewport.clientHeight + 50) / 2 - root.y * scale,
                    scale,
                };
                updateHud();
            } else {
                fitAll(false);
            }
        });
        showToast("Dos entradas a la misma vida. Elige una opción y la rama anterior se quedará en el mapa.", 4200);
        if (viewport.clientWidth < 760) {
            showToast("Entrada A en foco. Arrastra o pellizca; usa Encuadrar para ver las dos entradas.", 4600);
        }
    }

    window.addEventListener("resize", () => {
        drawStars();
        drawMinimap();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (!constellation.hidden) closeConstellation();
            else if (helpDialog.open) helpDialog.close();
            else if (details.classList.contains("open")) closeDetails();
        }
        const typing = event.target.closest("input, textarea, select, [contenteditable='true']");
        if (typing) return;
        if (event.key === "/") {
            event.preventDefault();
            openConstellation();
            requestAnimationFrame(() => document.getElementById("constellation-search").focus());
        }
        if (event.key === "+" || event.key === "=") zoomAt(1.15);
        if (event.key === "-") zoomAt(0.87);
        if (event.key === "0") fitAll(true);
    });

    drawStars();
    bootMap();
})();
