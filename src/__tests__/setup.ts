import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom no implementa IntersectionObserver, del que dependen useActiveSection
// y las animaciones de framer-motion al entrar en viewport.
class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe(): void { }
    unobserve(): void { }
    disconnect(): void { }
    takeRecords(): IntersectionObserverEntry[] { return [] }
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)

// matchMedia tampoco existe en jsdom; lo usan el fondo reactivo y Section.
vi.stubGlobal(
    'matchMedia',
    (query: string) =>
    ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        addListener: () => { },
        removeListener: () => { },
        dispatchEvent: () => false,
    } as unknown as MediaQueryList)
)
