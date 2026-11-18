import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: { chromatic: { viewports: [320, 1200] } },
};
export default meta;
export const Primary: StoryObj<typeof Button> = { args: { children: 'Buy now', variant: 'primary' } };
