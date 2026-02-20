import { useState } from 'react';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import logoImage from '../../../assets/logo.png';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel - Forgot Password Form */}
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12">
          {/* Back to Login */}
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Login</span>
          </button>

          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-white mb-2">Forgot Password?</h1>
                <p className="text-slate-400 text-sm">
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Forgot Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-white text-sm mb-2 block">
                    Email Address*
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-12 pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 hover:from-cyan-600 hover:via-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/50"
                >
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold text-white mb-2">Check Your Email</h1>
                  <p className="text-slate-400 text-sm">
                    We've sent a password reset link to <span className="text-cyan-400 font-medium">{email}</span>
                  </p>
                </div>

                <div className="p-4 bg-nebula-navy-light border border-nebula-navy-lighter rounded-lg">
                  <p className="text-sm text-slate-300">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      try again
                    </button>
                  </p>
                </div>

                <Button
                  onClick={onBackToLogin}
                  variant="outline"
                  className="w-full h-12 bg-nebula-navy-light border-nebula-navy-lighter hover:bg-nebula-navy-lighter text-white"
                >
                  Back to Login
                </Button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="text-center mt-8">
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