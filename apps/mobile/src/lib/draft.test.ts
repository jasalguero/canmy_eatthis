import { MAX_PHOTOS, useDraftStore } from './draft';

describe('useDraftStore', () => {
  beforeEach(() => {
    useDraftStore.getState().reset();
  });

  it('adds and removes photos', () => {
    useDraftStore.getState().addPhoto('file://a.jpg');
    useDraftStore.getState().addPhoto('file://b.jpg');
    expect(useDraftStore.getState().photos).toEqual(['file://a.jpg', 'file://b.jpg']);

    useDraftStore.getState().removePhoto(0);
    expect(useDraftStore.getState().photos).toEqual(['file://b.jpg']);
  });

  it('never exceeds MAX_PHOTOS', () => {
    for (let i = 0; i < MAX_PHOTOS + 2; i++) {
      useDraftStore.getState().addPhoto(`file://${i}.jpg`);
    }
    expect(useDraftStore.getState().photos).toHaveLength(MAX_PHOTOS);
  });

  it('moves a photo left and right without losing any', () => {
    useDraftStore.getState().addPhoto('file://a.jpg');
    useDraftStore.getState().addPhoto('file://b.jpg');
    useDraftStore.getState().addPhoto('file://c.jpg');

    useDraftStore.getState().movePhoto(0, 1); // a moves right, past b
    expect(useDraftStore.getState().photos).toEqual([
      'file://b.jpg',
      'file://a.jpg',
      'file://c.jpg',
    ]);

    useDraftStore.getState().movePhoto(1, -1); // a moves back left
    expect(useDraftStore.getState().photos).toEqual([
      'file://a.jpg',
      'file://b.jpg',
      'file://c.jpg',
    ]);
  });

  it('does nothing when moving past either end', () => {
    useDraftStore.getState().addPhoto('file://a.jpg');
    useDraftStore.getState().addPhoto('file://b.jpg');

    useDraftStore.getState().movePhoto(0, -1);
    useDraftStore.getState().movePhoto(1, 1);
    expect(useDraftStore.getState().photos).toEqual(['file://a.jpg', 'file://b.jpg']);
  });

  it('reset clears species, description and photos back to defaults', () => {
    useDraftStore.getState().setSpecies('cat');
    useDraftStore.getState().setDescription('dark chocolate');
    useDraftStore.getState().addPhoto('file://a.jpg');

    useDraftStore.getState().reset();

    const state = useDraftStore.getState();
    expect(state.species).toBe('dog');
    expect(state.description).toBe('');
    expect(state.photos).toEqual([]);
  });
});
