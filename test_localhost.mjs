import fs from 'fs';

async function test() {
  const url = 'http://localhost:3000/api/video/analyze';
  const token = 'podcast_secure_v1_987654321';
  
  console.log('Sending request to localhost:3000...');
  
  try {
    const formData = new FormData();
    const buffer = fs.readFileSync('test_audio.m4a');
    const blob = new Blob([buffer], { type: 'audio/mp4' });
    formData.append('video', blob, 'test_audio.m4a');
    formData.append('context', 'Test context for podcast');

    const startTime = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('Status Code:', res.status);
    
    if (!res.ok) {
        const text = await res.text();
        console.error('Error response:', text);
        return;
    }

    const data = await res.json();
    const elapsed = (Date.now() - startTime) / 1000;
    
    console.log(`Request finished in ${elapsed.toFixed(1)} seconds!`);
    console.log('Clips count:', data.clips?.length);
    console.log('Captions count:', data.captions?.length);
    
    if (data.captions && data.captions.length > 0) {
        console.log('First caption:', data.captions[0]);
    } else {
        console.log('Captions are EMPTY!');
    }
    
  } catch (err) {
    console.error('Network or Parse Error:', err);
  }
}

test();
