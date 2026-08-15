import { driver, type Alignment, type Driver, type Side } from 'driver.js'
import { confirmAction } from '@/shared'
import 'driver.js/dist/driver.css'
import './tour.css'

let instance: Driver | null = null
let shownKey: string | null = null
let closing = false
let clickHandler: ((event: Event) => void) | null = null

function unbindClick() {
  if (!clickHandler) {
    return
  }
  document.removeEventListener('click', clickHandler, true)
  clickHandler = null
}

export function destroyTourUi() {
  shownKey = null
  unbindClick()
  if (!instance) {
    return
  }
  const current = instance
  instance = null
  current.destroy()
}

function isTourChrome(target: EventTarget | null, selector: string) {
  return target instanceof Element && Boolean(target.closest(selector))
}

function isBlockedUi(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }
  return Boolean(
    target.closest('.n-modal-container, .n-dialog, .n-dialog-container, .n-modal-mask'),
  )
}

export function showTourHighlight(opts: {
  key: string
  selector: string
  title: string
  description: string
  showPrev: boolean
  nextLabel?: string
  stepIndex: number
  stepTotal: number
  side?: Side
  align?: Alignment
  onSkip: () => void
  onNext: () => void
  onPrev?: () => void
}) {
  if (shownKey === opts.key && instance?.isActive()) {
    return
  }

  destroyTourUi()
  shownKey = opts.key

  let busy = false
  const finish = (action: () => void) => {
    if (busy) {
      return
    }
    busy = true
    destroyTourUi()
    action()
  }

  const buttons: Array<'next' | 'previous' | 'close'> = opts.showPrev
    ? ['previous', 'next', 'close']
    : ['next', 'close']

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
    popoverClass: 'mh-tour',
    disableActiveInteraction: true,
    waitForElement: 4000,
    skipMissingElement: false,
    showProgress: false,
    smoothScroll: true,
    prevBtnText: 'Назад',
    nextBtnText: opts.nextLabel ?? 'Далее',
    doneBtnText: opts.nextLabel ?? 'Готово',
    showButtons: buttons,
    disableButtons: opts.showPrev ? [] : ['previous'],
    onDestroyStarted: (_element, _step, { driver: current }) => {
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
        unbindClick()
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
      const host = popover.footerButtons ?? popover.footer
      host.prepend(progress)
    },
    steps: [
      {
        element: opts.selector,
        popover: {
          title: opts.title,
          description: opts.description,
          side: opts.side ?? 'bottom',
          align: opts.align ?? 'center',
          showButtons: buttons,
          disableButtons: opts.showPrev ? [] : ['previous'],
          showProgress: false,
          prevBtnText: 'Назад',
          nextBtnText: opts.nextLabel ?? 'Далее',
          doneBtnText: opts.nextLabel ?? 'Готово',
          onNextClick: () => {
            finish(() => opts.onNext())
          },
          onPrevClick: () => {
            finish(() => opts.onPrev?.())
          },
        },
      },
    ],
  })

  instance = d
  d.drive(0)

  clickHandler = (event: Event) => {
    if (closing || busy) {
      return
    }
    const target = event.target
    if (isBlockedUi(target)) {
      return
    }
    if (isTourChrome(target, '.driver-popover-close-btn')) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    if (isTourChrome(target, '.driver-popover-prev-btn')) {
      finish(() => opts.onPrev?.())
      return
    }
    finish(() => opts.onNext())
  }
  document.addEventListener('click', clickHandler, true)
}
