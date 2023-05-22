//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import type { Meta, StoryObj } from '@storybook/vue3'

import NeTitle from '../components/common/NeTitle.vue'

const meta = {
  title: 'NeTitle',
  component: NeTitle,
  tags: ['autodocs'],
  argTypes: {
    level: { control: 'inline-radio', options: ['h1', 'h2'] }
  },
  args: { level: 'h1' } // default values
} satisfies Meta<typeof NeTitle>

export default meta
type Story = StoryObj<typeof meta>

const template =
  '<NeTitle v-bind="args">Your sample title</NeTitle>\
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>'

export const Level1: Story = {
  render: (args) => ({
    components: { NeTitle },
    setup() {
      return { args }
    },
    template: template
  }),
  args: {
    level: 'h1'
  }
}

export const Level2: Story = {
  render: (args) => ({
    components: { NeTitle },
    setup() {
      return { args }
    },
    template: template
  }),
  args: {
    level: 'h2'
  }
}

export const Level3: Story = {
  render: (args) => ({
    components: { NeTitle },
    setup() {
      return { args }
    },
    template: template
  }),
  args: {
    level: 'h3'
  }
}
