MANAGE_USERS = "manage_users"
MANAGE_ROLES = "manage_roles"

VIEW_LOCATIONS = "view_locations"
MANAGE_BRANCHES = "manage_branches"
MANAGE_TABLES = "manage_tables"

VIEW_SCHEDULES = "view_schedules"
MANAGE_SCHEDULES = "manage_schedules"

CREATE_RESERVATIONS = "create_reservations"
VIEW_RESERVATIONS = "view_reservations"
MANAGE_RESERVATIONS = "manage_reservations"

CREATE_PAYMENTS = "create_payments"
VIEW_PAYMENTS = "view_payments"
MANAGE_PAYMENTS = "manage_payments"

REQUEST_REFUNDS = "request_refunds"
APPROVE_REFUNDS = "approve_refunds"

VIEW_REPORTS = "view_reports"
MANAGE_REPORTS = "manage_reports"

ROLE_PERMISSION_DEFAULTS = {
    "owner": {
        VIEW_REPORTS,
        MANAGE_REPORTS,
    },
    "admin": {
        MANAGE_USERS,
        VIEW_REPORTS,
        MANAGE_BRANCHES,
        MANAGE_TABLES,
        MANAGE_SCHEDULES,
        MANAGE_RESERVATIONS,
        MANAGE_PAYMENTS,
    },
    "user": {
        VIEW_LOCATIONS,
        VIEW_SCHEDULES,
        CREATE_RESERVATIONS,
        VIEW_RESERVATIONS,
        CREATE_PAYMENTS,
        VIEW_PAYMENTS,
        REQUEST_REFUNDS,
    },
}


def get_default_permissions_for_roles(role_names: list[str] | set[str]) -> set[str]:
    permissions: set[str] = set()
    for role_name in role_names:
        permissions.update(ROLE_PERMISSION_DEFAULTS.get(role_name.lower(), set()))
    return permissions
