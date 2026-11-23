"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/auth-field";
import {
  GENERIC_ERROR_MESSAGE,
  signUpErrorMessage,
  welcomeName,
} from "@/components/auth/auth-errors";
import { Spinner } from "@/components/auth/spinner";
import { emailError, nameError, passwordError } from "@/components/auth/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type FieldName = "name" | "email" | "password";

export function SignUpForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function visible(field: FieldName) {
    return Boolean(touched[field] || submitted);
  }

  const errors = {
    name: visible("name") ? nameError(values.name) : undefined,
    email: visible("email") ? emailError(values.email) : undefined,
    password: visible("password") ? passwordError(values.password) : undefined,
  };

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (
      nameError(values.name) ||
      emailError(values.email) ||
      passwordError(values.password)
    ) {
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signUp.email({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        setServerError(signUpErrorMessage(result.error));
        setPending(false);
        return;
      }

      toast.success(
        `Welcome, ${welcomeName(result.data.user.name, values.name)}. Level 1 is open.`,
      );
      router.push("/map");
    } catch {
      setServerError(GENERIC_ERROR_MESSAGE);
      setPending(false);
    }
  }

  return (
    <div>
      <form noValidate className="space-y-4" aria-busy={pending} onSubmit={onSubmit}>
        <AuthField
          id="name"
          label="Name"
          autoComplete="name"
          autoFocus
          value={values.name}
          error={errors.name}
          disabled={pending}
          onChange={(value) => update("name", value)}
          onBlur={() => setTouched((current) => ({ ...current, name: true }))}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={errors.email}
          disabled={pending}
          onChange={(value) => update("email", value)}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          minLength={8}
          value={values.password}
          error={errors.password}
          disabled={pending}
          onChange={(value) => update("password", value)}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
        />
        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="submit"
          className="w-full bg-indigo-500 text-white hover:bg-indigo-400"
          disabled={pending}
        >
          {pending ? (
            <>
              <Spinner />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-indigo-400 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
