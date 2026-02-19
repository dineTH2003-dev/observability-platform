import { useState } from 'react';
import { Mail, Lock, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import logoImage from '../../../assets/logo.png';

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

export function Login({ onLogin, onSwitchToSignup, onSwitchToForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Login Form */}
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-white mb-2">Sign In</h1>
            <p className="text-slate-400 text-sm">Enter your email and password to sign in!</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white text-sm mb-2 block">
                Email*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@nebula.com"
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
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-12"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  onCheckedChange={(checked) => setKeepSignedIn(checked as boolean)}
                  className="border-nebula-navy-lighter data-[state=checked]:bg-nebula-purple data-[state=checked]:border-nebula-purple"
                />
                <label
                  htmlFor="keep-signed-in"
                  className="text-sm text-slate-400 cursor-pointer"
                >
                  Keep me logged in
                </label>
              </div>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white font-medium mt-6"
            >
              Sign In
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-slate-400 mb-4">
              Not registered yet?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-nebula-purple hover:text-nebula-purple-light font-medium"
              >
                Create an account
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