import React from 'react';
import { ThemeProvider } from '../src/theme/ThemeProvider';

export const decorators = [
  (Story) => React.createElement(ThemeProvider, { mode: 'light' }, React.createElement(Story)),
];

export const parameters = { layout: 'centered' };
