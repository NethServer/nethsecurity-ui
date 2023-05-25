<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import { useThemeStore } from '@/stores/theme'

const navigation = [
  { name: 'Dashboard', href: '#', icon: 'home', current: true },
  { name: 'System', href: '#', icon: 'server', current: false },
  { name: 'Network', href: '#', icon: 'network-wired', current: false },
  { name: 'Users & objects', href: '#', icon: 'user-group', current: false },
  { name: 'Firewall', href: '#', icon: 'fire', current: false },
  { name: 'Security', href: '#', icon: 'shield-halved', current: false },
  { name: 'VPN', href: '#', icon: 'globe', current: false },
  { name: 'Log', href: '#', icon: 'list', current: false },
  { name: 'Report', href: '#', icon: 'chart-line', current: false }
]

const userNavigation = [
  { name: 'Your profile', href: '#' },
  { name: 'Sign out', href: '#' }
]

const sidebarOpen = ref(false)

const themeStore = useThemeStore()
</script>

<!-- //// review -->

<template>
  <div>
    <!-- sidebar for mobile  -->
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <font-awesome-icon
                      :icon="['fas', 'xmark']"
                      class="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </TransitionChild>
              <!-- Sidebar component, swap this element with another sidebar if you like -->
              <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div class="flex h-16 shrink-0 items-center">
                  <img
                    class="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/mark.svg?color=cyan&shade=600"
                    alt="Your Company"
                  />
                </div>
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="-mx-2 space-y-1">
                        <li v-for="item in navigation" :key="item.name">
                          <a
                            :href="item.href"
                            :class="[
                              item.current
                                ? 'text-gray-900'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                              'group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            ]"
                          >
                            <font-awesome-icon
                              :icon="['fas', item.icon]"
                              class="h-6 w-6 shrink-0"
                              aria-hidden="true"
                            />
                            {{ item.name }}
                          </a>
                        </li>
                      </ul>
                    </li>
                    <!-- <li> //// 
                      <div class="text-xs font-semibold leading-6 text-gray-400">Your teams</div>
                      <ul role="list" class="-mx-2 mt-2 space-y-1">
                        <li v-for="team in teams" :key="team.name">
                          <a
                            :href="team.href"
                            :class="[
                              team.current
                                ? 'bg-gray-50 text-primary-600'
                                : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            ]"
                          >
                            <span
                              :class="[
                                team.current
                                  ? 'text-primary-600 border-primary-600'
                                  : 'text-gray-400 border-gray-200 group-hover:border-primary-600 group-hover:text-primary-600',
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                              ]"
                              >{{ team.initial }}</span
                            >
                            <span class="truncate">{{ team.name }}</span>
                          </a>
                        </li>
                      </ul>
                    </li> -->
                    <li class="mt-auto">
                      <a
                        href="#"
                        class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                      >
                        Settings
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <!-- Sidebar component, swap this element with another sidebar if you like -->
      <div
        class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4"
      >
        <div class="flex h-16 shrink-0 items-center">
          <img
            class="h-8 w-auto"
            src="https://tailwindui.com/img/logos/mark.svg?color=cyan&shade=600"
            alt="Your Company"
          />
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-2">
                <li v-for="item in navigation" :key="item.name">
                  <a
                    :href="item.href"
                    :class="[
                      item.current
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      'group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    ]"
                  >
                    <font-awesome-icon
                      :icon="['fas', item.icon]"
                      class="h-6 w-6 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{{ item.name }}</span>
                  </a>
                </li>
              </ul>
            </li>
            <!-- <li> //// 
              <div class="text-xs font-semibold leading-6 text-gray-400">Your teams</div>
              <ul role="list" class="-mx-2 mt-2 space-y-1">
                <li v-for="team in teams" :key="team.name">
                  <a
                    :href="team.href"
                    :class="[
                      team.current
                        ? 'bg-gray-50 text-primary-600'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    ]"
                  >
                    <span
                      :class="[
                        team.current
                          ? 'text-primary-600 border-primary-600'
                          : 'text-gray-400 border-gray-200 group-hover:border-primary-600 group-hover:text-primary-600',
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                      ]"
                      >{{ team.initial }}</span
                    >
                    <span class="truncate">{{ team.name }}</span>
                  </a>
                </li>
              </ul>
            </li> -->
            <li class="mt-auto">
              <a
                href="#"
                class="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-600"
              >
                Settings
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div class="lg:pl-72">
      <div
        class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8"
      >
        <button
          type="button"
          class="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">Open sidebar</span>
          <font-awesome-icon :icon="['fas', 'bars']" class="h-6 w-6 shrink-0" aria-hidden="true" />
        </button>

        <!-- Separator -->
        <div class="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

        <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <form class="relative flex flex-1" action="#" method="GET">
            <label for="search-field" class="sr-only">Search</label>
            <font-awesome-icon
              :icon="['fas', 'magnifying-glass']"
              class="pointer-events-none absolute inset-y-0 left-0 h-full text-gray-600 w-4"
              aria-hidden="true"
            />
            <input
              id="search-field"
              class="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-600 focus:ring-0 sm:text-sm"
              placeholder="Search"
              type="search"
              name="search"
            />
            <!-- <div class="flex gap-3 items-center"> //// move
              <font-awesome-icon
                :icon="['fas', 'life-ring']"
                class="text-gray-700 w-5 h-5"
                aria-hidden="true"
              />
              <span>Help</span>
            </div> -->
          </form>
          <div class="flex items-center gap-x-4 lg:gap-x-6">
            <!-- help -->
            <button
              type="button"
              class="-m-2.5 p-2.5 flex items-center gap-3 text-gray-600 hover:text-gray-900"
            >
              <font-awesome-icon
                :icon="['fas', 'life-ring']"
                class="h-6 w-6 shrink-0"
                aria-hidden="true"
              />
              <span>Help</span>
            </button>

            <!-- Separator -->
            <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

            <!-- theme switcher -->
            <button
              type="button"
              @click="themeStore.toggleTheme()"
              class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900"
            >
              <span class="sr-only">Toggle theme</span>
              <!-- //// use sun icon on dark theme -->
              <font-awesome-icon
                :icon="['far', 'moon']"
                class="h-6 w-6 shrink-0"
                aria-hidden="true"
              />
            </button>

            <!-- notifications -->
            <button type="button" class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900">
              <span class="sr-only">View notifications</span>
              <font-awesome-icon
                :icon="['far', 'bell']"
                class="h-6 w-6 shrink-0"
                aria-hidden="true"
              />
            </button>

            <!-- Profile dropdown -->
            <Menu as="div" class="relative">
              <MenuButton class="-m-1.5 flex items-center p-1.5 text-gray-600 hover:text-gray-900">
                <span class="sr-only">Open user menu</span>
                <font-awesome-icon
                  :icon="['fas', 'circle-user']"
                  class="h-6 w-6 shrink-0"
                  aria-hidden="true"
                />
                <!-- <img //// 
                  class="h-8 w-8 rounded-full bg-gray-50"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                /> -->
                <span class="hidden lg:flex lg:items-center">
                  <!-- <span //// 
                    class="ml-4 text-sm font-semibold leading-6 text-gray-900"
                    aria-hidden="true"
                    >Tom Cook</span
                  > -->
                  <font-awesome-icon
                    :icon="['fas', 'chevron-down']"
                    class="ml-2 h-3 w-3 shrink-0"
                    aria-hidden="true"
                  />
                </span>
              </MenuButton>
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none"
                >
                  <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                    <a
                      :href="item.href"
                      :class="[
                        active ? 'bg-gray-50' : '',
                        'block px-3 py-1 text-sm leading-6 text-gray-900'
                      ]"
                      >{{ item.name }}</a
                    >
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>

      <main class="py-10">
        <div class="px-4 sm:px-6 lg:px-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
