"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AppShell, useSelectedBranch } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import { BookingForm, type PaymentBookingFormValues } from "@/components/user/payment/BookingForm";
import { OrderSummary } from "@/components/user/payment/OrderSummary";
import { PaymentMethod, QrisPanel } from "@/components/user/payment/PaymentMethod";
import { api, clearAuth, getStoredAuth, type Jadwal, type Pembayaran, type Reservasi, type Tempat } from "@/lib/api";
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api-error";
import { invalidateBranchResourceCache, useBranchResourceCache } from "@/lib/use-branch-resource-cache";

const PAYMENT_FORM_ID = "user-payment-booking-form";
const EMPTY_TABLES: Tempat[] = [];
const EMPTY_SCHEDULES: Jadwal[] = [];

const bookingSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  no_hp: z.string().min(8, "No. Telp wajib diisi"),
  id_tempat: z.number().min(1, "Pilih ruangan"),
  id_jadwal: z.number().min(1, "Pilih jadwal"),
  tanggal: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine((value) => value >= getLocalDateIso(), "Tanggal reservasi tidak boleh di masa lalu"),
});

export default function UserPaymentPage() {
  return (
    <AppShell role="user">
      <Suspense fallback={<div className="p-8 font-bold text-[#174D3D]">Memuat payment...</div>}>
        <UserPaymentContent />
      </Suspense>
    </AppShell>
  );
}

function UserPaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { selectedBranch, branchesLoading, branchesError } = useSelectedBranch();
  const branchId = selectedBranch?.id_cabang ?? null;
  const requestedTableId = Number(params.get("id_tempat") ?? 0);
  const requestedScheduleId = Number(params.get("id_jadwal") ?? 0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isRefreshingPayment, setIsRefreshingPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [reservation, setReservation] = useState<Reservasi | null>(null);
  const [pendingReservation, setPendingReservation] = useState<Reservasi | null>(null);
  const [payment, setPayment] = useState<Pembayaran | null>(null);

  const form = useForm<PaymentBookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      nama: "",
      no_hp: "",
      id_tempat: 0,
      id_jadwal: 0,
      tanggal: getLocalDateIso(),
    },
  });
  const selectedTableId = useWatch({ control: form.control, name: "id_tempat" });
  const selectedScheduleId = useWatch({ control: form.control, name: "id_jadwal" });
  const selectedDate = useWatch({ control: form.control, name: "tanggal" });

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    form.setValue("nama", auth.user.nama);
    form.setValue("no_hp", auth.user.no_hp);
  }, [form, router]);

  const fetchTables = useCallback(
    (signal: AbortSignal) => {
      if (!branchId) {
        return Promise.resolve([]);
      }

      return api.masterData.listTempat(
        {
          id_cabang: branchId,
          limit: 100,
          sort_by: "nomor_meja",
          sort_order: "asc",
        },
        { signal },
      );
    },
    [branchId],
  );
  const tablesResource = useBranchResourceCache<Tempat[]>({
    resource: "user-payment-tables",
    branchId,
    cacheParts: ["tables"],
    enabled: Boolean(branchId),
    fetcher: fetchTables,
  });
  const tables = tablesResource.data ?? EMPTY_TABLES;

  useEffect(() => {
    if (isUnauthorizedError(tablesResource.error)) {
      clearAuth();
      router.replace("/login");
    }
  }, [router, tablesResource.error]);

  useEffect(() => {
    if (tables.length === 0) {
      form.setValue("id_tempat", 0);
      return;
    }

    const current = Number(form.getValues("id_tempat"));
    const currentIsValid = tables.some((table) => table.id_tempat === current);
    const requestedIsValid = tables.some((table) => table.id_tempat === requestedTableId);
    const firstAvailable = tables.find((table) => table.status.toLowerCase() === "available") ?? tables[0];
    const nextTableId = currentIsValid ? current : requestedIsValid ? requestedTableId : firstAvailable.id_tempat;

    if (current !== nextTableId) {
      form.setValue("id_tempat", nextTableId);
    }
  }, [form, requestedTableId, tables]);

  const availabilityEnabled = Boolean(selectedTableId && selectedDate);
  const fetchAvailability = useCallback(
    (signal: AbortSignal) => {
      const tableId = Number(selectedTableId);
      if (!tableId || !selectedDate) {
        return Promise.resolve([]);
      }

      return api.jadwal.listAvailability(
        {
          id_tempat: tableId,
          tanggal: selectedDate,
          limit: 100,
          sort_by: "jam_mulai",
          sort_order: "asc",
        },
        { signal },
      );
    },
    [selectedDate, selectedTableId],
  );
  const availabilityResource = useBranchResourceCache<Jadwal[]>({
    resource: "user-payment-availability",
    branchId: Number(selectedTableId) || null,
    cacheParts: ["availability", selectedDate],
    enabled: availabilityEnabled,
    fetcher: fetchAvailability,
  });
  const availableSchedules = useMemo(
    () => (availabilityResource.data ?? EMPTY_SCHEDULES).filter((schedule) => schedule.available !== false),
    [availabilityResource.data],
  );

  useEffect(() => {
    if (isUnauthorizedError(availabilityResource.error)) {
      clearAuth();
      router.replace("/login");
    }
  }, [availabilityResource.error, router]);

  useEffect(() => {
    if (!availabilityEnabled || availabilityResource.loading) {
      return;
    }

    const current = Number(form.getValues("id_jadwal"));
    const currentIsValid = availableSchedules.some((schedule) => schedule.id_jadwal === current);
    const requestedIsValid = availableSchedules.some((schedule) => schedule.id_jadwal === requestedScheduleId);
    const nextScheduleId = currentIsValid
      ? current
      : requestedIsValid
        ? requestedScheduleId
        : availableSchedules[0]?.id_jadwal ?? 0;

    if (current !== nextScheduleId) {
      form.setValue("id_jadwal", nextScheduleId);
    }
  }, [availabilityEnabled, availabilityResource.loading, availableSchedules, form, requestedScheduleId]);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id_tempat === Number(selectedTableId)) ?? null,
    [selectedTableId, tables],
  );
  const selectedSchedule = useMemo(
    () => availableSchedules.find((schedule) => schedule.id_jadwal === Number(selectedScheduleId)) ?? null,
    [availableSchedules, selectedScheduleId],
  );
  const hours = getDurationHours(selectedSchedule);
  const total = useMemo(() => Number(selectedTable?.harga ?? 0) * hours, [hours, selectedTable?.harga]);
  const tablesError = tablesResource.error
    ? getApiErrorMessage(tablesResource.error, "Gagal memuat data ruangan.", "Kamu tidak punya akses melihat ruangan.")
    : null;
  const availabilityError = availabilityResource.error
    ? getApiErrorMessage(availabilityResource.error, "Gagal memuat availability.", "Kamu tidak punya akses melihat jadwal.")
    : null;
  const latestReservation = pendingReservation ?? reservation;
  const canSubmit = Boolean(selectedBranch && selectedTable && selectedSchedule && total > 0);

  const onSubmit = async (values: PaymentBookingFormValues) => {
    setSubmitError(null);
    const auth = getStoredAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!selectedTable || selectedTable.id_tempat !== values.id_tempat) {
      setSubmitError("Ruangan tidak valid untuk cabang yang dipilih.");
      return;
    }

    const schedule = availableSchedules.find((item) => item.id_jadwal === values.id_jadwal);
    if (!schedule) {
      setSubmitError("Jadwal yang dipilih tidak tersedia untuk tanggal tersebut.");
      return;
    }

    setIsSubmitting(true);
    try {
      const createdReservation = await api.reservasi.create({
        id_user: auth.user.id_user,
        id_tempat: values.id_tempat,
        id_jadwal: values.id_jadwal,
        tanggal: values.tanggal,
        status: "pending",
        total_harga: total,
      });

      setReservation(createdReservation);
      setPendingReservation(null);
      storeLatestReservation(createdReservation.id_reservasi);
      invalidateUserCaches(branchId, Number(selectedTableId));

      try {
        const createdPayment = await api.pembayaran.create({
          id_reservasi: createdReservation.id_reservasi,
          amount: total,
          status: "pending",
        });
        setPayment(createdPayment);
        storeLatestPayment(createdPayment.id_payment);
        toast.success("Pesanan dibuat. Silakan lanjutkan pembayaran QRIS.");
      } catch (err) {
        setPendingReservation(createdReservation);
        setPayment(null);
        setSubmitError(
          getApiErrorMessage(err, "Reservasi dibuat, tetapi pembayaran gagal dibuat. Coba ulangi pembuatan pembayaran."),
        );
        toast.warning("Reservasi sudah dibuat, tetapi payment belum berhasil dibuat.");
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Gagal membuat reservasi."));
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryPayment = async () => {
    const sourceReservation = latestReservation;
    if (!sourceReservation) {
      return;
    }

    setIsRetryingPayment(true);
    setSubmitError(null);
    try {
      const createdPayment = await api.pembayaran.create({
        id_reservasi: sourceReservation.id_reservasi,
        amount: sourceReservation.total_harga,
        status: "pending",
      });
      setReservation(sourceReservation);
      setPendingReservation(null);
      setPayment(createdPayment);
      storeLatestPayment(createdPayment.id_payment);
      toast.success("Payment berhasil dibuat.");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Gagal membuat payment."));
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
      }
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const refreshPaymentStatus = async () => {
    const reservasiId = latestReservation?.id_reservasi ?? payment?.id_reservasi;
    if (!reservasiId) {
      return;
    }

    setIsRefreshingPayment(true);
    setSubmitError(null);
    try {
      const payments = await api.pembayaran.list({
        id_reservasi: reservasiId,
        limit: 1,
        sort_by: "id_payment",
        sort_order: "desc",
      });
      const latestPayment = payments[0] ?? null;
      setPayment(latestPayment);

      if (!latestPayment) {
        setSubmitError("Payment untuk reservasi ini belum ditemukan.");
      } else if (latestPayment.status.toLowerCase() === "paid") {
        storeLatestPayment(latestPayment.id_payment);
        router.push(`/user/payment/completed?id_reservasi=${reservasiId}&id_payment=${latestPayment.id_payment}`);
      } else {
        toast.info("Pembayaran masih menunggu konfirmasi.");
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Gagal mengecek status pembayaran."));
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
      }
    } finally {
      setIsRefreshingPayment(false);
    }
  };

  const dummyConfirmPayment = async () => {
    if (!payment) {
      return;
    }

    setIsConfirmingPayment(true);
    setSubmitError(null);
    try {
      const confirmedPayment = await api.pembayaran.dummyConfirm(payment.id_payment);
      const reservasiId = confirmedPayment.id_reservasi;
      setPayment(confirmedPayment);
      if (confirmedPayment.reservasi) {
        setReservation(confirmedPayment.reservasi);
      }
      storeLatestReservation(reservasiId);
      storeLatestPayment(confirmedPayment.id_payment);
      invalidateUserCaches(branchId, Number(selectedTableId));
      toast.success("Pembayaran dummy berhasil dikonfirmasi.");
      router.push(`/user/payment/completed?id_reservasi=${reservasiId}&id_payment=${confirmedPayment.id_payment}`);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Gagal mengonfirmasi pembayaran dummy."));
      if (isUnauthorizedError(err)) {
        clearAuth();
        router.replace("/login");
      }
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  return (
    <div className="grid w-full max-w-[1180px] grid-cols-1 gap-8 px-4 py-2 sm:px-6 md:grid-cols-[1.05fr_1fr] md:px-8">
      {branchesError ? (
        <div className="md:col-span-2">
          <ErrorState message={branchesError} />
        </div>
      ) : branchesLoading ? (
        <div className="md:col-span-2">
          <LoadingState label="Memuat cabang..." />
        </div>
      ) : !selectedBranch ? (
        <div className="md:col-span-2">
          <EmptyState message="Belum ada cabang yang dapat ditampilkan." />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {tablesError ? <ErrorState message={tablesError} /> : null}
            {availabilityError ? <ErrorState message={availabilityError} /> : null}
            <BookingForm
              form={form}
              formId={PAYMENT_FORM_ID}
              tables={tables}
              availableSchedules={availableSchedules}
              selectedTableId={Number(selectedTableId)}
              selectedSchedule={selectedSchedule}
              tablesLoading={tablesResource.loading}
              availabilityLoading={availabilityResource.loading}
              disabled={isSubmitting || Boolean(payment)}
              minDate={getLocalDateIso()}
              onSubmit={form.handleSubmit(onSubmit, () => setSubmitError("Lengkapi detail pemesanan."))}
            />
            <PaymentMethod disabled={isSubmitting} />
          </div>

          <div className="flex flex-col gap-5">
            <OrderSummary
              formId={PAYMENT_FORM_ID}
              selectedTable={selectedTable}
              total={total}
              payment={payment}
              pendingReservation={pendingReservation}
              submitError={submitError}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              isRetryingPayment={isRetryingPayment}
              onRetryPayment={retryPayment}
            />
            {payment ? (
              <QrisPanel
                payment={payment}
                isConfirmingPayment={isConfirmingPayment}
                isRefreshingPayment={isRefreshingPayment}
                onDummyConfirm={dummyConfirmPayment}
                onRefreshStatus={refreshPaymentStatus}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function getDurationHours(schedule: Jadwal | null) {
  if (!schedule) {
    return 1;
  }

  const start = parseTimeToMinutes(schedule.jam_mulai);
  const end = parseTimeToMinutes(schedule.jam_selesai);
  if (start === null || end === null || end <= start) {
    return 1;
  }

  return Math.max(1, (end - start) / 60);
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getLocalDateIso() {
  const date = new Date();
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function storeLatestReservation(reservasiId: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem("sibooking_latest_reservation", String(reservasiId));
}

function storeLatestPayment(paymentId: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem("sibooking_latest_payment", String(paymentId));
}

function invalidateUserCaches(branchId: number | null, tableId: number | null) {
  invalidateBranchResourceCache("user-active-bookings", branchId);
  invalidateBranchResourceCache("user-history", branchId);
  invalidateBranchResourceCache("user-dashboard", branchId);
  invalidateBranchResourceCache("user-payment-availability", tableId);
}
