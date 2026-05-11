# @nethesis/vue-components — Full Export Reference

Source: https://github.com/nethesis/vue-components  
Storybook: https://nethesis.github.io/vue-components

## Components

| Component               | Notes                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| `NeAvatar`              | User avatar with image, initials, or placeholder slot                       |
| `NeBadgeV2`             | Status/label badge — **use this, not the deprecated `NeBadge`**             |
| `NeButton`              | All button variants (primary, secondary, danger, ghost)                     |
| `NeCard`                | Content card container                                                      |
| `NeCheckbox`            | Checkbox with label and error state                                         |
| `NeCombobox`            | Searchable select/dropdown; accepts `NeComboboxOption[]`                    |
| `NeDropdown`            | Action dropdown menu; accepts `NeDropdownItem[]`                            |
| `NeDropdownFilter`      | Filter dropdown with multi-select; accepts `FilterOption[]`                 |
| `NeEmptyState`          | Empty-state placeholder with icon + text                                    |
| `NeExpandable`          | Expandable/collapsible content section                                      |
| `NeFileInput`           | File upload input                                                           |
| `NeFormItemLabel`       | Label for form fields (wraps `<label>`)                                     |
| `NeHeading`             | Semantic heading (h1–h6) with consistent style                              |
| `NeInlineNotification`  | Inline alert banner (info/success/warning/error)                            |
| `NeLink`                | Styled anchor/router-link                                                   |
| `NeListbox`             | Non-searchable select; accepts `NeListboxOption[]`                          |
| `NeModal`               | Modal dialog with configurable buttons                                      |
| `NePaginator`           | Pagination controls                                                         |
| `NeProgressBar`         | Progress bar                                                                |
| `NeRadioSelection`      | Radio button group; accepts `RadioOption[]`                                 |
| `NeRoundedIcon`         | Circular icon container                                                     |
| `NeSideDrawer`          | Slide-in side panel                                                         |
| `NeSkeleton`            | Skeleton loading placeholder                                                |
| `NeSortDropdown`        | Sort order dropdown                                                         |
| `NeStepper`             | Step progress indicator                                                     |
| `NeSpinner`             | Loading spinner                                                             |
| `NeTabs`                | Tab navigation; accepts `Tab[]`                                             |
| `NeTextArea`            | Multi-line text input                                                       |
| `NeTextInput`           | Single-line text input with label and validation                            |
| `NeToggle`              | Toggle switch                                                               |
| `NeTooltip`             | Tooltip wrapper                                                             |
| `NeToastNotificationV2` | Toast notification — **use this, not the deprecated `NeToastNotification`** |

## Types

| Type                                                | Source                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NeComboboxOption`                                  | `{ id: string; label: string; description?: string; icon?: IconDefinition; disabled?: boolean }` |
| `Tab`                                               | Tab item for `NeTabs`                                                                            |
| `NeNotificationV2`                                  | Notification object for `NeToastNotificationV2`                                                  |
| `NeListboxOption`                                   | Option for `NeListbox`                                                                           |
| `NeDropdownItem`                                    | Item for `NeDropdown`                                                                            |
| `FilterOption` / `FilterOptionGroup` / `FilterKind` | For `NeDropdownFilter`                                                                           |
| `RadioOption`                                       | For `NeRadioSelection`                                                                           |
| `SortEvent`                                         | Emitted by `NeTableHeadCell` on sort                                                             |
| `ModalKind` / `PrimaryButtonKind` / `ModalSize`     | For `NeModal`                                                                                    |
| `AvatarSize`                                        | For `NeAvatar`                                                                                   |
| `NeBadgeV2Kind`                                     | For `NeBadgeV2`                                                                                  |

## Utility Functions

```ts
import {
  sortByProperty,        // sort array of objects by a key
  focusElement,          // focus a DOM element by ref or selector
  getAxiosErrorMessage,  // map Axios error → i18n key string
  byteFormat1024,        // format bytes (1024-based, e.g. KiB)
  byteFormat1000,        // format bytes (1000-based, e.g. KB)
  kbpsFormat             // format kbps bandwidth value
} from '@nethesis/vue-components'
```

## Date/Time Functions

```ts
import {
  formatDateLoc,         // format date in user locale
  formatInTimeZoneLoc,   // format date in a specific time zone
  getDateFnsLocale,      // get date-fns locale object
  formatDurationLoc,     // format a duration
  humanDistanceToNowLoc  // "X minutes ago" style relative time
} from '@nethesis/vue-components'
```

## Storage Functions

```ts
import {
  saveToStorage,         // localStorage.setItem wrapper
  getJsonFromStorage,    // parse JSON from localStorage
  getStringFromStorage,  // get raw string from localStorage
  deleteFromStorage,     // localStorage.removeItem wrapper
  savePreference,        // save a user UI preference
  getPreference          // retrieve a user UI preference
} from '@nethesis/vue-components'
```

## Composables

```ts
import { useItemPagination } from '@nethesis/vue-components'  // client-side pagination
import { useSort } from '@nethesis/vue-components'             // sort state management
```

## Deprecated (Do Not Use)

| Deprecated            | Use Instead             |
| --------------------- | ----------------------- |
| `NeBadge`             | `NeBadgeV2`             |
| `NeToastNotification` | `NeToastNotificationV2` |
| `NeNotification` type | `NeNotificationV2` type |
