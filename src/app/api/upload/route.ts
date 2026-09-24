import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let base64String = '';
    let folder = 'general';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      base64String = body.image || body.file || '';
      folder = body.folder || 'general';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      folder = (formData.get('folder') as string) || 'general';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded in form data' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'image/jpeg';
      base64String = `data:${mimeType};base64,${buffer.toString('base64')}`;
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Please send JSON or multipart/form-data.' },
        { status: 400 }
      );
    }

    if (!base64String) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    // Upload to Cloudinary with automatic WebP optimization
    const result = await uploadImageToCloudinary(base64String, folder);

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error('API /api/upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Image upload failed' },
      { status: 500 }
    );
  }
}
