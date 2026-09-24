import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = { component: Card, title: 'Surfaces/Card' };
export default meta;

export const Default: StoryObj<typeof Card> = {
  args: { title: 'Quarterly usage', body: 'Snapshots consumed this period.' },
};

export const Raised: StoryObj<typeof Card> = {
  args: { title: 'Raised', body: 'Elevated surface.', elevation: 2 },
};
