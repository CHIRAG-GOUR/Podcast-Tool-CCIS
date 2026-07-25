// watch-deploy.mjs - Real-time Deployment Monitor (30s interval)
import fs from 'fs';
import path from 'path';

const LOG_DIR = `C:/Users/ASUS/.gemini/antigravity-ide/brain/77398541-af2b-4caa-8096-36de7d2cc5e3/.system_generated/tasks`;
const STATUS_FILE = path.resolve('deployment-status.md');

function getLatestTaskLog() {
  const file1012 = path.join(LOG_DIR, 'task-1012.log');
  if (fs.existsSync(file1012)) return file1012;
  if (!fs.existsSync(LOG_DIR)) return null;
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('task-') && f.endsWith('.log'))
    .map(f => {
      const fullPath = path.join(LOG_DIR, f);
      const content = fs.readFileSync(fullPath, 'utf-8');
      return { path: fullPath, time: fs.statSync(fullPath).mtimeMs, content };
    })
    .filter(item => item.content.includes('Thank you for trying our early preview') || item.content.includes('Deploying to'))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].path : null;
}

function parseLog(logPath) {
  if (!logPath || !fs.existsSync(logPath)) {
    return { percent: 0, status: 'Initializing deployment...' };
  }

  const content = fs.readFileSync(logPath, 'utf-8');

  if (content.includes('Deploy complete!')) {
    return { percent: 100, status: '✅ Deploy complete!', step1: '✅ Completed', step2: '✅ Completed', step3: '✅ Completed', step4: '✅ Completed', step5: '✅ Completed' };
  }
  if (content.includes('releasing new version...')) {
    return { percent: 95, status: 'Finalizing Hosting version...', step1: '✅ Completed', step2: '✅ Completed', step3: '✅ Completed', step4: '✅ Completed', step5: '🔄 In Progress' };
  }
  if (content.includes('updating Node.js 24') || content.includes('updating Node.js 20')) {
    return { percent: 75, status: 'Building Cloud Run container & deploying revision...', step1: '✅ Completed', step2: '✅ Completed', step3: '✅ Completed', step4: '🔄 In Progress', step5: '⏳ Pending' };
  }
  if (content.includes('source uploaded successfully') || content.includes('file upload complete')) {
    return { percent: 60, status: 'Source uploaded to GCS. Initiating Cloud Run build...', step1: '✅ Completed', step2: '✅ Completed', step3: '🔄 In Progress', step4: '⏳ Pending', step5: '⏳ Pending' };
  }
  if (content.includes('packaged')) {
    return { percent: 45, status: 'Packaging Cloud Function source (202 MB)...', step1: '✅ Completed', step2: '🔄 In Progress', step3: '⏳ Pending', step4: '⏳ Pending', step5: '⏳ Pending' };
  }
  if (content.includes('Generating static pages') || content.includes('Creating an optimized production build')) {
    return { percent: 25, status: 'Compiling Next.js production build...', step1: '🔄 In Progress', step2: '⏳ Pending', step3: '⏳ Pending', step4: '⏳ Pending', step5: '⏳ Pending' };
  }

  return { percent: 10, status: 'Starting deployment process...', step1: '🔄 In Progress', step2: '⏳ Pending', step3: '⏳ Pending', step4: '⏳ Pending', step5: '⏳ Pending' };
}

function updateMarkdown(info) {
  const timestamp = new Date().toLocaleTimeString();
  const md = `# Firebase Deployment Status

**Overall Completion:** **${info.percent}%**

---

## Deployment Progress Breakdown

| Step | Phase | Status | Weight | Progress |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Next.js Production Build** | ${info.step1 || '⏳ Pending'} | 30% | ${Math.min(info.percent, 30)}% / 30% |
| 2 | **Packaging SSR Cloud Function** | ${info.step2 || '⏳ Pending'} | 15% | ${Math.max(0, Math.min(info.percent - 30, 15))}% / 15% |
| 3 | **Uploading Source & Hosting Assets** | ${info.step3 || '⏳ Pending'} | 15% | ${Math.max(0, Math.min(info.percent - 45, 15))}% / 15% |
| 4 | **Cloud Run Container Build & Rollout** | ${info.step4 || '⏳ Pending'} | 35% | ${Math.max(0, Math.min(info.percent - 60, 35))}% / 35% |
| 5 | **Finalizing Hosting Version** | ${info.step5 || '⏳ Pending'} | 5% | ${Math.max(0, Math.min(info.percent - 95, 5))}% / 5% |

---

## Details
- **Project:** \`skillizee-products\`
- **Hosting URL:** [https://skillizee-products.web.app](https://skillizee-products.web.app)
- **Current Action:** ${info.status}
- **Last Updated:** ${new Date().toLocaleString()}
`;

  fs.writeFileSync(STATUS_FILE, md, 'utf-8');
}

function checkAndUpdate() {
  const logFile = getLatestTaskLog();
  const info = parseLog(logFile);

  console.clear();
  console.log(`====================================================`);
  console.log(`  Firebase Deployment Monitor (Updating every 30s)  `);
  console.log(`====================================================`);
  console.log(`Time: ${new Date().toLocaleTimeString()}`);
  console.log(`Progress: [${'█'.repeat(Math.floor(info.percent / 5))}${'░'.repeat(20 - Math.floor(info.percent / 5))}] ${info.percent}%`);
  console.log(`Status: ${info.status}`);
  console.log(`----------------------------------------------------\n`);

  updateMarkdown(info);

  if (info.percent === 100) {
    console.log('🎉 Deployment successfully finished!');
    process.exit(0);
  }
}

// Initial run
checkAndUpdate();

// Repeat every 30 seconds
setInterval(checkAndUpdate, 30000);
