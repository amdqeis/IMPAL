"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  FilterX,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/sibooking/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/sibooking/States";
import { useToast } from "@/components/sibooking/ToastProvider";
import {
  ApiError,
  api,
  clearAuth,
  type Cabang,
  type CabangCreatePayload,
  type CabangUpdatePayload,
  type Jadwal,
  type JadwalCreatePayload,
  type JadwalUpdatePayload,
  type PaginatedResponse,
  type PaginationMeta,
  type Tempat,
  type TempatCreatePayload,
  type TempatUpdatePayload,
} from "@/lib/api";
import { formatCurrency, normalizeTime } from "@/lib/format";
import { useBranchResourceCache } from "@/lib/use-branch-resource-cache";

type DialogMode = "create" | "edit";
type CabangDialogState = { mode: DialogMode; cabang?: Cabang };
type TempatDialogState = { mode: DialogMode; tempat?: Tempat };
type JadwalDialogState = { mode: DialogMode; jadwal?: Jadwal };
type DeleteTarget =
  | { kind: "cabang"; cabang: Cabang }
  | { kind: "tempat"; tempat: Tempat }
  | { kind: "jadwal"; jadwal: Jadwal };

const ITEMS_PER_PAGE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
};
const TEMPAT_STATUS_OPTIONS = ["available", "occupied", "maintenance", "booked", "unavailable"] as const;

export default function AdminCabangTempatJadwalPage() {
  return (
    <AppShell role="admin" showBranchSelector={false}>
      <AdminManagementContent />
    </AppShell>
  );
}

