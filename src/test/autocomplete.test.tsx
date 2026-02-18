import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Autocomplete } from "@/components/ui/autocomplete";

describe("Autocomplete", () => {
  const options = [
    { value: "computer-science", label: "Computer Science" },
    { value: "mechanical-engineering", label: "Mechanical Engineering" },
  ];

  it("does not submit parent form when opening dropdown", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Autocomplete options={options} value="" onChange={vi.fn()} />
        <button type="submit">Submit</button>
      </form>
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows suggestion options on open without requiring initial typing", () => {
    render(<Autocomplete options={options} value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Engineering")).toBeInTheDocument();
  });

  it("does not submit parent form when pressing Enter in autocomplete input", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Autocomplete options={options} value="" onChange={vi.fn()} />
        <button type="submit">Submit</button>
      </form>
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
