import { useState } from 'react';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { PasswordStrength } from '../../components/profile/PasswordStrength';
import logoImage from '../../../assets/logo.png';
import { authService } from '../../services/authService';

interface SignupProps {
  onSwitchToLogin: () => void;
}

export function Signup({ onSwitchToLogin }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Basic frontend password validation used to gate submission
  function getPasswordValidation(pw: string) {
    const checks = [
      (v: string) => v.length >= 8,
      (v: string) => /[A-Z]/.test(v),
      (v: string) => /[a-z]/.test(v),
      (v: string) => /\d/.test(v),
      (v: string) => /[^A-Za-z\d]/.test(v),
    ];

    const passed = checks.map((t) => t(pw));
    return { isValid: passed.every(Boolean), details: passed };
  }

  const passwordValidation = getPasswordValidation(password);
  const hasConfirmPassword = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = agreeToTerms && passwordValidation.isValid && hasConfirmPassword && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValidation.isValid) {
      alert('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');

      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await authService.signup({ email, password });
      setRegistrationComplete(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Signup failed');
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      setResendMessage('');
      const result = await authService.resendVerification(email);
      setResendMessage(result.message);
    } catch (error: any) {
      setResendMessage(error.response?.data?.message || 'Unable to resend verification email right now.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Signup Form */}
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12">
          {registrationComplete ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-nebula-navy-lighter bg-nebula-navy-light">
                <MailCheck className="size-8 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-semibold text-white mb-3">Check Your Email</h1>
              <p className="text-slate-400 text-sm leading-6 mb-8">
                We've sent a verification link to your email address. Please click the link in that email to activate your CloudSight account.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                disabled={isResending}
                className="mt-3 w-full h-12 bg-transparent border-nebula-navy-lighter text-white hover:bg-nebula-navy-light"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendMessage && (
                <p className="mt-3 text-xs text-slate-400">{resendMessage}</p>
              )}
              <p className="text-xs text-slate-500 mt-8">©2026 CloudSight. All Rights Reserved.</p>
            </div>
          ) : (
            <>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-white mb-2">Create Account</h1>
            <p className="text-slate-400 text-sm">Sign up to get started with Nebula!</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-white text-sm mb-2 block">
                Email*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-12"
                required
              />
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">
                Password*
              </Label>

              <div className="relative w-full">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pr-12 bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500"
                  aria-invalid={password.length > 0 && !passwordValidation.isValid}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2">
                <PasswordStrength password={password} />
              </div>
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">
                Confirm Password*
              </Label>

              <div className="relative w-full">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pr-12 bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500"
                  aria-invalid={hasConfirmPassword && !passwordsMatch}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className={`mt-2 min-h-4 text-xs ${hasConfirmPassword && !passwordsMatch ? 'text-red-400' : 'text-slate-500'}`}>
                {hasConfirmPassword && !passwordsMatch ? 'Confirm password must match the password.' : ''}
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked: boolean | 'indeterminate') => setAgreeToTerms(Boolean(checked))}
                className="border-nebula-navy-lighter data-[state=checked]:bg-nebula-purple data-[state=checked]:border-nebula-purple"
              />
              <label
                htmlFor="terms"
                className="text-sm text-slate-400 cursor-pointer"
              >
                I agree to the{' '}
                <span className="text-nebula-purple hover:text-nebula-purple-light">
                  Terms and Conditions
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 hover:from-cyan-600 hover:via-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/50 mt-6"
              disabled={!canSubmit}
            >
              Create Account
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-slate-400 mb-4">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-nebula-purple hover:text-nebula-purple-light font-medium"
              >
                Sign in
              </button>
            </p>
            <p className="text-xs text-slate-500">©2026 CloudSight. All Rights Reserved.</p>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="w-1/2 h-screen bg-gradient-to-br from-nebula-purple via-purple-500 to-nebula-pink flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-6">
          <img
            src={logoImage}
            alt="CloudSight Logo"
            className="w-48 h-48 object-contain drop-shadow-2xl"
          />
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            CloudSight
          </h1>
        </div>
      </div>
    </div>
  );
}
