from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from datetime import date, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.security import validate_password_strength
from app.db.session import SessionLocal, engine
from app.models import (
    Base,
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

def reset_database():
    """
    Menghapus semua tabel lalu membuat ulang tabel berdasarkan model SQLAlchemy.
    Gunakan hanya untuk development.
    """
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Creating all tables...")
    print("Database reset completed.")


def seed_dummy_data() -> None:
    """Insert a broad, consistent dummy dataset for local development."""
    reset_database()
    with SessionLocal() as db:
        existing_user = db.scalar(select(User.id_user).limit(1))
        if existing_user is not None:
            print("Dummy data already exists. Skipping seed.")
            return

        today = date.today()
        common_password = "123123123A"

        cabang_specs = [
            ("SiBooking Blok M", "Jakarta Selatan"),
            ("SiBooking Depok", "Depok"),
            ("SiBooking Dago", "Bandung"),
            ("SiBooking Darmo", "Surabaya"),
            ("SiBooking Gejayan", "Yogyakarta"),
            ("SiBooking Empty Branch", "Cabang tanpa reservasi untuk empty state"),
        ]
        cabang_list = [Cabang(nama=nama, lokasi=lokasi) for nama, lokasi in cabang_specs]
        db.add_all(cabang_list)
        db.flush()

        role_owner = Role(nama_role="owner")
        role_admin = Role(nama_role="admin")
        role_user = Role(nama_role="user")
        db.add_all([role_owner, role_admin, role_user])
        db.flush()

        user_specs = [
            ("Andre Owner", "owner@sibooking.test", "081200000001"),
            ("Nadia Admin", "admin@sibooking.test", "081200000002"),
            ("Ruviera Manager", "manager@sibooking.test", "081200000003"),
            ("Ahmad Alvaro", "ahmad@gmail.com", "081200000004"),
            ("Zalfa Ismail", "zalfa@gmail.com", "081200000005"),
            ("Ali Ahabadin", "ali@gmail.com", "081200000006"),
            ("Salman Pratama", "salman@gmail.com", "081200000007"),
            ("Nabila Putri", "nabila@gmail.com", "081200000008"),
            ("Dimas Arya", "dimas@gmail.com", "081200000009"),
            ("Adinda Rahma", "adinda@gmail.com", "081200000010"),
            ("Bima Saputra", "bima@gmail.com", "081200000011"),
            ("Citra Lestari", "citra@gmail.com", "081200000012"),
            ("Dewi Kartika", "dewi@gmail.com", "081200000013"),
            ("Eka Nugraha", "eka@gmail.com", "081200000014"),
            ("Fajar Hidayat", "fajar@gmail.com", "081200000015"),
            ("Gita Anggraini", "gita@gmail.com", "081200000016"),
            ("Hana Salsabila", "hana@gmail.com", "081200000017"),
            ("Ivan Mahendra", "ivan@gmail.com", "081200000018"),
            ("Jihan Aulia", "jihan@gmail.com", "081200000019"),
            ("Kevin Wijaya", "kevin@gmail.com", "081200000020"),
        ]
        users = [
            _build_user(
                nama=nama,
                email=email,
                password=common_password,
                no_hp=no_hp,
            )
            for nama, email, no_hp in user_specs
        ]
        db.add_all(users)
        db.flush()

        permission_role_map = {
            "manage_users": role_owner,
            "manage_roles": role_owner,
            "approve_refunds": role_owner,
            "manage_reports": role_owner,
            "view_reports": role_admin,
            "manage_branches": role_admin,
            "manage_tables": role_admin,
            "manage_schedules": role_admin,
            "manage_reservations": role_admin,
            "manage_payments": role_admin,
            "view_locations": role_user,
            "view_schedules": role_user,
            "create_reservations": role_user,
            "view_reservations": role_user,
            "create_payments": role_user,
            "view_payments": role_user,
            "request_refunds": role_user,
        }
        permissions = [
            Permission(id_role=role.id_role, nama_permission=permission)
            for permission, role in permission_role_map.items()
        ]
        db.add_all(permissions)

        role_assignments = [
            (0, [role_owner, role_admin, role_user]),
            (1, [role_admin, role_user]),
            (2, [role_admin, role_user]),
            (3, [role_user]),
            (4, [role_user]),
            (5, [role_user]),
            (6, [role_user]),
            (7, [role_user]),
            (8, [role_user]),
            (9, [role_user]),
            (10, [role_user]),
            (11, [role_user]),
            (12, [role_user]),
            (13, [role_user]),
            (14, [role_user]),
            (15, [role_user]),
            (16, [role_admin, role_user]),
            (17, [role_user]),
            (18, [role_user]),
            (19, [role_user]),
        ]
        db.add_all(
            [
                UserRole(id_user=users[user_index].id_user, id_role=role.id_role)
                for user_index, roles in role_assignments
                for role in roles
            ]
        )

        table_templates = [
            ("REG", Decimal("75000.00"), "available"),
            ("REG", Decimal("85000.00"), "occupied"),
            ("PREM", Decimal("125000.00"), "available"),
            ("PREM", Decimal("135000.00"), "maintenance"),
            ("VIP", Decimal("200000.00"), "available"),
            ("VIP", Decimal("225000.00"), "booked"),
        ]
        tempat_list: list[Tempat] = []
        for branch_index, cabang in enumerate(cabang_list):
            for table_index, (prefix, price, status) in enumerate(table_templates, start=1):
                tempat_list.append(
                    Tempat(
                        id_cabang=cabang.id_cabang,
                        nomor_meja=f"{prefix}-{branch_index + 1}{table_index:02d}",
                        harga=price + Decimal(branch_index * 10000),
                        status=status,
                    )
                )
        db.add_all(tempat_list)
        db.flush()

        slot_templates = [
            (time(9, 0), time(11, 0)),
            (time(11, 0), time(13, 0)),
            (time(13, 0), time(15, 0)),
            (time(15, 0), time(17, 0)),
            (time(17, 0), time(19, 0)),
            (time(19, 0), time(21, 0)),
        ]
        jadwal_list: list[Jadwal] = []
        for tempat in tempat_list:
            for start_time, end_time in slot_templates:
                jadwal_list.append(
                    Jadwal(
                        id_tempat=tempat.id_tempat,
                        jam_mulai=start_time,
                        jam_selesai=end_time,
                    )
                )
        db.add_all(jadwal_list)
        db.flush()

        report_types = [
            "harian",
            "mingguan",
            "bulanan",
            "audit",
            "operasional",
            "keuangan",
            "refund",
            "reservasi",
            "cabang",
            "jadwal",
            "cashflow",
            "inventory",
        ]
        report_makers = [users[0], users[1], users[2], users[16]]
        laporan_list = [
            Laporan(
                tipe=report_type,
                lampiran=f"laporan_{report_type}_{index + 1:02d}.pdf",
                dibuat_oleh=report_makers[index % len(report_makers)].id_user,
            )
            for index, report_type in enumerate(report_types)
        ]
        db.add_all(laporan_list)

        # Keep active reservations unique per table/schedule/date to satisfy
        # uq_reservasi_active_slot while still covering many status cases.
        reservation_statuses = [
            "pending",
            "confirmed",
            "completed",
            "cancelled",
            "declined",
            "no_show",
            "expired",
        ]
        reservasi_list: list[Reservasi] = []
        active_branch_count = len(cabang_list) - 1
        for branch_index in range(active_branch_count):
            branch_tables = tempat_list[branch_index * len(table_templates):(branch_index + 1) * len(table_templates)]
            for table_index, tempat in enumerate(branch_tables):
                table_slots = [
                    jadwal
                    for jadwal in jadwal_list
                    if jadwal.id_tempat == tempat.id_tempat
                ]
                for slot_index, jadwal in enumerate(table_slots[:5]):
                    status = reservation_statuses[(branch_index + table_index + slot_index) % len(reservation_statuses)]
                    day_offset = slot_index - 2 + branch_index
                    if status == "pending":
                        day_offset = abs(day_offset) + 1
                    elif status == "confirmed":
                        day_offset = max(day_offset, 0)
                    total = tempat.harga * Decimal((slot_index % 3) + 1)
                    reservasi_list.append(
                        Reservasi(
                            id_user=users[(branch_index * 4 + table_index + slot_index + 3) % len(users)].id_user,
                            id_tempat=tempat.id_tempat,
                            id_jadwal=jadwal.id_jadwal,
                            tanggal=today + timedelta(days=day_offset),
                            status=status,
                            total_harga=total,
                        )
                    )

        # Explicit edge cases for dashboard and API filtering.
        edge_case_specs = [
            (0, 0, 5, today + timedelta(days=7), "pending", users[3]),
            (0, 1, 5, today + timedelta(days=8), "pending", users[4]),
            (1, 0, 5, today + timedelta(days=1), "pending", users[5]),
            (2, 0, 5, today + timedelta(days=2), "confirmed", users[6]),
            (3, 2, 5, today - timedelta(days=4), "completed", users[7]),
            (4, 3, 5, today - timedelta(days=1), "cancelled", users[8]),
        ]
        for branch_index, table_index, slot_index, booking_date, status, user in edge_case_specs:
            tempat = tempat_list[branch_index * len(table_templates) + table_index]
            jadwal = [
                schedule for schedule in jadwal_list if schedule.id_tempat == tempat.id_tempat
            ][slot_index]
            reservasi_list.append(
                Reservasi(
                    id_user=user.id_user,
                    id_tempat=tempat.id_tempat,
                    id_jadwal=jadwal.id_jadwal,
                    tanggal=booking_date,
                    status=status,
                    total_harga=tempat.harga,
                )
            )

        db.add_all(reservasi_list)
        db.flush()

        payment_status_by_reservation = {
            "pending": ["pending", "unpaid", "failed"],
            "confirmed": ["paid", "paid", "pending"],
            "completed": ["paid", "paid", "refunded"],
            "cancelled": ["refunded", "void", "pending"],
            "declined": ["failed", "refunded", "void"],
            "no_show": ["paid", "refunded"],
            "expired": ["expired", "unpaid"],
        }
        payments: list[Payment] = []
        for index, reservasi in enumerate(reservasi_list):
            statuses = payment_status_by_reservation.get(reservasi.status, ["pending"])
            payment_status = statuses[index % len(statuses)]
            amount = reservasi.total_harga
            if payment_status == "refunded":
                amount = reservasi.total_harga
            elif payment_status == "failed":
                amount = Decimal("0.00")
            payments.append(
                Payment(
                    id_reservasi=reservasi.id_reservasi,
                    amount=amount,
                    status=payment_status,
                )
            )
        db.add_all(payments)
        db.flush()

        gateways = ["midtrans", "xendit", "manual", "cashier"]
        payment_logs = [
            PaymentLog(
                id_payment=payment.id_payment,
                response=(
                    '{"gateway":"%s","status":"%s","reference":"PAY-%04d","amount":"%s"}'
                    % (
                        gateways[index % len(gateways)],
                        payment.status,
                        index + 1,
                        payment.amount,
                    )
                ),
            )
            for index, payment in enumerate(payments)
        ]
        db.add_all(payment_logs)

        refund_statuses = ["pending", "approved", "rejected", "processed"]
        refundable_payments = [
            payment
            for payment in payments
            if payment.status in {"paid", "refunded", "pending", "void"}
        ]
        refunds = [
            Refund(
                id_payment=payment.id_payment,
                amount=min(payment.amount, Decimal("50000.00") + Decimal(index * 5000)),
                status=refund_statuses[index % len(refund_statuses)],
            )
            for index, payment in enumerate(refundable_payments[:30])
        ]
        db.add_all(refunds)

        db.commit()
        print(
            "Dummy data inserted successfully: "
            f"{len(cabang_list)} cabang, {len(tempat_list)} tempat, "
            f"{len(jadwal_list)} jadwal, {len(users)} users, "
            f"{len(reservasi_list)} reservasi, {len(payments)} payments."
        )


if __name__ == "__main__":
    seed_dummy_data()
