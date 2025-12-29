const fs = require('fs/promises');
const path = require('path');
const {spawn} = require('child_process');

const DAY_MS = 24 * 60 * 60 * 1000;
const ENV_FILES = ['.env.local', '.env'];

const loadEnvFile = async (filePath) => {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) return;
            const key = trimmed.slice(0, separatorIndex).trim();
            if (!key || process.env[key]) return;
            let value = trimmed.slice(separatorIndex + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch {
        // ignore missing env files
    }
};

const loadEnv = async () => {
    for (const fileName of ENV_FILES) {
        const filePath = path.join(process.cwd(), fileName);
        try {
            await fs.access(filePath);
            await loadEnvFile(filePath);
        } catch {
            // ignore missing env files
        }
    }
};

const isStale = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return Date.now() - stats.mtimeMs > DAY_MS;
    } catch {
        return true;
    }
};

const runScript = async (scriptPath) =>
    new Promise((resolve) => {
        const child = spawn(process.execPath, [scriptPath], {stdio: 'inherit'});
        child.on('close', (code) => resolve(code === 0));
    });

const ensureTasks = async () => {
    await loadEnv();
    const root = process.cwd();
    const tasks = [
        {
            name: 'Project repo list',
            filePath: path.join(root, 'data', 'projects.generated.ts'),
            scriptPath: path.join(root, 'scripts', 'updateProjectRepos.js'),
            requiredEnv: [],
        },
        {
            name: 'NuGet package map',
            filePath: path.join(root, 'data', 'nuget-packages.json'),
            scriptPath: path.join(root, 'scripts', 'updateNugetPackages.js'),
            requiredEnv: [],
        },
        {
            name: 'GitHub metrics history',
            filePath: path.join(root, 'data', 'githubMetricsHistory.json'),
            scriptPath: path.join(root, 'scripts', 'updateGithubMetrics.js'),
            requiredEnv: ['GITHUB_TOKEN'],
        },
    ];

    for (const task of tasks) {
        const stale = await isStale(task.filePath);
        if (!stale) {
            console.log(`✓ ${task.name} is fresh.`);
            continue;
        }
        const missingEnv = task.requiredEnv.filter((key) => !process.env[key]);
        if (missingEnv.length > 0) {
            console.warn(
                `⚠️  Skipping ${task.name}: missing ${missingEnv.join(', ')}.`,
            );
            continue;
        }
        console.log(`⏳ Refreshing ${task.name}...`);
        const ok = await runScript(task.scriptPath);
        if (!ok) {
            console.warn(`⚠️  ${task.name} refresh failed. Continuing.`);
        }
    }
};

if (require.main === module) {
    ensureTasks().catch((error) => {
        console.warn(`⚠️  Prebuild refresh failed: ${error?.message ?? error}`);
    });
}

module.exports = {ensureTasks};
