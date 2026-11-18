import type { Meta, StoryObj } from '@storybook/react';
import { RecentActivity } from './RecentActivity';

const meta: Meta<typeof RecentActivity> = { component: RecentActivity };
export default meta;

export const Default: StoryObj<typeof RecentActivity> = {
  args: {
    items: [
      { user: 'Ana', action: 'commented', at: new Date() },               // renders "just now", "3 minutes ago"...
      { user: 'Ben', action: 'merged a PR', at: new Date(Date.now() - 36e5) },
    ],
    avatarColor: () => `hsl(${Math.floor(Math.random() * 360)} 70% 50%)`,
  },
};
