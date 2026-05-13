"use client";

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  UserRound,
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
  type AuthResponse,
  type PaginationMeta,
  type RegisterPayload,
  type UserUpdatePayload,
  type UserWithAccess,
} from "@/lib/api";

type UserDialogMode = "create" | "edit";

type UserFormState = {
  nama: string;
  email: string;
  no_hp: string;
  password: string;
};

const ITEMS_PER_PAGE = 6;
const EMPTY_USERS: UserWithAccess[] = [];
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: ITEMS_PER_PAGE,
  total_items: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
};
const initialFormState: UserFormState = {
  nama: "",
  email: "",
  no_hp: "",
  password: "",
};

export default function AdminUsersPage() {
  return (
    <AppShell role="admin">
      <AdminUsersContent />
    </AppShell>
  );
}

function AdminUsersContent() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<UserWithAccess[]>(EMPTY_USERS);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogMode, setDialogMode] = useState<UserDialogMode | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithAccess | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWithAccess | null>(null);
  const [form, setForm] = useState<UserFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
          return "Kamu tidak punya akses untuk mengelola data user.";
        }

        if (err.status === 404) {
          return "Data user tidak ditemukan.";
        }

        return err.message || fallbackMessage;
      }

      return err instanceof Error ? err.message : fallbackMessage;
    },
    [router],
  );

  const loadUsers = useCallback(
    async (signal?: AbortSignal, mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await api.auth.listUsersPaginated({
          signal,
          query: {
            page,
            limit: ITEMS_PER_PAGE,
            search: debouncedSearchQuery || undefined,
            role: roleFilter === "all" ? undefined : roleFilter,
          },
        });
        if (!signal?.aborted) {
          setUsers(result.data);
          setPagination(result.pagination);
        }
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        const message = handleApiError(err, "Gagal memuat data user.");
        setError(message);
        toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [debouncedSearchQuery, handleApiError, page, roleFilter, toast],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadUsers]);

  const roleOptions = useMemo(() => buildRoleOptions(users), [users]);
  const filteredUsers = useMemo(
    () => filterUsers(users, "", "all", statusFilter),
    [statusFilter, users],
  );
  const canUseBackendPagination = statusFilter !== "inactive";
  const totalItems = canUseBackendPagination ? pagination.total_items : filteredUsers.length;
  const activeUsers = canUseBackendPagination
    ? totalItems
    : users.filter((user) => normalizeStatus(user.status) === "active").length;
  const adminUsers = users.filter((user) => user.roles.some((role) => normalizeRole(role) === "admin")).length;
  const regularUsers = users.filter((user) => user.roles.some((role) => normalizeRole(role) === "user")).length;
  const totalPages = Math.max(
    1,
    canUseBackendPagination ? pagination.total_pages || 1 : Math.ceil(filteredUsers.length / ITEMS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    if (canUseBackendPagination) {
      return filteredUsers;
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [canUseBackendPagination, currentPage, filteredUsers]);
  const showingStart = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = totalItems === 0 ? 0 : Math.min(showingStart + paginatedUsers.length - 1, totalItems);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const updateRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
    toast.info("Filter data user direset.");
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingUser(null);
    setForm(initialFormState);
  };

  const openEditDialog = (user: UserWithAccess) => {
    setDialogMode("edit");
    setEditingUser(user);
    setForm({
      nama: user.nama,
      email: user.email,
      no_hp: user.no_hp,
      password: "",
    });
  };

  const closeDialog = () => {
    if (submitting) {
      return;
    }

    setDialogMode(null);
    setEditingUser(null);
    setForm(initialFormState);
  };

  const submitUserForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dialogMode) {
      return;
    }

    const normalizedForm = {
      nama: form.nama.trim(),
      email: form.email.trim(),
      no_hp: form.no_hp.trim(),
      password: form.password,
    };

    if (!normalizedForm.nama || !normalizedForm.email || !normalizedForm.no_hp) {
      toast.warning("Nama, email, dan nomor HP wajib diisi.");
      return;
    }

    if (dialogMode === "create" && normalizedForm.password.length < 8) {
      toast.warning("Password minimal 8 karakter.");
      return;
    }

    setSubmitting(true);

    try {
      if (dialogMode === "create") {
        const payload: RegisterPayload = normalizedForm;
        const created = await api.auth.register(payload);
        const createdUser = authResponseToUser(created);

        setUsers((current) => [createdUser, ...current.filter((user) => user.id_user !== createdUser.id_user)]);
        toast.success("User baru berhasil ditambahkan.");
      } else if (editingUser) {
        const payload: UserUpdatePayload = {
          nama: normalizedForm.nama,
          email: normalizedForm.email,
          no_hp: normalizedForm.no_hp,
        };
        const updated = await api.auth.updateUser(editingUser.id_user, payload);

        setUsers((current) =>
          current.map((user) => (user.id_user === updated.id_user ? updated : user)),
        );
        toast.success("Data user berhasil diperbarui.");
      }

      closeDialog();
      void loadUsers(undefined, "refresh");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal menyimpan data user."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) {
      return;
    }

    if (deleteTarget.id_user === currentUserId) {
      toast.warning("Akun yang sedang digunakan tidak bisa dihapus dari sesi ini.");
      setDeleteTarget(null);
      return;
    }

    setDeletingId(deleteTarget.id_user);

    try {
      await api.auth.deleteUser(deleteTarget.id_user);
      setUsers((current) => current.filter((user) => user.id_user !== deleteTarget.id_user));
      toast.success("User berhasil dihapus.");
      setDeleteTarget(null);
      void loadUsers(undefined, "refresh");
    } catch (err) {
      toast.error(handleApiError(err, "Gagal menghapus user."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[34px] font-black leading-none text-[#0F4C3E] sm:text-[38px]">Data Users</h1>
            <p className="mt-3 text-[14px] font-bold text-[#6A9484]">
              Kelola akun pengguna langsung dari data API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers(undefined, "refresh")}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#BFD9CB] bg-white px-3 text-[13px] font-black text-[#174D3D] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <section className="mt-7 grid gap-4 rounded-[10px] bg-[#D3F0D6] p-5 shadow-[0_12px_28px_rgba(15,76,62,0.16)] lg:grid-cols-[1fr_auto_auto] lg:items-center lg:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-[#EEFFF4]">
              <UserRound className="h-11 w-11 fill-[#48B250] text-[#48B250]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[34px] font-black leading-none text-[#174D3D] sm:text-[38px]">
                {activeUsers}
                <span className="ml-2 align-middle text-[22px] text-[#4C6B55] sm:text-[24px]">
                  Active Users
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-black text-[#21684E]">
                <SummaryBadge label="Total" value={totalItems} />
                <SummaryBadge label="Admin" value={adminUsers} />
                <SummaryBadge label="User" value={regularUsers} />
              </div>
            </div>
          </div>

          <label className="flex h-[52px] min-w-0 items-center gap-3 rounded-[10px] border border-[#0F172A] bg-[#F8FAFC] px-3 lg:w-[255px]">
            <Search className="h-7 w-7 shrink-0 text-[#B6C1D0]" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => updateSearchQuery(event.target.value)}
              placeholder="Search..."
              className="min-w-0 flex-1 bg-transparent text-[18px] font-bold text-[#23313A] outline-none placeholder:text-[#B6C1D0]"
            />
          </label>

          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[8px] bg-[#49B84E] px-6 text-[18px] font-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.24)] transition hover:bg-[#3EA343]"
          >
            <UserPlus className="h-5 w-5 stroke-[3]" aria-hidden="true" />
            Add User
          </button>
        </section>

        <section className="mt-8 rounded-[10px] bg-[#D3F0D6] p-5 shadow-[0_12px_28px_rgba(15,76,62,0.14)] sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[225px_225px_1fr_auto]">
            <select
              value={roleFilter}
              onChange={(event) => updateRoleFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-[#0F172A] bg-[#E5E7EB] px-4 text-[16px] font-black text-[#1F2937] outline-none"
            >
              <option value="all">All Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {toTitleCase(role)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-[#0F172A] bg-[#E5E7EB] px-4 text-[16px] font-black text-[#1F2937] outline-none"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B6C1D0]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => updateSearchQuery(event.target.value)}
                placeholder="Search..."
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
              <LoadingState label="Memuat data user..." />
            </div>
          ) : users.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="Belum ada data user dari API." />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="User tidak ditemukan untuk filter ini." />
            </div>
          ) : (
            <>
              <div className="mt-4 hidden overflow-x-auto rounded-[10px] bg-white p-5 shadow-[0_4px_12px_rgba(15,76,62,0.08)] md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="text-[22px] font-black text-[#2F3B34]">
                    <tr>
                      <th className="w-[56px] pb-4">No</th>
                      <th className="pb-4">Name</th>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Role</th>
                      <th className="pb-4">Status</th>
                      <th className="w-[260px] pb-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, index) => (
                      <tr key={user.id_user} className="border-t border-[#0F172A] text-[18px] font-semibold text-[#3D4B54]">
                        <td className="py-3">{showingStart + index}</td>
                        <td className="py-3 font-bold">{user.nama}</td>
                        <td className="py-3">
                          <span className="break-all underline decoration-[#94A3B8] underline-offset-2">{user.email}</span>
                        </td>
                        <td className="py-3 capitalize">{formatRoles(user.roles)}</td>
                        <td className="py-3">
                          <UserStatusBadge status={user.status} />
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDialog(user)}
                              className="inline-flex h-9 min-w-[104px] items-center justify-center gap-2 rounded-[10px] bg-[#5CAEF0] px-3 text-[14px] font-black text-[#5B4DF0] transition hover:bg-[#4A9DDE]"
                            >
                              <Pencil className="h-5 w-5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              disabled={user.id_user === currentUserId || deletingId === user.id_user}
                              className="inline-flex h-9 min-w-[104px] items-center justify-center gap-2 rounded-[10px] bg-[#F64D4D] px-3 text-[14px] font-black text-white transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              <Trash2 className="h-5 w-5" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:hidden">
                {paginatedUsers.map((user, index) => (
                  <article key={user.id_user} className="rounded-[10px] bg-white p-4 shadow-[0_4px_12px_rgba(15,76,62,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-[#6B8D70]">#{showingStart + index}</p>
                        <h2 className="mt-1 truncate text-[18px] font-black text-[#23313A]">{user.nama}</h2>
                        <p className="mt-1 break-all text-[14px] font-bold text-[#53616A] underline decoration-[#CBD5E1]">{user.email}</p>
                      </div>
                      <UserStatusBadge status={user.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-[13px] font-bold text-[#53616A]">
                      <InfoItem label="Role" value={formatRoles(user.roles)} />
                      <InfoItem label="No HP" value={user.no_hp || "-"} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDialog(user)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#5CAEF0] text-[14px] font-black text-[#5B4DF0]"
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        disabled={user.id_user === currentUserId || deletingId === user.id_user}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-[#F64D4D] text-[14px] font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {!loading && filteredUsers.length > 0 ? (
            <div className="mt-5 flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[16px] font-bold text-[#6B8D70] sm:text-[20px]">
                Showing {showingStart} to {showingEnd} of {totalItems} users
              </p>
              {totalPages > 1 ? (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {dialogMode ? (
        <UserFormDialog
          mode={dialogMode}
          form={form}
          submitting={submitting}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onClose={closeDialog}
          onSubmit={submitUserForm}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Hapus user?"
          description={`Data ${deleteTarget.nama} akan dihapus dari sistem.`}
          confirmLabel="Delete"
          loading={deletingId === deleteTarget.id_user}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteUser}
        />
      ) : null}
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white/70 px-3 py-1">
      {label}: {value}
    </span>
  );
}

function UserStatusBadge({ status }: { status?: string }) {
  const normalized = normalizeStatus(status);
  const isActive = normalized === "active";

  return (
    <span
      className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-black ${
        isActive ? "bg-[#DCFCE7] text-[#3D4B54]" : "bg-[#E5E7EB] text-[#64748B]"
      }`}
    >
      <CheckCircle className={`h-5 w-5 ${isActive ? "fill-[#48B250] text-white" : "text-[#94A3B8]"}`} aria-hidden="true" />
      {toTitleCase(normalized)}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[8px] bg-[#F8FFFB] px-3 py-2">
      <p className="text-[11px] font-black uppercase text-[#8EA0B8]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-black text-[#23313A]">{value}</p>
    </div>
  );
}

function UserFormDialog({
  mode,
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: UserDialogMode;
  form: UserFormState;
  submitting: boolean;
  onChange: (key: keyof UserFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isCreate = mode === "create";

  return (
    <ModalShell onClose={onClose}>
      <form
        onSubmit={onSubmit}
        className="max-h-[calc(100vh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)] sm:max-h-[calc(100vh-3rem)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-black text-[#174D3D]">{isCreate ? "Add User" : "Edit User"}</h2>
            <p className="mt-1 text-[13px] font-bold text-[#6A9484]">
              {isCreate ? "Buat akun user baru." : "Perbarui profil user."}
            </p>
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
          <FormField
            label="Name"
            value={form.nama}
            onChange={(value) => onChange("nama", value)}
            autoComplete="name"
            required
          />
          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => onChange("email", value)}
            autoComplete="email"
            required
          />
          <FormField
            label="No HP"
            value={form.no_hp}
            onChange={(value) => onChange("no_hp", value)}
            autoComplete="tel"
            minLength={11}
            maxLength={12}
            required
          />
          {isCreate ? (
            <FormField
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => onChange("password", value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          ) : null}
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

function FormField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  minLength,
  maxLength,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  minLength?: number;
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
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        required={required}
        className="h-11 rounded-[9px] border border-[#CFE8DA] bg-[#F8FFFB] px-3 text-[15px] font-bold text-[#23313A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#21684E] focus:bg-white"
      />
    </label>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onCancel}>
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-[420px] overflow-y-auto rounded-[12px] bg-white p-5 text-[#23313A] shadow-[0_24px_70px_rgba(15,76,62,0.25)] sm:max-h-[calc(100vh-3rem)]">
        <h2 className="text-[22px] font-black text-[#174D3D]">{title}</h2>
        <p className="mt-2 text-[14px] font-semibold text-[#53616A]">{description}</p>
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
            {loading ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
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

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <div className="flex w-fit overflow-hidden rounded-full bg-white text-[16px] shadow-[0_4px_12px_rgba(15,76,62,0.08)]">
      <PaginationButton
        label={<ChevronsLeft className="h-4 w-4" aria-hidden="true" />}
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
      />
      <PaginationButton
        label={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      />
      {pages.map((page) => (
        <PaginationButton
          key={page}
          label={page}
          active={page === currentPage}
          onClick={() => onPageChange(page)}
        />
      ))}
      <PaginationButton
        label={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      />
      <PaginationButton
        label={<ChevronsRight className="h-4 w-4" aria-hidden="true" />}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
      />
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
      className={`flex h-11 min-w-10 items-center justify-center border-l border-[#0F172A] px-3 first:border-l-0 transition disabled:cursor-not-allowed disabled:text-[#B6C1D0] ${
        active ? "bg-[#F8FFFB] font-black text-black" : "font-semibold text-[#111827] hover:bg-[#ECFDF3]"
      }`}
    >
      {label}
    </button>
  );
}

function filterUsers(users: UserWithAccess[], keyword: string, roleFilter: string, statusFilter: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return users.filter((user) => {
    const roles = user.roles.map(normalizeRole);
    const status = normalizeStatus(user.status);
    const matchesRole = roleFilter === "all" || roles.includes(roleFilter);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesSearch =
      !normalizedKeyword ||
      [
        String(user.id_user),
        user.nama,
        user.email,
        user.no_hp,
        user.status ?? "Active",
        ...user.roles,
        ...user.permissions,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);

    return matchesRole && matchesStatus && matchesSearch;
  });
}

function buildRoleOptions(users: UserWithAccess[]) {
  const roles = new Set<string>(["admin", "owner", "user"]);

  for (const user of users) {
    for (const role of user.roles) {
      roles.add(normalizeRole(role));
    }
  }

  return Array.from(roles).sort((a, b) => a.localeCompare(b));
}

function authResponseToUser(response: AuthResponse): UserWithAccess {
  return {
    ...response.user,
    roles: response.roles,
    permissions: response.permissions,
    status: "Active",
  };
}

function normalizeRole(role: string) {
  return role.trim().toLowerCase();
}

function normalizeStatus(status?: string) {
  return (status ?? "Active").trim().toLowerCase();
}

function formatRoles(roles: string[]) {
  if (roles.length === 0) {
    return "User";
  }

  return roles.map(toTitleCase).join(", ");
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
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
