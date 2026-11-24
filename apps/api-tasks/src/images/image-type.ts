/** The pictures a store may upload, and the limits. Pure rules, so they can be tested without a server. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/**
 * The real type of the bytes, read from the file signature. The type the browser declares is never trusted:
 * a file that is not one of the three formats is refused even when it claims to be a picture.
 */
export function detectImageType(data: Buffer): ImageType | null {
  if (
    data.length > 8 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return 'image/png';
  }
  if (
    data.length > 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    data.length > 12 &&
    data.subarray(0, 4).toString('ascii') === 'RIFF' &&
    data.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export type UploadProblem = 'EMPTY' | 'TOO_BIG' | 'NOT_AN_IMAGE';

export function checkUpload(data: Buffer): UploadProblem | ImageType {
  if (data.length === 0) return 'EMPTY';
  if (data.length > MAX_IMAGE_BYTES) return 'TOO_BIG';
  return detectImageType(data) ?? 'NOT_AN_IMAGE';
}

export const UPLOAD_MESSAGES: Record<UploadProblem, string> = {
  EMPTY: 'The file is empty',
  TOO_BIG: 'The picture must be 2 MB or smaller',
  NOT_AN_IMAGE: 'Only PNG, JPEG or WebP pictures are accepted',
};
