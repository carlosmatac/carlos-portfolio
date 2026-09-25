import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOURNEY, stopProgress } from "../journey-timeline";
import DescentExperience from "../DescentExperience";

const sceneMock = vi.hoisted(() => ({
  render: vi.fn(), resize: vi.fn(), dispose: vi.fn(), fail: false, onContextLost: () => {},
}));
vi.mock("../create-descent", () => ({
  createDescent: (...args: [HTMLElement, () => void]) => {
    if (sceneMock.fail) throw new Error("WebGL unavailable");
    sceneMock.onContextLost = args[1];
    return sceneMock;
  },
}));

const pageHeight = JOURNEY.totalH * 1000;
let sectionHeight = pageHeight + 1000;
let now = 0, scrollY = stopProgress(0) * pageHeight, reduced = false;
let callback: FrameRequestCallback;
let motionChange: () => void;
beforeEach(() => {
  now = 0; scrollY = stopProgress(0) * pageHeight; reduced = false;
  sectionHeight = pageHeight + 1000;
  sceneMock.fail = false;
  sceneMock.render.mockClear(); sceneMock.resize.mockClear(); sceneMock.dispose.mockClear();
  history.replaceState(null, "", "/");
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(1000);
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => sectionHeight);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ top: -scrollY }) as DOMRect);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { callback = cb; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reduced; },
    addEventListener: (_event: string, listener: () => void) => { motionChange = listener; },
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(window, "scrollTo").mockImplementation((options: ScrollToOptions | number) => {
    if (typeof options !== "number") scrollY = Math.round(options.top ?? scrollY);
    window.dispatchEvent(new Event("scroll"));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function advance(ms: number) {
  act(() => {
    const end = now + ms;
    while (now < end) { now = Math.min(end, now + 16); callback(now); }
  });
}
async function mount() {
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(<DescentExperience />); });
  advance(16);
  return { ...view, stage: view.container.querySelector(".descent-viewport")! };
}

describe("Guided scroll integration", () => {
  it("lands once despite repeated wheel bursts, then permits a fresh reverse gesture", async () => {
    const { stage } = await mount();
    fireEvent.wheel(window, { deltaY: 14000 });
    advance(1200);
    fireEvent.wheel(window, { deltaY: 14000 });
    advance(4000);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(1), 4);
    fireEvent.wheel(window, { deltaY: -14000 });
    advance(5200);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(0), 4);
  });

  it("permits explicit city navigation and native scrollbar cancellation", async () => {
    const { container, stage } = await mount();
    fireEvent.click(container.querySelector('.journey-nav a[href="#madrid"]')!);
    advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("madrid");
    fireEvent.wheel(window, { deltaY: -500 });
    advance(500);
    scrollY = pageHeight * stopProgress(2);
    fireEvent.scroll(window);
    advance(4000);
    expect(stage.getAttribute("data-stop")).toBe("brno");
    expect(stage.getAttribute("data-travelling")).toBe("false");
  });

  it("consumes one vertical swipe while preserving pinch gestures", async () => {
    const { stage } = await mount();
    fireEvent.touchStart(stage, { touches: [{ clientX: 150, clientY: 500 }] });
    fireEvent.touchMove(stage, { touches: [{ clientX: 150, clientY: 350 }] });
    advance(5200);
    fireEvent.touchMove(stage, { touches: [{ clientX: 150, clientY: 50 }] });
    advance(5200);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    const pinch = new WheelEvent("wheel", { deltaY: 100, ctrlKey: true, cancelable: true });
    window.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(false);
  });

  it("leaves reduced-motion scrolling native and does not trap keyboard focus", async () => {
    reduced = true;
    const { stage, container } = await mount();
    const wheel = new WheelEvent("wheel", { deltaY: 1200, cancelable: true });
    window.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    scrollY = pageHeight * stopProgress(3);
    fireEvent.scroll(window);
    advance(16);
    expect(stage.getAttribute("data-stop")).toBe("munich");
    expect(container.querySelector('.journey-nav a[href="#munich"]')?.getAttribute("tabindex")).toBe("0");
  });
});

it("accepts a fresh gesture on the first frame after landing", async () => {
  const { stage } = await mount();
  fireEvent.wheel(window, { deltaY: 100 });
  advance(4816);
  expect(stage.getAttribute("data-travelling")).toBe("false");
  fireEvent.wheel(window, { deltaY: 100 });
  advance(100);
  expect(stage.getAttribute("data-travelling")).toBe("true");
  expect(scrollY / pageHeight).toBeGreaterThan(stopProgress(1));
});

