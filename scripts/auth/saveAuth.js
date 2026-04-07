/**
 * File: scripts/auth/saveAuth.js
 * Description: Automated script to launch browser, extract authentication state from Google AI Studio, and save to config files
 *
 * Author: iBUHUB
 */

const { firefox } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Load environment variables from .env file
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

// Initialize language from environment variable passed by setupAuth.js
const lang = process.env.SETUP_AUTH_LANG || "zh";

// Bilingual text helper
const getText = (zh, en) => (lang === "zh" ? zh : en);

// --- Configuration Constants ---
const getDefaultBrowserExecutablePath = () => {
    const platform = os.platform();
    if (platform === "linux") return path.join(__dirname, "..", "..", "camoufox-linux", "camoufox");
    if (platform === "win32") return path.join(__dirname, "..", "..", "camoufox", "camoufox.exe");
    if (platform === "darwin")
        return path.join(__dirname, "..", "..", "camoufox-macos", "Camoufox.app", "Contents", "MacOS", "camoufox");
    return null;
};

const browserExecutablePath = process.env.CAMOUFOX_EXECUTABLE_PATH || getDefaultBrowserExecutablePath();
const VALIDATION_LINE_THRESHOLD = 200; // Validation line threshold
const CONFIG_DIR = "configs/auth"; // Authentication files directory

const { parseProxyFromEnv } = require("../../src/utils/ProxyUtils");

/**
 * Ensures that the specified directory exists, creating it if it doesn't.
 * @param {string} dirPath - The path of the directory to check and create.
 */
const ensureDirectoryExists = dirPath => {
    if (!fs.existsSync(dirPath)) {
        console.log(
            getText(
                `📂 目录 "${path.basename(dirPath)}" 不存在，正在创建...`,
                `📂 Directory "${path.basename(dirPath)}" does not exist, creating...`
            )
        );
        fs.mkdirSync(dirPath);
    }
};

/**
 * Gets the next available authentication file index from the 'configs/auth' directory.
 * Always uses max existing index + 1 to ensure new auth is always the latest.
 * This simplifies dedup logic assumption: higher index = newer auth.
 * @returns {number} - The next available index value.
 */
const getNextAuthIndex = () => {
    const projectRoot = path.join(__dirname, "..", "..");
    const directory = path.join(projectRoot, CONFIG_DIR);

    if (!fs.existsSync(directory)) {
        return 0;
    }

    // Find max existing index and use max + 1
    const files = fs.readdirSync(directory);
    const authFiles = files.filter(file => /^auth-\d+\.json$/.test(file));
    if (authFiles.length === 0) {
        return 0;
    }

    const indices = authFiles.map(file => parseInt(file.match(/^auth-(\d+)\.json$/)[1], 10));
    return Math.max(...indices) + 1;
};

