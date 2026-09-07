import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MachineExperience from "../MachineExperience";

const mocks = vi.hoisted(() => ({
  launch: vi.fn(() => true), setRoute: vi.fn(), setGravity: vi.fn(), setExploded: vi.fn(),
  setScrub: vi.fn(), setPaused: vi.fn(), rotate: vi.fn(), resetView: vi.fn(), dispose: vi.fn(),
  fail: false,
}));
vi.mock("../create-machine", () => ({ createMachine: () => {
  if (mocks.fail) throw new Error("WebGL unavailable");
  return mocks;
} }));

beforeEach(() => {
  vi.clearAllMocks(); mocks.fail = false;
  window.history.replaceState(null, "", "/");
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
async function ready() {
  render(<MachineExperience />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Soltar una canica" })).toBeEnabled());
}

describe("Portfolio experience", () => {
  it("lets the visitor launch, choose a consequence and suspend gravity", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Vuelo" }));
    expect(mocks.setRoute).toHaveBeenLastCalledWith("flight");
    fireEvent.click(screen.getByRole("button", { name: "Soltar una canica" }));
    expect(mocks.launch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("001", { selector: ".serial-number" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gravedad: sí" }));
    expect(mocks.setGravity).toHaveBeenLastCalledWith(false);
  });
  it("blocks new launches while rewinding, and can return to the present", async () => {
    await ready();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(screen.getByText("St. Louis")).toBeInTheDocument();
    expect(mocks.setScrub).toHaveBeenLastCalledWith(0);
    expect(screen.getByRole("button", { name: "Soltar una canica" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Volver al presente/ }));
    expect(mocks.setScrub).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: "Soltar una canica" })).toBeEnabled();
  });
  it("pauses behind a project and keeps the real repository available", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /Las piezas/ }));
    expect(mocks.setPaused).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: /FlySmart Spain/ }));
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByRole("link", { name: /Frontend Repo/ })).toHaveAttribute("href", "https://github.com/FlySmartProject/FlySmartSpainFrontEnd");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar información" }));
    expect(mocks.setPaused).toHaveBeenLastCalledWith(false);
  });
  it("keeps legacy about links working", async () => {
    window.history.replaceState(null, "", "/#about");
    await ready();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Hola, soy Carlos.");
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/carlos-mata-carrillo/");
  });
  it("retains access to projects if the GPU is unavailable", async () => {
    mocks.fail = true;
    render(<MachineExperience />);
    await waitFor(() => expect(screen.getByText("La máquina necesita un respiro.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Soltar una canica" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ver proyectos" }));
    expect(screen.getByRole("button", { name: /Retail Analytics Data Platform/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /GitHub/ }).length).toBeGreaterThan(0);
  });
  it("does not launch on Space while a visitor is using another control", async () => {
    await ready();
    await act(async () => { fireEvent.keyDown(screen.getByRole("slider"), { code: "Space" }); });
    expect(mocks.launch).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { code: "Space" });
    expect(mocks.launch).toHaveBeenCalledTimes(1);
  });
});
