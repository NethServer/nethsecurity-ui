import type { Meta, StoryObj } from '@storybook/vue3'

import NeButton from '../components/common/NeButton.vue'

const meta = {
  title: 'NeButton',
  component: NeButton,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    kind: { control: 'inline-radio', options: ['primary', 'secondary', 'tertiary', 'danger'] },
    onClick: { action: 'clicked' }
  },
  args: { kind: 'secondary', size: 'md', disabled: false } // default values
} satisfies Meta<typeof NeButton>

export default meta
type Story = StoryObj<typeof meta>
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/vue/api/csf
 * to learn how to use render functions.
 */
export const Secondary: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    kind: 'secondary'
  }
}

//// sample story with no need to specify the template:
// export const Secondary: Story = {
//   args: {
//     kind: 'secondary'
//   }
// }

export const Primary: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    kind: 'primary'
  }
}

export const Tertiary: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    kind: 'tertiary'
  }
}

export const Danger: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    kind: 'danger'
  }
}

export const ExtraLarge: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    size: 'xl'
  }
}

export const ExtraSmall: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    size: 'xs'
  }
}

export const Disabled: Story = {
  render: (args) => ({
    components: { NeButton },
    setup() {
      return { args }
    },
    template: '<NeButton v-bind="args">Button</NeButton>'
  }),
  args: {
    // ...Secondary.args, ////
    disabled: true
  }
}
