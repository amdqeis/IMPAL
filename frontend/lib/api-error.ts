import { ApiError } from "@/lib/api";

export function getApiErrorMessage(
  err: unknown,
  fallbackMessage: string,
  forbiddenMessage = "Kamu tidak punya akses untuk data ini.",
) {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Sesi berakhir. Silakan login kembali.";
    }

    if (err.status === 403) {
      return forbiddenMessage;
    }

    return err.message || fallbackMessage;
  }

  return err instanceof Error ? err.message : fallbackMessage;
}

export function isUnauthorizedError(err: unknown) {
  return err instanceof ApiError && err.status === 401;
}
