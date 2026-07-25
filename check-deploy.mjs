// check-deploy.mjs - Deployment Status Checker via Node.js
const HOSTING_URL = 'https://skillizee-products.web.app';
const CLOUD_RUN_URL = 'https://skillizee-video-backend-1011375873388.us-central1.run.app';
const API_TOKEN = 'podcast_secure_v1_987654321';

async function checkDeployment() {
  console.log('\n======================================');
  console.log('  Checking Deployment Status');
  console.log('======================================\n');

  // 1. Frontend Hosting
  try {
    const res = await fetch(HOSTING_URL, { method: 'HEAD' });
    console.log(`[1/3] Frontend Hosting (${HOSTING_URL}): ${res.ok ? 'ONLINE (' + res.status + ')' : 'STATUS ' + res.status}`);
  } catch (err) {
    console.log(`[1/3] Frontend Hosting: FAILED (${err.message})`);
  }

  // 2. Backend Service
  try {
    const res = await fetch(`${CLOUD_RUN_URL}/health`);
    console.log(`[2/3] Backend Service (${CLOUD_RUN_URL}): STATUS ${res.status}`);
  } catch (err) {
    console.log(`[2/3] Backend Service: FAILED (${err.message})`);
  }

  // 3. Signed Upload URL Endpoint
  try {
    const res = await fetch(`${HOSTING_URL}/api/video/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ filename: 'test.mp4', contentType: 'video/mp4' }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      console.log('[3/3] Upload URL API (/api/video/upload-url): SUCCESS (Signed URL Generated)');
    } else {
      console.log(`[3/3] Upload URL API: FAILED (${res.status} - ${data.error || 'Unknown error'})`);
    }
  } catch (err) {
    console.log(`[3/3] Upload URL API: FAILED (${err.message})`);
  }

  console.log('\n======================================\n');
}

checkDeployment();
