from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.db.session import engine
from app.models import Base


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

init_db()
