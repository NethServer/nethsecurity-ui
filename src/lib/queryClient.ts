//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { QueryClient } from '@tanstack/vue-query'

// Shared with VueQueryPlugin so the router guards can use the same cache as the components
export const queryClient = new QueryClient()