describe("Timeline navigation and lifecycle", () => {
  it("jumps directly to Madrid under cover without sampling the intervening cities", async () => {
    const { container, stage } = await mount();
    fireEvent.click(container.querySelector('.journey-nav a[href="#madrid"]')!);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const previous = stage.getAttribute("data-stop");
      advance(16);
      seen.add(stage.getAttribute("data-stop")!);
      if (previous !== stage.getAttribute("data-stop")) expect((stage as HTMLElement).style.getPropertyValue("--seek-opacity")).toBe("1.0000");
    }
    expect([...seen]).toEqual(["st-louis", "madrid"]);
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(4), 4);
    expect(stage.getAttribute("data-travelling")).toBe("false");
  });

  it("covers a seek even when frames skip its intended midpoint, and lets a newer request win", async () => {
    const { container, stage } = await mount();
    fireEvent.click(container.querySelector('.journey-nav a[href="#madrid"]')!);
    act(() => { now += 1000; callback(now); });
    expect(stage.getAttribute("data-stop")).toBe("madrid");
    expect((stage as HTMLElement).style.getPropertyValue("--seek-opacity")).toBe("1.0000");
    fireEvent.click(container.querySelector('.journey-nav a[href="#brno"]')!);
    advance(600);
    expect(stage.getAttribute("data-stop")).toBe("brno");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(2), 4);
  });

  it("preserves normalized phase position on resize, both resting and during a flight", async () => {
    const { stage } = await mount();
    const arrival = JOURNEY.phases.find(p => p.kind === "arrival")!;
    scrollY = (arrival.startH + arrival.weightH / 2) / JOURNEY.totalH * pageHeight;
    fireEvent.scroll(window);
    advance(3000);
    const position = Number(stage.getAttribute("data-position"));
    sectionHeight = pageHeight / 2 + 1000;
    fireEvent.resize(window);
    advance(16);
    expect(Number(stage.getAttribute("data-position"))).toBeCloseTo(position, 5);
    expect(scrollY / (sectionHeight - 1000)).toBeCloseTo(position, 4);
    fireEvent.wheel(window, { deltaY: -100 });
    advance(1000);
    const travellingPosition = Number(stage.getAttribute("data-position"));
    sectionHeight = pageHeight + 1000;
    fireEvent.resize(window);
    expect(scrollY / pageHeight).toBeCloseTo(travellingPosition, 4);
    expect(stage.getAttribute("data-travelling")).toBe("true");
  });

  it("reverses a native scrub in the middle of the blend with no inherited city state", async () => {
    const { stage } = await mount();
    const arrival = JOURNEY.phases.find(p => p.kind === "arrival")!;
    const setArrival = (t: number) => {
      scrollY = (arrival.startH + arrival.weightH * t) / JOURNEY.totalH * pageHeight;
      fireEvent.scroll(window); advance(3000);
      return stage.getAttribute("data-city-blend");
    };
    const blend = setArrival(0.5);
    expect(Number(blend)).toBeGreaterThan(0);
    expect(Number(blend)).toBeLessThan(1);
    setArrival(0.7);
    expect(setArrival(0.5)).toBe(blend);
    expect(stage.getAttribute("data-travelling")).toBe("false");
  });

  it("keeps keys adjacent, ignores auto-repeat, and uses direct Home/End navigation", async () => {
    const { stage } = await mount();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    advance(4816);
    fireEvent.keyDown(window, { key: "ArrowDown", repeat: true });
    advance(16);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    fireEvent.keyDown(window, { key: "End" }); advance(600);
    expect(stage.getAttribute("data-stop")).toBe("madrid");
    fireEvent.keyDown(window, { key: "Home" }); advance(600);
    expect(stage.getAttribute("data-position")).toBe("0.000000");
  });

  it.each([[0, 12], [1, 1], [2, 1]])("normalizes wheel mode %i without changing travel duration", async (deltaMode, deltaY) => {
    const { stage } = await mount();
    fireEvent.wheel(window, { deltaMode, deltaY });
    advance(4816);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    expect(stage.getAttribute("data-travelling")).toBe("false");
  });

  it("pauses flights in a hidden tab and handles reduced motion changes in flight", async () => {
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const { stage } = await mount();
    fireEvent.wheel(window, { deltaY: 100 }); advance(1000);
    const position = stage.getAttribute("data-position");
    hidden = true; fireEvent(document, new Event("visibilitychange")); advance(10000);
    expect(stage.getAttribute("data-position")).toBe(position);
    hidden = false; fireEvent(document, new Event("visibilitychange")); advance(16);
    expect(stage.getAttribute("data-travelling")).toBe("true");
    reduced = true; act(() => motionChange()); advance(16);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(1), 4);
  });

  it("honors direct anchors and follows native hash navigation", async () => {
    history.replaceState(null, "", "#brno");
    const { stage } = await mount();
    expect(stage.getAttribute("data-stop")).toBe("brno");
    history.replaceState(null, "", "#st-louis");
    fireEvent(window, new Event("hashchange")); advance(600);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
    expect(stage.getAttribute("data-city-blend")).toBe("1.0000");
  });

  it.each(["unavailable", "lost"])("keeps HTML chapters and seeking usable when WebGL is %s", async failure => {
    sceneMock.fail = failure === "unavailable";
    const { stage, container } = await mount();
    if (failure === "lost") act(() => sceneMock.onContextLost());
    expect(stage.getAttribute("data-renderer")).toBe("fallback");
    fireEvent.click(container.querySelector('.journey-nav a[href="#madrid"]')!); advance(600);
    expect(stage.getAttribute("data-stop")).toBe("madrid");
    expect(container.querySelector('[aria-labelledby="madrid-title"]')?.getAttribute("aria-hidden")).toBe("false");
  });

  it("cleans up the renderer, input and animation on unmount", async () => {
    const { unmount } = await mount();
    unmount();
    expect(sceneMock.dispose).toHaveBeenCalledOnce();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    const wheel = new WheelEvent("wheel", { deltaY: 100, cancelable: true });
    window.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    const calls = sceneMock.render.mock.calls.length;
    advance(1000);
    expect(sceneMock.render).toHaveBeenCalledTimes(calls);
  });
});


