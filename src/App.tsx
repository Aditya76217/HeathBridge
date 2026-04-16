import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  Plus, 
  User, 
  FileText, 
  QrCode, 
  History, 
  LogOut, 
  Shield, 
  Activity, 
  AlertCircle,
  Search,
  ChevronRight,
  Menu,
  X,
  Globe,
  MapPin,
  Stethoscope,
  Mic,
  MicOff,
  MessageSquare,
  Clock,
  Heart,
  Zap,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Database,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { AISearchBar, AISearchBarHandle } from './components/AISearchBar';

// --- Types ---
type Role = 'worker' | 'doctor' | 'admin';

interface MockUser {
  uid: string;
  displayName: string;
  email: string;
}

interface UpdateEntry {
  text: string;
  timestamp: string;
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  abhaId?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  recentUpdates?: (string | UpdateEntry)[];
  aadharNo?: string;
  contactNo?: string;
  emergencyContactNo?: string;
  gender?: string;
  dob?: string;
  address?: string;
  password?: string; // For mock auth
  isVerified?: boolean;
}

interface MedicalRecord {
  id: string;
  workerUid: string;
  doctorUid: string;
  doctorName: string;
  diagnosis: string;
  prescription: string;
  date: any;
  location: string;
}

// --- Context ---
const AuthContext = createContext<{
  user: MockUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<string | null>;
  loginWithGoogle: () => Promise<boolean>;
  signup: (details: Partial<UserProfile> & { password: string }) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
} | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm',
    outline: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100'
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

const Badge = ({ children, color = 'blue', className }: { children: React.ReactNode; color?: 'blue' | 'red' | 'green' | 'yellow'; className?: string }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100'
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', colors[color], className)}>
      {children}
    </span>
  );
};

// --- Views ---

