import { useEffect } from 'react';
import type { AnimationSpeed, FontSize, Theme } from '../models/types';

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '13px',
  medium: '14px',
  large: '16px'
};

const ANIMATION_MULTIPLIER: Record<AnimationSpeed, string> = {
  none: '0',
  reduced: '0.5',
  normal: '1'
};

export function useTheme(
  theme: Theme | undefined,
  fontSize?: FontSize,
  accentColor?: string,
  animationSpeed?: AnimationSpeed
): void {
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme =
        theme === 'system'
          ? matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : theme;
    };
    apply();
    const query = matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    if (!fontSize) return;
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZE_MAP[fontSize]);
  }, [fontSize]);

  useEffect(() => {
    if (!accentColor) return;
    document.documentElement.style.setProperty('--accent-override', accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!animationSpeed) return;
    const multiplier = ANIMATION_MULTIPLIER[animationSpeed];
    document.documentElement.style.setProperty('--animation-speed', multiplier);
    if (animationSpeed === 'none') {
      document.documentElement.style.setProperty('--transition-fast', '0s');
      document.documentElement.style.setProperty('--transition-normal', '0s');
      document.documentElement.style.setProperty('--transition-spring', '0s');
    } else if (animationSpeed === 'reduced') {
      document.documentElement.style.setProperty('--transition-fast', '0.08s cubic-bezier(0.4, 0, 0.2, 1)');
      document.documentElement.style.setProperty('--transition-normal', '0.12s cubic-bezier(0.4, 0, 0.2, 1)');
      document.documentElement.style.setProperty('--transition-spring', '0.18s cubic-bezier(0.34, 1.56, 0.64, 1)');
    } else {
      document.documentElement.style.removeProperty('--transition-fast');
      document.documentElement.style.removeProperty('--transition-normal');
      document.documentElement.style.removeProperty('--transition-spring');
    }
  }, [animationSpeed]);
}
