import sys
import re

# Update API route files
api_files = [
    r'e:\1. Skillizee\Podcast Tool\src\app\api\video\analyze\route.ts',
    r'e:\1. Skillizee\Podcast Tool\src\app\api\video\transcribe\route.ts'
]

security_block = """    // --- SECURITY GUARD ---
    const authHeader = req.headers.get('authorization');
    const origin = req.headers.get('origin') || '';
    const clientIp = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = req.headers.get('user-agent') || 'Unknown User Agent';
    
    // 1. Token Check (from Frontend)
    const isValidToken = authHeader === `Bearer ${process.env.API_SECRET_TOKEN}`;
    
    // 2. Origin Check (Prevent CSRF / external bots)
    // Only allow if no origin (cURL with token) OR if it matches our expected domains
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('.vercel.app') || origin.includes('skillizee');
    const isValidOrigin = !origin || isLocal || isVercel;

    if (!isValidToken || !isValidOrigin) {
      console.warn(`[SECURITY REJECTED] Bot or unauthorized access attempt. IP: ${clientIp}, Origin: ${origin}, UA: ${userAgent}`);
      return NextResponse.json({ error: 'Unauthorized access. Bot traffic rejected.' }, { status: 403 });
    }
    // ----------------------
"""

for filepath in api_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove old security block from analyze if it exists
    content = re.sub(r'\s*// Basic Authentication & Debug Logging.*?(?:const formData = await req\.formData\(\);)', '\n    const formData = await req.formData();', content, flags=re.DOTALL)
    
    # Insert new security block at the start of try {
    content = content.replace("try {", "try {\n" + security_block)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Update Frontend Fetch in ProcessingView.tsx
processing_path = r'e:\1. Skillizee\Podcast Tool\src\components\video-studio\ProcessingView.tsx'
with open(processing_path, 'r', encoding='utf-8') as f:
    p_content = f.read()

p_content = p_content.replace(
    'const res = await fetch("/api/video/analyze", {',
    'const res = await fetch("/api/video/analyze", {\n          headers: {\n            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`\n          },'
)
with open(processing_path, 'w', encoding='utf-8') as f:
    f.write(p_content)

# Update Frontend Fetch in StudioView.tsx
studio_path = r'e:\1. Skillizee\Podcast Tool\src\components\video-studio\StudioView.tsx'
with open(studio_path, 'r', encoding='utf-8') as f:
    s_content = f.read()

s_content = s_content.replace(
    'const res = await fetch("/api/video/transcribe", {',
    'const res = await fetch("/api/video/transcribe", {\n                                     headers: {\n                                       "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET_TOKEN}`\n                                     },'
)
with open(studio_path, 'w', encoding='utf-8') as f:
    f.write(s_content)

print("Security successfully implemented across frontend and backend.")
