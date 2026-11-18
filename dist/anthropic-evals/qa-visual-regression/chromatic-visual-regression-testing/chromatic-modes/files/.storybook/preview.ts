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
