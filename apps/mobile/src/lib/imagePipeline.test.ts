import { ImageManipulator } from 'expo-image-manipulator';
import { Image } from 'react-native';
import { JPEG_QUALITY, computeResizeDimensions, processImage } from './imagePipeline';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));

describe('computeResizeDimensions', () => {
  it('scales down a landscape photo so the longest edge is 1024', () => {
    expect(computeResizeDimensions(4000, 3000)).toEqual({ width: 1024, height: 768 });
  });

  it('scales down a portrait photo so the longest edge is 1024', () => {
    expect(computeResizeDimensions(3000, 4000)).toEqual({ width: 768, height: 1024 });
  });

  it('never upscales an already-small image', () => {
    expect(computeResizeDimensions(400, 300)).toEqual({ width: 400, height: 300 });
  });

  it('leaves a square image exactly at the cap untouched', () => {
    expect(computeResizeDimensions(1024, 1024)).toEqual({ width: 1024, height: 1024 });
  });
});

describe('processImage', () => {
  it('resizes to the computed target and saves as JPEG at the fixed quality', async () => {
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(4000, 2000));

    const saveAsync = jest
      .fn()
      .mockResolvedValue({ uri: 'file://processed.jpg', width: 1024, height: 512 });
    const renderAsync = jest.fn().mockResolvedValue({ saveAsync });
    const resize = jest.fn().mockReturnValue({ renderAsync });
    jest.mocked(ImageManipulator.manipulate).mockReturnValue({ resize } as never);

    const result = await processImage('file://original.jpg');

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file://original.jpg');
    expect(resize).toHaveBeenCalledWith({ width: 1024, height: 512 });
    expect(saveAsync).toHaveBeenCalledWith({ compress: JPEG_QUALITY, format: 'jpeg' });
    expect(result).toEqual({ uri: 'file://processed.jpg', width: 1024, height: 512 });
  });
});
