"use client";

import { CheckCircle, Pencil, Search, Trash2, UserRound } from "lucide-react";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type UserWithAccess } from "@/lib/api";
import { fallbackUsers } from "@/lib/fallback-data";
import { useApiData } from "@/lib/use-api-data";

export default function AdminUsersPage() {
  const users = useApiData<UserWithAccess[]>(() => api.auth.listUsers(), fallbackUsers);

  const deleteUser = async (user: UserWithAccess) => {
    users.setError(null);
    try {
      await api.auth.deleteUser(user.id_user);
      users.setData((current) => current.filter((item) => item.id_user !== user.id_user));
    } catch (err) {
      users.setError(err instanceof Error ? err.message : "Gagal menghapus user");
    }
  };

  return (
    <AppShell role="admin">
      <div className="w-full max-w-[1160px] px-4 py-6 sm:px-6 md:px-8">
        <h1 className="text-[38px] font-extrabold leading-none text-[#0F4C3E]">Data Users</h1>
        <section className="mt-7 flex min-h-[120px] flex-wrap items-center gap-5 rounded-[8px] bg-[#D3F0D6] px-8 shadow-[0_8px_20px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#EEFFF4]">
              <UserRound className="h-11 w-11 fill-[#48B250] text-[#48B250]" />
            </span>
            <p className="text-[38px] font-black text-[#174D3D]">
              {users.data.length} <span className="text-[24px]">Active Users</span>
            </p>
          </div>
          <label className="ml-auto flex h-[52px] w-[255px] items-center gap-3 rounded-[10px] border border-black bg-[#F8FAFC] px-3">
            <Search className="h-8 w-8 text-[#B6C1D0]" />
            <input placeholder="Search..." className="min-w-0 flex-1 bg-transparent text-[20px] font-bold outline-none placeholder:text-[#B6C1D0]" />
          </label>
          <button className="h-[52px] rounded-[6px] bg-[#49B84E] px-14 text-[20px] font-black text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
            +Add User
          </button>
        </section>

        <section className="mt-9 rounded-[8px] bg-[#D3F0D6] p-6 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
          <div className="flex flex-wrap gap-3">
            <select className="h-[36px] w-[225px] rounded-[10px] border border-black bg-[#E5E7EB] px-5 text-[20px] font-black">
              <option>All Roles</option>
            </select>
            <select className="h-[36px] w-[225px] rounded-[10px] border border-black bg-[#E5E7EB] px-5 text-[20px] font-black">
              <option>Status</option>
            </select>
            <input placeholder="Search..." className="h-[36px] min-w-[280px] flex-1 rounded-[10px] border border-black bg-white px-4 text-[20px] font-bold placeholder:text-[#B6C1D0]" />
          </div>
          {users.error ? <div className="mt-4"><ErrorState message={users.error} /></div> : null}
          {users.loading ? <div className="mt-4"><LoadingState /></div> : null}
          <div className="mt-4 overflow-x-auto rounded-[8px] bg-white p-5">
            <table className="w-full min-w-[900px] text-left">
              <thead className="text-[24px] font-black text-[#2F3B34]">
                <tr>
                  <th>No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.data.map((user, index) => (
                  <tr key={user.id_user} className="border-t border-black text-[24px] text-[#3D4B54]">
                    <td className="py-3">{index + 1}</td>
                    <td className="py-3">{user.nama}</td>
                    <td className="py-3 underline">{user.email}</td>
                    <td className="py-3 capitalize">{user.roles[0] ?? "User"}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-1 text-[16px] font-black">
                        <CheckCircle className="h-5 w-5 fill-[#48B250] text-white" />
                        Active
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button className="flex h-[30px] w-[124px] items-center justify-center gap-2 rounded-[10px] bg-[#5CAEF0] text-[16px] font-black text-[#6C4DFF]">
                          <Pencil className="h-6 w-6" /> Edit
                        </button>
                        <button onClick={() => deleteUser(user)} className="flex h-[30px] w-[124px] items-center justify-center gap-2 rounded-[10px] bg-[#F64D4D] text-[16px] font-black text-white">
                          <Trash2 className="h-6 w-6" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-3">
            <p className="text-[24px] text-[#6B8D70]">Showing 1 to {Math.min(4, users.data.length)} of {users.data.length} users</p>
            <div className="flex overflow-hidden rounded-full bg-white text-[20px]">
              {["‹", "1", "2", "3", "4", "››", "›"].map((item, index) => (
                <button key={`${item}-${index}`} className={`h-11 min-w-10 border-l border-black px-3 first:border-l-0 ${item === "2" ? "font-black" : ""}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
