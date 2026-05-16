"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  FilterX,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import {
  ApiError,
  api,
  clearAuth,
  getStoredAuth,
  type Laporan,
  type LaporanCreatePayload,
  type LaporanUpdatePayload,
  type PaginationMeta,
} from "@/lib/api";

type ReportFormState = {
  tipe: string;
  lampiran: string;
};

const EMPTY_REPORTS: Laporan[] = [];
const ITEMS_PER_PAGE = 8;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
};
const reportTypes = ["keuangan", "reservasi", "operasional", "user", "cabang", "audit"];
const initialFormState: ReportFormState = {
  tipe: "keuangan",
  lampiran: "",
};

export default function OwnerReportsPage() {
  return (
    <AppShell role="owner">
      <OwnerReportsContent />
    </AppShell>
  );
}

function OwnerReportsContent() {
  const router = useRouter();
  const toast = useToast();
  const [reports, setReports] = useState<Laporan[]>(EMPTY_REPORTS);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ReportFormState>(initialFormState);
  const [editingReport, setEditingReport] = useState<Laporan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyReportId, setBusyReportId] = useState<number | null>(null);
  const currentUserId = getStoredAuth()?.user.id_user ?? null;

  const handleApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearAuth();
          router.replace("/admin/login");
          return "Sesi berakhir. Silakan login kembali.";
        }

        if (err.status === 403) {
          return "Akun ini tidak memiliki akses owner untuk mengelola laporan.";
        }

        if (err.status === 404) {
          return "Laporan tidak ditemukan.";
        }

        return err.message || fallbackMessage;
      }

      return err instanceof Error ? err.message : fallbackMessage;
    },
    [router],
  );

  const loadReports = useCallback(
    async (signal?: AbortSignal, mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await api.laporan.listPaginated({
          signal,
          query: {
            page,
            limit: ITEMS_PER_PAGE,
            search: debouncedSearchQuery || undefined,
            tipe: typeFilter === "all" ? undefined : typeFilter,
          },
        });
        if (!signal?.aborted) {
          setReports(result.data);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        const message = handleApiError(err, "Gagal memuat laporan.");
        setError(message);
        toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearchQuery, handleApiError, page, toast, typeFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadReports(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadReports]);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const currentPage = Math.min(page, totalPages);
  const totalItems = pagination.total_items;
  const totalPdf = reports.filter((report) => report.lampiran.toLowerCase().endsWith(".pdf")).length;
  const ownerReports = reports.filter((report) => report.dibuat_oleh === currentUserId).length;
  const hasActiveFilters = Boolean(debouncedSearchQuery) || typeFilter !== "all";

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const updateTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setPage(1);
    toast.info("Filter laporan direset.");
  };

  const requestReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUserId) {
      toast.error("Sesi owner tidak ditemukan. Silakan login kembali.");
      router.replace("/admin/login");
      return;
    }

    const tipe = form.tipe.trim().toLowerCase();
    const lampiran = normalizePdfFilename(form.lampiran || buildReportFilename(tipe));
    if (!tipe) {
      toast.warning("Tipe laporan wajib dipilih.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: LaporanCreatePayload = {
        tipe,
        lampiran,
        dibuat_oleh: currentUserId,
      };
      const created = await api.laporan.create(payload);

      setReports((current) => (page === 1 ? [created, ...current].slice(0, ITEMS_PER_PAGE) : current));
      setPagination((current) => ({
        ...current,
        total_items: current.total_items + 1,
        total_pages: Math.ceil((current.total_items + 1) / current.limit),
        has_next: current.page < Math.ceil((current.total_items + 1) / current.limit),
      }));
      setForm({ tipe, lampiran: "" });
      setPage(1);
      void loadReports(undefined, "refresh");
      toast.success("Permintaan laporan berhasil dibuat.");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal meminta laporan."));
    } finally {
      setSubmitting(false);
    }
  };

  const updateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingReport) {
      return;
    }

    const payload: LaporanUpdatePayload = {
      tipe: form.tipe.trim().toLowerCase(),
      lampiran: normalizePdfFilename(form.lampiran || editingReport.lampiran),
    };

    setSubmitting(true);

    try {
      const updated = await api.laporan.update(editingReport.id_laporan, payload);
      setReports((current) =>
        current.map((report) => (report.id_laporan === updated.id_laporan ? updated : report)),
      );
      setEditingReport(null);
      setForm(initialFormState);
      void loadReports(undefined, "refresh");
      toast.success("Laporan berhasil diperbarui.");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal memperbarui laporan."));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = async (report: Laporan) => {
    setBusyReportId(report.id_laporan);

    try {
      const blob = await api.laporan.downloadPdf(report.id_laporan);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = normalizePdfFilename(report.lampiran);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF laporan berhasil dibuat.");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal membuat PDF laporan."));
    } finally {
      setBusyReportId(null);
    }
  };

  const openEditDialog = (report: Laporan) => {
    setEditingReport(report);
    setForm({
      tipe: report.tipe,
      lampiran: report.lampiran,
    });
  };

  const closeEditDialog = () => {
    if (submitting) {
      return;
    }

    setEditingReport(null);
    setForm(initialFormState);
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-black leading-none text-[#0F4C3E] sm:text-[38px]">Owner Reports</h1>
            <p className="mt-3 text-[14px] font-bold text-[#6A9484]">
              Request dan kelola laporan PDF SiBooking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReports(undefined, "refresh")}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#BFD9CB] bg-white px-3 text-[13px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <section className="mt-7 grid gap-4 rounded-[12px] bg-[#0E3A2E] p-5 text-white shadow-[0_14px_36px_rgba(0,0,0,0.18)] lg:grid-cols-[1fr_360px] lg:p-7">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total Laporan" value={totalItems} />
            <SummaryCard label="PDF Ready" value={totalPdf} />
            <SummaryCard label="Dibuat Owner" value={ownerReports} />
          </div>

          <form onSubmit={requestReport} className="rounded-[10px] bg-white/10 p-4 backdrop-blur">
            <div className="grid gap-3">
              <select
                value={form.tipe}
                onChange={(event) => setForm((current) => ({ ...current, tipe: event.target.value }))}
                className="h-11 rounded-[9px] border border-white/20 bg-white px-3 text-[14px] font-black text-[#174D3D] outline-none"
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {toTitleCase(type)}
                  </option>
                ))}
              </select>
              <input
                value={form.lampiran}
                onChange={(event) => setForm((current) => ({ ...current, lampiran: event.target.value }))}
                placeholder={buildReportFilename(form.tipe)}
                className="h-11 rounded-[9px] border border-white/20 bg-white px-3 text-[14px] font-bold text-[#174D3D] outline-none placeholder:text-[#8EA0B8]"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#49B84E] px-4 text-[14px] font-black text-white transition hover:bg-[#3EA343] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText className="h-5 w-5" aria-hidden="true" />
                {submitting ? "Meminta..." : "Request PDF"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-[10px] bg-[#D3F0D6] p-5 shadow-[0_12px_28px_rgba(15,76,62,0.14)] sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[225px_1fr_auto]">
            <select
              value={typeFilter}
              onChange={(event) => updateTypeFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-[#0F172A] bg-[#E5E7EB] px-4 text-[16px] font-black text-[#1F2937] outline-none"
            >
              <option value="all">All Types</option>
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {toTitleCase(type)}
                </option>
              ))}
            </select>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B6C1D0]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => updateSearchQuery(event.target.value)}
                placeholder="Search laporan..."
                className="h-10 w-full rounded-[10px] border border-[#0F172A] bg-white pl-10 pr-3 text-[16px] font-bold text-[#23313A] outline-none placeholder:text-[#B6C1D0]"
              />
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#BFD9CB] bg-white px-4 text-[13px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3]"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>

          {error ? (
            <div className="mt-4">
              <ErrorState message={error} />
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4">
              <LoadingState label="Memuat laporan..." />
            </div>
          ) : reports.length === 0 ? (
            <div className="mt-4">
              <EmptyState message={hasActiveFilters ? "Laporan tidak ditemukan untuk filter ini." : "Belum ada laporan."} />
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3">
                {reports.map((report) => (
                  <article key={report.id_laporan} className="rounded-[10px] bg-white p-4 shadow-[0_4px_12px_rgba(15,76,62,0.08)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black uppercase text-[#6B8D70]">Report #{report.id_laporan}</p>
                        <h2 className="mt-1 text-[20px] font-black text-[#23313A]">{toTitleCase(report.tipe)}</h2>
                        <p className="mt-1 break-all text-[14px] font-bold text-[#53616A]">{normalizePdfFilename(report.lampiran)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void downloadReport(report)}
                          disabled={busyReportId === report.id_laporan}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#21684E] px-4 text-[14px] font-black text-white transition hover:bg-[#2B7A5D] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(report)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#5CAEF0] px-4 text-[14px] font-black text-[#5B4DF0] transition hover:bg-[#4A9DDE]"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
              />
            </>
          )}
        </section>
      </div>

      {editingReport ? (
        <ReportEditDialog
          form={form}
          submitting={submitting}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onClose={closeEditDialog}
          onSubmit={updateReport}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] bg-[#EEFFF4] p-4 text-[#174D3D]">
      <p className="text-[13px] font-black text-[#4C6B55]">{label}</p>
      <p className="mt-2 text-[30px] font-black leading-none">{value}</p>
    </div>
  );
}

function ReportEditDialog({
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  form: ReportFormState;
  submitting: boolean;
  onChange: (key: keyof ReportFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={onSubmit} className="w-full max-w-[520px] rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-black text-[#174D3D]">Edit Laporan</h2>
            <p className="mt-1 text-[13px] font-bold text-[#6A9484]">Perbarui metadata laporan PDF.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDF7F1] text-[#174D3D] transition hover:bg-[#D3F0D6]"
          >
            <X className="h-5 w-5 stroke-[3]" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-[13px] font-black text-[#51645E]">Tipe</span>
            <select
              value={form.tipe}
              onChange={(event) => onChange("tipe", event.target.value)}
              className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[15px] font-bold text-[#23313A] outline-none focus:border-[#21684E]"
            >
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {toTitleCase(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-[13px] font-black text-[#51645E]">Lampiran</span>
            <input
              value={form.lampiran}
              onChange={(event) => onChange("lampiran", event.target.value)}
              required
              className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[15px] font-bold text-[#23313A] outline-none focus:border-[#21684E]"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 rounded-[8px] border border-[#BFD9CB] bg-white px-5 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-[8px] bg-[#21684E] px-6 text-[14px] font-black text-white transition hover:bg-[#2B7A5D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Save"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-black/30 px-4 py-4 backdrop-blur-[2px] sm:py-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex min-h-full w-full items-center justify-center"
      >
        {children}
      </div>
    </div>
  );
}

function buildReportFilename(type: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `sibooking_${type || "laporan"}_${date}.pdf`;
}

function normalizePdfFilename(filename: string) {
  const normalized = filename.trim().replace(/\s+/g, "_").toLowerCase();
  if (!normalized) {
    return buildReportFilename("laporan");
  }

  return normalized.endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <nav className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] font-bold text-[#6B8D70]">
        Menampilkan {totalItems} laporan, halaman {currentPage} dari {totalPages}
      </p>
      <div className="flex w-full overflow-hidden rounded-full border border-[#174D3D] bg-white text-[15px] shadow-[0_10px_24px_rgba(17,48,41,0.08)] sm:w-auto">
        <PageButton label="Awal" disabled={currentPage === 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Sebelumnya" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="flex h-10 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 font-black text-[#94A3B8]">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`h-10 min-w-10 border-l border-[#174D3D] px-3 font-black transition ${
                currentPage === item ? "bg-[#174D3D] text-white" : "text-[#174D3D] hover:bg-[#ECFDF3]"
              }`}
            >
              {item}
            </button>
          ),
        )}
        <PageButton label="Berikutnya" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton label="Akhir" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 min-w-10 items-center justify-center border-l border-[#174D3D] px-3 text-[#174D3D] transition first:border-l-0 hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:text-[#B7C2D0] disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}

function getPaginationPages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delay, value]);

  return debouncedValue;
}
