import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { AcurisAddressInput, hitToDisplay } from "../src/AcurisAddressInput.js";

const suggestPayload = {
  suggestions: [
    {
      country: "deu",
      city: "Berlin",
      state: "BE",
      postcode: "10117",
      street: "FRIEDRICHSTRASSE",
      house_number: "43",
      formatted_address: "Friedrichstraße 43\n10117 Berlin\nDEU",
    },
    {
      country: "deu",
      city: "Berlin",
      state: "BE",
      postcode: "10117",
      street: "FRIEDRICHSTRASSE",
      house_number: "100",
      formatted_address: "Friedrichstraße 100\n10117 Berlin\nDEU",
    },
  ],
};

function Wrapper({ onSelect }: { onSelect?: (h: unknown) => void }) {
  const [v, setV] = useState("");
  return (
    <AcurisAddressInput
      endpoints={{ validate: "/api/v", suggest: "/api/s" }}
      country="deu"
      value={v}
      onChange={setV}
      onSelect={onSelect}
      debounceMs={0}
      minQueryLength={3}
      placeholder="Search…"
    />
  );
}

describe("<AcurisAddressInput>", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(suggestPayload), { status: 200 }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders the input and starts collapsed", () => {
    render(<Wrapper />);
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens suggestions dropdown after the user types past minQueryLength", async () => {
    render(<Wrapper />);
    const input = screen.getByPlaceholderText("Search…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Friedrich" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("calls onSelect when a suggestion is clicked", async () => {
    const onSelect = vi.fn();
    render(<Wrapper onSelect={onSelect} />);
    const input = screen.getByPlaceholderText("Search…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Friedrich" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    const first = screen.getAllByRole("option")[0]!;
    fireEvent.mouseDown(first);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toContain("Friedrichstraße");
  });

  it("supports ArrowDown / Enter keyboard selection", async () => {
    const onSelect = vi.fn();
    render(<Wrapper onSelect={onSelect} />);
    const input = screen.getByPlaceholderText("Search…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Friedrich" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toContain("Friedrichstraße 43");
  });

  it("populates the input with a single-line display (no raw newlines)", async () => {
    render(<Wrapper />);
    const input = screen.getByPlaceholderText("Search…") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Friedrich" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getAllByRole("option")[0]!);
    // Multi-line input would be "Friedrichstraße 43\n10117 Berlin\nDEU";
    // we want the comma-joined form.
    expect(input.value).not.toContain("\n");
    expect(input.value).toContain("Friedrichstraße 43");
    expect(input.value).toContain("10117");
    expect(input.value).toMatch(/Friedrichstraße 43,\s+10117 Berlin/);
  });

  it("closes the dropdown on Escape", async () => {
    render(<Wrapper />);
    const input = screen.getByPlaceholderText("Search…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Friedrich" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });
});
