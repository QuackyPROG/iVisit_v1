// src/pages/InternalRegistration/InternalRegistration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Meta from '../../utils/Meta';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { createUser } from '../../api/UsersApi';

const isStrongPassword = (password: string) => {
  return (
    /[A-Z]/.test(password) &&      // at least one uppercase
    /[a-z]/.test(password) &&      // at least one lowercase
    /\d/.test(password) &&         // at least one digit
    /[^A-Za-z0-9]/.test(password)  // at least one symbol
  );
};

export default function InternalRegistration() {
  Meta({ title: 'Register Account - iVisit' });

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Only for server-side failures (e.g. email already used, backend error)
  const [serverError, setServerError] = useState<string | null>(null);

  // Controls when to show inline validation errors
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const passwordMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;


  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleAccountTypeChange = (val: string) => {
    setFormData((prev) => ({ ...prev, accountType: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setServerError(null);

    if (!formData.username || !formData.email) {
      return;
    }

    if (!isValidEmail(formData.email)) {
      return;
    }

    if (!formData.accountType) {
      return;
    }

    if (!formData.password) {
      return;
    }

    if (formData.password.length < 8) {
      return;
    }

    if (!isStrongPassword(formData.password)) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    try {
      setSubmitting(true);

      await createUser({
        username: formData.username,
        password: formData.password,
        emailAddress: formData.email,
        accountType: formData.accountType,
      });

      alert('Account created successfully.');
      navigate('/dashboard/accounts');
    } catch (err: any) {
      console.error(err);
      setServerError(err?.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  const showUsernameError = attemptedSubmit && !formData.username;
  const showAccountTypeError = attemptedSubmit && !formData.accountType;
  const showPasswordRequiredError = attemptedSubmit && !formData.password;
  const emailEmpty = attemptedSubmit && !formData.email;
  const emailInvalid =
    formData.email.length > 0 && !isValidEmail(formData.email);

  const passwordTooShort =
    attemptedSubmit &&
    !!formData.password &&
    formData.password.length > 0 &&
    formData.password.length < 8;

  const passwordTooWeak =
    attemptedSubmit &&
    !!formData.password &&
    formData.password.length >= 8 &&
    !isStrongPassword(formData.password);


  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl mb-4">Registration</h1>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full md:max-w-3xl"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {/* Username */}
          <div>
            <label htmlFor="username" className="block mb-1">
              Username
            </label>
            <Input
              id="username"
              className="w-full"
              placeholder="Enter username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="off"
            />
            {showUsernameError && (
              <p className="mt-1 text-xs text-red-400">
                Username is required.
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block mb-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              className="w-full"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />

            {emailEmpty && (
              <p className="mt-1 text-xs text-red-400">
                Email address is required.
              </p>
            )}

            {!emailEmpty && emailInvalid && (
              <p className="mt-1 text-xs text-red-400">
                Please enter a valid email address.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              className="w-full"
              placeholder="Enter a password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {showPasswordRequiredError && (
              <p className="mt-1 text-xs text-red-400">
                Password is required.
              </p>
            )}
            {!showPasswordRequiredError && passwordTooShort && (
              <p className="mt-1 text-xs text-red-400">
                Password must be at least 8 characters.
              </p>
            )}
            {!showPasswordRequiredError &&
              !passwordTooShort &&
              passwordTooWeak && (
                <p className="mt-1 text-xs text-red-400">
                  Password must include at least one uppercase letter, lowercase letter,
                  number, and symbol.
                </p>
              )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block mb-1">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              className="w-full"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {passwordMismatch && (
              <p className="mt-1 text-xs text-red-400">
                Passwords do not match.
              </p>
            )}
          </div>

          {/* Account Type */}
          <div className="md:col-span-2">
            <label htmlFor="accountType" className="block mb-1">
              Account Type
            </label>
            <Select
              id="accountType"
              value={formData.accountType}
              options={[
                { label: 'Select account type', value: '' },
                { label: 'Admin', value: 'ADMIN' },
                { label: 'Guard', value: 'GUARD' },
                { label: 'Support', value: 'SUPPORT' },
              ]}
              placeholder="Select account type"
              onChange={handleAccountTypeChange}
            />
            {showAccountTypeError && (
              <p className="mt-1 text-xs text-red-400">
                Please select an account type.
              </p>
            )}
          </div>

          {/* Server-side error (only if backend fails) */}
          {serverError && (
            <div className="md:col-span-2">
              <p className="mt-1 text-xs text-red-400 text-center md:text-left">
                {serverError}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="md:col-span-2">
            <Button
              className="w-full"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
