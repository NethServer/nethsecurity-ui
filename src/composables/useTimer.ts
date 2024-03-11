//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { onUnmounted, ref } from 'vue'

export type TimerOptions = {
  duration: number
  progressStep: number
  onProgressStep?: (currentProgress: number) => void
  onTimerFinish?: () => void
}

/**
 * Composable that enables the creation of a timer, at the end of which an action is executed.
 * @param {Object} timerOptions - An object containing the options associated to the timer
 * @param {number} timerOptions.duration - Contains the duration of the timer
 * @param {number} timerOptions.progressStep - Contains the progress step, which defines how often the progress is updated.
 * This parameter is specified as a number greater than 0 and less or equal than 100
 * @param {(currentProgress: number) => void} [timerOptions.onProgressStep] - If present, this callback function
 * will be executed every time the progress is updated
 * @param {() => void} [timerOptions.onTimerFinish] - If present, this callback function will be executed
 * when the timer ends
 */
export function useTimer({ duration, progressStep, onProgressStep, onTimerFinish }: TimerOptions) {
  const timerIntervalRef = ref<number | undefined>()
  const timeTimeoutRef = ref<number | undefined>()
  const currentProgress = ref<number>(0)

  function startTimer() {
    timeTimeoutRef.value = setTimeout(onTimerFinish ?? (() => {}), duration)

    timerIntervalRef.value = setInterval(() => {
      currentProgress.value += progressStep
      onProgressStep?.(currentProgress.value)
    }, (duration * progressStep) / 100)
  }

  function clearTimer() {
    if (timeTimeoutRef.value) {
      clearTimeout(timeTimeoutRef.value)
    }
    if (timerIntervalRef.value) {
      clearInterval(timerIntervalRef.value)
    }
    currentProgress.value = 0
  }

  onUnmounted(() => {
    clearTimer()
  })

  return { startTimer, clearTimer, currentProgress }
}
