from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from datetime import date, time
from decimal import Decimal

from sqlalchemy import select

from app.core.security import validate_password_strength
from app.db.session import SessionLocal
from app.models import (
    Cabang,
    Jadwal,
    Laporan,
    Payment,
    PaymentLog,
    Permission,
    Refund,
    Reservasi,
    Role,
    Tempat,
    User,
    UserRole,
)


def _build_user(*, nama: str, email: str, password: str, no_hp: str) -> User:
    validate_password_strength(password)
    user = User(
        nama=nama,
        email=email,
        password="",
        no_hp=no_hp,
    )
    user.set_password(password)
    return user


def seed_dummy_data() -> None:
    """Insert a small, consistent dummy dataset for local development."""
    with SessionLocal() as db:
        existing_user = db.scalar(select(User.id_user).limit(1))
        if existing_user is not None:
            print("Dummy data already exists. Skipping seed.")
            return

        cabang_list = [
            Cabang(nama="Cabang Jakarta", lokasi="Jakarta"),
            Cabang(nama="Cabang Bandung", lokasi="Bandung"),
            Cabang(nama="Cabang Malang", lokasi="Malang"),
        ]
        db.add_all(cabang_list)
        db.flush()

        role_owner = Role(nama_role="owner")
        role_admin = Role(nama_role="admin")
        role_user = Role(nama_role="user")
        db.add_all([role_owner, role_admin, role_user])
        db.flush()

        users = [
            _build_user(
                nama="Ahmad",
                email="ahmad@example.com",
                password="123123123",
                no_hp="081200000001",
            ),
            _build_user(
                nama="Qeis",
                email="qeis@example.com",
                password="123123123",
                no_hp="081200000002",
            ),
            _build_user(
                nama="Ruviera",
                email="ruviera@example.com",
                password="123123123",
                no_hp="081200000003",
            ),
            _build_user(
                nama="Alvaro",
                email="alvaro@example.com",
                password="123123123",
                no_hp="081200000004",
            ),
            _build_user(
                nama="Zalfa",
                email="zalfa@example.com",
                password="123123123",
                no_hp="081200000005",
            ),
            _build_user(
                nama="Ahabadin",
                email="ahabadin@example.com",
                password="123123123",
                no_hp="081200000006",
            ),
            _build_user(
                nama="Salman",
                email="salman@example.com",
                password="123123123",
                no_hp="081200000007",
            ),
            _build_user(
                nama="Newt",
                email="newt@example.com",
                password="123123123",
                no_hp="081200000008",
            ),
            _build_user(
                nama="Thomas",
                email="thomas@example.com",
                password="123123123",
                no_hp="081200000009",
            ),
            _build_user(
                nama="Adinda",
                email="adinda@example.com",
                password="123123123",
                no_hp="081200000010",
            ),
        ]
        db.add_all(users)
        db.flush()

        tempat_list = [
            Tempat(id_cabang=cabang_list[0].id_cabang, nomor_meja="A01", harga=Decimal("150000.00"), status="available"),
            Tempat(id_cabang=cabang_list[0].id_cabang, nomor_meja="A02", harga=Decimal("160000.00"), status="available"),
            Tempat(id_cabang=cabang_list[0].id_cabang, nomor_meja="VIP1", harga=Decimal("350000.00"), status="available"),
            Tempat(id_cabang=cabang_list[1].id_cabang, nomor_meja="B01", harga=Decimal("180000.00"), status="available"),
            Tempat(id_cabang=cabang_list[1].id_cabang, nomor_meja="B02", harga=Decimal("190000.00"), status="booked"),
            Tempat(id_cabang=cabang_list[1].id_cabang, nomor_meja="B03", harga=Decimal("200000.00"), status="available"),
            Tempat(id_cabang=cabang_list[2].id_cabang, nomor_meja="C01", harga=Decimal("210000.00"), status="available"),
            Tempat(id_cabang=cabang_list[2].id_cabang, nomor_meja="C02", harga=Decimal("220000.00"), status="booked"),
            Tempat(id_cabang=cabang_list[2].id_cabang, nomor_meja="C03", harga=Decimal("230000.00"), status="available"),
            Tempat(id_cabang=cabang_list[2].id_cabang, nomor_meja="V01", harga=Decimal("300000.00"), status="available"),
        ]
        db.add_all(tempat_list)
        db.flush()

        permissions = [
            Permission(id_role=role_owner.id_role, nama_permission="manage_users"),
            Permission(id_role=role_owner.id_role, nama_permission="manage_roles"),
            Permission(id_role=role_owner.id_role, nama_permission="view_reports"),
            Permission(id_role=role_admin.id_role, nama_permission="manage_branches"),
            Permission(id_role=role_admin.id_role, nama_permission="manage_tables"),
            Permission(id_role=role_admin.id_role, nama_permission="manage_schedules"),
            Permission(id_role=role_admin.id_role, nama_permission="manage_payments"),
            Permission(id_role=role_user.id_role, nama_permission="create_reservations"),
            Permission(id_role=role_user.id_role, nama_permission="view_reservations"),
            Permission(id_role=role_user.id_role, nama_permission="request_refunds"),
        ]
        db.add_all(permissions)

        db.add_all(
            [
                UserRole(id_user=users[0].id_user, id_role=role_owner.id_role),
                UserRole(id_user=users[1].id_user, id_role=role_admin.id_role),
                UserRole(id_user=users[2].id_user, id_role=role_user.id_role),
                UserRole(id_user=users[3].id_user, id_role=role_user.id_role),
                UserRole(id_user=users[4].id_user, id_role=role_admin.id_role),
                UserRole(id_user=users[5].id_user, id_role=role_user.id_role),
                UserRole(id_user=users[6].id_user, id_role=role_user.id_role),
                UserRole(id_user=users[7].id_user, id_role=role_admin.id_role),
                UserRole(id_user=users[8].id_user, id_role=role_user.id_role),
                UserRole(id_user=users[9].id_user, id_role=role_user.id_role),
            ]
        )

        jadwal_list = [
            Jadwal(id_tempat=tempat_list[0].id_tempat, tanggal=date(2026, 4, 10), jam_mulai=time(9, 0), jam_selesai=time(11, 0)),
            Jadwal(id_tempat=tempat_list[1].id_tempat, tanggal=date(2026, 4, 10), jam_mulai=time(11, 0), jam_selesai=time(13, 0)),
            Jadwal(id_tempat=tempat_list[2].id_tempat, tanggal=date(2026, 4, 11), jam_mulai=time(13, 0), jam_selesai=time(15, 0)),
            Jadwal(id_tempat=tempat_list[3].id_tempat, tanggal=date(2026, 4, 11), jam_mulai=time(15, 0), jam_selesai=time(17, 0)),
            Jadwal(id_tempat=tempat_list[4].id_tempat, tanggal=date(2026, 4, 12), jam_mulai=time(10, 0), jam_selesai=time(12, 0)),
            Jadwal(id_tempat=tempat_list[5].id_tempat, tanggal=date(2026, 4, 12), jam_mulai=time(12, 0), jam_selesai=time(14, 0)),
            Jadwal(id_tempat=tempat_list[6].id_tempat, tanggal=date(2026, 4, 13), jam_mulai=time(14, 0), jam_selesai=time(16, 0)),
            Jadwal(id_tempat=tempat_list[7].id_tempat, tanggal=date(2026, 4, 13), jam_mulai=time(16, 0), jam_selesai=time(18, 0)),
            Jadwal(id_tempat=tempat_list[8].id_tempat, tanggal=date(2026, 4, 14), jam_mulai=time(18, 0), jam_selesai=time(20, 0)),
            Jadwal(id_tempat=tempat_list[9].id_tempat, tanggal=date(2026, 4, 14), jam_mulai=time(20, 0), jam_selesai=time(22, 0)),
        ]
        db.add_all(jadwal_list)
        db.flush()

        laporan_list = [
            Laporan(tipe="harian", lampiran="laporan_harian_01.pdf", dibuat_oleh=users[0].id_user),
            Laporan(tipe="mingguan", lampiran="laporan_mingguan_02.pdf", dibuat_oleh=users[1].id_user),
            Laporan(tipe="bulanan", lampiran="laporan_bulanan_03.pdf", dibuat_oleh=users[2].id_user),
            Laporan(tipe="audit", lampiran="laporan_audit_04.pdf", dibuat_oleh=users[3].id_user),
            Laporan(tipe="operasional", lampiran="laporan_operasional_05.pdf", dibuat_oleh=users[4].id_user),
            Laporan(tipe="keuangan", lampiran="laporan_keuangan_06.pdf", dibuat_oleh=users[5].id_user),
            Laporan(tipe="harian", lampiran="laporan_harian_07.pdf", dibuat_oleh=users[6].id_user),
            Laporan(tipe="mingguan", lampiran="laporan_mingguan_08.pdf", dibuat_oleh=users[7].id_user),
            Laporan(tipe="bulanan", lampiran="laporan_bulanan_09.pdf", dibuat_oleh=users[8].id_user),
            Laporan(tipe="audit", lampiran="laporan_audit_10.pdf", dibuat_oleh=users[9].id_user),
        ]
        db.add_all(laporan_list)

        reservasi_list = [
            Reservasi(id_user=users[0].id_user, id_jadwal=jadwal_list[0].id_jadwal, status="confirmed", total_harga=Decimal("150000.00")),
            Reservasi(id_user=users[1].id_user, id_jadwal=jadwal_list[1].id_jadwal, status="pending", total_harga=Decimal("160000.00")),
            Reservasi(id_user=users[2].id_user, id_jadwal=jadwal_list[2].id_jadwal, status="cancelled", total_harga=Decimal("170000.00")),
            Reservasi(id_user=users[3].id_user, id_jadwal=jadwal_list[3].id_jadwal, status="confirmed", total_harga=Decimal("180000.00")),
            Reservasi(id_user=users[4].id_user, id_jadwal=jadwal_list[4].id_jadwal, status="completed", total_harga=Decimal("190000.00")),
            Reservasi(id_user=users[5].id_user, id_jadwal=jadwal_list[5].id_jadwal, status="pending", total_harga=Decimal("200000.00")),
            Reservasi(id_user=users[6].id_user, id_jadwal=jadwal_list[6].id_jadwal, status="confirmed", total_harga=Decimal("210000.00")),
            Reservasi(id_user=users[7].id_user, id_jadwal=jadwal_list[7].id_jadwal, status="completed", total_harga=Decimal("220000.00")),
            Reservasi(id_user=users[8].id_user, id_jadwal=jadwal_list[8].id_jadwal, status="confirmed", total_harga=Decimal("230000.00")),
            Reservasi(id_user=users[9].id_user, id_jadwal=jadwal_list[9].id_jadwal, status="pending", total_harga=Decimal("350000.00")),
        ]
        db.add_all(reservasi_list)
        db.flush()

        payments = [
            Payment(id_reservasi=reservasi_list[0].id_reservasi, amount=Decimal("150000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[1].id_reservasi, amount=Decimal("160000.00"), status="unpaid"),
            Payment(id_reservasi=reservasi_list[2].id_reservasi, amount=Decimal("170000.00"), status="refunded"),
            Payment(id_reservasi=reservasi_list[3].id_reservasi, amount=Decimal("180000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[4].id_reservasi, amount=Decimal("190000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[5].id_reservasi, amount=Decimal("200000.00"), status="pending"),
            Payment(id_reservasi=reservasi_list[6].id_reservasi, amount=Decimal("210000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[7].id_reservasi, amount=Decimal("220000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[8].id_reservasi, amount=Decimal("230000.00"), status="paid"),
            Payment(id_reservasi=reservasi_list[9].id_reservasi, amount=Decimal("350000.00"), status="pending"),
        ]
        db.add_all(payments)
        db.flush()

        payment_logs = [
            PaymentLog(id_payment=payments[0].id_payment, response='{"gateway":"midtrans","status":"success","reference":"PAY-001"}'),
            PaymentLog(id_payment=payments[1].id_payment, response='{"gateway":"midtrans","status":"waiting","reference":"PAY-002"}'),
            PaymentLog(id_payment=payments[2].id_payment, response='{"gateway":"midtrans","status":"refund","reference":"PAY-003"}'),
            PaymentLog(id_payment=payments[3].id_payment, response='{"gateway":"xendit","status":"success","reference":"PAY-004"}'),
            PaymentLog(id_payment=payments[4].id_payment, response='{"gateway":"xendit","status":"success","reference":"PAY-005"}'),
            PaymentLog(id_payment=payments[5].id_payment, response='{"gateway":"xendit","status":"pending","reference":"PAY-006"}'),
            PaymentLog(id_payment=payments[6].id_payment, response='{"gateway":"midtrans","status":"success","reference":"PAY-007"}'),
            PaymentLog(id_payment=payments[7].id_payment, response='{"gateway":"midtrans","status":"success","reference":"PAY-008"}'),
            PaymentLog(id_payment=payments[8].id_payment, response='{"gateway":"xendit","status":"success","reference":"PAY-009"}'),
            PaymentLog(id_payment=payments[9].id_payment, response='{"gateway":"xendit","status":"pending","reference":"PAY-010"}'),
        ]
        db.add_all(payment_logs)

        refunds = [
            Refund(id_payment=payments[0].id_payment, amount=Decimal("50000.00"), status="rejected"),
            Refund(id_payment=payments[1].id_payment, amount=Decimal("80000.00"), status="pending"),
            Refund(id_payment=payments[2].id_payment, amount=Decimal("170000.00"), status="approved"),
            Refund(id_payment=payments[3].id_payment, amount=Decimal("25000.00"), status="rejected"),
            Refund(id_payment=payments[4].id_payment, amount=Decimal("40000.00"), status="pending"),
            Refund(id_payment=payments[5].id_payment, amount=Decimal("100000.00"), status="pending"),
            Refund(id_payment=payments[6].id_payment, amount=Decimal("30000.00"), status="rejected"),
            Refund(id_payment=payments[7].id_payment, amount=Decimal("50000.00"), status="approved"),
            Refund(id_payment=payments[8].id_payment, amount=Decimal("60000.00"), status="pending"),
            Refund(id_payment=payments[9].id_payment, amount=Decimal("120000.00"), status="pending"),
        ]
        db.add_all(refunds)

        db.commit()
        print("Dummy data inserted successfully.")


if __name__ == "__main__":
    seed_dummy_data()
