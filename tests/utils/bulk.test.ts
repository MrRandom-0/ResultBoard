import { describe, it, expect } from 'vitest';
import { applyTagIds, tagChangeApplies } from '../../src/utils/bulk';

describe('applyTagIds', () => {
  it('adds new tags preserving order', () => {
    expect(applyTagIds(['a'], ['b', 'c'], 'add')).toEqual(['a', 'b', 'c']);
  });

  it('does not duplicate tags that are already present', () => {
    expect(applyTagIds(['a', 'b'], ['b', 'c'], 'add')).toEqual(['a', 'b', 'c']);
  });

  it('dedupes duplicates inside the inputs', () => {
    expect(applyTagIds(['a', 'a'], ['a', 'b', 'b'], 'add')).toEqual(['a', 'b']);
  });

  it('removes only the listed tags', () => {
    expect(applyTagIds(['a', 'b', 'c'], ['b'], 'remove')).toEqual(['a', 'c']);
  });

  it('removing an absent tag is a no-op', () => {
    expect(applyTagIds(['a'], ['zzz'], 'remove')).toEqual(['a']);
  });

  it('adding an empty list is a no-op', () => {
    expect(applyTagIds(['a'], [], 'add')).toEqual(['a']);
  });
});

describe('tagChangeApplies', () => {
  it('is true when add would change the list', () => {
    expect(tagChangeApplies(['a'], ['b'], 'add')).toBe(true);
  });

  it('is false when every added tag is already present', () => {
    expect(tagChangeApplies(['a', 'b'], ['a'], 'add')).toBe(false);
  });

  it('is true when remove would change the list', () => {
    expect(tagChangeApplies(['a', 'b'], ['b'], 'remove')).toBe(true);
  });

  it('is false when removing tags the record does not have', () => {
    expect(tagChangeApplies(['a'], ['b'], 'remove')).toBe(false);
  });
});