describe("Earth observation stop", () => {
  it("lands on Earth after the first gesture and waits for another deliberate gesture", async () => {
    scrollY = 0;
    const { stage, container } = await mount();
    fireEvent.wheel(window, { deltaY: 14000 }); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
    expect(stage.getAttribute("data-phase")).toBe("earth-observe");
    expect(stage.getAttribute("data-city-blend")).toBe("0.0000");
    expect(container.querySelector('[aria-labelledby="st-louis-title"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector('.journey-nav a[href="#earth"]')?.getAttribute("aria-current")).toBe("step");
    advance(10000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
    fireEvent.wheel(window, { deltaY: 100 }); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
    fireEvent.wheel(window, { deltaY: -100 }); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
  });

  it("supports the Earth anchor, keyboard and an intro link that does not skip Earth", async () => {
    history.replaceState(null, "", "#earth");
    const { stage, container } = await mount();
    expect(stage.getAttribute("data-stop")).toBe("earth");
    expect(container.querySelector('.scroll-invitation')?.getAttribute("href")).toBe("#earth");
    fireEvent.keyDown(window, { key: "ArrowDown" }); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
    fireEvent.keyDown(window, { key: "ArrowUp" }); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
    history.replaceState(null, "", "#constructor");
    fireEvent(window, new Event("hashchange")); advance(600);
    expect(stage.getAttribute("data-stop")).toBe("earth");
  });
});


it("flies through clouds for adjacent Earth/city links instead of using the direct-seek fade", async () => {
  history.replaceState(null, "", "#earth");
  const { stage, container } = await mount();
  fireEvent.click(container.querySelector('.journey-nav a[href="#st-louis"]')!);
  advance(500);
  expect(stage.getAttribute("data-travelling")).toBe("true");
  expect((stage as HTMLElement).style.getPropertyValue("--seek-opacity")).toBe("0.0000");
  expect(stage.getAttribute("data-phase")).toBe("arrival");
  advance(5000);
  expect(stage.getAttribute("data-stop")).toBe("st-louis");
  fireEvent.click(container.querySelector('.journey-nav a[href="#earth"]')!); advance(500);
  expect((stage as HTMLElement).style.getPropertyValue("--seek-opacity")).toBe("0.0000");
  advance(5000);
  expect(stage.getAttribute("data-stop")).toBe("earth");
});
