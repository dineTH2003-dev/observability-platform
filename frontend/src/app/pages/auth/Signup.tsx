import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import logoImage from '../../../assets/logo.png';

interface SignupProps {
  onSignup: () => void;
  onSwitchToLogin: () => void;
}

export function Signup({ onSignup, onSwitchToLogin }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup();
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Signup Form */}
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-white mb-2">Create Account</h1>
            <p className="text-slate-400 text-sm">Sign up to get started with Nebula!</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password" className="text-white text-sm mb-2 block">
                Password*
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-12"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white text-sm mb-2 block">
                Confirm Password*
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-12"
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                className="border-nebula-navy-lighter data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
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
              disabled={!agreeToTerms}
            >
              Create Account
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8">
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