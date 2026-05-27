"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffLines = diffLines;
exports.printDiff = printDiff;
exports.diffStats = diffStats;
const chalk_1 = __importDefault(require("chalk"));
/**
 * 简单行级 diff（LCS-based）。
 * 适合 SKILL.md 这种 <500 行的文件。
 */
function diffLines(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    // 构建 LCS 表
    const m = oldLines.length;
    const n = newLines.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            }
            else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    // 回溯生成 diff
    const result = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.unshift({ op: 'same', oldNum: i, newNum: j, text: oldLines[i - 1] });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ op: 'add', newNum: j, text: newLines[j - 1] });
            j--;
        }
        else if (i > 0) {
            result.unshift({ op: 'del', oldNum: i, text: oldLines[i - 1] });
            i--;
        }
    }
    // 合并相邻的 del + add 为 mod
    return mergeModifications(result);
}
/** 合并相邻的删+增为修改 */
function mergeModifications(lines) {
    const result = [];
    let i = 0;
    while (i < lines.length) {
        if (lines[i].op === 'del' &&
            i + 1 < lines.length &&
            lines[i + 1].op === 'add') {
            result.push({
                op: 'mod',
                oldNum: lines[i].oldNum,
                newNum: lines[i + 1].newNum,
                text: lines[i + 1].text,
            });
            i += 2;
        }
        else {
            result.push(lines[i]);
            i++;
        }
    }
    return result;
}
/**
 * 打印彩色 diff 到终端
 */
function printDiff(oldText, newText, context = 3) {
    const lines = diffLines(oldText, newText);
    let added = 0;
    let deleted = 0;
    let modified = 0;
    // 只显示变更行 + 上下文
    const visible = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].op !== 'same') {
            // 添加上下文
            const start = Math.max(0, i - context);
            const end = Math.min(lines.length, i + context + 1);
            for (let j = start; j < end; j++) {
                if (!visible.find(v => v.index === j)) {
                    visible.push({ line: lines[j], index: j });
                }
            }
        }
    }
    // 按 index 排序输出
    visible.sort((a, b) => a.index - b.index);
    let lastPrinted = -2;
    for (const { line, index } of visible) {
        // 跳过大段相同行用 ... 省略
        if (index > lastPrinted + 1 && lastPrinted >= 0) {
            console.log(chalk_1.default.dim('  ...'));
        }
        lastPrinted = index;
        switch (line.op) {
            case 'add':
                console.log(chalk_1.default.green(`  + ${line.text}`));
                added++;
                break;
            case 'del':
                console.log(chalk_1.default.red(`  - ${line.text}`));
                deleted++;
                break;
            case 'mod':
                console.log(chalk_1.default.yellow(`  ~ ${line.text}`));
                modified++;
                break;
            case 'same':
                if (line.text.trim()) {
                    console.log(chalk_1.default.dim(`    ${line.text}`));
                }
                break;
        }
    }
    return { added, deleted, modified };
}
/**
 * 统计差异
 */
function diffStats(oldText, newText) {
    const lines = diffLines(oldText, newText);
    return {
        added: lines.filter(l => l.op === 'add').length,
        deleted: lines.filter(l => l.op === 'del').length,
        modified: lines.filter(l => l.op === 'mod').length,
    };
}
//# sourceMappingURL=diff.js.map