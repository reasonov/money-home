import { driver, type Alignment, type Driver, type Side } from 'driver.js'
import { confirmAction } from '@/shared'
import 'driver.js/dist/driver.css'
import './tour.css'

let instance: Driver | null = null
let shownKey: string | null = null
let closing = false

export function destroyTourUi() {
  shownKey = null
  if (!instance) {
    return
  }
  const current = instance
  instance = null
  current.destroy()
}

function overlayUiOpen() {
  const menus = [...document.querySelectorAll('.n-base-select-menu, .n-date-panel')]
  return menus.some((el) => {
    if (!(el instanceof HTMLElement) || el.offsetHeight === 0 || el.offsetWidth === 0) {
      return false
    }
    return true
  })
}

function dockPopover(wrapper: HTMLElement, dock: 'bottom' | 'top') {
  const nav = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim() || '64px'
  const header = getComputedStyle(document.documentElement).getPropertyValue('--header-height').trim() || '56px'
  wrapper.style.left = '50%'
  wrapper.style.right = 'auto'
  wrapper.style.transform = 'translateX(-50%)'
  if (dock === 'top') {
    wrapper.style.bottom = 'auto'
    wrapper.style.top = `calc(${header} + env(safe-area-inset-top, 0px) + 12px)`
    return
  }
  wrapper.style.top = 'auto'
  wrapper.style.bottom = `calc(${nav} + env(safe-area-inset-bottom, 0px) + 12px)`
}

function clickTourTarget(selector: string) {
  const root = document.querySelector(selector)
  if (!(root instanceof HTMLElement)) {
    return
  }
  const target = root.matches('a, button') ? root : root.querySelector('a, button')
  if (target instanceof HTMLElement) {
    target.click()
  }
}

export function showTourHighlight(opts: {
  key: string
  selector: string
  title: string
  description: string
  showNext: boolean
  nextLabel?: string
  stepIndex: number
  stepTotal: number
  side?: Side
  align?: Alignment
  dock?: 'bottom' | 'top'
  onSkip: () => void
  onSkipStep?: () => void
  onNext?: () => void
  onTargetClick?: () => void
}) {
  if (shownKey === opts.key && instance?.isActive()) {
    return
  }

  destroyTourUi()
  shownKey = opts.key

  const finish = (action: () => void) => {
    destroyTourUi()
    action()
  }

  const buttons: Array<'next' | 'close'> = opts.showNext ? ['next', 'close'] : ['close']
  const popoverClass = [
    'mh-tour',
    opts.showNext ? '' : 'mh-tour--submit',
    opts.dock === 'bottom' ? 'mh-tour--dock mh-tour--dock-bottom' : '',
    opts.dock === 'top' ? 'mh-tour--dock mh-tour--dock-top' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const d = driver({
    animate: true,
    allowClose: true,
    allowKeyboardControl: true,
    overlayClickBehavior: () => undefined,
    overlayColor: '#0f172a',
    overlayOpacity: 0.45,
    stagePadding: 8,
    stageRadius: 12,
    popoverOffset: 12,
    popoverClass,
    disableActiveInteraction: false,
    waitForElement: 4000,
    skipMissingElement: false,
    showProgress: false,
    smoothScroll: true,
    prevBtnText: 'Назад',
    nextBtnText: opts.nextLabel ?? 'Далее',
    doneBtnText: opts.nextLabel ?? 'Готово',
    showButtons: buttons,
    disableButtons: ['previous'],
    onDestroyStarted: (_element, _step, { driver: current }) => {
      if (overlayUiOpen()) {
        return
      }
      if (closing) {
        return
      }
      closing = true
      void confirmAction({
        title: 'Закрыть подсказки?',
        message: 'Гайд можно снова включить в настройках.',
        confirmLabel: 'Закрыть',
        cancelLabel: 'Продолжить',
      }).then((ok) => {
        closing = false
        if (!ok) {
          return
        }
        current.destroy()
        instance = null
        shownKey = null
        opts.onSkip()
      })
    },
    onPopoverRender: (popover) => {
      popover.footer.style.display = 'flex'
      const progress = document.createElement('span')
      progress.className = 'mh-tour-progress'
      progress.textContent = `Шаг ${opts.stepIndex} из ${opts.stepTotal}`
      const skip = document.createElement('button')
      skip.type = 'button'
      skip.className = 'mh-tour-skip'
      skip.textContent = 'Пропустить'
      skip.addEventListener('click', () => {
        finish(() => opts.onSkipStep?.())
      })
      const host = popover.footerButtons ?? popover.footer
      host.prepend(skip)
      host.prepend(progress)
      requestAnimationFrame(() => {
        if (opts.dock && popover.wrapper) {
          dockPopover(popover.wrapper, opts.dock)
        }
      })
    },
    steps: [
      {
        element: opts.selector,
        advanceOnClick: Boolean(opts.onTargetClick),
        popover: {
          title: opts.title,
          description: opts.description,
          side: opts.side ?? 'bottom',
          align: opts.align ?? 'center',
          showButtons: buttons,
          disableButtons: ['previous'],
          showProgress: false,
          prevBtnText: 'Назад',
          nextBtnText: opts.nextLabel ?? 'Далее',
          doneBtnText: opts.nextLabel ?? 'Готово',
          onNextClick: () => {
            const selector = opts.selector
            const clickTarget = Boolean(opts.onTargetClick)
            finish(() => {
              if (clickTarget) {
                opts.onTargetClick?.()
                clickTourTarget(selector)
                return
              }
              opts.onNext?.()
            })
          },
        },
      },
    ],
  })

  instance = d
  d.drive(0)
}
