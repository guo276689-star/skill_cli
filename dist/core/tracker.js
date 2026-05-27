"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSources = loadSources;
exports.trackInstall = trackInstall;
exports.trackRemove = trackRemove;
exports.getSource = getSource;
exports.listUpdatable = listUpdatable;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/** 获取 sources.json 文件路径 */
function getSourcesPath(scope) {
    const dir = scope === 'global'
        ? path.join(os.homedir(), '.reasonix')
        : path.join(process.cwd(), '.reasonix');
    return path.join(dir, 'sources.json');
}
/** 读取来源映射 */
function loadSources(scope) {
    const p = getSourcesPath(scope);
    try {
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf-8'));
        }
    }
    catch { /* 文件损坏则重置 */ }
    return {};
}
/** 保存来源映射 */
function saveSources(scope, map) {
    const p = getSourcesPath(scope);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(map, null, 2), 'utf-8');
}
/** 记录安装来源 */
function trackInstall(scope, skillName, repo, originalSkillName) {
    const map = loadSources(scope);
    map[skillName] = {
        repo,
        skillName: originalSkillName,
        installedAt: new Date().toISOString(),
    };
    saveSources(scope, map);
}
/** 记录移除 */
function trackRemove(scope, skillName) {
    const map = loadSources(scope);
    delete map[skillName];
    saveSources(scope, map);
}
/** 获取某个 Skill 的安装来源 */
function getSource(skillName) {
    // 先查项目级，再查全局
    const project = loadSources('project');
    if (project[skillName])
        return project[skillName];
    const global = loadSources('global');
    return global[skillName] ?? null;
}
/** 列出所有可更新的 Skill */
function listUpdatable() {
    const result = [];
    for (const scope of ['project', 'global']) {
        const map = loadSources(scope);
        for (const [name, src] of Object.entries(map)) {
            result.push({ name, source: src });
        }
    }
    return result;
}
//# sourceMappingURL=tracker.js.map