(async () => {
    // Use project root directory instead of scripts directory
    const projectRoot = path.join(__dirname, "..", "..");
    const configDirPath = path.join(projectRoot, CONFIG_DIR);
    ensureDirectoryExists(configDirPath);

    const newIndex = getNextAuthIndex();
    const authFileName = `auth-${newIndex}.json`;

    console.log(
        getText(
            `▶️  正在准备为账号 #${newIndex} 创建新的认证文件...`,
            `▶️  Preparing to create new authentication file for account #${newIndex}...`
        )
    );
    console.log(getText(`▶️  启动浏览器: ${browserExecutablePath}`, `▶️  Launching browser: ${browserExecutablePath}`));

    if (!browserExecutablePath || !fs.existsSync(browserExecutablePath)) {
        console.error(getText("❌ 未找到 Camoufox 可执行文件。", "❌ Camoufox executable not found."));
        console.error(
            getText(
                `   -> 检查路径: ${browserExecutablePath || "(null)"}`,
                `   -> Checked: ${browserExecutablePath || "(null)"}`
            )
        );
        console.error(
            getText(
                '   -> 请先运行 "npm run setup-auth"，或设置 CAMOUFOX_EXECUTABLE_PATH。',
                '   -> Please run "npm run setup-auth" first, or set CAMOUFOX_EXECUTABLE_PATH.'
            )
        );
        process.exit(1);
    }

    const proxyConfig = parseProxyFromEnv();
    if (proxyConfig) {
        const bypassText = proxyConfig.bypass ? `, bypass=${proxyConfig.bypass}` : "";
        console.log(
            getText(
                `🌐  使用代理: ${proxyConfig.server}${bypassText}`,
                `🌐  Using proxy: ${proxyConfig.server}${bypassText}`
            )
        );
    } else {
        console.log(
            getText(
                "🌐  未检测到代理环境变量 (HTTPS_PROXY/HTTP_PROXY/ALL_PROXY)。如需代理请在运行前设置。",
                "🌐  No proxy env detected (HTTPS_PROXY/HTTP_PROXY/ALL_PROXY). Set it before running if needed."
            )
        );
    }

    const browser = await firefox.launch({
        executablePath: browserExecutablePath,
        headless: false,
        ...(proxyConfig ? { proxy: proxyConfig } : {}),
    });

    const context = await browser.newContext(proxyConfig ? { proxy: proxyConfig } : {});
    const page = await context.newPage();

    // Auto-fill logic
    const autoFillEmail = process.env.AUTO_FILL_EMAIL;
    const autoFillPwd = process.env.AUTO_FILL_PWD;

    if (!autoFillEmail) {
        console.log("");
        console.log(
            getText(
                "--- 请在新打开的 Camoufox 窗口中完成以下步骤 ---",
                "--- Please complete the following steps in the newly opened Camoufox window ---"
            )
        );
        console.log(
            getText(
                "1. 浏览器将打开 Google AI Studio。请在弹出的页面上完整登录您的 Google 账号。",
                "1. The browser will open Google AI Studio. Please log in to your Google account completely on the popup page."
            )
        );
        console.log(
            getText(
                "2. 登录成功并看到 AI Studio 界面后，请不要关闭浏览器窗口。",
                "2. After successful login and seeing the AI Studio interface, do not close the browser window."
            )
        );
        console.log(
            getText(
                '3. 返回此终端，然后按 "回车键" 继续...',
                '3. Return to this terminal, then press "Enter" to continue...'
            )
        );
    }

    await page.goto("https://gemini.google.com");

    if (autoFillEmail) {
        try {
            const randomWait = () => new Promise(r => setTimeout(r, 1000 + Math.random() * 4000));

            console.log(
                getText(
                    `🕵️ 正在尝试自动填入账号: ${autoFillEmail}`,
                    `🕵️ Attempting to auto-fill account: ${autoFillEmail}`
                )
            );
            await page.waitForSelector('input[type="email"]', { timeout: 30000 });
            await randomWait();
            await page.fill('input[type="email"]', autoFillEmail);
            await page.keyboard.press("Enter");

            if (autoFillPwd) {
                console.log(getText("🕵️ 正在等待密码输入框...", "🕵️ Waiting for password input field..."));
                await page.waitForSelector('input[type="password"]', { state: "visible", timeout: 30000 });
                await randomWait();
                await page.fill('input[type="password"]', autoFillPwd);
                await page.keyboard.press("Enter");

                // Handle post-login / 2FA transition pages (e.g. "You're all set" screen with a Next button)
                try {
                    // Look for the specific Google transition button
                    const nextButton = page.locator(
                        'button:has(span:text("Next")), button:has(span:text("下一步")), button:has-text("Next"), button:has-text("下一步")'
                    );
                    const notNowButton = page.locator(
                        'button:has(span:text("Not now")), button:has(span:text("暂时不")), button:has-text("Not now"), button:has-text("暂时不")'
                    );

                    // Polling for the transition button for a short duration
                    for (let i = 0; i < 10; i++) {
                        if (await nextButton.isVisible({ timeout: 1000 })) {
                            console.log(
                                getText(
                                    "🕵️ 检测到「下一步」按钮，正在点击以跳过说明页...",
                                    "🕵️ Detected 'Next' button, clicking to skip info page..."
                                )
                            );
                            await nextButton.click();
                            await randomWait();
                        } else if (await notNowButton.isVisible({ timeout: 1000 })) {
                            console.log(
                                getText(
                                    "🕵️ 检测到「暂时不」按钮，正在点击以跳过...",
                                    "🕵️ Detected 'Not now' button, clicking to skip..."
                                )
                            );
                            await notNowButton.click();
                            await randomWait();
                        }
                        await page.waitForTimeout(1000);
                    }
                } catch (e) {
                    // Best effort
                }
            }
            console.log(
                getText(
                    "🕵️ 自动填充已完成。如有 2FA 请在浏览器中手动完成。",
                    "🕵️ Auto-fill complete. Please complete 2FA manually if required."
                )
            );
        } catch (e) {
            console.warn(
                getText(
                    `⚠️ 自动填充提示: 未能完全自动执行 (${e.message})`,
                    `⚠️ Auto-fill notice: Could not complete automatically (${e.message})`
                )
            );
        }
    }

    console.log("");
    if (autoFillEmail) {
        console.log(
            getText(
                "请在浏览器中确认已完成登录后再继续。",
                "Please confirm login is complete in the browser before continuing."
            )
        );
    }
    console.log(
        getText("返回此终端，然后按“回车键”继续...", 'Return to this terminal, then press "Enter" to continue...')
    );
    await new Promise(resolve => process.stdin.once("data", resolve));

    // ==================== Capture Account Name ====================

    let accountName = "unknown"; // Default value
    try {
        console.log(
            getText(
                "🕵️  正在尝试获取账号名称 (V3 - 扫描 <script> JSON)...",
                "🕵️  Attempting to retrieve account name (V3 - Scanning <script> JSON)..."
            )
        );

        // 1. Locate all <script type="application/json"> tags
        const scriptLocators = page.locator('script[type="application/json"]');
        const count = await scriptLocators.count();
        console.log(getText(`   -> 找到 ${count} 个 JSON <script> 标签。`, `   -> Found ${count} JSON <script> tags.`));

        // 2. Define a basic Email regular expression
        // It will match strings like "ouyang5453@gmail.com"
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

        // 3. Iterate through all tags to find the first matching Email
        for (let i = 0; i < count; i++) {
            const content = await scriptLocators.nth(i).textContent();

            if (content) {
                // 4. Search for Email in tag content
                const match = content.match(emailRegex);

                if (match && match[0]) {
                    // 5. Found it!
                    accountName = match[0];
                    console.log(
                        getText(
                            `   -> 成功获取账号: ${accountName}`,
                            `   -> Successfully retrieved account: ${accountName}`
                        )
                    );
                    break; // Exit loop immediately after finding
                }
            }
        }

        if (accountName === "unknown") {
            console.log(
                getText(
                    `   -> 已遍历所有 ${count} 个 <script> 标签，但未找到 Email。`,
                    `   -> Iterated through all ${count} <script> tags, but no Email found.`
                )
            );
        }
    } catch (error) {
        console.warn(
            getText(
                "⚠️  无法自动获取账号名称 (V3 扫描出错)。",
                "⚠️  Unable to automatically retrieve account name (error during V3 scan)."
            )
        );
        console.warn(getText(`   -> 错误: ${error.message}`, `   -> Error: ${error.message}`));
        console.warn(getText('   -> 将使用 "unknown" 作为账号名称。', '   -> Will use "unknown" as account name.'));
    }

    // ==================== Smart Validation and Dual-file Save Logic ====================
    console.log("");
    console.log(getText("正在获取并验证登录状态...", "Retrieving and validating login status..."));
    const currentState = await context.storageState();
    currentState.accountName = accountName;
    const prettyStateString = JSON.stringify(currentState, null, 2);
    const lineCount = prettyStateString.split("\n").length;

    if (lineCount > VALIDATION_LINE_THRESHOLD) {
        console.log(
            getText(
                `✅ 状态验证通过 (${lineCount} 行 > ${VALIDATION_LINE_THRESHOLD} 行)。`,
                `✅ State validation passed (${lineCount} lines > ${VALIDATION_LINE_THRESHOLD} lines).`
            )
        );

        const compactStateString = JSON.stringify(currentState);
        const authFilePath = path.join(configDirPath, authFileName);

        fs.writeFileSync(authFilePath, compactStateString);
        console.log(
            getText(
                `   📄 认证文件已保存到: ${path.join(CONFIG_DIR, authFileName)}`,
                `   📄 Authentication file saved to: ${path.join(CONFIG_DIR, authFileName)}`
            )
        );
    } else {
        console.log(
            getText(
                `❌ 状态验证失败 (${lineCount} 行 <= ${VALIDATION_LINE_THRESHOLD} 行)。`,
                `❌ State validation failed (${lineCount} lines <= ${VALIDATION_LINE_THRESHOLD} lines).`
            )
        );
        console.log(
            getText(
                "   登录状态似乎为空或无效，文件未保存。",
                "   Login status appears to be empty or invalid, file was not saved."
            )
        );
        console.log(
            getText(
                "   请确保您已完全登录后再按回车键。",
                "   Please make sure you are fully logged in before pressing Enter."
            )
        );

        await browser.close();
        console.log("");
        console.log(getText("浏览器已关闭。", "Browser closed."));
        process.exit(1); // Exit with error code when validation fails
    }
    // ===================================================================

    await browser.close();
    console.log("");
    console.log(getText("浏览器已关闭。", "Browser closed."));

    process.exit(0);
})();
