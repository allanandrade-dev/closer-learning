// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { SignUpForm } from "@/components/auth/sign-up-form";

import "@testing-library/jest-dom/vitest";

const { signUpEmail, push, toastSuccess } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  push: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: { email: signUpEmail },
    signIn: { email: vi.fn() },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess },
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("fields expose labels, autocomplete, and autofocus", () => {
  render(<SignUpForm />);

  const name = screen.getByLabelText("Name");
  expect(name).toHaveAttribute("autocomplete", "name");
  expect(name).toHaveFocus();
  expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
  expect(screen.getByLabelText("Password")).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
});

test("invalid email and short password show field errors and do not call the client", async () => {
  const user = userEvent.setup();
  render(<SignUpForm />);

  await user.type(screen.getByLabelText("Email"), "not-an-email");
  await user.tab();

  const email = screen.getByLabelText("Email");
  expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAttribute("aria-describedby", "email-error");

  await user.type(screen.getByLabelText("Password"), "short");
  await user.tab();

  const password = screen.getByLabelText("Password");
  expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
  expect(password).toHaveAttribute("aria-invalid", "true");
  expect(password).toHaveAttribute(
    "aria-describedby",
    "password-hint password-error",
  );

  await user.click(screen.getByRole("button", { name: "Create account" }));

  expect(screen.getByText("Name is required")).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  expect(signUpEmail).not.toHaveBeenCalled();
});

test("a valid sign-up calls the client, toasts, and redirects to /map", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: { user: { name: "Ada" } },
    error: null,
  });
  render(<SignUpForm />);

  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Create account" }));

  await waitFor(() => {
    expect(signUpEmail).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password1",
    });
  });
  expect(toastSuccess).toHaveBeenCalledWith(
    "Welcome, Ada. Level 1 is open.",
  );
  expect(push).toHaveBeenCalledWith("/map");
});

async function submitValidSignUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

test("a duplicate email is attached to the email field", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: null,
    error: {
      message: "User already exists. Use another email.",
      status: 422,
      statusText: "UNPROCESSABLE_ENTITY",
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
    },
  });
  render(<SignUpForm />);

  await submitValidSignUp(user);

  const email = screen.getByLabelText("Email");
  expect(await screen.findByText("That email is already registered.")).toHaveAttribute(
    "id",
    "email-error",
  );
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAttribute("aria-describedby", "email-error");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

test("VALIDATION_ERROR for an email is shown on the email field", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: null,
    error: {
      message: "[body.email] Invalid email address",
      status: 400,
      statusText: "BAD_REQUEST",
      code: "VALIDATION_ERROR",
    },
  });
  render(<SignUpForm />);

  await submitValidSignUp(user);

  const email = screen.getByLabelText("Email");
  expect(await screen.findByText("Enter a valid email")).toHaveAttribute(
    "id",
    "email-error",
  );
  expect(email).toHaveAttribute("aria-invalid", "true");
  expect(email).toHaveAttribute("aria-describedby", "email-error");
  expect(
    screen.queryByText("[body.email] Invalid email address"),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("INVALID_EMAIL still falls back to the email field", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: null,
    error: {
      message: "Invalid email",
      status: 400,
      statusText: "BAD_REQUEST",
      code: "INVALID_EMAIL",
    },
  });
  render(<SignUpForm />);

  await submitValidSignUp(user);

  expect(await screen.findByText("Enter a valid email")).toHaveAttribute(
    "id",
    "email-error",
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("PASSWORD_TOO_SHORT is shown on the password field", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: null,
    error: {
      message: "Password too short",
      status: 400,
      statusText: "BAD_REQUEST",
      code: "PASSWORD_TOO_SHORT",
    },
  });
  render(<SignUpForm />);

  await submitValidSignUp(user);

  expect(await screen.findByText("Use at least 8 characters")).toHaveAttribute(
    "id",
    "password-error",
  );
  expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("any other sign-up failure shows the generic alert", async () => {
  const user = userEvent.setup();
  signUpEmail.mockResolvedValue({
    data: null,
    error: {
      message: "Database unavailable",
      status: 500,
      statusText: "INTERNAL_SERVER_ERROR",
    },
  });
  render(<SignUpForm />);

  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Create account" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Something went wrong. Try again.",
  );
  expect(screen.queryByText("Database unavailable")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

test("submitting disables the inputs", async () => {
  const user = userEvent.setup();
  let resolveSignUp: (value: unknown) => void = () => {};
  signUpEmail.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
  );
  render(<SignUpForm />);

  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");

  const submitted = user.click(
    screen.getByRole("button", { name: "Create account" }),
  );

  await waitFor(() => {
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });
  expect(screen.getByLabelText("Email")).toBeDisabled();
  expect(screen.getByLabelText("Password")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Creating account…" }),
  ).toBeDisabled();

  resolveSignUp({
    data: { user: { name: "Ada Lovelace" } },
    error: null,
  });
  await submitted;
});