function AdminManagementContent() {
  const router = useRouter();
  const toast = useToast();
  const [cabangResponse, setCabangResponse] = useState<PaginatedResponse<Cabang>>(
    createEmptyPaginatedResponse<Cabang>(),
  );
  const [cabangLoading, setCabangLoading] = useState(true);
  const [cabangRefreshing, setCabangRefreshing] = useState(false);
  const [cabangError, setCabangError] = useState<string | null>(null);
  const [cabangSearch, setCabangSearch] = useState("");
  const debouncedCabangSearch = useDebouncedValue(cabangSearch, 350);
  const [cabangPage, setCabangPage] = useState(1);
  const [selectedCabang, setSelectedCabang] = useState<Cabang | null>(null);

  const [tempatSearch, setTempatSearch] = useState("");
  const debouncedTempatSearch = useDebouncedValue(tempatSearch, 350);
  const [tempatStatusFilter, setTempatStatusFilter] = useState("all");
  const [tempatPage, setTempatPage] = useState(1);
  const [selectedTempat, setSelectedTempat] = useState<Tempat | null>(null);
  const [jadwalPage, setJadwalPage] = useState(1);

  const [cabangDialog, setCabangDialog] = useState<CabangDialogState | null>(null);
  const [tempatDialog, setTempatDialog] = useState<TempatDialogState | null>(null);
  const [jadwalDialog, setJadwalDialog] = useState<JadwalDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selectedCabangId = selectedCabang?.id_cabang ?? null;
  const selectedTempatId = selectedTempat?.id_tempat ?? null;

  const handleApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearAuth();
          router.replace("/admin/login");
          return "Sesi berakhir. Silakan login kembali.";
        }

        if (err.status === 403) {
          return "Kamu tidak punya akses untuk mengelola master data.";
        }

        if (err.status === 404) {
          return "Data yang dipilih tidak ditemukan.";
        }

        return err.message || fallbackMessage;
      }

      return err instanceof Error ? err.message : fallbackMessage;
    },
    [router],
  );

  const loadCabang = useCallback(
    async (signal?: AbortSignal, mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setCabangRefreshing(true);
      } else {
        setCabangLoading(true);
      }

      setCabangError(null);

      try {
        const result = await api.masterData.listCabangPaginated(
          {
            page: cabangPage,
            limit: ITEMS_PER_PAGE,
            search: debouncedCabangSearch || undefined,
            sort_by: "nama",
            sort_order: "asc",
          },
          { signal },
        );

        if (!signal?.aborted) {
          setCabangResponse(result);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        const message = handleApiError(err, "Gagal memuat data cabang.");
        setCabangError(message);
        toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setCabangLoading(false);
          setCabangRefreshing(false);
        }
      }
    },
    [cabangPage, debouncedCabangSearch, handleApiError, toast],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCabang(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadCabang]);

  const fetchTempat = useCallback(
    (signal: AbortSignal) =>
      selectedCabangId
        ? api.masterData.listTempatPaginated(
            {
              page: tempatPage,
              limit: ITEMS_PER_PAGE,
              id_cabang: selectedCabangId,
              search: debouncedTempatSearch || undefined,
              status_tempat: tempatStatusFilter === "all" ? undefined : tempatStatusFilter,
              sort_by: "nomor_meja",
              sort_order: "asc",
            },
            { signal },
          )
        : Promise.resolve(createEmptyPaginatedResponse<Tempat>(tempatPage)),
    [debouncedTempatSearch, selectedCabangId, tempatPage, tempatStatusFilter],
  );
  const tempatResource = useBranchResourceCache<PaginatedResponse<Tempat>>({
    resource: "admin-master-tempat",
    branchId: selectedCabangId,
    cacheParts: ["tempat", tempatPage, debouncedTempatSearch, tempatStatusFilter],
    enabled: Boolean(selectedCabangId),
    fetcher: fetchTempat,
  });

  const fetchJadwal = useCallback(
    (signal: AbortSignal) =>
      selectedTempatId
        ? api.jadwal.listPaginated(
            {
              page: jadwalPage,
              limit: ITEMS_PER_PAGE,
              id_tempat: selectedTempatId,
              sort_by: "jam_mulai",
              sort_order: "asc",
            },
            { signal },
          )
        : Promise.resolve(createEmptyPaginatedResponse<Jadwal>(jadwalPage)),
    [jadwalPage, selectedTempatId],
  );
  const jadwalResource = useBranchResourceCache<PaginatedResponse<Jadwal>>({
    resource: "admin-master-jadwal",
    branchId: selectedTempatId,
    cacheParts: ["jadwal", jadwalPage],
    enabled: Boolean(selectedTempatId),
    fetcher: fetchJadwal,
  });

  useEffect(() => {
    if (!tempatResource.error) {
      return;
    }

    toast.error(handleApiError(tempatResource.error, "Gagal memuat data tempat."));
  }, [handleApiError, tempatResource.error, toast]);

  useEffect(() => {
    if (!jadwalResource.error) {
      return;
    }

    toast.error(handleApiError(jadwalResource.error, "Gagal memuat data jadwal."));
  }, [handleApiError, jadwalResource.error, toast]);

  const cabangs = cabangResponse.data;
  const tempatResponse = tempatResource.data ?? createEmptyPaginatedResponse<Tempat>(tempatPage);
  const jadwalResponse = jadwalResource.data ?? createEmptyPaginatedResponse<Jadwal>(jadwalPage);
  const tempats = tempatResponse.data;
  const jadwals = jadwalResponse.data;
  const cabangTotalPages = Math.max(1, cabangResponse.pagination.total_pages || 1);
  const tempatTotalPages = Math.max(1, tempatResponse.pagination.total_pages || 1);
  const jadwalTotalPages = Math.max(1, jadwalResponse.pagination.total_pages || 1);

  useEffect(() => {
    if (cabangPage > cabangTotalPages) {
      setCabangPage(cabangTotalPages);
    }
  }, [cabangPage, cabangTotalPages]);

  useEffect(() => {
    if (tempatPage > tempatTotalPages) {
      setTempatPage(tempatTotalPages);
    }
  }, [tempatPage, tempatTotalPages]);

  useEffect(() => {
    if (jadwalPage > jadwalTotalPages) {
      setJadwalPage(jadwalTotalPages);
    }
  }, [jadwalPage, jadwalTotalPages]);

  const selectedCabangName = selectedCabang?.nama ?? "Pilih cabang";
  const selectedTempatName = selectedTempat?.nomor_meja ?? "Pilih tempat";

  const selectCabang = (cabang: Cabang) => {
    setSelectedCabang(cabang);
    setSelectedTempat(null);
    setTempatPage(1);
    setJadwalPage(1);
  };

  const selectTempat = (tempat: Tempat) => {
    setSelectedTempat(tempat);
    setJadwalPage(1);
  };

  const resetCabangSearch = () => {
    setCabangSearch("");
    setCabangPage(1);
  };

  const resetTempatFilters = () => {
    setTempatSearch("");
    setTempatStatusFilter("all");
    setTempatPage(1);
  };

  const saveCabang = async (payload: CabangCreatePayload | CabangUpdatePayload) => {
    setSubmitting(true);

    try {
      const saved = cabangDialog?.mode === "edit" && cabangDialog.cabang
        ? await api.masterData.updateCabang(cabangDialog.cabang.id_cabang, payload)
        : await api.masterData.createCabang(payload as CabangCreatePayload);

      setCabangResponse((current) => ({
        ...current,
        data: mergeById(current.data, saved, "id_cabang"),
      }));
      setSelectedCabang((current) => (cabangDialog?.mode === "create" || current?.id_cabang === saved.id_cabang ? saved : current));
      if (cabangDialog?.mode === "create") {
        setSelectedTempat(null);
        setTempatPage(1);
        setJadwalPage(1);
      }
      setCabangDialog(null);
      toast.success(cabangDialog?.mode === "edit" ? "Cabang berhasil diperbarui." : "Cabang berhasil dibuat.");
      void loadCabang(undefined, "refresh");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal menyimpan cabang."));
    } finally {
      setSubmitting(false);
    }
  };

  const saveTempat = async (payload: TempatCreatePayload | TempatUpdatePayload) => {
    if (!selectedCabang) {
      toast.warning("Pilih cabang terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      const saved = tempatDialog?.mode === "edit" && tempatDialog.tempat
        ? await api.masterData.updateTempat(tempatDialog.tempat.id_tempat, payload)
        : await api.masterData.createTempat(payload as TempatCreatePayload);

      setSelectedTempat((current) => (tempatDialog?.mode === "create" || current?.id_tempat === saved.id_tempat ? saved : current));
      if (tempatDialog?.mode === "create") {
        setJadwalPage(1);
      }
      setTempatDialog(null);
      tempatResource.invalidate();
      toast.success(tempatDialog?.mode === "edit" ? "Tempat berhasil diperbarui." : "Tempat berhasil dibuat.");
      void tempatResource.refetch("background");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal menyimpan tempat."));
    } finally {
      setSubmitting(false);
    }
  };

  const saveJadwal = async (payload: JadwalCreatePayload | JadwalUpdatePayload) => {
    if (!selectedTempat) {
      toast.warning("Pilih tempat terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      await (jadwalDialog?.mode === "edit" && jadwalDialog.jadwal
        ? api.jadwal.update(jadwalDialog.jadwal.id_jadwal, payload)
        : api.jadwal.create(payload as JadwalCreatePayload));

      setJadwalDialog(null);
      jadwalResource.invalidate();
      toast.success(jadwalDialog?.mode === "edit" ? "Jadwal berhasil diperbarui." : "Jadwal berhasil dibuat.");
      void jadwalResource.refetch("background");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal menyimpan jadwal."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      if (deleteTarget.kind === "cabang") {
        await api.masterData.deleteCabang(deleteTarget.cabang.id_cabang);
        setCabangResponse((current) => ({
          data: current.data.filter((cabang) => cabang.id_cabang !== deleteTarget.cabang.id_cabang),
          pagination: {
            ...current.pagination,
            total_items: Math.max(0, current.pagination.total_items - 1),
          },
        }));

        if (selectedCabang?.id_cabang === deleteTarget.cabang.id_cabang) {
          tempatResource.invalidate();
          jadwalResource.invalidate();
          setSelectedCabang(null);
          setSelectedTempat(null);
        }

        toast.success("Cabang berhasil dihapus.");
        void loadCabang(undefined, "refresh");
      }

      if (deleteTarget.kind === "tempat") {
        await api.masterData.deleteTempat(deleteTarget.tempat.id_tempat);
        tempatResource.invalidate();

        if (selectedTempat?.id_tempat === deleteTarget.tempat.id_tempat) {
          jadwalResource.invalidate();
          setSelectedTempat(null);
        }

        toast.success("Tempat berhasil dihapus.");
        void tempatResource.refetch("background");
      }

      if (deleteTarget.kind === "jadwal") {
        await api.jadwal.delete(deleteTarget.jadwal.id_jadwal);
        jadwalResource.invalidate();
        toast.success("Jadwal berhasil dihapus.");
        void jadwalResource.refetch("background");
      }

      setDeleteTarget(null);
    } catch (err) {
      const fallback =
        deleteTarget.kind === "cabang"
          ? "Gagal menghapus cabang."
          : deleteTarget.kind === "tempat"
            ? "Gagal menghapus tempat."
            : "Gagal menghapus jadwal.";
      toast.error(handleApiError(err, fallback));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 text-[#153E35] sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 rounded-[12px] bg-[#0F3D31] px-5 py-5 text-white shadow-[0_14px_36px_rgba(15,61,49,0.18)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <p className="text-[13px] font-black uppercase tracking-[0.12em] text-[#9FE6BC]">Master Data</p>
          <h1 className="mt-1 text-[28px] font-black leading-tight sm:text-[34px]">
            Manajemen Cabang, Tempat & Jadwal
          </h1>
          <p className="mt-2 max-w-[760px] text-[14px] font-semibold leading-6 text-[#D7F4E2]">
            Kelola struktur lokasi secara bertahap: pilih cabang, lanjutkan tempat, lalu atur slot jadwal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCabangDialog({ mode: "create" })}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#F5A400] px-4 text-[14px] font-black text-[#173B34] transition hover:bg-[#FFC04D]"
        >
          <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
          Tambah Cabang
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.05fr)_minmax(300px,1fr)]">
        <CabangPanel
          cabangs={cabangs}
          pagination={cabangResponse.pagination}
          currentPage={cabangPage}
          totalPages={cabangTotalPages}
          search={cabangSearch}
          loading={cabangLoading}
          refreshing={cabangRefreshing}
          error={cabangError}
          selectedCabang={selectedCabang}
          onSearchChange={(value) => {
            setCabangSearch(value);
            setCabangPage(1);
          }}
          onResetSearch={resetCabangSearch}
          onPageChange={setCabangPage}
          onRefresh={() => void loadCabang(undefined, "refresh")}
          onSelect={selectCabang}
          onCreate={() => setCabangDialog({ mode: "create" })}
          onEdit={(cabang) => setCabangDialog({ mode: "edit", cabang })}
          onDelete={(cabang) => setDeleteTarget({ kind: "cabang", cabang })}
        />

        <TempatPanel
          selectedCabangName={selectedCabangName}
          selectedCabangId={selectedCabangId}
          tempats={tempats}
          pagination={tempatResponse.pagination}
          currentPage={tempatPage}
          totalPages={tempatTotalPages}
          search={tempatSearch}
          statusFilter={tempatStatusFilter}
          loading={tempatResource.loading}
          refreshing={tempatResource.refreshing}
          error={tempatResource.error ? getApiDisplayMessage(tempatResource.error, "Gagal memuat data tempat.") : null}
          selectedTempat={selectedTempat}
          onSearchChange={(value) => {
            setTempatSearch(value);
            setTempatPage(1);
          }}
          onStatusChange={(value) => {
            setTempatStatusFilter(value);
            setTempatPage(1);
          }}
          onResetFilters={resetTempatFilters}
          onPageChange={setTempatPage}
          onRefresh={() => void tempatResource.refetch("foreground")}
          onSelect={selectTempat}
          onCreate={() => setTempatDialog({ mode: "create" })}
          onEdit={(tempat) => setTempatDialog({ mode: "edit", tempat })}
          onDelete={(tempat) => setDeleteTarget({ kind: "tempat", tempat })}
        />

        <JadwalPanel
          selectedTempatName={selectedTempatName}
          selectedTempatId={selectedTempatId}
          jadwals={jadwals}
          pagination={jadwalResponse.pagination}
          currentPage={jadwalPage}
          totalPages={jadwalTotalPages}
          loading={jadwalResource.loading}
          refreshing={jadwalResource.refreshing}
          error={jadwalResource.error ? getApiDisplayMessage(jadwalResource.error, "Gagal memuat data jadwal.") : null}
          onPageChange={setJadwalPage}
          onRefresh={() => void jadwalResource.refetch("foreground")}
          onCreate={() => setJadwalDialog({ mode: "create" })}
          onEdit={(jadwal) => setJadwalDialog({ mode: "edit", jadwal })}
          onDelete={(jadwal) => setDeleteTarget({ kind: "jadwal", jadwal })}
        />
      </div>

      {cabangDialog ? (
        <CabangFormDialog
          mode={cabangDialog.mode}
          cabang={cabangDialog.cabang}
          loading={submitting}
          onClose={() => setCabangDialog(null)}
          onSubmit={saveCabang}
        />
      ) : null}

      {tempatDialog ? (
        <TempatFormDialog
          mode={tempatDialog.mode}
          tempat={tempatDialog.tempat}
          cabang={selectedCabang}
          loading={submitting}
          onClose={() => setTempatDialog(null)}
          onSubmit={saveTempat}
        />
      ) : null}

      {jadwalDialog ? (
        <JadwalFormDialog
          mode={jadwalDialog.mode}
          jadwal={jadwalDialog.jadwal}
          tempat={selectedTempat}
          loading={submitting}
          onClose={() => setJadwalDialog(null)}
          onSubmit={saveJadwal}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmationDialog
          target={deleteTarget}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function CabangPanel({
  cabangs,
  pagination,
  currentPage,
  totalPages,
  search,
  loading,
  refreshing,
  error,
  selectedCabang,
  onSearchChange,
  onResetSearch,
  onPageChange,
  onRefresh,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  cabangs: Cabang[];
  pagination: PaginationMeta;
  currentPage: number;
  totalPages: number;
  search: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedCabang: Cabang | null;
  onSearchChange: (value: string) => void;
  onResetSearch: () => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSelect: (cabang: Cabang) => void;
  onCreate: () => void;
  onEdit: (cabang: Cabang) => void;
  onDelete: (cabang: Cabang) => void;
}) {
  return (
    <ManagementPanel
      icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
      title="Cabang"
      subtitle={`${pagination.total_items} cabang terdaftar`}
      actionLabel="Tambah"
      onAction={onCreate}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <SearchInput
        value={search}
        placeholder="Cari cabang atau lokasi..."
        onChange={onSearchChange}
        onReset={onResetSearch}
      />

      {error ? <ErrorState message={error} /> : null}
      {loading ? (
        <LoadingState label="Memuat data cabang..." />
      ) : cabangs.length === 0 ? (
        <EmptyState message={search ? "Cabang tidak ditemukan." : "Belum ada cabang."} />
      ) : (
        <div className="grid gap-2">
          {cabangs.map((cabang) => {
            const active = selectedCabang?.id_cabang === cabang.id_cabang;

            return (
              <div
                key={cabang.id_cabang}
                className={`group grid min-w-0 gap-2 rounded-[10px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#3DBE74] bg-[#ECFDF3] shadow-[0_8px_22px_rgba(22,163,74,0.12)]"
                    : "border-[#DCEFE4] bg-white hover:border-[#9FDDBB] hover:bg-[#F8FFFB]"
                }`}
              >
                <button type="button" onClick={() => onSelect(cabang)} className="flex min-w-0 items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-[#174D3D]">{cabang.nama}</p>
                    <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5 text-[#64746F]">{cabang.lokasi}</p>
                  </div>
                  {active ? <Check className="h-5 w-5 shrink-0 text-[#16A34A]" aria-hidden="true" /> : null}
                </button>
                <RowActions
                  onEdit={() => onEdit(cabang)}
                  onDelete={() => onDelete(cabang)}
                  editLabel={`Edit cabang ${cabang.nama}`}
                  deleteLabel={`Hapus cabang ${cabang.nama}`}
                />
              </div>
            );
          })}
        </div>
      )}

      <PaginationSummary pagination={pagination} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </ManagementPanel>
  );
}

function TempatPanel({
  selectedCabangName,
  selectedCabangId,
  tempats,
  pagination,
  currentPage,
  totalPages,
  search,
  statusFilter,
  loading,
  refreshing,
  error,
  selectedTempat,
  onSearchChange,
  onStatusChange,
  onResetFilters,
  onPageChange,
  onRefresh,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  selectedCabangName: string;
  selectedCabangId: number | null;
  tempats: Tempat[];
  pagination: PaginationMeta;
  currentPage: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedTempat: Tempat | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSelect: (tempat: Tempat) => void;
  onCreate: () => void;
  onEdit: (tempat: Tempat) => void;
  onDelete: (tempat: Tempat) => void;
}) {
  return (
    <ManagementPanel
      icon={<Table2 className="h-5 w-5" aria-hidden="true" />}
      title="Tempat"
      subtitle={selectedCabangId ? `Cabang aktif: ${selectedCabangName}` : "Pilih cabang untuk melihat tempat"}
      actionLabel="Tambah"
      onAction={onCreate}
      actionDisabled={!selectedCabangId}
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshDisabled={!selectedCabangId}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
        <SearchInput
          value={search}
          placeholder="Cari nomor meja..."
          onChange={onSearchChange}
          onReset={onResetFilters}
          disabled={!selectedCabangId}
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          disabled={!selectedCabangId}
          className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[14px] font-bold text-[#23313A] outline-none transition focus:border-[#21684E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="all">Semua status</option>
          {TEMPAT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {toTitleCase(status)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onResetFilters}
          disabled={!selectedCabangId || (!search && statusFilter === "all")}
          className="flex h-11 items-center justify-center rounded-[9px] border border-[#CFE8DA] bg-white px-3 text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Reset filter tempat"
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!selectedCabangId ? (
        <EmptyState message="Pilih cabang terlebih dahulu." />
      ) : error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState label="Memuat data tempat..." />
      ) : tempats.length === 0 ? (
        <EmptyState message="Belum ada tempat untuk cabang ini." />
      ) : (
        <div className="grid gap-2">
          {tempats.map((tempat) => {
            const active = selectedTempat?.id_tempat === tempat.id_tempat;

            return (
              <div
                key={tempat.id_tempat}
                className={`grid min-w-0 gap-3 rounded-[10px] border px-3 py-3 text-left transition ${
                  active ? "border-[#3DBE74] bg-[#ECFDF3]" : "border-[#DCEFE4] bg-white hover:border-[#9FDDBB] hover:bg-[#F8FFFB]"
                }`}
              >
                <button type="button" onClick={() => onSelect(tempat)} className="flex min-w-0 items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-[#174D3D]">Meja {tempat.nomor_meja}</p>
                    <p className="mt-1 text-[13px] font-bold text-[#64746F]">{formatCurrency(tempat.harga)}</p>
                  </div>
                  <StatusBadge status={tempat.status} />
                </button>
                <RowActions
                  onEdit={() => onEdit(tempat)}
                  onDelete={() => onDelete(tempat)}
                  editLabel={`Edit tempat ${tempat.nomor_meja}`}
                  deleteLabel={`Hapus tempat ${tempat.nomor_meja}`}
                />
              </div>
            );
          })}
        </div>
      )}

      <PaginationSummary pagination={pagination} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} disabled={!selectedCabangId} />
    </ManagementPanel>
  );
}

function JadwalPanel({
  selectedTempatName,
  selectedTempatId,
  jadwals,
  pagination,
  currentPage,
  totalPages,
  loading,
  refreshing,
  error,
  onPageChange,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
}: {
  selectedTempatName: string;
  selectedTempatId: number | null;
  jadwals: Jadwal[];
  pagination: PaginationMeta;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (jadwal: Jadwal) => void;
  onDelete: (jadwal: Jadwal) => void;
}) {
  return (
    <ManagementPanel
      icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
      title="Jadwal"
      subtitle={selectedTempatId ? `Tempat aktif: Meja ${selectedTempatName}` : "Pilih tempat untuk melihat jadwal"}
      actionLabel="Tambah"
      onAction={onCreate}
      actionDisabled={!selectedTempatId}
      refreshing={refreshing}
      onRefresh={onRefresh}
      refreshDisabled={!selectedTempatId}
    >
      {!selectedTempatId ? (
        <EmptyState message="Pilih tempat terlebih dahulu." />
      ) : error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState label="Memuat data jadwal..." />
      ) : jadwals.length === 0 ? (
        <EmptyState message="Belum ada jadwal untuk tempat ini." />
      ) : (
        <div className="grid gap-2">
          {jadwals.map((jadwal) => (
            <div key={jadwal.id_jadwal} className="rounded-[10px] border border-[#DCEFE4] bg-white px-3 py-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-black text-[#174D3D]">
                    {normalizeTime(jadwal.jam_mulai)} - {normalizeTime(jadwal.jam_selesai)}
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-[#64746F]">ID Jadwal #{jadwal.id_jadwal}</p>
                </div>
                <RowActions
                  onEdit={() => onEdit(jadwal)}
                  onDelete={() => onDelete(jadwal)}
                  editLabel={`Edit jadwal ${jadwal.id_jadwal}`}
                  deleteLabel={`Hapus jadwal ${jadwal.id_jadwal}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationSummary pagination={pagination} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} disabled={!selectedTempatId} />
    </ManagementPanel>
  );
}

function ManagementPanel({
  icon,
  title,
  subtitle,
  actionLabel,
  actionDisabled = false,
  refreshing,
  refreshDisabled = false,
  onAction,
  onRefresh,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionDisabled?: boolean;
  refreshing: boolean;
  refreshDisabled?: boolean;
  onAction: () => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[12px] border border-[#DCEFE4] bg-white/90 p-4 shadow-[0_12px_32px_rgba(15,76,62,0.08)]">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-[#ECFDF3] text-[#21684E]">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-black text-[#174D3D]">{title}</h2>
            <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-5 text-[#64746F]">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled || refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#CFE8DA] bg-white text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Refresh ${title}`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] bg-[#21684E] px-3 text-[13px] font-black text-white transition hover:bg-[#2B7A5D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
            {actionLabel}
          </button>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SearchInput({
  value,
  placeholder,
  disabled = false,
  onChange,
  onReset,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7C918A]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] pl-10 pr-10 text-[14px] font-bold text-[#23313A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#21684E] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      />
      {value ? (
        <button
          type="button"
          onClick={onReset}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#64746F] transition hover:bg-[#E8F8EF] hover:text-[#174D3D]"
          aria-label="Reset pencarian"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#EEF6FF] text-[#2563EB] transition hover:bg-[#DBEAFE]"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={deleteLabel}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#FEF2F2] text-[#DC2626] transition hover:bg-[#FEE2E2]"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const className =
    normalized === "available"
      ? "bg-[#DCFCE7] text-[#15803D]"
      : normalized === "maintenance"
        ? "bg-[#FEF3C7] text-[#B45309]"
        : normalized === "occupied" || normalized === "booked"
          ? "bg-[#DBEAFE] text-[#1D4ED8]"
          : "bg-[#FEE2E2] text-[#B91C1C]";

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${className}`}>
      {normalized || "unknown"}
    </span>
  );
}

function CabangFormDialog({
  mode,
  cabang,
  loading,
  onClose,
  onSubmit,
}: {
  mode: DialogMode;
  cabang?: Cabang;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: CabangCreatePayload | CabangUpdatePayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nama: cabang?.nama ?? "",
    lokasi: cabang?.lokasi ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      nama: form.nama.trim(),
      lokasi: form.lokasi.trim(),
    };

    if (!payload.nama || !payload.lokasi) {
      setError("Nama dan lokasi cabang wajib diisi.");
      return;
    }

    setError(null);
    await onSubmit(payload);
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="w-full max-w-[460px] rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)]">
        <DialogHeader title={mode === "edit" ? "Edit Cabang" : "Tambah Cabang"} onClose={onClose} />
        {error ? <FormError message={error} /> : null}
        <div className="mt-4 grid gap-3">
          <TextField label="Nama Cabang" value={form.nama} onChange={(value) => setForm((current) => ({ ...current, nama: value }))} required maxLength={255} />
          <TextField label="Lokasi" value={form.lokasi} onChange={(value) => setForm((current) => ({ ...current, lokasi: value }))} required maxLength={255} />
        </div>
        <DialogActions loading={loading} submitLabel={mode === "edit" ? "Simpan Cabang" : "Buat Cabang"} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function TempatFormDialog({
  mode,
  tempat,
  cabang,
  loading,
  onClose,
  onSubmit,
}: {
  mode: DialogMode;
  tempat?: Tempat;
  cabang: Cabang | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: TempatCreatePayload | TempatUpdatePayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    nomor_meja: tempat?.nomor_meja ?? "",
    harga: tempat?.harga ? String(tempat.harga) : "",
    status: tempat?.status ?? "available",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const harga = Number(form.harga);

    if (!cabang) {
      setError("Pilih cabang terlebih dahulu.");
      return;
    }

    if (!form.nomor_meja.trim()) {
      setError("Nomor meja wajib diisi.");
      return;
    }

    if (!Number.isFinite(harga) || harga < 0) {
      setError("Harga harus berupa angka dan tidak boleh negatif.");
      return;
    }

    if (!TEMPAT_STATUS_OPTIONS.includes(form.status as (typeof TEMPAT_STATUS_OPTIONS)[number])) {
      setError("Status tempat tidak valid.");
      return;
    }

    setError(null);
    await onSubmit({
      id_cabang: cabang.id_cabang,
      nomor_meja: form.nomor_meja.trim(),
      harga,
      status: form.status,
    });
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="w-full max-w-[460px] rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)]">
        <DialogHeader title={mode === "edit" ? "Edit Tempat" : "Tambah Tempat"} onClose={onClose} />
        <p className="mt-2 text-[13px] font-bold text-[#64746F]">Cabang: {cabang?.nama ?? "Belum dipilih"}</p>
        {error ? <FormError message={error} /> : null}
        <div className="mt-4 grid gap-3">
          <TextField label="Nomor Meja" value={form.nomor_meja} onChange={(value) => setForm((current) => ({ ...current, nomor_meja: value }))} required maxLength={50} />
          <TextField label="Harga" value={form.harga} type="number" min={0} onChange={(value) => setForm((current) => ({ ...current, harga: value }))} required />
          <label className="grid gap-2">
            <span className="text-[13px] font-black text-[#51645E]">Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[15px] font-bold text-[#23313A] outline-none transition focus:border-[#21684E] focus:bg-white"
            >
              {TEMPAT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {toTitleCase(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DialogActions loading={loading} submitLabel={mode === "edit" ? "Simpan Tempat" : "Buat Tempat"} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function JadwalFormDialog({
  mode,
  jadwal,
  tempat,
  loading,
  onClose,
  onSubmit,
}: {
  mode: DialogMode;
  jadwal?: Jadwal;
  tempat: Tempat | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: JadwalCreatePayload | JadwalUpdatePayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    jam_mulai: normalizeTime(jadwal?.jam_mulai).replace("--:--", ""),
    jam_selesai: normalizeTime(jadwal?.jam_selesai).replace("--:--", ""),
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tempat) {
      setError("Pilih tempat terlebih dahulu.");
      return;
    }

    if (!form.jam_mulai || !form.jam_selesai) {
      setError("Jam mulai dan jam selesai wajib diisi.");
      return;
    }

    if (form.jam_selesai <= form.jam_mulai) {
      setError("Jam selesai harus lebih besar dari jam mulai.");
      return;
    }

    setError(null);
    await onSubmit({
      id_tempat: tempat.id_tempat,
      jam_mulai: form.jam_mulai,
      jam_selesai: form.jam_selesai,
    });
  };

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="w-full max-w-[460px] rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)]">
        <DialogHeader title={mode === "edit" ? "Edit Jadwal" : "Tambah Jadwal"} onClose={onClose} />
        <p className="mt-2 text-[13px] font-bold text-[#64746F]">Tempat: {tempat ? `Meja ${tempat.nomor_meja}` : "Belum dipilih"}</p>
        {error ? <FormError message={error} /> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField label="Jam Mulai" value={form.jam_mulai} type="time" onChange={(value) => setForm((current) => ({ ...current, jam_mulai: value }))} required />
          <TextField label="Jam Selesai" value={form.jam_selesai} type="time" onChange={(value) => setForm((current) => ({ ...current, jam_selesai: value }))} required />
        </div>
        <DialogActions loading={loading} submitLabel={mode === "edit" ? "Simpan Jadwal" : "Buat Jadwal"} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

function DeleteConfirmationDialog({
  target,
  loading,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = getDeleteCopy(target);

  return (
    <ModalShell onClose={onCancel}>
      <div className="w-full max-w-[420px] rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)]">
        <h2 className="text-[22px] font-black text-[#174D3D]">{copy.title}</h2>
        <p className="mt-2 text-[14px] font-semibold leading-6 text-[#53616A]">{copy.description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-[8px] border border-[#BFD9CB] bg-white px-5 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 rounded-[8px] bg-[#F64D4D] px-6 text-[14px] font-black text-white transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-[22px] font-black text-[#174D3D]">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667A75] transition hover:bg-[#EDF7F1] hover:text-[#173D35]"
        aria-label="Tutup dialog"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function DialogActions({
  loading,
  submitLabel,
  onCancel,
}: {
  loading: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="h-10 rounded-[8px] border border-[#BFD9CB] bg-white px-5 text-[14px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="h-10 rounded-[8px] bg-[#21684E] px-6 text-[14px] font-black text-white transition hover:bg-[#2B7A5D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : submitLabel}
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  min,
  maxLength,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[13px] font-black text-[#51645E]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        maxLength={maxLength}
        required={required}
        className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[15px] font-bold text-[#23313A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#21684E] focus:bg-white"
      />
    </label>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[13px] font-bold text-[#B91C1C]">
      {message}
    </div>
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

function PaginationSummary({
  pagination,
  currentPage,
  totalPages,
  disabled = false,
  onPageChange,
}: {
  pagination: PaginationMeta;
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) {
  const start = pagination.total_items === 0 ? 0 : (currentPage - 1) * pagination.limit + 1;
  const end = pagination.total_items === 0 ? 0 : Math.min(start + pagination.limit - 1, pagination.total_items);

  return (
    <div className="flex flex-col gap-3 border-t border-[#E5F3EA] pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-bold text-[#64746F]">
        {start}-{end} dari {pagination.total_items}
      </p>
      <Pagination currentPage={currentPage} totalPages={totalPages} disabled={disabled || totalPages <= 1} onPageChange={onPageChange} />
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  disabled = false,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <div className="flex w-fit overflow-hidden rounded-full bg-white text-[14px] shadow-[0_4px_12px_rgba(15,76,62,0.08)]">
      <PaginationButton label={<ChevronsLeft className="h-4 w-4" aria-hidden="true" />} disabled={disabled || currentPage === 1} onClick={() => onPageChange(1)} />
      <PaginationButton label={<ChevronLeft className="h-4 w-4" aria-hidden="true" />} disabled={disabled || currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} />
      {pages.map((page) => (
        <PaginationButton key={page} label={page} active={page === currentPage} disabled={disabled} onClick={() => onPageChange(page)} />
      ))}
      <PaginationButton label={<ChevronRight className="h-4 w-4" aria-hidden="true" />} disabled={disabled || currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} />
      <PaginationButton label={<ChevronsRight className="h-4 w-4" aria-hidden="true" />} disabled={disabled || currentPage === totalPages} onClick={() => onPageChange(totalPages)} />
    </div>
  );
}

function PaginationButton({
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  label: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 min-w-9 items-center justify-center border-l border-[#D8E8DF] px-2.5 first:border-l-0 transition disabled:cursor-not-allowed disabled:text-[#B6C1D0] ${
        active ? "bg-[#ECFDF3] font-black text-[#174D3D]" : "font-semibold text-[#111827] hover:bg-[#ECFDF3]"
      }`}
    >
      {label}
    </button>
  );
}

function createEmptyPaginatedResponse<T>(page = 1, limit = ITEMS_PER_PAGE): PaginatedResponse<T> {
  return {
    data: [],
    pagination: {
      ...EMPTY_PAGINATION,
      page,
      limit,
    },
  };
}

function getApiDisplayMessage(err: unknown, fallbackMessage: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "Sesi berakhir. Silakan login kembali.";
    }

    if (err.status === 403) {
      return "Kamu tidak punya akses untuk mengelola master data.";
    }

    if (err.status === 404) {
      return "Data yang dipilih tidak ditemukan.";
    }

    return err.message || fallbackMessage;
  }

  return err instanceof Error ? err.message : fallbackMessage;
}

function mergeById<T extends Record<K, number>, K extends keyof T>(items: T[], item: T, key: K) {
  const exists = items.some((current) => current[key] === item[key]);

  if (!exists) {
    return [item, ...items].slice(0, ITEMS_PER_PAGE);
  }

  return items.map((current) => (current[key] === item[key] ? item : current));
}

function getDeleteCopy(target: DeleteTarget) {
  if (target.kind === "cabang") {
    return {
      title: "Hapus Cabang",
      description: `Cabang "${target.cabang.nama}" akan dihapus. Tempat dan jadwal terkait bisa ikut terdampak jika backend membatasi relasi data.`,
    };
  }

  if (target.kind === "tempat") {
    return {
      title: "Hapus Tempat",
      description: `Tempat "Meja ${target.tempat.nomor_meja}" akan dihapus dari cabang aktif.`,
    };
  }

  return {
    title: "Hapus Jadwal",
    description: `Jadwal ${normalizeTime(target.jadwal.jam_mulai)} - ${normalizeTime(target.jadwal.jam_selesai)} akan dihapus.`,
  };
}

function getPaginationPages(currentPage: number, totalPages: number) {
  const maxPages = 4;
  const half = Math.floor(maxPages / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxPages - 1);
  start = Math.max(1, end - maxPages + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
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

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}
