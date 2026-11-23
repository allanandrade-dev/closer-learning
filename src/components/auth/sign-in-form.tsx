"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/auth-field";
import {
  GENERIC_ERROR_MESSAGE,
  mapAuthError,
  welcomeName,
} from "@/components/auth/auth-errors";
import { safeRedirectPath } from "@/components/auth/safe-redirect";
import { Spinner } from "@/components/auth/spinner";
import { emailError, passwordError } from "@/components/auth/validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type FieldName = "email" | "password";

type SignInFormProps = {
  nextPath?: string;
};

export function SignInForm({ nextPath }: SignInFormProps) {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFields, setServerFields] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [pending, setPending] = useState(false);

  function visible(field: FieldName) {
    return Boolean(touched[field] || submitted);
  }

  const errors = {
    email:
      (visible("email") ? emailError(values.email) : undefined) ??
      serverFields.email,
    password:
      (visible("password") ? passwordError(values.password) : undefined) ??
      serverFields.password,
  };

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerFields((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setServerError(null);
    setServerFields({});

    if (emailError(values.email) || passwordError(values.password)) {
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        const mapped = mapAuthError(result.error);
        setServerError(mapped.alert);
        setServerFields({ email: mapped.email, password: mapped.password });
        setPending(false);
        return;
      }

      if (!result.data) {
        setServerError(GENERIC_ERROR_MESSAGE);
        setPending(false);
        return;
      }

      toast.success(
        `Welcome, ${welcomeName(result.data.user.name)}. Level 1 is open.`,
      );
      router.push(safeRedirectPath(nextPath));
    } catch {
      setServerError(GENERIC_ERROR_MESSAGE);
      setPending(false);
    }
  }

  return (
    <div>
      <form noValidate className="space-y-4" aria-busy={pending} onSubmit={onSubmit}>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
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
          autoComplete="current-password"
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
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-400">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-indigo-400 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
