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
let now = 0, scrollY = stopProgress(0) * pageHeight, reduced = false, coarse = false;
let callback: FrameRequestCallback;
let motionChange: () => void;
beforeEach(() => {
  now = 0; scrollY = stopProgress(0) * pageHeight; reduced = false; coarse = false;
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
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return query.includes("reduced-motion") ? reduced : query.includes("coarse") ? coarse : false; },
    addEventListener: (_event: string, listener: () => void) => { if (query.includes("reduced-motion")) motionChange = listener; },
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

  it("never blocks a touch, and completes a swipe to the next station once it comes to rest", async () => {
    const { stage } = await mount();
    const swipe = (toH: number) => {
      const start = new TouchEvent("touchstart", { bubbles: true, cancelable: true });
      stage.dispatchEvent(start);
      const move = new TouchEvent("touchmove", { bubbles: true, cancelable: true });
      stage.dispatchEvent(move);
      expect([start.defaultPrevented, move.defaultPrevented]).toEqual([false, false]);
      scrollY = Math.round(pageHeight * toH / JOURNEY.totalH);
      fireEvent.scroll(window);
      fireEvent.touchEnd(stage);
      advance(7000);
      return stage.getAttribute("data-stop");
    };
    // A short swipe leaves St. Louis; the journey carries on to Granada.
    expect(swipe(JOURNEY.anchors["st-louis"] + 1)).toBe("granada");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(1), 3);
    // A short swipe back returns to St. Louis.
    expect(swipe(JOURNEY.anchors.granada - 1)).toBe("st-louis");
    expect(scrollY / pageHeight).toBeCloseTo(stopProgress(0), 3);
    // Coming to rest on a station needs nothing more.
    expect(swipe(JOURNEY.anchors.brno)).toBe("brno");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    const pinch = new WheelEvent("wheel", { deltaY: 100, ctrlKey: true, cancelable: true });
    window.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(false);
  });

  it("gives a touch-started flight back to the finger, and ignores the browser's small scroll corrections", async () => {
    const { stage } = await mount();
    fireEvent.touchStart(window);
    scrollY = Math.round(pageHeight * (JOURNEY.anchors["st-louis"] + 1) / JOURNEY.totalH);
    fireEvent.scroll(window);
    fireEvent.touchEnd(window);
    advance(1500);
    expect(stage.getAttribute("data-travelling")).toBe("true");
    scrollY += 5;
    fireEvent.scroll(window);
    advance(16);
    expect(stage.getAttribute("data-travelling")).toBe("true");
    fireEvent.touchStart(window);
    advance(16);
    expect(stage.getAttribute("data-travelling")).toBe("false");
  });

  it("returns to the start from the header's Home link once the journey has begun", async () => {
    const { stage } = await mount();
    const home = document.createElement("a");
    home.href = "/"; home.dataset.journeyTarget = "top";
    document.body.append(home);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    home.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    advance(1000);
    expect(scrollY).toBe(0);
    expect(stage.getAttribute("data-phase")).toBe("intro");
    expect(location.hash).toBe("");
    home.remove();
  });

  it("travels to a station chosen in the header and announces each station it settles on", async () => {
    const { stage } = await mount();
    const stops: string[] = [];
    const listen = (event: Event) => stops.push((event as CustomEvent<string>).detail);
    window.addEventListener("journey:stop", listen);
    const link = document.createElement("a");
    link.href = "/#brno"; link.dataset.journeyTarget = "brno";
    document.body.append(link);
    fireEvent.click(link); advance(1000);
    expect(stage.getAttribute("data-stop")).toBe("brno");
    expect(location.hash).toBe("#brno");
    expect(stops.at(-1)).toBe("brno");
    expect(document.documentElement.dataset.journeyStop).toBe("brno");
    const elsewhere = document.createElement("a");
    elsewhere.href = "/work#brno";
    document.body.append(elsewhere);
    let handled = true;
    const stopNavigation = (event: Event) => { handled = event.defaultPrevented; event.preventDefault(); };
    window.addEventListener("click", stopNavigation);
    fireEvent.click(elsewhere);
    expect(handled).toBe(false);
    window.removeEventListener("click", stopNavigation);
    window.removeEventListener("journey:stop", listen);
    link.remove(); elsewhere.remove();
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

describe("Stepped travel on touch devices", () => {
  it("never follows or writes the page scroll, so it cannot rest inside a transition", async () => {
    coarse = true;
    const { stage } = await mount();
    const writes = vi.mocked(window.scrollTo).mock.calls.length;
    // A native scroll to the middle of the St. Louis → Granada passage changes nothing.
    scrollY = pageHeight * (JOURNEY.anchors["st-louis"] + 1) / JOURNEY.totalH;
    fireEvent.scroll(window); fireEvent.touchStart(window); fireEvent.touchEnd(window);
    advance(8000);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    expect(vi.mocked(window.scrollTo).mock.calls.length).toBe(writes);
  });

  it("goes through the full transition to the next station with a button, one station per press", async () => {
    coarse = true;
    const { stage, container } = await mount();
    const next = container.querySelector<HTMLButtonElement>(".station-next")!;
    expect(next.textContent).toContain("Granada");
    fireEvent.click(next);
    const passage = new Set<string>();
    const sample = (ms: number) => { for (let t = 0; t < ms; t += 50) { advance(50); passage.add(stage.getAttribute("data-phase")!); } };
    sample(1000);
    expect(stage.getAttribute("data-travelling")).toBe("true");
    expect(next.getAttribute("aria-disabled")).toBe("true");
    // Presses during the flight are ignored rather than queued.
    fireEvent.click(next); fireEvent.click(next);
    sample(4500);
    expect(passage.has("departure")).toBe(true);
    expect(passage.has("arrival")).toBe(true);
    expect(stage.getAttribute("data-stop")).toBe("granada");
    expect(stage.getAttribute("data-travelling")).toBe("false");
    expect(next.getAttribute("aria-disabled")).toBe("false");
    expect(next.textContent).toContain("Brno");
    fireEvent.click(container.querySelector(".station-back")!); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("st-louis");
  });

  it("starts from the intro with a tap and offers the way back to Earth at the last station", async () => {
    coarse = true;
    scrollY = 0;
    const { stage, container } = await mount();
    expect(stage.getAttribute("data-phase")).toBe("intro");
    fireEvent.click(container.querySelector(".scroll-invitation")!); advance(6000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
    fireEvent.click(container.querySelector('.journey-nav a[href="#madrid"]')!); advance(1000);
    const next = container.querySelector<HTMLButtonElement>(".station-next")!;
    expect(next.textContent).toContain("Back to Earth");
    fireEvent.click(next); advance(1000);
    expect(stage.getAttribute("data-stop")).toBe("earth");
  });
});