// --- Views ---

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-[#FBFBFD] overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-[#1D1D1F] tracking-tight">HealthBridge</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">Features</a>
            <a href="#security" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">Security</a>
            <a href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">How it Works</a>
            <Button onClick={onGetStarted} className="rounded-full px-8 py-6 shadow-xl shadow-red-100">Get Started</Button>
          </div>
          <button className="md:hidden p-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Hero Section - Split Layout (Recipe 11) */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-widest">
              <Zap className="w-4 h-4" />
              Revolutionizing Migrant Healthcare
            </div>
            <h1 className="text-7xl lg:text-8xl font-display font-bold text-[#1D1D1F] leading-[0.9] tracking-tight">
              Your Health, <br />
              <span className="text-red-600">Without Borders.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-lg font-medium">
              The first unified digital health passport for migrant workers. Linked with ABHA ID for seamless medical record portability across every state.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onGetStarted} className="py-8 px-10 text-xl rounded-2xl shadow-2xl shadow-red-200 group">
                Launch Dashboard
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-4 px-6">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-400">Trusted by 10,000+ workers</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-br from-red-500 to-orange-500 rounded-[4rem] rotate-3 absolute inset-0 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative bg-white p-4 rounded-[3rem] shadow-2xl border border-slate-100">
              <img 
                src="https://picsum.photos/seed/healthcare/1200/1200" 
                alt="Healthcare" 
                className="rounded-[2.5rem] w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 max-w-[240px] rotate-[-6deg]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">ABHA Verified</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">Your medical records are securely linked and ready for cross-state use.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Clean Utility (Recipe 8) */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-display font-bold text-[#1D1D1F]">Built for the Real World</h2>
            <p className="text-lg text-slate-500 font-medium">We've solved the biggest challenges in migrant healthcare with cutting-edge technology.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <QrCode className="w-8 h-8 text-red-600" />,
                title: "Offline-First QR",
                desc: "Access your health passport even without internet. Doctors scan your unique QR to see vital info instantly."
              },
              {
                icon: <Globe className="w-8 h-8 text-blue-600" />,
                title: "Multilingual Support",
                desc: "Available in Hindi, Bengali, and English. Language should never be a barrier to quality healthcare."
              },
              {
                icon: <Shield className="w-8 h-8 text-green-600" />,
                title: "ABHA Integration",
                desc: "Fully integrated with India's Ayushman Bharat Digital Mission for official medical record portability."
              },
              {
                icon: <Activity className="w-8 h-8 text-orange-600" />,
                title: "AI Health Assistant",
                desc: "Describe symptoms in your own language and get instant advice and nearby hospital suggestions."
              },
              {
                icon: <Smartphone className="w-8 h-8 text-purple-600" />,
                title: "Voice-First Input",
                desc: "No need to type. Record updates and search for doctors using simple voice commands."
              },
              {
                icon: <Database className="w-8 h-8 text-slate-600" />,
                title: "Secure Cloud Sync",
                desc: "Your data is encrypted and synced across all your devices, ensuring you never lose your history."
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 bg-[#FBFBFD] rounded-[2.5rem] border border-slate-50 hover:border-red-100 hover:shadow-xl transition-all group"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-4">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 bg-[#1D1D1F] text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-5xl font-display font-bold leading-tight">Your Data is <br /><span className="text-red-500">Private & Secure.</span></h2>
              <p className="text-xl text-slate-400 leading-relaxed font-medium">
                We use bank-grade encryption and follow strict HIPAA-compliant protocols to ensure your medical records are only accessible by you and authorized doctors.
              </p>
              <div className="space-y-4">
                {[
                  "End-to-end encryption for all medical records",
                  "Biometric authentication support",
                  "Full control over who can scan your QR",
                  "No data sharing with third parties"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-red-500" />
                    <span className="text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] text-center">
              <Shield className="w-24 h-24 text-red-500 mx-auto mb-8 animate-pulse" />
              <h3 className="text-2xl font-bold mb-4">Security First Architecture</h3>
              <p className="text-slate-400 mb-8">Our backend is built with Node.js and MongoDB, providing a robust and scalable infrastructure for millions of users.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-2xl font-bold text-white">99.9%</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Uptime</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-2xl font-bold text-white">256-bit</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Encryption</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-[#FBFBFD] border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-[#1D1D1F]">HealthBridge</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-slate-400">
              <a href="#" className="hover:text-red-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-red-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-red-600 transition-colors">Contact Us</a>
            </div>
            <p className="text-xs font-bold text-slate-300">© 2026 HealthBridge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AuthView = ({ onBack }: { onBack?: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  return isLogin ? (
    <LoginView onBack={onBack} onToggle={() => setIsLogin(false)} />
  ) : (
    <SignUpView onBack={onBack} onToggle={() => setIsLogin(true)} />
  );
};

const LoginView = ({ onBack, onToggle }: { onBack?: () => void; onToggle: () => void }) => {
  const { login, loginWithGoogle } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    const success = await loginWithGoogle();
    if (!success) {
      setError('Google Sign-In failed');
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const errorMsg = await login(userId, password);
    if (errorMsg) {
      setError(errorMsg);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-xl shadow-red-200 rotate-3">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-display mb-2">HealthBridge</h1>
        <p className="text-slate-500 mb-8">Your Digital Health Passport for a Secure Future</p>
        
        <Card className="p-8 text-left">
          <h2 className="text-xl mb-6 font-semibold">Login to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User ID (Aadhar or Email)</label>
              <input 
                type="text" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter User ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter Password"
                required
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-4 text-lg mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full py-4 flex items-center justify-center gap-3 border-slate-200 hover:bg-slate-50"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="font-bold">Google Account</span>
            </Button>
            
            <div className="text-center mt-6">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <button type="button" onClick={onToggle} className="text-red-600 font-bold hover:underline">
                  Sign Up
                </button>
              </p>
            </div>

            {onBack && (
              <button 
                type="button"
                onClick={onBack}
                className="w-full mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to Landing Page
              </button>
            )}
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const SignUpView = ({ onBack, onToggle }: { onBack?: () => void; onToggle: () => void }) => {
  const { signup, loginWithGoogle } = useAuth();
  const [details, setDetails] = useState({
    name: '',
    email: '',
    password: '',
    aadharNo: '',
    contactNo: '',
    emergencyContactNo: '',
    gender: 'Male',
    bloodGroup: 'O+',
    dob: '',
    address: '',
    role: 'worker' as Role
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const detectLocation = () => {
    setIsDetectingLocation(true);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDetails(prev => ({ ...prev, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        setIsDetectingLocation(false);
      },
      (err) => {
        setError('Could not fetch location. Please enter manually.');
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (details.aadharNo.length !== 12) {
      setError('Aadhar Number must be 12 digits.');
      return;
    }
    setIsSubmitting(true);
    const errorMsg = await signup(details);
    if (errorMsg) {
      setError(errorMsg);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200 rotate-3">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-display mb-2">Create Account</h1>
        <p className="text-slate-500 mb-8">Join HealthBridge and secure your medical future</p>
        
        <Card className="p-10 text-left">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="John Doe"
                  value={details.name}
                  onChange={e => setDetails({...details, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="john@example.com"
                  value={details.email}
                  onChange={e => setDetails({...details, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="Create password"
                  value={details.password}
                  onChange={e => setDetails({...details, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Aadhar Number</label>
                <input 
                  type="text" 
                  required
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="1234 5678 9012"
                  value={details.aadharNo}
                  onChange={e => setDetails({...details, aadharNo: e.target.value.replace(/\D/g, '')})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Number</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="+91 98765 43210"
                  value={details.contactNo}
                  onChange={e => setDetails({...details, contactNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Emergency Contact</label>
                <input 
                  type="tel" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="Family member's phone"
                  value={details.emergencyContactNo}
                  onChange={e => setDetails({...details, emergencyContactNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  value={details.gender}
                  onChange={e => setDetails({...details, gender: e.target.value})}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Blood Group</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  value={details.bloodGroup}
                  onChange={e => setDetails({...details, bloodGroup: e.target.value})}
                >
                  <option>A+</option>
                  <option>A-</option>
                  <option>B+</option>
                  <option>B-</option>
                  <option>AB+</option>
                  <option>AB-</option>
                  <option>O+</option>
                  <option>O-</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  value={details.dob}
                  onChange={e => setDetails({...details, dob: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">I am a...</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setDetails({...details, role: 'worker'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-bold transition-all",
                      details.role === 'worker' ? "border-red-500 bg-red-50 text-red-600" : "border-slate-100 text-slate-400"
                    )}
                  >
                    Worker
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDetails({...details, role: 'doctor'})}
                    className={cn(
                      "flex-1 py-3 rounded-xl border-2 font-bold transition-all",
                      details.role === 'doctor' ? "border-red-500 bg-red-50 text-red-600" : "border-slate-100 text-slate-400"
                    )}
                  >
                    Doctor
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Home Address / Current Location</label>
                <button 
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="text-xs font-bold text-red-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3" />
                  {isDetectingLocation ? 'Detecting...' : 'Detect Location'}
                </button>
              </div>
              <textarea 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Full permanent address or current location"
                rows={3}
                value={details.address}
                onChange={e => setDetails({...details, address: e.target.value})}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full py-4 text-lg" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full py-4 flex items-center justify-center gap-3 border-slate-200 hover:bg-slate-50"
              onClick={async () => {
                setError('');
                setIsSubmitting(true);
                const success = await loginWithGoogle();
                if (!success) setError('Google Sign-In failed');
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
            >
              <Globe className="w-5 h-5 text-blue-600" />
              <span className="font-bold">Google Account</span>
            </Button>
            
            <div className="text-center mt-6">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <button type="button" onClick={onToggle} className="text-red-600 font-bold hover:underline">
                  Login
                </button>
              </p>
            </div>

            {onBack && (
              <button 
                type="button"
                onClick={onBack}
                className="w-full mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to Landing Page
              </button>
            )}
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const RoleSelectionView = ({ onSelect }: { onSelect: (role: Role) => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <h1 className="text-3xl font-display text-center mb-8">Choose Your Role</h1>
        <div className="grid md:grid-cols-2 gap-6">
          <button 
            onClick={() => onSelect('worker')}
            className="group p-8 bg-white rounded-3xl border-2 border-transparent hover:border-red-500 transition-all text-left shadow-sm hover:shadow-xl"
          >
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl mb-2">I am a Worker</h3>
            <p className="text-slate-500">Access your health records, ABHA ID, and share via QR code anywhere in India.</p>
          </button>

          <button 
            onClick={() => onSelect('doctor')}
            className="group p-8 bg-white rounded-3xl border-2 border-transparent hover:border-slate-800 transition-all text-left shadow-sm hover:shadow-xl"
          >
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-8 h-8 text-slate-800" />
            </div>
            <h3 className="text-2xl mb-2">I am a Doctor</h3>
            <p className="text-slate-500">Scan worker QR codes, view medical history, and add new prescriptions instantly.</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const VerificationModal = ({ isOpen, onClose, onVerified }: { isOpen: boolean; onClose: () => void; onVerified: (data: any) => void }) => {
  const [step, setStep] = useState<'id' | 'otp'>('id');
  const [idNumber, setIdNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState('');

  const handleGenerateOtp = async () => {
    if (idNumber.length !== 12) {
      setError('Please enter a valid 12-digit Aadhar number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/aadhar/generate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_number: idNumber })
      });
      const data = await response.json();
      if (data.success) {
        setClientId(data.data.client_id);
        setStep('otp');
      } else {
        setError(data.message || 'Failed to generate OTP. Please check your Aadhar number.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/aadhar/submit-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp, client_id: clientId })
      });
      const data = await response.json();
      if (data.success) {
        onVerified(data.data);
        onClose();
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-display font-bold text-slate-800">Identity Verification</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <Shield className="w-8 h-8 text-blue-600" />
              <p className="text-sm text-blue-800 font-medium">Secure verification via UIDAI (Aadhar) to link your official medical records.</p>
            </div>

            {step === 'id' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Aadhar Number</label>
                  <input 
                    type="text" 
                    maxLength={12}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-lg tracking-widest font-mono"
                    placeholder="XXXX XXXX XXXX"
                  />
                </div>
                {error && <p className="text-red-500 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}
                <Button 
                  onClick={handleGenerateOtp} 
                  className="w-full py-4 text-lg" 
                  disabled={loading || idNumber.length !== 12}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Generate OTP'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Enter 6-Digit OTP</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none transition-all text-center text-2xl tracking-[1rem] font-mono"
                    placeholder="XXXXXX"
                  />
                  <p className="text-xs text-slate-400 mt-2 text-center">OTP sent to your Aadhar-linked mobile number</p>
                </div>
                {error && <p className="text-red-500 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('id')} className="flex-1 py-4">Back</Button>
                  <Button 
                    onClick={handleVerifyOtp} 
                    className="flex-[2] py-4 text-lg" 
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Verify & Link'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const WorkerDashboard = () => {
  const { profile, logout, updateProfile } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi' | 'bn'>('en');
  const [activeTab, setActiveTab] = useState<'home' | 'records' | 'language' | 'profile'>('home');
  const [isListening, setIsListening] = useState(false);
  const [newUpdate, setNewUpdate] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ contactNo: '', address: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const aiSearchRef = useRef<AISearchBarHandle>(null);

  useEffect(() => {
    if (profile) {
      setEditForm({
        contactNo: profile.contactNo || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile({
        contactNo: editForm.contactNo,
        address: editForm.address
      });
      setShowEditProfile(false);
    } catch (e) {
      console.error("Failed to save profile", e);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const translations = {
    en: { 
      welcome: 'Welcome back', 
      abha: 'ABHA ID', 
      showQr: 'Show QR', 
      history: 'History', 
      summary: 'Health Summary', 
      blood: 'Blood Group', 
      allergies: 'Allergies', 
      visits: 'Recent Visits', 
      viewAll: 'View All',
      recentUpdates: 'Recent Updates',
      addUpdate: 'Add health update...',
      save: 'Save',
      home: 'Home',
      records: 'Records',
      language: 'Language',
      profile: 'Profile',
      logout: 'Logout',
      selectLang: 'Select Language',
      personalInfo: 'Personal Information',
      allRecords: 'All Medical Records',
      verifyIdentity: 'Verify Identity',
      verifyDesc: 'Link your official Aadhar/ABHA ID to securely access your medical records across states.',
      verified: 'Verified'
    },
    hi: { 
      welcome: 'नमस्ते', 
      abha: 'आभा आईडी', 
      showQr: 'क्यूआर दिखाएं', 
      history: 'इतिहास', 
      summary: 'स्वास्थ्य सारांश', 
      blood: 'रक्त समूह', 
      allergies: 'एलर्जी', 
      visits: 'हाल की यात्राएं', 
      viewAll: 'सभी देखें',
      recentUpdates: 'हाल के अपडेट',
      addUpdate: 'स्वास्थ्य अपडेट जोड़ें...',
      save: 'सहेजें',
      home: 'होम',
      records: 'रिकॉर्ड्स',
      language: 'भाषा',
      profile: 'प्रोफ़ाइल',
      logout: 'लॉगआउट',
      selectLang: 'भाषा चुनें',
      personalInfo: 'व्यक्तिगत जानकारी',
      allRecords: 'सभी मेडिकल रिकॉर्ड्स',
      verifyIdentity: 'पहचान सत्यापित करें',
      verifyDesc: 'राज्यों में अपने मेडिकल रिकॉर्ड तक सुरक्षित रूप से पहुंचने के लिए अपना आधिकारिक आधार/आभा आईडी लिंक करें।',
      verified: 'सत्यापित'
    },
    bn: { 
      welcome: 'স্বাগতম', 
      abha: 'আভা আইডি', 
      showQr: 'QR দেখান', 
      history: 'ইতিহাস', 
      summary: 'স্বাস্থ্য সারাংশ', 
      blood: 'রক্তের গ্রুপ', 
      allergies: 'অ্যালার্জি', 
      visits: 'সাম্প্রতিক ভিজিট', 
      viewAll: 'সব দেখুন',
      recentUpdates: 'সাম্প্রতিক আপডেট',
      addUpdate: 'স্বাস্থ্য আপডেট যোগ করুন...',
      save: 'সংরক্ষণ করুন',
      home: 'হোম',
      records: 'রেকর্ডস',
      language: 'ভাষা',
      profile: 'প্রোফাইল',
      logout: 'লগআউট',
      selectLang: 'ভাষা নির্বাচন করুন',
      personalInfo: 'ব্যক্তিগত তথ্য',
      allRecords: 'সমস্ত মেডিকেল রেকর্ড',
      verifyIdentity: 'পরিচয় যাচাই করুন',
      verifyDesc: 'রাজ্য জুড়ে আপনার মেডিকেল রেকর্ডগুলি নিরাপদে অ্যাক্সেস করতে আপনার অফিসিয়াল আধার/আভা আইডি লিঙ্ক করুন।',
      verified: 'যাচাইকৃত'
    }
  };

  const t = translations[lang];

  useEffect(() => {
    if (!profile?.uid) return;
    const path = 'records';
    const q = query(collection(db, path), where('workerUid', '==', profile.uid));
    return onSnapshot(q, (snapshot) => {
      const fetchedRecords = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MedicalRecord));
      
      // If no records, add some mock ones for the "History" feel
      if (fetchedRecords.length === 0) {
        setRecords([
          {
            id: 'mock-1',
            diagnosis: 'Common Cold & Cough',
            prescription: 'Cetirizine 10mg (Night), Paracetamol 500mg (SOS), Cough Syrup 10ml (TID)',
            doctorName: 'Dr. Sharma',
            date: { toDate: () => new Date('2026-03-15') } as any,
            workerUid: profile.uid,
            doctorUid: 'mock-doc',
            location: 'Community Health Center'
          },
          {
            id: 'mock-2',
            diagnosis: 'Seasonal Allergy',
            prescription: 'Allegra 120mg (Once daily), Nasal Spray',
            doctorName: 'Dr. Patel',
            date: { toDate: () => new Date('2026-02-10') } as any,
            workerUid: profile.uid,
            doctorUid: 'mock-doc-2',
            location: 'Mobile Health Van'
          }
        ]);
      } else {
        setRecords(fetchedRecords);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }, [profile?.uid]);

  const startVoiceInput = () => {
    setMicError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'bn' ? 'bn-IN' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setNewUpdate(prev => prev + (prev ? " " : "") + text);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access is blocked in the preview. Please open the app in a new tab to use voice features.');
      } else {
        setMicError('Speech recognition error. Please try again.');
      }
      setTimeout(() => setMicError(null), 8000);
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
      setMicError('Could not start mic.');
    }
  };

  const handleSaveUpdate = async () => {
    if (!newUpdate.trim() || !profile) return;
    setSavingUpdate(true);
    try {
      const currentUpdates = profile.recentUpdates || [];
      const newEntry: UpdateEntry = {
        text: newUpdate,
        timestamp: new Date().toLocaleString()
      };
      await updateProfile({
        recentUpdates: [newEntry, ...currentUpdates].slice(0, 5) // Keep last 5
      });
      setNewUpdate('');
    } catch (e) {
      console.error("Failed to save update", e);
    } finally {
      setSavingUpdate(false);
    }
  };

  const qrData = JSON.stringify({
    uid: profile?.uid,
    name: profile?.name,
    abha: profile?.abhaId,
    blood: profile?.bloodGroup,
    allergies: profile?.allergies,
    aadhar: profile?.aadharNo,
    contact: profile?.contactNo,
    emergency: profile?.emergencyContactNo
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans antialiased flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 h-screen sticky top-0 z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 mesh-gradient-red rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold text-[#1D1D1F]">HealthBridge</h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'home', label: t.home, icon: Activity },
              { id: 'profile', label: t.profile, icon: User },
              { id: 'records', label: t.records, icon: History },
              { id: 'scan', label: t.showQr, icon: QrCode },
              { id: 'nearby', label: 'Nearby Hospitals', icon: MapPin },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'scan') {
                    setShowQR(true);
                  } else if (item.id === 'nearby') {
                    setActiveTab('home');
                    setTimeout(() => {
                      aiSearchRef.current?.searchNearby();
                    }, 100);
                  } else {
                    setActiveTab(item.id as any);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-red-50 text-red-600 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logged in as</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <User className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{profile?.name}</p>
                <p className="text-[10px] text-slate-500 capitalize">{profile?.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-600" />
          <span className="font-display font-bold">HealthBridge</span>
        </div>
        <div className="flex gap-2">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
          </select>
          <button onClick={logout} className="p-2 text-slate-500"><LogOut className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-10">
          
          {/* Top Bar / Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-display font-bold text-[#1D1D1F] tracking-tight">
                {activeTab === 'home' ? `${t.welcome}, ${profile?.name?.split(' ')[0]}` : 
                 activeTab === 'profile' ? t.profile : t.records}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {activeTab === 'home' ? 'Here is your health summary and quick actions.' : 
                 activeTab === 'profile' ? 'Manage your digital health identity.' : 'Your past medical consultations.'}
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-slate-700">System Online</span>
              </div>
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold outline-none shadow-sm hover:border-red-200 transition-all"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
          </div>
        
          {activeTab === 'home' && (
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left & Middle Column */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Verification Banner */}
                {!profile?.isVerified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[2.5rem] border-2 border-dashed border-red-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                        <Shield className="w-8 h-8 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{t.verifyIdentity}</h4>
                        <p className="text-sm text-slate-500 max-w-md">{t.verifyDesc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowVerificationModal(true)}
                      className="whitespace-nowrap px-8 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                    >
                      Verify Now
                    </button>
                  </motion.div>
                )}
                
                {/* Horizontal ABHA Card */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="mesh-gradient-red rounded-[2.5rem] p-8 lg:p-10 text-white shadow-[0_30px_60px_-15px_rgba(239,68,68,0.3)] border border-white/20 relative overflow-hidden group cursor-pointer"
                  onClick={() => setShowQR(true)}
                >
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32 blur-2xl"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-6 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-80 font-bold block mb-1">Digital Health Passport</span>
                            <h3 className="text-xl font-display font-bold tracking-tight">{t.abha}</h3>
                          </div>
                        </div>
                        {profile?.isVerified && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t.verified}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm opacity-70 font-medium tracking-wider">ABHA NUMBER</p>
                        <p className="text-3xl lg:text-4xl font-mono tracking-[0.2em] font-bold drop-shadow-lg">
                          {profile?.abhaId || '12-3456-7890-1234'}
                        </p>
                      </div>

                      <div className="flex items-center gap-8">
                        <div>
                          <p className="text-[10px] opacity-70 font-bold tracking-widest uppercase mb-1">Name</p>
                          <p className="font-bold text-lg">{profile?.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-70 font-bold tracking-widest uppercase mb-1">{t.blood}</p>
                          <p className="font-bold text-lg">{profile?.bloodGroup}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-3xl shadow-2xl flex flex-col items-center gap-3 self-center md:self-auto">
                      <QRCodeSVG value={qrData} size={140} level="H" includeMargin={false} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Scan to Sync History</span>
                    </div>
                  </div>
                </motion.div>

                {/* Symptoms & AI Advice Section */}
                <div className="bg-white rounded-[3rem] p-8 lg:p-10 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
                  <AISearchBar ref={aiSearchRef} />
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: t.showQr, icon: QrCode, color: 'red', onClick: () => setShowQR(true) },
                    { label: t.history, icon: History, color: 'blue', onClick: () => setActiveTab('records') },
                    { label: 'Symptoms', icon: Stethoscope, color: 'green', onClick: () => document.querySelector('input')?.focus() },
                    { label: 'Nearby Hospitals', icon: MapPin, color: 'orange', onClick: () => aiSearchRef.current?.searchNearby() },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4 hover:shadow-md hover:border-red-100 transition-all group active:scale-95"
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                        action.color === 'red' ? "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white" :
                        action.color === 'blue' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" :
                        action.color === 'green' ? "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white" :
                        "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"
                      )}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Health Summary & Updates */}
              <div className="lg:col-span-4 space-y-8">
                {/* Health Summary Card */}
                <Card className="p-8 rounded-[3rem] border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] bg-white h-fit">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-display font-bold flex items-center gap-3">
                      <div className="p-2 bg-red-50 rounded-xl">
                        <Activity className="w-5 h-5 text-red-500" />
                      </div>
                      {t.summary}
                    </h3>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      Healthy
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">{t.blood}</p>
                        <p className="text-3xl font-display font-bold text-red-600">{profile?.bloodGroup || 'O+'}</p>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">Age</p>
                        <p className="text-3xl font-display font-bold text-slate-800">
                          {profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : '28'}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-4">{t.allergies}</p>
                      <div className="flex flex-wrap gap-2">
                        {profile?.allergies?.length ? profile.allergies.map(a => (
                          <Badge key={a} color="red" className="px-4 py-1.5 rounded-xl text-xs font-bold">
                            {a}
                          </Badge>
                        )) : <span className="text-slate-400 text-sm italic">No known allergies</span>}
                      </div>
                    </div>

                    {/* Recent Visits Snippet */}
                    <div className="pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-slate-800">{t.visits}</h4>
                        <button onClick={() => setActiveTab('records')} className="text-red-600 text-xs font-bold hover:underline">View All</button>
                      </div>
                      <div className="space-y-3">
                        {records.slice(0, 2).map(record => (
                          <div key={record.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                              <Stethoscope className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{record.diagnosis}</p>
                              <p className="text-[10px] text-slate-500">{record.doctorName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Health Tips / Updates */}
                <Card className="p-8 rounded-[3rem] border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] bg-white">
                  <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    Health Tips
                  </h3>
                  <div className="space-y-4">
                    {[
                      { title: 'Stay Hydrated', desc: 'Drink at least 3-4 liters of water daily while working.', icon: Heart },
                      { title: 'Regular Checkups', icon: Stethoscope, desc: 'Visit a clinic every 6 months for routine tests.' }
                    ].map((tip, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <tip.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 mb-1">{tip.title}</p>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{tip.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

        {activeTab === 'records' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-display font-bold">{t.allRecords}</h3>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl border-slate-200 bg-white">Filter</Button>
                <Button variant="outline" className="rounded-xl border-slate-200 bg-white">Export PDF</Button>
              </div>
            </div>
            
            <div className="grid gap-6">
              {records.length ? records.map((record, i) => (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-8 rounded-[2.5rem] hover:border-red-100 transition-all group cursor-pointer shadow-sm hover:shadow-md">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex gap-6">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-600 transition-colors">
                          <Stethoscope className="w-8 h-8 text-red-600 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-xl font-display font-bold text-slate-900">{record.diagnosis}</h4>
                            <Badge color="blue" className="px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold tracking-widest">Consultation</Badge>
                          </div>
                          <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-2"><User className="w-4 h-4" /> {record.doctorName}</span>
                            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {record.location}</span>
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {record.date?.toDate ? record.date.toDate().toLocaleDateString() : 'Recent'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex md:flex-col justify-between items-end gap-2">
                        <Button variant="outline" className="rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50">View Details</Button>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-50">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prescription</p>
                      <p className="text-sm text-slate-700 leading-relaxed italic">"{record.prescription}"</p>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium">No medical records found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'language' && (
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-display px-2">{t.selectLang}</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { id: 'en', label: 'English', sub: 'Default language' },
                  { id: 'hi', label: 'हिंदी', sub: 'Hindi' },
                  { id: 'bn', label: 'বাংলা', sub: 'Bengali' }
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id as any)}
                    className={cn(
                      "p-8 rounded-[2.5rem] border-2 text-left transition-all flex flex-col justify-between h-48",
                      lang === l.id ? "border-red-500 bg-red-50 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                      lang === l.id ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={cn("text-xl font-bold", lang === l.id ? "text-red-700" : "text-slate-800")}>{l.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{l.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-display font-bold">{t.personalInfo}</h3>
                <Button 
                  variant="outline" 
                  className="rounded-xl border-slate-200"
                  onClick={() => setShowEditProfile(true)}
                >
                  Edit Profile
                </Button>
              </div>
              <Card className="p-10 rounded-[3rem] space-y-10">
                <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-[2.5rem]">
                  <div className="w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center shadow-inner">
                    <User className="w-12 h-12 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-display font-bold text-slate-900">{profile?.name}</h4>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge color="red" className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">Worker Profile</Badge>
                      <span className="text-slate-400 text-sm">•</span>
                      <span className="text-slate-500 text-sm font-medium">Member since 2024</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                  {[
                    { label: t.abha, value: profile?.abhaId, icon: Shield },
                    { label: t.blood, value: profile?.bloodGroup, icon: Activity, color: 'text-red-600' },
                    { label: 'Aadhar Number', value: profile?.aadharNo, icon: Smartphone },
                    { label: 'Contact', value: profile?.contactNo, icon: Smartphone },
                    { label: 'Emergency Contact', value: profile?.emergencyContactNo, icon: AlertCircle, color: 'text-red-500' },
                    { label: 'Gender', value: profile?.gender, icon: User },
                    { label: 'Date of Birth', value: profile?.dob, icon: Clock },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50 group hover:bg-slate-50/50 transition-colors rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                          <item.icon className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-sm font-bold text-slate-500">{item.label}</span>
                      </div>
                      <span className={cn("font-bold text-slate-800", item.color)}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem]">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Home Address</span>
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{profile?.address}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </main>

    {/* Mobile Bottom Navigation */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-6 py-4 flex justify-between items-center z-50">
      {[
        { id: 'home', icon: Activity },
        { id: 'records', icon: History },
        { id: 'profile', icon: User },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id as any)}
          className={cn(
            "p-3 rounded-2xl transition-all",
            activeTab === item.id ? "bg-red-600 text-white shadow-lg shadow-red-200 scale-110" : "text-slate-400"
          )}
        >
          <item.icon className="w-6 h-6" />
        </button>
      ))}
      <button 
        onClick={() => setShowQR(true)}
        className="p-3 rounded-2xl text-slate-400"
      >
        <QrCode className="w-6 h-6" />
      </button>
    </nav>

    {/* Edit Profile Modal */}
    <AnimatePresence>
      {showEditProfile && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={() => setShowEditProfile(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-900">Edit Profile</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel"
                    value={editForm.contactNo}
                    onChange={e => setEditForm(prev => ({ ...prev, contactNo: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Home Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <textarea 
                    value={editForm.address}
                    onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium min-h-[120px] resize-none"
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-6 rounded-2xl text-lg font-bold border-slate-200"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="flex-1 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-red-100"
                >
                  {isSavingProfile ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* QR Modal */}
    <AnimatePresence>
      {showQR && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={() => setShowQR(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[3rem] p-10 w-full max-w-md text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-8 flex justify-center">
              <div className="p-6 bg-white border-8 border-slate-50 rounded-[2.5rem] shadow-inner">
                <QRCodeSVG value={qrData} size={240} />
              </div>
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 text-slate-900">Digital Health Passport</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Show this QR code to any registered healthcare provider to instantly share your verified medical history.
            </p>
            <Button onClick={() => setShowQR(false)} className="w-full py-6 rounded-2xl text-lg font-bold">Close</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Modals */}
    <VerificationModal 
      isOpen={showVerificationModal} 
      onClose={() => setShowVerificationModal(false)}
      onVerified={async (data) => {
        console.log('Verified data:', data);
        await updateProfile({ 
          isVerified: true,
          aadharNo: data.id_number || profile?.aadharNo,
          name: data.full_name || profile?.name,
          gender: data.gender || profile?.gender,
          dob: data.dob || profile?.dob,
          address: data.address?.full_address || profile?.address
        });
      }}
    />
  </div>
);
};

const DoctorDashboard = () => {
  const { profile, logout } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [newRecord, setNewRecord] = useState({ diagnosis: '', prescription: '' });
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const scan = () => {
      if (videoRef.current && canvasRef.current && scanning) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            try {
              const data = JSON.parse(code.data);
              if (data.uid && data.name) {
                setPatient({
                  uid: data.uid,
                  name: data.name,
                  abha: data.abha || 'N/A',
                  blood: data.blood || 'N/A',
                  allergies: data.allergies || [],
                  aadhar: data.aadhar || 'N/A',
                  contact: data.contact || 'N/A',
                  emergency: data.emergency || 'N/A',
                  history: [] 
                });
                
                // Fetch real history (allowed for doctors)
                const q = query(collection(db, 'records'), where('workerUid', '==', data.uid));
                
                onSnapshot(q, (snapshot) => {
                  const history = snapshot.docs.map(d => ({
                    diagnosis: d.data().diagnosis,
                    date: d.data().date?.toDate ? d.data().date.toDate().toLocaleDateString() : 'Recent',
                    doctor: d.data().doctorName
                  }));
                  setPatient((prev: any) => prev ? { ...prev, history } : null);
                });

                setScanning(false);
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
                return;
              }
            } catch (e) {
              console.error("Invalid QR data", e);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    if (scanning) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.setAttribute("playsinline", "true");
            videoRef.current.play();
            animationFrameId = requestAnimationFrame(scan);
          }
        })
        .catch(err => {
          console.error("Camera access error", err);
          setScanning(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setCameraError('Camera access denied. Please allow camera permissions or open the app in a new tab.');
          } else {
            setCameraError('Could not access camera. Please ensure no other app is using it.');
          }
          setTimeout(() => setCameraError(null), 8000);
        });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanning]);

  const handleScan = () => {
    setScanning(true);
    setPatient(null);
  };

  const startVoiceInput = () => {
    setMicError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setNewRecord(prev => ({
        ...prev,
        diagnosis: prev.diagnosis + (prev.diagnosis ? " " : "") + text + ". "
      }));
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access is blocked in the preview. Please open the app in a new tab to use voice features.');
      } else {
        setMicError('Speech recognition error. Please try again.');
      }
      setTimeout(() => setMicError(null), 8000);
    };
    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
      setMicError('Could not start mic.');
    }
  };

  const saveRecord = async () => {
    if (!patient || !newRecord.diagnosis) return;
    setLoading(true);
    const path = 'records';
    try {
      await addDoc(collection(db, path), {
        workerUid: patient.uid,
        doctorUid: profile?.uid,
        doctorName: profile?.name,
        diagnosis: newRecord.diagnosis,
        prescription: newRecord.prescription,
        date: serverTimestamp(),
        location: 'City General Hospital'
      });
      alert('Record saved successfully!');
      setPatient(null);
      setNewRecord({ diagnosis: '', prescription: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans antialiased flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-slate-900 tracking-tight">HealthBridge</span>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: Activity, label: 'Dashboard', active: true },
              { id: 'scan', icon: QrCode, label: 'Scan Patient' },
              { id: 'profile', icon: User, label: 'My Profile' },
            ].map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all",
                  item.active ? "bg-red-50 text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-[1200px] mx-auto p-6 lg:p-10 space-y-10">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Doctor Portal</h1>
              <p className="text-slate-500 text-sm mt-1">Logged in as <span className="text-red-600 font-bold">Dr. {profile?.name}</span></p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Online</span>
              </div>
              <Button variant="outline" onClick={logout} className="lg:hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-10">
            {/* Left Column: Actions */}
            <div className="lg:col-span-5 space-y-8">
              <Card className="p-10 rounded-[3rem] border-none shadow-[0_20px_50px_-20px_rgba(0,0,0,0.08)] bg-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <h3 className="text-2xl font-display font-bold mb-8 text-[#1D1D1F]">Patient Check-in</h3>
                <Button 
                  onClick={handleScan} 
                  className="w-full py-14 flex-col gap-5 rounded-[2.5rem] text-xl font-bold mesh-gradient-red border-none shadow-[0_15px_30px_-10px_rgba(239,68,68,0.3)] hover:scale-[1.02] transition-transform overflow-hidden relative" 
                  disabled={scanning}
                >
                  {scanning ? (
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover opacity-60" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-2 border-white/30 m-12 rounded-3xl animate-pulse"></div>
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan-line"></div>
                      <p className="absolute bottom-6 text-xs text-white font-bold tracking-widest uppercase">Align QR Code</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-5 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
                        <QrCode className="w-12 h-12" />
                      </div>
                      Scan QR Code
                    </>
                  )}
                </Button>

                {cameraError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{cameraError}</p>
                  </motion.div>
                )}
                <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-50 flex gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm h-fit">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    Scan the worker's digital health passport to instantly sync their cross-state medical history.
                  </p>
                </div>
              </Card>

              {patient && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="p-8 rounded-[3rem] border-none shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] bg-white">
                    <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl">
                        <History className="w-5 h-5 text-slate-600" />
                      </div>
                      Patient History
                    </h3>
                    <div className="space-y-4">
                      {patient.history.length ? patient.history.map((h: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-sm text-slate-800">{h.diagnosis}</p>
                            <Badge color="blue" className="text-[10px]">{h.date}</Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">By {h.doctor}</p>
                        </div>
                      )) : (
                        <p className="text-center text-slate-400 text-xs py-8 italic">No previous history found.</p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Column: Details & Form */}
            <div className="lg:col-span-7">
              {patient ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="rounded-[3rem] overflow-hidden border-none shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)] bg-white">
                    <div className="mesh-gradient-red p-10 text-white relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-80 font-bold block mb-2">Verified Patient</span>
                          <h2 className="text-4xl font-display font-bold tracking-tight">{patient.name}</h2>
                          <p className="text-lg opacity-90 mt-1 font-mono">{patient.abha}</p>
                        </div>
                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
                          <User className="w-10 h-10" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 mt-10 relative z-10">
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                          <p className="text-[10px] opacity-70 font-bold tracking-widest uppercase mb-1">Blood Group</p>
                          <p className="text-xl font-bold">{patient.blood}</p>
                        </div>
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                          <p className="text-[10px] opacity-70 font-bold tracking-widest uppercase mb-1">Gender</p>
                          <p className="text-xl font-bold">Male</p>
                        </div>
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                          <p className="text-[10px] opacity-70 font-bold tracking-widest uppercase mb-1">Age</p>
                          <p className="text-xl font-bold">28</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-10 space-y-8">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Medical Alerts</h4>
                        <div className="flex flex-wrap gap-2">
                          {patient.allergies.map((a: string) => (
                            <Badge key={a} color="red" className="px-4 py-2 rounded-xl text-xs font-bold">
                              Allergic to {a}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-slate-50">
                        <h3 className="text-2xl font-display font-bold text-slate-900">New Consultation</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Diagnosis</label>
                            <button 
                              onClick={startVoiceInput}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all relative",
                                isListening ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              )}
                            >
                              <AnimatePresence>
                                {micError && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    className="absolute bottom-full mb-4 right-0 bg-white border border-red-100 p-4 rounded-2xl shadow-2xl z-50 w-64 text-center"
                                  >
                                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <MicOff className="w-5 h-5 text-red-500" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 mb-1">Microphone Blocked</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                                      Browser blocked the microphone. Please open the app in a new tab.
                                    </p>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); window.open(window.location.href, '_blank'); }}
                                      className="w-full py-2 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                      Open in New Tab
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <Mic className="w-3 h-3" />
                              {isListening ? 'Listening...' : 'Voice Input'}
                            </button>
                          </div>
                          <input 
                            type="text"
                            value={newRecord.diagnosis}
                            onChange={e => setNewRecord({...newRecord, diagnosis: e.target.value})}
                            placeholder="e.g. Viral Fever, Muscle Strain"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prescription & Advice</label>
                            <textarea 
                              value={newRecord.prescription}
                              onChange={e => setNewRecord({...newRecord, prescription: e.target.value})}
                              placeholder="Medicines, dosage, and rest advice..."
                              rows={4}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                            />
                          </div>
                          <div className="flex gap-4 pt-4">
                            <Button 
                              onClick={saveRecord} 
                              className="flex-1 py-6 rounded-2xl text-lg font-bold shadow-lg shadow-red-100"
                              disabled={loading || !newRecord.diagnosis || !newRecord.prescription}
                            >
                              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Save & Sync Record'}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setPatient(null)}
                              className="py-6 px-8 rounded-2xl border-slate-200"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center px-10">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                    <User className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-800 mb-4">No Patient Selected</h3>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Please scan a patient's ABHA QR code to view their medical history and start a new consultation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminDashboard = () => {
  const { profile, logout } = useAuth();
  const [stats, setStats] = useState({ workers: 0, doctors: 0, records: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(d => d.data() as UserProfile);
      setUsers(allUsers);
      setStats(prev => ({
        ...prev,
        workers: allUsers.filter(u => u.role === 'worker').length,
        doctors: allUsers.filter(u => u.role === 'doctor').length
      }));
      setLoading(false);
    });

    const recordsUnsubscribe = onSnapshot(collection(db, 'records'), (snapshot) => {
      setStats(prev => ({ ...prev, records: snapshot.size }));
    });

    return () => {
      usersUnsubscribe();
      recordsUnsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <aside className="w-72 bg-slate-900 text-white p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="w-8 h-8 text-red-500" />
          <span className="text-xl font-display font-bold">Admin Panel</span>
        </div>
        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl text-sm font-bold">
            <Activity className="w-5 h-5" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl text-sm font-bold">
            <User className="w-5 h-5" /> User Management
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl text-sm font-bold">
            <Database className="w-5 h-5" /> System Logs
          </button>
        </nav>
        <button onClick={logout} className="flex items-center gap-3 text-red-400 font-bold p-4 hover:bg-red-500/10 rounded-xl">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold">System Overview</h1>
            <p className="text-slate-500">Welcome back, {profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
              Live System Status
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Workers', value: stats.workers, icon: User, color: 'blue' },
            { label: 'Registered Doctors', value: stats.doctors, icon: Stethoscope, color: 'red' },
            { label: 'Medical Records', value: stats.records, icon: FileText, color: 'green' }
          ].map((stat, i) => (
            <Card key={i} className="p-6 border-none shadow-sm">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                  stat.color === 'red' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                )}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-display font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold">Recent User Registrations</h3>
            <Button variant="ghost" className="text-xs">View All Users</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.slice(0, 10).map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm">{u.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      <Badge color={u.role === 'doctor' ? 'red' : u.role === 'admin' ? 'yellow' : 'blue'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          u.isVerified ? "bg-green-500" : "bg-slate-300"
                        )}></div>
                        <span className="text-xs font-medium text-slate-600">
                          {u.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};

// --- Main App & Provider ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const mockUser: MockUser = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email
        };
        setUser(mockUser);
        
        // Fetch profile from Firestore
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error('Profile fetch error:', e);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      // Admin Bootstrap Logic
      const adminEmail = 'malviyaaditya51@gmail.com';
      const adminPass = 'Aditya@712';

      if (email === adminEmail && password === adminPass) {
        try {
          // Try signing in
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          // Ensure profile exists and has admin role
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists() || (docSnap.data() as UserProfile).role !== 'admin') {
            const adminProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: 'Admin Aditya',
              email: adminEmail,
              role: 'admin',
              abhaId: 'ADMIN-001',
              recentUpdates: []
            };
            await setDoc(docRef, adminProfile, { merge: true });
            setProfile(adminProfile);
          } else {
            setProfile(docSnap.data() as UserProfile);
          }
          return null;
        } catch (authError: any) {
          if (authError.code === 'auth/operation-not-allowed') {
            return 'Email/Password authentication is not enabled in Firebase Console. Please enable it in the Sign-in Method tab.';
          }
          // If user doesn't exist, create it
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              const firebaseUser = userCredential.user;
              const adminProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: 'Admin Aditya',
                email: adminEmail,
                role: 'admin',
                abhaId: 'ADMIN-001',
                recentUpdates: []
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), adminProfile);
              setProfile(adminProfile);
              return null;
            } catch (createError: any) {
              if (createError.code === 'auth/operation-not-allowed') {
                return 'Email/Password authentication is not enabled in Firebase Console. Please enable it in the Sign-in Method tab.';
              }
              console.error('Admin creation error:', createError);
              return createError.message;
            }
          }
          console.error('Admin login error:', authError);
          return authError.message;
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
      return null;
    } catch (e: any) {
      console.error('Login error:', e);
      if (e.code === 'auth/operation-not-allowed') {
        return 'Email/Password authentication is not enabled in Firebase Console. Please enable it in the Sign-in Method tab.';
      }
      return e.message || 'Invalid User ID or Password';
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Create a basic profile for new Google users
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email || '',
          role: 'worker',
          abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          bloodGroup: 'O+',
          allergies: [],
          chronicConditions: [],
          recentUpdates: []
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      } else {
        setProfile(docSnap.data() as UserProfile);
      }
      return true;
    } catch (e) {
      console.error('Google Login error:', e);
      return false;
    }
  };

  const signup = async (details: Partial<UserProfile> & { password: string }): Promise<string | null> => {
    if (!details.email || !details.password) return 'Email and password are required';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password);
      const firebaseUser = userCredential.user;
      
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: details.name || '',
        email: details.email || '',
        role: details.role || 'worker',
        password: details.password, // Storing password in Firestore is generally NOT recommended, but keeping it for now as per existing logic
        aadharNo: details.aadharNo,
        contactNo: details.contactNo,
        emergencyContactNo: details.emergencyContactNo,
        gender: details.gender,
        dob: details.dob,
        address: details.address,
        abhaId: details.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        bloodGroup: details.bloodGroup || 'O+',
        allergies: details.allergies || [],
        chronicConditions: details.chronicConditions || [],
        recentUpdates: []
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setProfile(newProfile);
      return null;
    } catch (e: any) {
      console.error('Signup error:', e);
      if (e.code === 'auth/operation-not-allowed') {
        return 'Email/Password authentication is not enabled in Firebase Console. Please enable it in the Sign-in Method tab.';
      }
      return e.message || 'Signup failed. Please try again.';
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updatedProfile = { ...(profile || {}), ...updates } as UserProfile;
    setProfile(updatedProfile);
    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
    } catch (e) {
      console.error('Update profile error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithGoogle, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

const IframeWarning = () => {
  const [isIframe, setIsIframe] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  if (!isIframe || dismissed) return null;

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-lg"
    >
      <div className="flex items-center gap-2 text-xs font-bold">
        <AlertCircle className="w-4 h-4" />
        <span>For full features (Mic/Camera), open HealthBridge in a new tab.</span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="bg-white text-red-600 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors"
        >
          Open Now
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-red-700 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <IframeWarning />
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading, updateProfile } = useAuth();
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Reset activeRole when user logs out or set it if profile has it
  useEffect(() => {
    if (!user) {
      setActiveRole(null);
    } else if (profile?.role) {
      setActiveRole(profile.role);
    }
  }, [user, profile?.role]);

  const handleRoleSelect = async (role: Role) => {
    if (!user) return;
    setIsTransitioning(true);
    
    // If profile doesn't exist, create it. If it does, update it with the selected role.
    const newProfile: any = {
      uid: user.uid,
      name: user.displayName || 'Anonymous',
      email: user.email || '',
      role,
      abhaId: role === 'worker' ? (profile?.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`) : null,
      bloodGroup: role === 'worker' ? (profile?.bloodGroup || 'O+') : null,
      allergies: role === 'worker' ? (profile?.allergies || ['Dust', 'Cold', 'Cough']) : null,
      chronicConditions: role === 'worker' ? (profile?.chronicConditions || []) : null
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
      await updateProfile(newProfile);
      setActiveRole(role);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsTransitioning(false);
    }
  };

  if (loading || isTransitioning) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-display animate-pulse">
        {isTransitioning ? 'Setting up your dashboard...' : 'Loading HealthBridge...'}
      </p>
    </div>
  );

  if (!user) {
    if (showLogin) {
      return <AuthView onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }
  
  // Always show role selection if no role has been selected for this session
  if (!activeRole) return <RoleSelectionView onSelect={handleRoleSelect} />;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
    >
      {activeRole === 'admin' ? <AdminDashboard /> : 
       activeRole === 'worker' ? <WorkerDashboard /> : <DoctorDashboard />}
    </motion.div>
  );
}
