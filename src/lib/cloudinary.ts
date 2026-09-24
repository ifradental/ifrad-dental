import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Uploads a base64 string or file buffer/URL to Cloudinary with automatic optimization.
 * Optimizations applied:
 * - format: 'webp' (modern efficient image format)
 * - quality: 'auto:good' (automatic lossless/perceptual compression)
 * - fetch_format: 'auto'
 */
export async function uploadImageToCloudinary(
  fileBase64OrUrl: string,
  folder: string = 'general'
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    console.warn(
      '⚠️ CLOUDINARY_CLOUD_NAME is not configured in environment variables. Falling back to direct data URL.'
    );
    return {
      url: fileBase64OrUrl,
      publicId: `local_fallback_${Date.now()}`,
    };
  }

  try {
    const uploadRes = await cloudinary.uploader.upload(fileBase64OrUrl, {
      folder: `ifrad_dental/${folder}`,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { flags: 'lossy' },
      ],
    });

    return {
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      width: uploadRes.width,
      height: uploadRes.height,
      format: uploadRes.format,
      bytes: uploadRes.bytes,
    };
  } catch (err: any) {
    console.error('❌ Cloudinary upload error:', err.message);
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
}

/**
 * Generates an optimized Cloudinary delivery URL with customizable width, height, and crop.
 */
export function getOptimizedImageUrl(
  publicIdOrUrl: string,
  options?: { width?: number; height?: number; crop?: string; quality?: string }
): string {
  if (!publicIdOrUrl) return '';
  if (publicIdOrUrl.startsWith('data:') || publicIdOrUrl.startsWith('blob:')) {
    return publicIdOrUrl;
  }

  // If already full Cloudinary URL
  if (publicIdOrUrl.includes('cloudinary.com')) {
    // Insert transformation parameters if provided
    if (options?.width || options?.height) {
      const transformPart = `w_${options.width || 'auto'},h_${options.height || 'auto'},c_${
        options.crop || 'limit'
      },q_${options.quality || 'auto'},f_auto`;
      return publicIdOrUrl.replace('/upload/', `/upload/${transformPart}/`);
    }
    return publicIdOrUrl;
  }

  // If publicId was given
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return publicIdOrUrl;

  return cloudinary.url(publicIdOrUrl, {
    quality: options?.quality || 'auto:good',
    fetch_format: 'auto',
    width: options?.width,
    height: options?.height,
    crop: options?.crop || 'limit',
    secure: true,
  });
}
