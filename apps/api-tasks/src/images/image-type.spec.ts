import { checkUpload, detectImageType, MAX_IMAGE_BYTES } from './image-type';

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

describe('image upload rules', () => {
  it('knows PNG, JPEG and WebP by their signature', () => {
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(JPEG)).toBe('image/jpeg');
    expect(detectImageType(WEBP)).toBe('image/webp');
  });

  it('refuses anything else, even when it looks like text or a script', () => {
    expect(checkUpload(Buffer.from('<svg onload="alert(1)"></svg>'))).toBe(
      'NOT_AN_IMAGE',
    );
    expect(checkUpload(Buffer.from('GIF89a......'))).toBe('NOT_AN_IMAGE');
  });

  it('refuses an empty file and one over 2 MB', () => {
    expect(checkUpload(Buffer.alloc(0))).toBe('EMPTY');
    expect(
      checkUpload(Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)])),
    ).toBe('TOO_BIG');
  });

  it('accepts a valid picture of the right size', () => {
    expect(checkUpload(PNG)).toBe('image/png');
  });
});
