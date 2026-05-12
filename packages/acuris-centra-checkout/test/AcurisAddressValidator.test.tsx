import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AcurisAddressValidator } from "../src/AcurisAddressValidator.js";

const okResult = {
  accuracy_type: "rooftop",
  confidence: 1,
  match_type: "rooftop",
  match_score: 1,
  match_components: { city: true, house_number: true, state: true, street: true, zip: true },
  input_corrected: false,
  standardized: {
    country: "deu",
    city: "Berlin",
    formatted_address: "Friedrichstraße 43, 10117 Berlin",
  },
};

const addr = { street: "Friedrichstraße", house_number: "43", city: "Berlin", postcode: "10117" };

describe("<AcurisAddressValidator>", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(okResult), { status: 200 }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders idle initially and exposes formProps", () => {
    render(
      <AcurisAddressValidator
        endpoints={{ validate: "/api/v" }}
        country="deu"
        address={addr}
      >
        {({ status }) => <p data-testid="status">{status}</p>}
      </AcurisAddressValidator>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("validates on blur when trigger='blur'", async () => {
    render(
      <AcurisAddressValidator
        endpoints={{ validate: "/api/v" }}
        country="deu"
        address={addr}
        trigger="blur"
      >
        {({ status, formProps, result }) => (
          <form {...formProps} data-testid="form">
            <span data-testid="status">{status}</span>
            <span data-testid="score">{result?.match_score ?? ""}</span>
          </form>
        )}
      </AcurisAddressValidator>,
    );
    fireEvent.blur(screen.getByTestId("form"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ok"));
    expect(screen.getByTestId("score")).toHaveTextContent("1");
  });

  it("validates on submit when trigger='submit' and prevents default", async () => {
    const submitSpy = vi.fn();
    render(
      <AcurisAddressValidator
        endpoints={{ validate: "/api/v" }}
        country="deu"
        address={addr}
        trigger="submit"
      >
        {({ status, formProps }) => (
          <form
            {...formProps}
            data-testid="form"
            onSubmit={(e) => {
              formProps.onSubmit(e);
              submitSpy(e.defaultPrevented);
            }}
          >
            <span data-testid="status">{status}</span>
          </form>
        )}
      </AcurisAddressValidator>,
    );
    fireEvent.submit(screen.getByTestId("form"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ok"));
    expect(submitSpy).toHaveBeenCalledWith(true);
  });

  it("manual trigger does not auto-validate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(
      <AcurisAddressValidator
        endpoints={{ validate: "/api/v" }}
        country="deu"
        address={addr}
        trigger="manual"
      >
        {({ status, formProps }) => (
          <form {...formProps} data-testid="form">
            <span data-testid="status">{status}</span>
          </form>
        )}
      </AcurisAddressValidator>,
    );
    fireEvent.blur(screen.getByTestId("form"));
    fireEvent.submit(screen.getByTestId("form"));
    // Give any unintended async a chance to run.
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
