import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TrendingUp, AlertCircle, X, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react-native';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  authError: string | null;
  onDismissError: () => void;
}

export function SignInScreen({ onSignIn, onSignUp, authError, onDismissError }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    if (mode === 'signin') {
      await onSignIn(email, password);
    } else {
      await onSignUp(email, password);
    }
    setSubmitting(false);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-1 items-center justify-center p-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md">
            <View className="items-center mb-8">
              <View className="w-16 h-16 rounded-2xl bg-sky-500 items-center justify-center mb-4">
                <TrendingUp size={32} color="white" />
              </View>
              <Text className="text-2xl font-bold text-white text-center">Tier-Based Trading Router</Text>
              <Text className="text-sm text-slate-400 mt-1.5 text-center">
                Automated strategy routing with MT5 signal copying
              </Text>
            </View>

            {authError && (
              <View className="mb-4 bg-rose-500/10 border border-rose-500/40 rounded-xl p-3.5 flex-row items-start gap-2.5">
                <AlertCircle size={16} color="#f43f5e" />
                <View className="flex-1">
                  <Text className="text-sm text-rose-300 font-medium">
                    {mode === 'signin' ? 'Sign-in problem' : 'Sign-up problem'}
                  </Text>
                  <Text className="text-[11px] text-rose-300/80 mt-0.5">{authError}</Text>
                </View>
                <TouchableOpacity onPress={onDismissError}>
                  <X size={16} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            )}

            <View className="gap-3">
              <View>
                <Text className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  Email
                </Text>
                <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-lg px-3">
                  <Mail size={16} color="#64748b" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#475569"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 ml-2.5 py-2.5 text-sm text-white"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </Text>
                <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-lg px-3">
                  <Lock size={16} color="#64748b" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#475569"
                    secureTextEntry
                    className="flex-1 ml-2.5 py-2.5 text-sm text-white"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !email || !password}
                className={`flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg ${
                  submitting || !email || !password ? 'bg-slate-700' : 'bg-sky-600'
                }`}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} color="white" />
                    <Text className="text-white text-sm font-bold">
                      {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </Text>
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn size={16} color="white" />
                    <Text className="text-white text-sm font-bold">Sign In</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} color="white" />
                    <Text className="text-white text-sm font-bold">Create Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="items-center mt-4"
            >
              <Text className="text-xs text-slate-400">
                {mode === 'signin'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>

            <Text className="text-center text-[10px] text-slate-500 mt-4">
              No real trading occurs — this is a paper trading simulator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
