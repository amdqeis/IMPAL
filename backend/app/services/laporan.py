from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from app.models import Cabang, Laporan, Payment, Reservasi, Tempat, User
from app.repositories import laporan as repo
from app.repositories import users as user_repo
from app.schemas.common import PaginatedResponse, build_paginated_response
from app.schemas.laporan import LaporanCreate, LaporanUpdate


def list_laporan(
    db: Session,
    *,
    page: int,
    limit: int,
    search: str | None = None,
    tipe: str | None = None,
    dibuat_oleh: int | None = None,
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> PaginatedResponse[Laporan]:
    """Return reports using database pagination."""
    items, total_items = repo.list_laporan(
        db,
        page=page,
        limit=limit,
        search=search,
        tipe=tipe,
        dibuat_oleh=dibuat_oleh,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return build_paginated_response(items, page=page, limit=limit, total_items=total_items)


def create_laporan(db: Session, payload: LaporanCreate, *, dibuat_oleh: int | None = None) -> Laporan:
    """Create a report metadata row."""
    data = payload.model_dump()
    if dibuat_oleh is not None:
        data["dibuat_oleh"] = dibuat_oleh

    if not user_repo.get_user_by_id(db, data["dibuat_oleh"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    laporan = Laporan(**data)
    db.add(laporan)
    db.commit()
    db.refresh(laporan)
    return laporan


def update_laporan(db: Session, laporan_id: int, payload: LaporanUpdate) -> Laporan:
    """Patch report metadata."""
    laporan = repo.get_laporan(db, laporan_id)
    if not laporan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laporan tidak ditemukan")

    data = payload.model_dump(exclude_unset=True)
    if "dibuat_oleh" in data and not user_repo.get_user_by_id(db, data["dibuat_oleh"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembuat laporan tidak ditemukan")

    for key, value in data.items():
        setattr(laporan, key, value)

    db.commit()
    db.refresh(laporan)
    return laporan


def generate_laporan_pdf(db: Session, laporan_id: int) -> tuple[bytes, str]:
    """Generate a small PDF report from current database data."""
    laporan = repo.get_laporan(db, laporan_id)
    if not laporan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laporan tidak ditemukan")

    lines = _build_report_lines(db, laporan)
    filename = laporan.lampiran if laporan.lampiran.lower().endswith(".pdf") else f"{laporan.lampiran}.pdf"
    return _build_pdf(lines, title=f"SiBooking - Laporan {laporan.tipe.title()}"), filename


def _build_report_lines(db: Session, laporan: Laporan) -> list[str]:
    maker = user_repo.get_user_by_id(db, laporan.dibuat_oleh)
    total_users = db.scalar(select(func.count(User.id_user))) or 0
    total_branches = db.scalar(select(func.count(Cabang.id_cabang))) or 0
    total_reservations = db.scalar(select(func.count(Reservasi.id_reservasi))) or 0
    total_payments = db.scalar(select(func.count(Payment.id_payment))) or 0
    income_total = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "paid")) or Decimal("0")

    reservation_statuses = db.execute(
        select(Reservasi.status, func.count(Reservasi.id_reservasi))
        .group_by(Reservasi.status)
        .order_by(Reservasi.status)
    ).all()
    payment_statuses = db.execute(
        select(Payment.status, func.count(Payment.id_payment), func.coalesce(func.sum(Payment.amount), 0))
        .group_by(Payment.status)
        .order_by(Payment.status)
    ).all()
    branch_rows = db.execute(
        select(
            Cabang.nama,
            func.count(func.distinct(Reservasi.id_reservasi)),
            func.coalesce(func.sum(case((Payment.status == "paid", Payment.amount), else_=0)), 0),
        )
        .select_from(Cabang)
        .outerjoin(Tempat, Tempat.id_cabang == Cabang.id_cabang)
        .outerjoin(Reservasi, Reservasi.id_tempat == Tempat.id_tempat)
        .outerjoin(Payment, Payment.id_reservasi == Reservasi.id_reservasi)
        .group_by(Cabang.id_cabang, Cabang.nama)
        .order_by(Cabang.nama)
    ).all()
    recent_reservations = db.scalars(
        select(Reservasi)
        .order_by(desc(Reservasi.tanggal), desc(Reservasi.id_reservasi))
        .limit(12)
    ).all()

    lines = [
        f"Nomor laporan: #{laporan.id_laporan}",
        f"Tipe laporan: {laporan.tipe.title()}",
        f"Lampiran: {laporan.lampiran}",
        f"Dibuat oleh: {maker.nama if maker else 'User tidak ditemukan'}",
        f"Dibuat pada: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "Ringkasan Database",
        f"- Total cabang: {total_branches}",
        f"- Total user: {total_users}",
        f"- Total reservasi: {total_reservations}",
        f"- Total pembayaran: {total_payments}",
        f"- Total income paid: {_format_rupiah(income_total)}",
        "",
        "Status Reservasi",
    ]

    lines.extend([f"- {status_value.title()}: {count}" for status_value, count in reservation_statuses] or ["- Belum ada reservasi"])
    lines.append("")
    lines.append("Status Pembayaran")
    lines.extend(
        [
            f"- {status_value.title()}: {count} transaksi, {_format_rupiah(amount)}"
            for status_value, count, amount in payment_statuses
        ]
        or ["- Belum ada pembayaran"]
    )
    lines.append("")
    lines.append("Ringkasan Cabang")
    lines.extend(
        [
            f"- {branch_name}: {reservation_count} reservasi, income {_format_rupiah(income_amount)}"
            for branch_name, reservation_count, income_amount in branch_rows
        ]
        or ["- Belum ada cabang"]
    )
    lines.append("")
    lines.append("Reservasi Terbaru")

    if recent_reservations:
        for reservation in recent_reservations:
            customer = reservation.user.nama if reservation.user else f"User #{reservation.id_user}"
            room = reservation.tempat.nomor_meja if reservation.tempat else f"Tempat #{reservation.id_tempat}"
            branch = reservation.tempat.cabang.nama if reservation.tempat and reservation.tempat.cabang else "-"
            lines.append(
                f"- #{reservation.id_reservasi} {reservation.tanggal} {customer} - {room} ({branch}) "
                f"{reservation.status}, total {_format_rupiah(reservation.total_harga)}"
            )
    else:
        lines.append("- Belum ada reservasi")

    return lines


def _format_rupiah(value: Decimal | int | float) -> str:
    amount = Decimal(value)
    return f"Rp {amount:,.0f}".replace(",", ".")


def _build_pdf(lines: list[str], *, title: str) -> bytes:
    wrapped_lines: list[str] = []
    for line in lines:
        wrapped_lines.extend(_wrap_line(line))

    lines_per_page = 42
    pages = [wrapped_lines[index:index + lines_per_page] for index in range(0, len(wrapped_lines), lines_per_page)]
    if not pages:
        pages = [["Tidak ada data."]]

    page_count = len(pages)
    catalog_id = 1
    pages_id = 2
    font_id = 3
    content_ids = [4 + index * 2 for index in range(page_count)]
    page_ids = [5 + index * 2 for index in range(page_count)]

    objects: dict[int, bytes] = {
        catalog_id: b"<< /Type /Catalog /Pages 2 0 R >>",
        font_id: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    }

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id] = f"<< /Type /Pages /Kids [{kids}] /Count {page_count} >>".encode()

    for index, page_lines in enumerate(pages):
        content = _build_pdf_page_content(title, page_lines, index + 1, page_count)
        content_id = content_ids[index]
        page_id = page_ids[index]
        objects[content_id] = (
            f"<< /Length {len(content)} >>\nstream\n".encode()
            + content
            + b"\nendstream"
        )
        objects[page_id] = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode()

    ordered_objects = [objects[index] for index in range(1, max(objects) + 1)]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []

    for object_number, content in enumerate(ordered_objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{object_number} 0 obj\n".encode())
        pdf.extend(content)
        pdf.extend(b"\nendobj\n")

    xref_position = len(pdf)
    pdf.extend(f"xref\n0 {len(ordered_objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        f"trailer\n<< /Size {len(ordered_objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_position}\n%%EOF\n".encode()
    )
    return bytes(pdf)


def _build_pdf_page_content(title: str, lines: list[str], page_number: int, page_count: int) -> bytes:
    commands = [
        "BT",
        "/F1 18 Tf",
        f"1 0 0 1 50 800 Tm ({_escape_pdf_text(title)}) Tj",
        "/F1 9 Tf",
        f"1 0 0 1 500 800 Tm (Page {page_number}/{page_count}) Tj",
        "/F1 10 Tf",
    ]
    y_position = 772
    for line in lines:
        commands.append(f"1 0 0 1 50 {y_position} Tm ({_escape_pdf_text(line)}) Tj")
        y_position -= 16
    commands.append("ET")
    return "\n".join(commands).encode("latin-1", errors="replace")


def _wrap_line(line: str, max_length: int = 95) -> list[str]:
    if not line:
        return [""]
    words = line.split()
    wrapped: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_length:
            current = candidate
        else:
            if current:
                wrapped.append(current)
            current = word
    if current:
        wrapped.append(current)
    return wrapped


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
