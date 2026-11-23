// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { SignInForm } from "@/components/auth/sign-in-form";
import SignInPage from "@/app/sign-in/page";

import "@testing-library/jest-dom/vitest";

const { signInEmail, push, toastSuccess } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  push: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: signInEmail },
    signUp: { email: vi.fn() },
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

async function signInAsAda(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

test("fields expose labels, autocomplete, and autofocus", () => {
  render(<SignInForm />);

  const email = screen.getByLabelText("Email");
  expect(email).toHaveAttribute("autocomplete", "email");
  expect(email).toHaveFocus();
  expect(screen.getByLabelText("Password")).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
  expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
    "href",
    "/sign-up",
  );
});

test("invalid email and short password show field errors and do not call the client", async () => {
  const user = userEvent.setup();
  render(<SignInForm />);

  await user.type(screen.getByLabelText("Email"), "ada@");
  await user.tab();
  expect(screen.getByText("Enter a valid email")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Password"), "short");
  await user.tab();
  expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(signInEmail).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Password")).toHaveAttribute(
    "aria-describedby",
    "password-error",
  );
});

test("INVALID_EMAIL_OR_PASSWORD shows the generic credentials alert", async () => {
  const user = userEvent.setup();
  signInEmail.mockResolvedValue({
    data: null,
    error: {
      message: "Invalid email or password",
      status: 401,
      statusText: "UNAUTHORIZED",
      code: "INVALID_EMAIL_OR_PASSWORD",
    },
  });
  render(<SignInForm />);

  await signInAsAda(user);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Email or password is wrong.");
  expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

test("any other sign-in failure shows the generic alert", async () => {
  const user = userEvent.setup();
  signInEmail.mockResolvedValue({
    data: null,
    error: {
      message: "Invalid password",
      status: 500,
      statusText: "INTERNAL_SERVER_ERROR",
      code: "FAILED_TO_CREATE_SESSION",
    },
  });
  render(<SignInForm />);

  await signInAsAda(user);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Something went wrong. Try again.",
  );
  expect(screen.queryByText("Email or password is wrong.")).not.toBeInTheDocument();
  expect(screen.queryByText("Invalid password")).not.toBeInTheDocument();
});

test("a valid sign-in toasts and redirects to /map", async () => {
  const user = userEvent.setup();
  signInEmail.mockResolvedValue({
    data: { user: { name: "Ada" } },
    error: null,
  });
  render(<SignInForm />);

  await signInAsAda(user);

  await waitFor(() => {
    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password1",
    });
  });
  expect(toastSuccess).toHaveBeenCalledWith("Welcome, Ada. Level 1 is open.");
  expect(push).toHaveBeenCalledWith("/map");
});

test("submitting disables the inputs", async () => {
  const user = userEvent.setup();
  let resolveSignIn: (value: unknown) => void = () => {};
  signInEmail.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
  );
  render(<SignInForm />);

  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "password1");

  const submitted = user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });
  expect(screen.getByLabelText("Password")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();

  resolveSignIn({
    data: { user: { name: "Ada" } },
    error: null,
  });
  await submitted;
});

test.each([
  ["a same-origin path", { next: "/levels/2" }, "/levels/2"],
  ["a path with a query", { next: "/levels/2?tab=notes" }, "/levels/2?tab=notes"],
  ["a protocol-relative url", { next: "//evil.example" }, "/map"],
  ["an absolute url", { next: "https://evil.example/steal" }, "/map"],
  ["a backslash url", { next: "/\\evil.example" }, "/map"],
  ["a path without a leading slash", { next: "levels/2" }, "/map"],
  ["the first unsafe value", { next: ["//evil.example", "/levels/2"] }, "/map"],
  ["a missing next param", {}, "/map"],
])("next is honored only when safe: %s", async (_label, params, expected) => {
  const user = userEvent.setup();
  signInEmail.mockResolvedValue({
    data: { user: { name: "Ada" } },
    error: null,
  });

  render(
    await SignInPage({
      searchParams: Promise.resolve(params),
    }),
  );

  await signInAsAda(user);

  await waitFor(() => {
    expect(push).toHaveBeenCalledWith(expected);
  });
});
