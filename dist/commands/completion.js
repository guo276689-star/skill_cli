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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionCommand = completionCommand;
const chalk_1 = __importDefault(require("chalk"));
const os = __importStar(require("os"));
async function completionCommand(shell) {
    if (!shell && os.platform() === 'win32')
        shell = 'powershell';
    if (!shell)
        shell = 'bash';
    let script;
    let installHint;
    switch (shell) {
        case 'powershell':
        case 'pwsh':
            script = powershellCompletion();
            installHint = `添加到 PowerShell 配置文件:\n  notepad $PROFILE\n  粘贴脚本保存，重启 PowerShell`;
            break;
        case 'bash':
        case 'zsh':
            script = bashCompletion();
            installHint = `添加到 ~/.bashrc 或 ~/.zshrc:\n  source <(skills completion bash)`;
            break;
        default:
            console.log(chalk_1.default.red(`不支持的 shell: ${shell}`));
            console.log(chalk_1.default.dim('支持: bash, zsh, powershell'));
            return;
    }
    console.log(script);
    console.log();
    console.log(chalk_1.default.dim(installHint));
}
function powershellCompletion() {
    return `# Skills CLI Tab 补全 — 添加到 $PROFILE
Register-ArgumentCompleter -Native -CommandName skills -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $cmds = @('search','install','list','ls','info','doctor','review','diff','update','remove','rm','env','new','freeze','bundle','serve','ui')

    # 提取已输入的命令
    $tokens = $commandAst.CommandElements | ForEach-Object { $_.Value }
    $cmd = $tokens[1]

    if ($tokens.Count -le 2) {
        # 补全命令名
        return $cmds | Where-Object { $_ -like "$wordToComplete*" }
    }

    switch ($cmd) {
        'info' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'doctor' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'review' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'diff' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'update' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'remove' { return (skills list 2>$null | Select-String '^\\s+[📋🧬]\\s+(\\S+)' | ForEach-Object { $_.Matches.Groups[1].Value }) | Where-Object { $_ -like "$wordToComplete*" } }
        'bundle' {
            $actions = @('list','install')
            if ($tokens.Count -le 3) { return $actions | Where-Object { $_ -like "$wordToComplete*" } }
            return @('dev','engineering','research','security') | Where-Object { $_ -like "$wordToComplete*" }
        }
    }
}`;
}
function bashCompletion() {
    return `# Skills CLI Tab 补全 — 添加到 ~/.bashrc
_skills_completion() {
    local cur prev words cword
    _init_completion || return

    local cmds="search install list info doctor review diff update remove env new freeze bundle serve"

    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$cmds" -- "$cur"))
        return
    fi

    local cmd="\${words[1]}"
    case "$cmd" in
        info|doctor|review|diff|update|remove)
            local names=$(skills list 2>/dev/null | grep -oP '^\\s+[📋🧬]\\s+\\K\\S+' )
            COMPREPLY=($(compgen -W "$names" -- "$cur"))
            ;;
        bundle)
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "list install" -- "$cur"))
            else
                COMPREPLY=($(compgen -W "dev engineering research security" -- "$cur"))
            fi
            ;;
    esac
}
complete -F _skills_completion skills`;
}
//# sourceMappingURL=completion.js.map