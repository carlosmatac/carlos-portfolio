import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "../SiteHeader";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
afterEach(() => { cleanup(); navigation.pathname = "/"; });

describe("Site header", () => {
  it("offers Home with the logo, the journey, the work board and icon-only social profiles", () => {
    render(<SiteHeader />);
    const home = screen.getByRole("link", { name: "Home" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Journey" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My work" }).getAttribute("href")).toBe("/work");
    const social = [["GitHub", "https://github.com/carlosmatac"], ["LinkedIn", "https://www.linkedin.com/in/carlos-mata-carrillo/"], ["X (Twitter)", "https://x.com/carlosmatacar"]];
    for (const [label, href] of social) {
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.textContent).toBe("");
    }
  });

  it("lists every station in a dropdown that closes on selection and with Escape", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Journey" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    const list = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(list.hidden).toBe(false);
    const stations = within(list).getAllByRole("link");
    expect(stations.map(link => link.getAttribute("href"))).toEqual(["/#earth", "/#st-louis", "/#granada", "/#brno", "/#munich", "/#madrid"]);
    fireEvent.click(stations[2]);
    expect(list.hidden).toBe(true);
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(list.hidden).toBe(true);
  });

  it("marks the station the journey announces, and the current page", () => {
    const { rerender } = render(<SiteHeader />);
    act(() => { window.dispatchEvent(new CustomEvent("journey:stop", { detail: "granada" })); });
    fireEvent.click(screen.getByRole("button", { name: "Journey" }));
    expect(screen.getByRole("link", { name: /Granada/ }).getAttribute("aria-current")).toBe("step");
    navigation.pathname = "/work";
    rerender(<SiteHeader />);
    expect(screen.getByRole("link", { name: "My work" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /Granada/ }).getAttribute("aria-current")).toBeNull();
  });

  it("opens and closes the compact menu used on small screens", () => {
    const { container } = render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(toggle);
    expect(container.querySelector(".site-header")?.getAttribute("data-menu")).toBe("open");
    expect(screen.getByRole("button", { name: "Close menu" }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: "My work" }));
    expect(container.querySelector(".site-header")?.getAttribute("data-menu")).toBe("closed");
  });
});
