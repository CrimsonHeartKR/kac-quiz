import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import defaultTheme from '../themes/default.json'

export interface ThemeConfig {
  name: string
  primaryColor: string
  accentColor: string
  bgColor: string
  bgSecondary: string
  logoUrl: string
  eventName: string
  fontTitle: string
  fontBody: string

  // Answer button colors
  btnA: string
  btnB: string
  btnC: string
  btnD: string

  // Timer colors
  timerSafe: string
  timerWarn: string
  timerDanger: string

  // Feedback colors
  correct: string
  incorrect: string

  // Medal colors
  medalGold: string
  medalSilver: string
  medalBronze: string

  // UI layer colors
  overlayColor: string
  cardBg: string
  cardBorder: string

  // Per-screen background images
  bgImageJoin: string
  bgImageWait: string
  bgImagePlay: string
  bgImageResult: string
  bgImageProjector: string

  // Lottie animation URLs (4단계)
  lottieTimer: string
  lottieCorrect: string
  lottieIncorrect: string
  lottieCelebration: string

  // Button style preset
  buttonPreset: string
}

/** CSS variable mapping: ThemeConfig key → CSS variable name */
const CSS_VAR_MAP: Partial<Record<keyof ThemeConfig, string>> = {
  primaryColor: '--primary',
  accentColor: '--accent',
  bgColor: '--bg',
  bgSecondary: '--bg-secondary',
  fontTitle: '--font-title',
  fontBody: '--font-body',
  btnA: '--btn-a',
  btnB: '--btn-b',
  btnC: '--btn-c',
  btnD: '--btn-d',
  timerSafe: '--timer-safe',
  timerWarn: '--timer-warn',
  timerDanger: '--timer-danger',
  correct: '--correct',
  incorrect: '--incorrect',
  medalGold: '--medal-gold',
  medalSilver: '--medal-silver',
  medalBronze: '--medal-bronze',
  overlayColor: '--overlay',
  cardBg: '--card-bg',
  cardBorder: '--card-border',
}

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement.style
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = theme[key as keyof ThemeConfig]
    if (value && cssVar) {
      root.setProperty(cssVar, value)
    }
  }
}

/** Helper: get button colors array from theme */
export function getButtonColors(theme: ThemeConfig) {
  return [
    { bg: theme.btnA, label: 'A' },
    { bg: theme.btnB, label: 'B' },
    { bg: theme.btnC, label: 'C' },
    { bg: theme.btnD, label: 'D' },
  ]
}

/** Helper: timer color based on remaining ratio */
export function getTimerColor(theme: ThemeConfig, ratio: number): string {
  if (ratio > 0.5) return theme.timerSafe
  if (ratio > 0.2) return theme.timerWarn
  return theme.timerDanger
}

export const DEFAULT_THEME = defaultTheme as ThemeConfig

export function useTheme(quizSetId?: string) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME)

  useEffect(() => {
    if (!quizSetId) {
      applyTheme(DEFAULT_THEME)
      return
    }

    async function loadTheme() {
      const { data } = await supabase
        .from('quiz_sets')
        .select('theme_config')
        .eq('id', quizSetId)
        .single()

      if (data?.theme_config && Object.keys(data.theme_config).length > 0) {
        const merged = { ...DEFAULT_THEME, ...data.theme_config } as ThemeConfig
        setTheme(merged)
        applyTheme(merged)
      } else {
        applyTheme(DEFAULT_THEME)
      }
    }

    loadTheme()
  }, [quizSetId])

  return theme
}
