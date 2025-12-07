import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import Button from "../../components/common/Button";
import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/common/Table";
import Switch from "../../components/common/Switch";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Select from "../../components/common/Select";
import { useToast } from "../../contexts/ToastContext";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import PaginationControls from "../../components/common/PaginationControls";
import {
  getAllUsers,
  deleteUser,
  updateUser,
  resetUserCredentials,
  type UserAccount,
} from "../../api/UsersApi";

type AccountStatus = "Active" | "Inactive";

interface AccountRow {
  id: number;
  username: string;
  email: string;
  role: string;
  accountCreated?: string;
  status: AccountStatus;
  active: boolean;
  emailVerified: boolean;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password: string) => {
  const lengthOk = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return lengthOk && hasLower && hasUpper && hasDigit && hasSpecial;
};

export default function Accounts() {
  Meta({ title: "Accounts - iVisit" });

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [cookies] = useCookies(["userId", "username", "role"]);

  const [allRows, setAllRows] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Client-side pagination state
  const [page, setPage] = useState(0);      // 0-based
  const [pageSize, setPageSize] = useState(25);

  const currentUserId =
    cookies.userId != null ? Number(cookies.userId) : null;
  const currentUsername =
    typeof cookies.username === "string" ? cookies.username : null;

  const role = cookies.role as "admin" | "guard" | "support" | undefined;
  const isSupport = role === "support";

  const isSelf = (row: AccountRow): boolean => {
    if (currentUserId != null && row.id === currentUserId) return true;
    if (currentUsername && row.username === currentUsername) return true;
    return false;
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountRow | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    role: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editAttempted, setEditAttempted] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
  const [resetForm, setResetForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [resetAttempted, setResetAttempted] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetServerError, setResetServerError] = useState<string | null>(null);

  const resetPasswordMismatch =
    resetForm.confirmPassword.length > 0 &&
    resetForm.password !== resetForm.confirmPassword;

  const resetPasswordTooShort =
    resetAttempted &&
    !!resetForm.password &&
    resetForm.password.length > 0 &&
    resetForm.password.length < 8;

  const resetPasswordTooWeak =
    resetAttempted &&
    !!resetForm.password &&
    resetForm.password.length >= 8 &&
    !isStrongPassword(resetForm.password);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);
        setError(null);

        const users: UserAccount[] = await getAllUsers();

        const rows: AccountRow[] = users.map((u) => {
          const activeFlag = u.active !== false;
          const verifiedFlag = u.emailVerified === true;

          let accountCreated: string | undefined = "—";
          if (u.createdAt) {
            const d = new Date(u.createdAt);
            accountCreated = d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            });
          }

          return {
            id: u.accountID,
            username: u.username,
            email: u.emailAddress,
            role: u.accountType || "Unknown",
            accountCreated,
            status: activeFlag ? "Active" : "Inactive",
            active: activeFlag,
            emailVerified: verifiedFlag,
          };
        });

        setAllRows(rows);
      } catch (err: any) {
        console.error(err);
        const msg = err?.message || "Failed to load accounts.";
        setError(msg);
        showToast(msg, { variant: "error" });
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [showToast]);

  const handleToggleStatus = async (row: AccountRow) => {
    if (isSupport) return;
    if (isSelf(row)) return;

    const newActive = !row.active;

    try {
      const updated = await updateUser(row.id, { active: newActive });
      const updatedActive = updated.active !== false;

      setAllRows((prev) =>
        prev.map((u) =>
          u.id === row.id
            ? {
              ...u,
              active: updatedActive,
              status: updatedActive ? "Active" : "Inactive",
            }
            : u
        )
      );

      showToast(
        `Account "${row.username}" has been ${updatedActive ? "activated" : "deactivated"
        }.`,
        { variant: "success" }
      );
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Failed to update account status.";
      setError(msg);
      showToast(msg, { variant: "error" });
    }
  };

  const handleDeleteAccount = (row: AccountRow) => {
    if (isSupport) return;

    if (isSelf(row)) {
      showToast("You cannot delete your own account.", { variant: "warning" });
      return;
    }

    setConfirmState({
      open: true,
      title: "Delete account",
      message: `Are you sure you want to delete the account "${row.username}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteUser(row.id);
          setAllRows((prev) => prev.filter((u) => u.id !== row.id));
          showToast(`Account "${row.username}" has been deleted.`, {
            variant: "success",
          });
        } catch (err: any) {
          console.error(err);
          const msg = err?.message || "Failed to delete account.";
          setError(msg);
          showToast(msg, { variant: "error" });
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const openResetModal = (row: AccountRow) => {
    setResetTarget(row);
    setResetForm({ password: "", confirmPassword: "" });
    setResetAttempted(false);
    setResetServerError(null);
    setResetSubmitting(false);
    setResetOpen(true);
  };

  const handleResetSubmit = async () => {
    if (!resetTarget) return;

    setResetAttempted(true);
    setResetServerError(null);

    const { password, confirmPassword } = resetForm;

    if (!password || !confirmPassword) {
      return;
    }

    if (password.length < 8) {
      return;
    }

    if (!isStrongPassword(password)) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    try {
      setResetSubmitting(true);

      await resetUserCredentials(resetTarget.id, password);

      showToast("Password has been reset.", { variant: "success" });
      setResetOpen(false);
      setResetTarget(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Failed to reset credentials.";
      setResetServerError(msg);
      setError(msg);
      showToast(msg, { variant: "error" });
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetCredentials = (row: AccountRow) => {
    if (isSupport) return;

    if (isSelf(row)) {
      setConfirmState({
        open: true,
        title: "Reset your password",
        message: "Are you sure you want to reset your own password?",
        onConfirm: async () => {
          setConfirmState(null);
          openResetModal(row);
        },
      });
    } else {
      openResetModal(row);
    }
  };

  // 1) Apply filters + search in memory
  const filteredData = allRows.filter((row) => {
    // status filter
    if (statusFilter === "active" && !row.active) return false;
    if (statusFilter === "inactive" && row.active) return false;

    // role filter
    if (roleFilter !== "all") {
      if (!row.role || row.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
    }

    // search filter
    const term = search.trim().toLowerCase();
    if (term) {
      const haystack = `${row.username} ${row.email} ${row.role}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });

  // 2) Derive pagination info from the filtered list
  const totalElements = filteredData.length;
  const totalPages =
    totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);

  // Clamp current page to valid range
  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);

  // 3) Slice rows for the current page
  const pagedData = filteredData.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  const openEditModal = (row: AccountRow) => {
    setEditTarget(row);
    setEditForm({
      username: row.username,
      email: row.email,
      role: row.role,
    });
    setEditAttempted(false);
    setEditSubmitting(false);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditTarget(null);
  };

  const handleEditChange = (
    field: "username" | "email" | "role",
    value: string
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditAttempted(true);
    setServerError(null);

    const { username, email, role } = editForm;
    const self = isSelf(editTarget);

    if (!username.trim() || !email.trim() || (!role.trim() && !self)) {
      return;
    }

    if (!isValidEmail(email)) {
      return;
    }

    try {
      setEditSubmitting(true);

      const payload: any = {
        username: username.trim(),
        emailAddress: email.trim(),
      };

      if (!self) {
        payload.accountType = role.trim();
      }

      const updated = await updateUser(editTarget.id, payload);

      setAllRows((prev) =>
        prev.map((row) =>
          row.id === editTarget.id
            ? {
              ...row,
              username: updated.username,
              email: updated.emailAddress,
              role: updated.accountType || row.role,
            }
            : row
        )
      );

      showToast("Account details updated.", { variant: "success" });

      setEditOpen(false);
      setEditTarget(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Failed to update account.";
      setServerError(msg);
      showToast(msg, { variant: "error" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="mb-4 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xl">Accounts</p>

          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
            <div className="flex flex-wrap gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-300">Status:</span>
                <select
                  className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "all" | "active" | "inactive");
                    setPage(0);
                  }}
                >
                  <option value="all">All</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-slate-300">Role:</span>
                <select
                  className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All</option>
                  <option value="ADMIN">Admin</option>
                  <option value="GUARD">Guard</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  id="account-search"
                  name="accountSearch"
                  type="text"
                  autoComplete="off"
                  className="text-dark-gray w-full"
                  placeholder="Search username, email, role..."
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>
            {!isSupport && (
              <Button
                className="text-nowrap"
                onClick={() => navigate("/dashboard/register")}
              >
                Add account
              </Button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <p className="text-gray-400 text-center mt-4">Loading accounts...</p>
      )}

      {error && !loading && (
        <p className="text-red-400 text-center mt-4">{error}</p>
      )}

      {!loading && !error && (
        <>
          <Table>
            <Thead>
              <Tr>
                <Th>Username</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Account Created</Th>
                <Th>Email Verified</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pagedData.map((row) => {
                const self = isSelf(row);

                return (
                  <Tr key={row.id}>
                    <Td>
                      {row.username}
                      {self ? " (You)" : ""}
                    </Td>
                    <Td>{row.email}</Td>
                    <Td>{row.role}</Td>
                    <Td>{row.accountCreated ?? "—"}</Td>
                    <Td className="py-2">
                      {row.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-600/30 text-green-200 border border-green-500/60 whitespace-nowrap">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-600/30 text-yellow-100 border border-yellow-500/60 whitespace-nowrap">
                          Unverified
                        </span>
                      )}
                    </Td>
                    <Td className="py-2">
                      <div className="flex flex-col gap-1">
                        <span>{row.status}</span>
                        {isSupport ? (
                          <span className="text-xs text-gray-400">
                            View only
                          </span>
                        ) : self ? (
                          <span className="text-xs text-gray-400">Denied</span>
                        ) : (
                          <Switch
                            checked={row.active}
                            onChange={() => handleToggleStatus(row)}
                          />
                        )}
                      </div>
                    </Td>
                    <Td className="py-2">
                      <div className="flex gap-2 items-center">
                        {!isSupport && (
                          <Button
                            className="text-xs px-2 py-1"
                            variation="primary"
                            onClick={() => openEditModal(row)}
                          >
                            Edit
                          </Button>
                        )}

                        {!isSupport && (
                          <Button
                            className="text-xs px-2 py-1"
                            onClick={() => handleResetCredentials(row)}
                          >
                            Reset
                          </Button>
                        )}

                        {!isSupport && (
                          <Button
                            variation={self ? "secondary" : "primary"}
                            className="text-xs px-2 py-1"
                            onClick={() => handleDeleteAccount(row)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          <PaginationControls
            page={currentPage}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {editOpen && editTarget && (
        <Modal
          isOpen={editOpen}
          onClose={closeEditModal}
          title={`Edit account – ${editTarget.username}${isSelf(editTarget) ? " (You)" : ""
            }`}
        >
          <div className="flex flex-col gap-4 text-white">
            <div>
              <label className="block mb-1 text-sm">Username</label>
              <Input
                className="w-full text-dark-gray"
                value={editForm.username}
                onChange={(e) =>
                  handleEditChange("username", e.target.value)
                }
              />
              {editAttempted && !editForm.username.trim() && (
                <p className="mt-1 text-xs text-red-400">
                  Username is required.
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1 text-sm">Email</label>
              <Input
                className="w-full text-dark-gray"
                value={editForm.email}
                onChange={(e) => handleEditChange("email", e.target.value)}
              />
              {editAttempted && !editForm.email.trim() && (
                <p className="mt-1 text-xs text-red-400">
                  Email is required.
                </p>
              )}
              {editForm.email.trim().length > 0 &&
                !isValidEmail(editForm.email) && (
                  <p className="mt-1 text-xs text-red-400">
                    Please enter a valid email address.
                  </p>
                )}
            </div>

            <div>
              <label className="block mb-1 text-sm">Role</label>
              <Select
                id="edit-role"
                value={editForm.role}
                options={[
                  { label: "Select role", value: "" },
                  { label: "Admin", value: "ADMIN" },
                  { label: "Guard", value: "GUARD" },
                  { label: "Support", value: "SUPPORT" },
                ]}
                placeholder={
                  isSelf(editTarget)
                    ? "Your role (cannot change)"
                    : "Select role"
                }
                disabled={isSelf(editTarget)}
                onChange={(val) => handleEditChange("role", val)}
              />
              {isSelf(editTarget) && (
                <p className="mt-1 text-xs text-gray-400">
                  You cannot change your own role. Ask another admin to update
                  this.
                </p>
              )}
              {!isSelf(editTarget) &&
                editAttempted &&
                !editForm.role.trim() && (
                  <p className="mt-1 text-xs text-red-400">
                    Role is required.
                  </p>
                )}
            </div>

            {serverError && (
              <p className="mt-1 text-xs text-red-400">{serverError}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variation="secondary"
                onClick={closeEditModal}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {resetOpen && resetTarget && (
        <Modal
          isOpen={resetOpen}
          onClose={() => {
            if (!resetSubmitting) {
              setResetOpen(false);
              setResetTarget(null);
            }
          }}
          title={`Reset password – ${resetTarget.username}${isSelf(resetTarget) ? " (You)" : ""
            }`}
        >
          <div className="flex flex-col gap-4 text-white">
            <p className="text-xs text-white/70">
              Password must be at least 8 characters and include uppercase, lowercase,
              number, and symbol.
            </p>

            <div>
              <label className="block mb-1 text-sm">New Password</label>
              <Input
                id="reset-new-password"
                name="resetNewPassword"
                type="password"
                autoComplete="new-password"
                className="w-full text-dark-gray"
                value={resetForm.password}
                onChange={(e) =>
                  setResetForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
              {resetAttempted && !resetForm.password && (
                <p className="mt-1 text-xs text-red-400">
                  Password is required.
                </p>
              )}
              {!(!resetForm.password) && resetPasswordTooShort && (
                <p className="mt-1 text-xs text-red-400">
                  Password must be at least 8 characters.
                </p>
              )}
              {!(!resetForm.password) &&
                !resetPasswordTooShort &&
                resetPasswordTooWeak && (
                  <p className="mt-1 text-xs text-red-400">
                    Password must include at least one uppercase letter, lowercase letter,
                    number, and symbol.
                  </p>
                )}
            </div>

            <div>
              <label className="block mb-1 text-sm">Confirm New Password</label>
              <Input
                id="reset-confirm-password"
                name="resetConfirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full text-dark-gray"
                value={resetForm.confirmPassword}
                onChange={(e) =>
                  setResetForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
              {resetAttempted && !resetForm.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  Please confirm the new password.
                </p>
              )}
              {resetPasswordMismatch && (
                <p className="mt-1 text-xs text-red-400">
                  Passwords do not match.
                </p>
              )}
            </div>

            {resetServerError && (
              <p className="mt-1 text-xs text-red-400">{resetServerError}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variation="secondary"
                onClick={() => {
                  if (!resetSubmitting) {
                    setResetOpen(false);
                    setResetTarget(null);
                  }
                }}
                disabled={resetSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetSubmit}
                disabled={resetSubmitting}
              >
                {resetSubmitting ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </DashboardLayout>
  );
}
