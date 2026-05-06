import { describe, expect, it } from 'vitest';
import { BREAKPOINTS_PX } from './breakpoints';

describe('BREAKPOINTS_PX', () => {
  it('matches UX spec Tailwind-style defaults', () => {
    expect(BREAKPOINTS_PX).toEqual({
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    });
  });
});
