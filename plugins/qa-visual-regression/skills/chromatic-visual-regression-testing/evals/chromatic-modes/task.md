# Check every component in light and dark on mobile and desktop

## Problem Description

Set up Chromatic so every component is checked in light and dark themes on mobile and desktop (`docs/request.md`). Update the Storybook files.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/Button.stories.tsx ===============
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: { chromatic: { viewports: [320, 1200] } },
};
export default meta;
export const Primary: StoryObj<typeof Button> = { args: { children: 'Buy now', variant: 'primary' } };

=============== FILE: .storybook/preview.ts ===============
import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    viewport: {
      options: {
        small: { name: 'Small', styles: { width: '375px', height: '800px' } },
        large: { name: 'Large', styles: { width: '1280px', height: '900px' } },
      },
    },
  },
  decorators: [withThemeByClassName({ themes: { light: 'light', dark: 'dark' }, defaultTheme: 'light' })],
};
export default preview;

=============== FILE: docs/request.md ===============
Design wants every component checked in light and dark theme, on a phone-size and a desktop-size
viewport, with dark-mode changes approved separately from light-mode ones. We use Storybook 9.
