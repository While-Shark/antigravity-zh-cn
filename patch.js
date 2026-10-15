const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const os = require('os');

console.log('\x1b[36m========================================================\x1b[0m');
console.log('\x1b[36m        Antigravity 跨平台汉化 / 还原管理工具           \x1b[0m');
console.log(`\x1b[36m           当前操作系统: ${process.platform === 'darwin' ? 'macOS' : (process.platform === 'win32' ? 'Windows' : process.platform)} \x1b[0m`);
console.log('\x1b[36m========================================================\x1b[0m\n');

const dictPath = path.join(__dirname, 'dict.json');

// 创建 readline 实例
function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function questionAsync(rl, query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

// 解析用户输入的路径为标准 asarPath 和 resourcesDir
function resolveAppPaths(rawPath) {
    if (!rawPath) return null;
    let cleanPath = rawPath.trim().replace(/^['"]|['"]$/g, '');
    if (cleanPath.startsWith('~')) {
        cleanPath = path.join(os.homedir(), cleanPath.slice(1));
    }
    cleanPath = path.resolve(cleanPath);

    // 1. 直接指定 app.asar
    if (cleanPath.endsWith('app.asar') && fs.existsSync(cleanPath)) {
        return {
            asarPath: cleanPath,
            bakPath: cleanPath + '.bak',
            resourcesDir: path.dirname(cleanPath),
            extractDir: path.join(path.dirname(cleanPath), 'app_extracted_patch')
        };
    }

    // 2. macOS .app bundle 目录 (如 /Applications/Antigravity.app)
    if (process.platform === 'darwin' || cleanPath.endsWith('.app')) {
        const macAsar = path.join(cleanPath, 'Contents', 'Resources', 'app.asar');
        if (fs.existsSync(macAsar) || fs.existsSync(macAsar + '.bak')) {
            const resDir = path.join(cleanPath, 'Contents', 'Resources');
            return {
                asarPath: macAsar,
                bakPath: macAsar + '.bak',
                resourcesDir: resDir,
                extractDir: path.join(resDir, 'app_extracted_patch')
            };
        }
    }

    // 3. 根安装目录包含 resources/app.asar (如 Windows 的 LocalAppData/Programs/antigravity)
    const resAsar = path.join(cleanPath, 'resources', 'app.asar');
    if (fs.existsSync(resAsar) || fs.existsSync(resAsar + '.bak')) {
        const resDir = path.join(cleanPath, 'resources');
        return {
            asarPath: resAsar,
            bakPath: resAsar + '.bak',
            resourcesDir: resDir,
            extractDir: path.join(resDir, 'app_extracted_patch')
        };
    }

    // 4. 当前输入的就是 resources 目录
    const directAsar = path.join(cleanPath, 'app.asar');
    if (fs.existsSync(directAsar) || fs.existsSync(directAsar + '.bak')) {
        return {
            asarPath: directAsar,
            bakPath: directAsar + '.bak',
            resourcesDir: cleanPath,
            extractDir: path.join(cleanPath, 'app_extracted_patch')
        };
    }

    return null;
}

// 获取各系统默认的候选安装路径
function getDefaultCandidatePaths() {
    const candidates = [];
    if (process.platform === 'win32') {
        if (process.env.LOCALAPPDATA) {
            candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity'));
        }
        if (process.env.PROGRAMFILES) {
            candidates.push(path.join(process.env.PROGRAMFILES, 'Antigravity'));
            candidates.push(path.join(process.env.PROGRAMFILES, 'antigravity'));
        }
        if (process.env['PROGRAMFILES(X86)']) {
            candidates.push(path.join(process.env['PROGRAMFILES(X86)'], 'Antigravity'));
        }
    } else if (process.platform === 'darwin') {
        candidates.push('/Applications/Antigravity.app');
        candidates.push('/Applications/Google Antigravity.app');
        candidates.push(path.join(os.homedir(), 'Applications', 'Antigravity.app'));
    } else {
        // Linux / 其他
        candidates.push('/opt/antigravity');
        candidates.push('/usr/lib/antigravity');
        candidates.push(path.join(os.homedir(), '.local', 'share', 'antigravity'));
    }
    return candidates;
}

// 自动检测与交互获取安装路径
async function getTargetPaths(rl) {
    const candidates = getDefaultCandidatePaths();
    for (const c of candidates) {
        const resolved = resolveAppPaths(c);
        if (resolved) {
            console.log(`\x1b[32m[检测] 自动发现 Antigravity 安装路径:\x1b[0m\n       ${resolved.asarPath}`);
            const ans = await questionAsync(rl, '\n是否使用此路径？[Y/n / 或直接输入自定义路径]: ');
            const trimmed = ans.trim();
            if (!trimmed || trimmed.toLowerCase() === 'y' || trimmed.toLowerCase() === 'yes') {
                return resolved;
            } else if (trimmed.toLowerCase() !== 'n') {
                const customResolved = resolveAppPaths(trimmed);
                if (customResolved) return customResolved;
                console.log(`\x1b[31m[提示] 输入的自定义路径无法找到 app.asar，进入手动输入流程...\x1b[0m`);
            }
            break;
        }
    }

    // 默认路径未找到或用户选择自定义路径
    console.log(`\x1b[33m[提示] 未在默认位置检测到 Antigravity，请输入安装路径。\x1b[0m`);
    if (process.platform === 'darwin') {
        console.log(`      例如: /Applications/Antigravity.app`);
    } else {
        console.log(`      例如: D:\\Software\\antigravity 或 C:\\Users\\...\\app.asar`);
    }

    while (true) {
        const input = await questionAsync(rl, '\n请输入 Antigravity 安装路径 (输入 q 退出): ');
        if (input.trim().toLowerCase() === 'q') {
            console.log('操作已取消。');
            process.exit(0);
        }
        const resolved = resolveAppPaths(input);
        if (resolved) {
            console.log(`\x1b[32m[确认] 成功定位到:\x1b[0m ${resolved.asarPath}`);
            return resolved;
        }
        console.log(`\x1b[31m[错误] 无法在所输路径中找到 app.asar 文件，请重新检查并输入！\x1b[0m`);
    }
}

// 自动加载 dict.json 词典文件
function loadDictionary() {
    if (!fs.existsSync(dictPath)) {
        console.error(`\x1b[31m[错误] 未找到词典文件 dict.json，请确保其与 patch.js 在同一目录下！\x1b[0m`);
        process.exit(1);
    }
    try {
        let raw = fs.readFileSync(dictPath, 'utf8').replace(/^\uFEFF/, '').trim();
        const parsed = JSON.parse(raw);
        const exact = parsed.exact || (parsed._comment ? {} : parsed);
        const patterns = parsed.patterns || [];
        const exactCount = Object.keys(exact).length;
        const patternCount = patterns.length;
        console.log(`\x1b[32m[词典] 成功加载 dict.json (共 ${exactCount} 条精确词条, ${patternCount} 条正则规则)\x1b[0m`);
        return { exact, patterns };
    } catch (e) {
        console.error(`\x1b[31m[错误] dict.json 格式解析失败，请检查是否符合 JSON 规范：\x1b[0m\n`, e.message);
        process.exit(1);
    }
}

// macOS 下修复被修改文件的签名及 Gatekeeper 隔离属性
function fixMacOsSignature(appPaths) {
    if (process.platform === 'darwin') {
        console.log('\x1b[33m[*] 正在为 macOS 应用重新签名并解除隔离属性...\x1b[0m');
        try {
            const appBundle = path.resolve(appPaths.resourcesDir, '..', '..');
            if (appBundle.endsWith('.app') && fs.existsSync(appBundle)) {
                execSync(`codesign --force --deep --sign - "${appBundle}"`, { stdio: 'ignore' });
                execSync(`xattr -cr "${appBundle}"`, { stdio: 'ignore' });
                console.log('      ✔ macOS 签名与安全隔离属性已自动修复完成！');
            }
        } catch (signErr) {
            console.warn('      [提示] 自动重签名遇到警告，建议在终端执行: codesign --force --deep --sign - /Applications/Antigravity.app');
        }
    }
}

// 还原为原版
function performRestore(appPaths) {
    console.log('\n\x1b[33m>>> 正在执行还原为官方原版英文...\x1b[0m');
    if (!fs.existsSync(appPaths.bakPath)) {
        console.error(`\x1b[31m[错误] 未找到备份文件 (${appPaths.bakPath})，无法执行还原！\x1b[0m`);
        return;
    }
    try {
        fs.copyFileSync(appPaths.bakPath, appPaths.asarPath);
        fixMacOsSignature(appPaths);
        console.log('\x1b[32m========================================================\x1b[0m');
        console.log('\x1b[32m       ✔ 已成功还原为官方原版英文！                   \x1b[0m');
        console.log('\x1b[32m========================================================\x1b[0m\n');
    } catch (e) {
        console.error(`\x1b[31m[错误] 还原失败，请确认 Antigravity 软件是否已完全退出！\x1b[0m`, e);
    }
}

// 执行汉化
function performInstall(appPaths) {
    console.log('\n\x1b[33m>>> 正在开始安装 / 更新全量汉化补丁...\x1b[0m');
    const { exact, patterns } = loadDictionary();

    // 1. 备份原版
    console.log('\x1b[33m[1/4] 检查并备份原始文件...\x1b[0m');
    if (!fs.existsSync(appPaths.bakPath)) {
        fs.copyFileSync(appPaths.asarPath, appPaths.bakPath);
        console.log(`      已创建原始备份: ${path.basename(appPaths.bakPath)}`);
    } else {
        console.log('      备份已存在，跳过备份。');
    }

    // 2. 解包
    console.log('\x1b[33m[2/4] 正在解包 app.asar 核心文件...\x1b[0m');
    if (fs.existsSync(appPaths.extractDir)) {
        fs.rmSync(appPaths.extractDir, { recursive: true, force: true });
    }

    try {
        execSync(`npx --yes @electron/asar extract "${appPaths.asarPath}" "${appPaths.extractDir}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error('\x1b[31m[错误] 解包 app.asar 失败！\x1b[0m', e);
        process.exit(1);
    }

    // 3. 注入汉化
    console.log('\x1b[33m[3/4] 正在注入词典与前端动态汉化引擎...\x1b[0m');

    // (A) updater.js
    const updaterPath = path.join(appPaths.extractDir, 'dist', 'updater.js');
    if (fs.existsSync(updaterPath)) {
        let content = fs.readFileSync(updaterPath, 'utf8');
        content = content
            .replace(/Check for Updates/g, '检查更新')
            .replace(/Checking for Updates\.\.\./g, '正在检查更新...')
            .replace(/Downloading Update\.\.\./g, '正在下载更新...')
            .replace(/Restart to Update/g, '重启以应用更新');
        fs.writeFileSync(updaterPath, content, 'utf8');
    }

    // (B) tray.js
    const trayPath = path.join(appPaths.extractDir, 'dist', 'tray.js');
    if (fs.existsSync(trayPath)) {
        let content = fs.readFileSync(trayPath, 'utf8');
        content = content.replace(
            /\(count > 0 \? `\$\{count\}` : 'No'\) \+\s*' agent' \+\s*\(count === 1 \? '' : 's'\) \+\s*' running';/g,
            "(count > 0 ? `${count}` : '无') + ' 个运行中的智能体';"
        );
        fs.writeFileSync(trayPath, content, 'utf8');
    }

    // (C) wizardHtml.js
    const wizardPath = path.join(appPaths.extractDir, 'dist', 'ideInstall', 'wizardHtml.js');
    if (fs.existsSync(wizardPath)) {
        let content = fs.readFileSync(wizardPath, 'utf8');
        content = content
            .replace('Welcome to the new Antigravity!', '欢迎使用全新 Antigravity！')
            .replace("Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE</b>.", 'Antigravity 经过全新设计，以智能体为核心提供更强大的能力。如果您仍需要代码编辑器，可下载独立的 <b>Antigravity IDE</b>。')
            .replace('Download the Antigravity IDE', '下载 Antigravity IDE')
            .replace('Explore the new Antigravity', '开始探索 Antigravity')
            .replace('Setting up…', '正在初始化…');
        fs.writeFileSync(wizardPath, content, 'utf8');
    }

    // (D) preload.js 注入
    const preloadPath = path.join(appPaths.extractDir, 'dist', 'preload.js');
    if (fs.existsSync(preloadPath)) {
        let content = fs.readFileSync(preloadPath, 'utf8');
        const patchTag = '// === ANTIGRAVITY_I18N_PATCH_INJECTED ===';
        if (content.includes(patchTag)) {
            content = content.substring(0, content.indexOf(patchTag));
        }

        const dictJson = JSON.stringify(exact);
        const patternJson = JSON.stringify(patterns);

        const injector = `\n${patchTag}
(function () {
    const DICT = ${dictJson};
    const PATTERNS_CONF = ${patternJson};
    const map = new Map(Object.entries(DICT));

    const regexRules = PATTERNS_CONF.map(item => [new RegExp(item.match, 'gi'), item.replace]);

    function translateText(text) {
        if (!text) return text;
        const trimmed = text.trim();
        if (map.has(trimmed)) {
            return text.replace(trimmed, map.get(trimmed));
        }
        for (let i = 0; i < regexRules.length; i++) {
            const [reg, repl] = regexRules[i];
            reg.lastIndex = 0;
            if (reg.test(trimmed)) {
                return text.replace(reg, repl);
            }
        }
        return text;
    }

    function translateNode(node) {
        if (!node) return;
        if (node.nodeType === 3) { // TEXT_NODE
            const val = node.nodeValue;
            if (val && val.trim()) {
                const res = translateText(val);
                if (res !== val) {
                    node.nodeValue = res;
                }
            }
        } else if (node.nodeType === 1) { // ELEMENT_NODE
            if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
            const attrs = ['placeholder', 'title', 'aria-label', 'value', 'tooltip', 'data-tooltip'];
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                const val = node.getAttribute(attr);
                if (val && val.trim()) {
                    const res = translateText(val);
                    if (res !== val) {
                        node.setAttribute(attr, res);
                    }
                }
            }
            if (node.shadowRoot) {
                translateNode(node.shadowRoot);
            }
            const children = node.childNodes;
            for (let i = 0; i < children.length; i++) {
                translateNode(children[i]);
            }
        } else if (node.nodeType === 11) { // DOCUMENT_FRAGMENT (e.g. shadowRoot)
            const children = node.childNodes;
            for (let i = 0; i < children.length; i++) {
                translateNode(children[i]);
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            if (m.type === 'childList') {
                for (let j = 0; j < m.addedNodes.length; j++) {
                    translateNode(m.addedNodes[j]);
                }
            } else if (m.type === 'characterData') {
                translateNode(m.target);
            }
        }
    });

    function init() {
        if (document.body) {
            translateNode(document.body);
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            setInterval(() => {
                if (document.body) translateNode(document.body);
            }, 300);
        } else {
            setTimeout(init, 30);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
`;
        fs.writeFileSync(preloadPath, content + injector, 'utf8');
    }

    // (E) menu.js
    const menuPath = path.join(appPaths.extractDir, 'dist', 'menu.js');
    if (fs.existsSync(menuPath)) {
        let content = fs.readFileSync(menuPath, 'utf8');
        content = content
            .replace(/label:\s*'New Window'/g, "label: '新建窗口'")
            .replace(/label:\s*'Docs'/g, "label: '官方文档'")
            .replace(/label:\s*'Connect to WSL'/g, "label: '连接到 WSL'")
            .replace(/label:\s*'Reopen Locally'/g, "label: '在本地重新打开'");
        fs.writeFileSync(menuPath, content, 'utf8');
    }

    // (F) main.js (原生退出确认对话框)
    const mainPath = path.join(appPaths.extractDir, 'dist', 'main.js');
    if (fs.existsSync(mainPath)) {
        let content = fs.readFileSync(mainPath, 'utf8');
        content = content
            .replace("buttons: ['Cancel', 'Quit']", "buttons: ['取消', '退出']")
            .replace("title: 'Confirm Quit'", "title: '确认退出'")
            .replace("message: 'Are you sure you want to quit?'", "message: '您确定要退出吗？'")
            .replace("detail: 'There may be agents or background tasks running.'", "detail: '后台可能仍有智能体或任务正在运行。'");
        fs.writeFileSync(mainPath, content, 'utf8');
    }

    // (G) provisionSplash.js (WSL 初始化提示)
    const splashPath = path.join(appPaths.extractDir, 'dist', 'provisionSplash.js');
    if (fs.existsSync(splashPath)) {
        let content = fs.readFileSync(splashPath, 'utf8');
        content = content.replace("Setting up WSL:", "正在配置 WSL:");
        fs.writeFileSync(splashPath, content, 'utf8');
    }

    // 4. 重新打包
    console.log('\x1b[33m[4/4] 正在重新打包 app.asar 并应用补丁...\x1b[0m');
    try {
        const unpackArg = fs.existsSync(path.join(appPaths.extractDir, 'node_modules', 'chrome-devtools-mcp'))
            ? ' --unpack "**/chrome-devtools-mcp/**"'
            : '';
        execSync(`npx --yes @electron/asar pack "${appPaths.extractDir}" "${appPaths.asarPath}"${unpackArg}`, { stdio: 'inherit' });
        fs.rmSync(appPaths.extractDir, { recursive: true, force: true });
    } catch (e) {
        console.error('\x1b[31m[错误] 打包失败！\x1b[0m', e);
        process.exit(1);
    }

    fixMacOsSignature(appPaths);

    console.log('\n\x1b[32m========================================================\x1b[0m');
    console.log('\x1b[32m       ✔ Antigravity 全量汉化补丁已成功更新打包！      \x1b[0m');
    console.log('\x1b[32m========================================================\x1b[0m\n');
}

// 检查是否正在运行
function checkRunningApp() {
    try {
        let isRunning = false;
        if (process.platform === 'win32') {
            const tasklist = execSync('tasklist', { encoding: 'utf8' });
            isRunning = /antigravity\.exe/i.test(tasklist);
        } else if (process.platform === 'darwin') {
            const ps = execSync('pgrep -x Antigravity || true', { encoding: 'utf8' }).trim();
            isRunning = !!ps;
        }
        if (isRunning) {
            console.log('\x1b[31m[⚠️  重要警告] 检测到 Antigravity 软件当前正在运行中！\x1b[0m');
            console.log('\x1b[33m   Electron 应用在运行时会把原文件的偏移表缓存在内存中。');
            console.log('   如果在软件运行中注入汉化，会导致代码偏移错位并产生语法错误，汉化将无法生效！');
            console.log('   👉 请务必先彻底退出 Antigravity（Mac 下按 Cmd + Q，确保 Dock 栏图标下无小圆点）后再继续。\x1b[0m\n');
        }
    } catch (e) {}
}

// 主流程启动
async function main() {
    checkRunningApp();
    const rl = createRL();
    try {
        // 1. 获取安装路径
        const appPaths = await getTargetPaths(rl);

        // 2. 选择操作
        console.log('\n请选择操作：');
        console.log('  [1] 安装 / 更新汉化补丁 (默认，应用 dict.json)');
        console.log('  [2] 还原为官方原版英文\n');

        const choice = await questionAsync(rl, '请输入选项编号 [1-2] (直接回车默认执行 1): ');
        rl.close();

        if (choice.trim() === '2') {
            performRestore(appPaths);
        } else {
            performInstall(appPaths);
        }
    } catch (err) {
        rl.close();
        console.error('\x1b[31m[运行异常]\x1b[0m', err);
        process.exit(1);
    }
}

main();