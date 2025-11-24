// Configuração do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Inicialização Firebase
let firebaseConfig;
let appId;
try {
  firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  appId = typeof __app_id !== 'undefined' ? __app_id : 'academylids';
  if (!firebaseConfig.apiKey) throw new Error("Fallback needed");
} catch (e) {
  firebaseConfig = {
    apiKey: "AIzaSyB0xvVzytOx4dumokND-dr926krSO4-CqU",
    authDomain: "academylids.firebaseapp.com",
    projectId: "academylids",
    storageBucket: "academylids.firebasestorage.app",
    messagingSenderId: "826478835273",
    appId: "1:826478835273:web:0995d64419276b932cb198"
  };
  appId = 'academylids';
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Referências de Coleção
const getCol = (name) => collection(db, `artifacts/${appId}/public/data/${name}`);
const getAdminsCol = () => collection(db, 'admins');

// --- Componentes Reutilizáveis ---

const LoadingSpinner = () => <i className="fas fa-spinner animate-spin mr-2"></i>;

// NOVO: Componente ScrollProgressBar
const ScrollProgressBar = () => {
    const [width, setWidth] = React.useState(0);

    React.useEffect(() => {
        const handleScroll = () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
            setWidth(scrolled);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return <div id="scroll-progress" style={{ width: `${width}%` }}></div>;
};

const Modal = ({ isOpen, onClose, title, children, size = "modal-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${size} p-6 shadow-2xl`}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Componente de Gráficos (Wrapper para Chart.js) ---
const DashboardChart = ({ type, data, options, id }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, { type, data, options });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [data, type, options]);

    return <canvas ref={canvasRef} id={id}></canvas>;
};


// --- Componente Principal (APP) ---

function App() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [view, setView] = React.useState('home'); // home, detail, admin
  const [selectedCourse, setSelectedCourse] = React.useState(null);
  const [userCheckins, setUserCheckins] = React.useState({});
  
  const [courses, setCourses] = React.useState([]);
  const [instructors, setInstructors] = React.useState([]);

  // Auth Listener
  React.useEffect(() => {
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try { await signInWithCustomToken(auth, __initial_auth_token); return; } 
            catch(e) { console.error(e); }
        }
        if (!auth.currentUser) await signInAnonymously(auth);
    };
    initAuth();

    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (!u.isAnonymous) {
          const adminDoc = await getDoc(doc(getAdminsCol(), u.uid));
          setIsAdmin(adminDoc.exists());
        } else {
          setIsAdmin(false);
        }
        
        const q = query(getCol('checkins'), where("userId", "==", u.uid));
        const snap = await getDocs(q);
        const checkins = {};
        snap.forEach(d => checkins[d.data().courseId] = true);
        setUserCheckins(checkins);
      }
    });
  }, []);

  // Data Listeners
  React.useEffect(() => {
    const unsubCourses = onSnapshot(getCol('courses'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => a.title.localeCompare(b.title));
      setCourses(list);
    });
    const unsubInstructors = onSnapshot(getCol('instructors'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInstructors(list);
    });
    return () => { unsubCourses(); unsubInstructors(); };
  }, []);

  const goHome = () => setView('home');
  const goDetail = (course) => { setSelectedCourse(course); setView('detail'); window.scrollTo(0,0); };
  const goAdmin = () => { if(isAdmin) setView('admin'); else setIsLoginModalOpen(true); };

  const [isLoginModalOpen, setIsLoginModalOpen] = React.useState(false);
  
  return (
    <div className="min-h-screen flex flex-col">
        {/* Barra de Progresso de Scroll Inserida Aqui */}
        <ScrollProgressBar />

        {view !== 'admin' && (
            <Header 
                isAdmin={isAdmin} 
                onAdminClick={goAdmin} 
                onLogout={() => signOut(auth)}
                goHome={goHome}
            />
        )}

        <main className="flex-1">
            {view === 'home' && <HomeView courses={courses} onCourseClick={goDetail} />}
            
            {view === 'detail' && selectedCourse && (
                <CourseDetailView 
                    course={selectedCourse} 
                    user={user}
                    hasCheckedIn={!!userCheckins[selectedCourse.id]}
                    onBack={goHome}
                    setUserCheckins={setUserCheckins}
                />
            )}
            
            {view === 'admin' && isAdmin && (
                <AdminPanel 
                    courses={courses} 
                    instructors={instructors}
                    onExit={goHome}
                    currentUser={user}
                />
            )}
        </main>

        {view !== 'admin' && <Footer onAdminClick={goAdmin} />}

        <LoginModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)} 
            onSuccess={() => { setIsLoginModalOpen(false); setView('admin'); }}
        />
    </div>
  );
}

// --- Views Principais ---

const Header = ({ isAdmin, onAdminClick, onLogout, goHome }) => (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <div className="cursor-pointer" onClick={goHome}>
                <img src="https://i.postimg.cc/hvvWCwnk/Prancheta-1-1.png" alt="Logo" className="h-10" />
            </div>
            <div className="flex gap-4">
                <button onClick={onAdminClick} className="btn-ghost px-4 py-2 text-sm">
                    <i className="fas fa-lock mr-2"></i>{isAdmin ? 'Painel Admin' : 'Admin'}
                </button>
                {isAdmin && (
                    <button onClick={onLogout} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-semibold transition">
                        <i className="fas fa-right-from-bracket mr-2"></i>Sair
                    </button>
                )}
            </div>
        </div>
    </header>
);

const HomeView = ({ courses, onCourseClick }) => {
    const openCourses = courses.filter(c => c.status === 'aberto');
    const soonCourses = courses.filter(c => c.status === 'em_breve');

    return (
        <div className="animate-fade-in">
            <section className="relative bg-slate-900 text-white py-24 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://i.postimg.cc/4xNpxRZJ/capabannerlids.png')] bg-cover bg-center"></div>
                <div className="relative z-10 container mx-auto px-6">
                    <span className="inline-block bg-white/10 border border-white/20 rounded-full px-4 py-1 text-sm font-bold mb-6 backdrop-blur">
                        <i className="fa-solid fa-bolt text-yellow-400 mr-2"></i> Inscrições Abertas
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">Evereste Academy</h1>
                    <p className="text-xl text-slate-300 max-w-2xl mb-8">
                        Formações práticas e focadas em resultados para elevar a excelência do Instituto Evereste.
                    </p>
                    <button onClick={() => document.getElementById('cursos').scrollIntoView({behavior: 'smooth'})} className="btn-primary px-8 py-4 text-lg shadow-lg shadow-blue-500/30">
                        <i className="fa-solid fa-graduation-cap mr-2"></i> Ver Cursos
                    </button>
                </div>
            </section>

            <section id="cursos" className="py-20 container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black text-slate-900 mb-4">Cursos Disponíveis</h2>
                    <p className="text-slate-500 text-lg">Inscrições abertas para as próximas turmas</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {openCourses.length === 0 ? <p className="col-span-2 text-center text-slate-400">Nenhum curso aberto.</p> : 
                    openCourses.map(course => (
                        <div key={course.id} onClick={() => onCourseClick(course)} 
                            className="card-3d p-6 cursor-pointer group overflow-hidden relative"
                            style={{ 
                                borderBottom: `4px solid ${course.themeColor}`,
                                background: `linear-gradient(135deg, ${course.themeColor}, ${course.themeColorDark || course.themeColor})`
                            }}>
                            <div className="relative z-10 text-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <i className={`fa-solid ${course.icon} text-3xl opacity-80`}></i>
                                    <div>
                                        <h3 className="text-2xl font-bold">{course.title}</h3>
                                        <p className="opacity-90">{course.subtitle}</p>
                                    </div>
                                </div>
                                <div className="rounded-lg overflow-hidden mb-4 shadow-inner bg-black/20 h-48">
                                     <img src={course.headerOverlayImage} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-500" />
                                </div>
                                <p className="mb-6 opacity-90 line-clamp-2">{course.summary}</p>
                                <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur py-3 rounded-lg font-bold transition">
                                    Ver Detalhes <i className="fa-solid fa-arrow-right ml-2"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {soonCourses.length > 0 && (
                    <div className="mt-20">
                         <h3 className="text-2xl font-bold text-center mb-8 text-slate-700">Em Breve</h3>
                         <div className="grid md:grid-cols-3 gap-6">
                            {soonCourses.map(c => (
                                <div key={c.id} className="card-3d p-6 bg-slate-50 opacity-75">
                                    <span className="badge-status status-soon mb-3 inline-block">Em breve</span>
                                    <h4 className="font-bold text-lg text-slate-700">{c.title}</h4>
                                    <p className="text-sm text-slate-500 mt-2">Novas turmas a serem anunciadas.</p>
                                </div>
                            ))}
                         </div>
                    </div>
                )}
            </section>
        </div>
    );
};

const CourseDetailView = ({ course, user, hasCheckedIn, onBack, setUserCheckins }) => {
    const [isEnrollModalOpen, setIsEnrollModalOpen] = React.useState(false);
    const [isCheckinModalOpen, setIsCheckinModalOpen] = React.useState(false);
    const [isRatingModalOpen, setIsRatingModalOpen] = React.useState(false);

    // Helpers para renderização segura
    const details = course.details || {};
    const objectives = course.learningObjectives || [];
    const requirements = course.requirements || [];
    const activities = course.practicalActivities || [];
    const modules = course.modules || [];
    const instructors = course.instructors || [];

    return (
        <div className="animate-fade-in bg-slate-50 min-h-screen pb-20">
            <div className="relative pt-32 pb-20 px-6 overflow-hidden" style={{ background: `linear-gradient(to right, ${course.themeColor}, ${course.themeColorDark || course.themeColor})` }}>
                <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${course.headerOverlayImage})` }}></div>
                <div className="container mx-auto relative z-10 text-white">
                    <button onClick={onBack} className="mb-8 hover:underline opacity-80 flex items-center gap-2">
                        <i className="fas fa-arrow-left"></i> Voltar
                    </button>
                    <h1 className="text-4xl md:text-6xl font-black mb-4">{course.title}</h1>
                    <p className="text-xl md:text-2xl opacity-90 max-w-3xl">{course.subtitle}</p>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-10 relative z-20">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Sobre o Curso</h2>
                        <p className="text-slate-600 leading-relaxed mb-8 whitespace-pre-line">{course.fullDescription}</p>

                        <h3 className="text-xl font-bold mb-4">O que vai aprender</h3>
                        <ul className="grid gap-3 mb-8">
                            {objectives.map((obj, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <i className="fas fa-check-circle mt-1" style={{color: course.themeColor}}></i>
                                    <span className="text-slate-700">{obj}</span>
                                </li>
                            ))}
                        </ul>

                        <h3 className="text-xl font-bold mb-6">Conteúdo Programático</h3>
                        <div className="space-y-4 mb-8">
                            {modules.map((mod, i) => (
                                <div key={i} className="bg-slate-50 p-5 rounded-lg border-l-4" style={{borderColor: course.themeColor}}>
                                    <h4 className="font-bold text-lg mb-2">{mod.title}</h4>
                                    <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                                        {(mod.topics || []).map((t, j) => <li key={j}>{t}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {activities.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-bold mb-4">Atividades Práticas</h3>
                                <div className="space-y-4">
                                    {activities.map((act, i) => (
                                        <div key={i} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                            <h4 className="font-bold flex items-center text-lg mb-2" style={{color: course.themeColor}}>
                                                <i className="fas fa-flask mr-2"></i>{act.title}
                                            </h4>
                                            <p className="text-slate-600 ml-6">{act.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {requirements.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xl font-bold mb-4">Requisitos</h3>
                                <ul className="space-y-3">
                                    {requirements.map((req, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                                            <span className="text-slate-700">{req}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl p-6 shadow-xl sticky top-24 border border-slate-100">
                             <div className="mb-6 space-y-3">
                                {Object.entries(details).map(([k, v]) => (
                                    <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="font-semibold text-slate-500">{k}</span>
                                        <span className="font-bold text-slate-800">{v}</span>
                                    </div>
                                ))}
                             </div>

                             <div className="space-y-3">
                                <button onClick={() => setIsEnrollModalOpen(true)} className="w-full py-3 rounded-lg font-bold text-white shadow-lg transform hover:-translate-y-1 transition" style={{ background: course.themeColor }}>
                                    <i className="fas fa-paper-plane mr-2"></i> Inscrever-se
                                </button>

                                {hasCheckedIn ? (
                                    <button disabled className="w-full py-3 rounded-lg font-bold bg-slate-200 text-slate-500 cursor-not-allowed">
                                        <i className="fas fa-check-double mr-2"></i> Presença Confirmada
                                    </button>
                                ) : (
                                    <button onClick={() => setIsCheckinModalOpen(true)} className="w-full py-3 rounded-lg font-bold bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 transition">
                                        <i className="fas fa-qrcode mr-2"></i> Fazer Check-in
                                    </button>
                                )}

                                {hasCheckedIn && course.isRatingEnabled && (
                                    <button onClick={() => setIsRatingModalOpen(true)} className="w-full py-3 rounded-lg font-bold bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition">
                                        <i className="fas fa-star mr-2"></i> Avaliar Instrutor
                                    </button>
                                )}
                             </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="font-bold text-slate-800 mb-4">Instrutores</h4>
                            <div className="space-y-4">
                                {instructors.map(inst => (
                                    <div key={inst.id} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                                        <img src={inst.image} className="w-12 h-12 rounded-full object-cover" />
                                        <div>
                                            <p className="font-bold text-sm">{inst.name}</p>
                                            <p className="text-xs text-slate-500">{inst.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EnrollModal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} course={course} user={user} />
            <CheckinModal isOpen={isCheckinModalOpen} onClose={() => setIsCheckinModalOpen(false)} courseId={course.id} user={user} onSuccess={(cid) => setUserCheckins(prev => ({...prev, [cid]: true}))} />
            <RatingModal isOpen={isRatingModalOpen} onClose={() => setIsRatingModalOpen(false)} course={course} user={user} />
        </div>
    );
};

const Footer = ({ onAdminClick }) => (
    <footer className="bg-white border-t border-slate-200 py-10 mt-auto">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <p className="text-slate-500 text-sm">© 2025 Evereste Academy. LIDS.</p>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onAdminClick} className="text-sm text-slate-400 hover:text-blue-600 transition">Área Admin</button>
                <img src="https://i.postimg.cc/SKQh2j5n/logo-evereste-2025-horizontal-2.png" className="h-6 opacity-50 grayscale hover:grayscale-0 transition" />
            </div>
        </div>
    </footer>
);

// --- Painel Admin ---

const AdminPanel = ({ courses, instructors, onExit, currentUser }) => {
    const [tab, setTab] = React.useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    const handleTabChange = (t) => {
        setTab(t);
        setSidebarOpen(false);
    };

    return (
        <div className="admin-layout">
            {sidebarOpen && <div className="admin-sidebar-overlay md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-black text-xl text-slate-800">Admin</h2>
                    <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}><i className="fas fa-times"></i></button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                    <AdminNavLink icon="chart-line" label="Dashboard" active={tab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
                    <AdminNavLink icon="graduation-cap" label="Cursos" active={tab === 'courses'} onClick={() => handleTabChange('courses')} />
                    <AdminNavLink icon="users" label="Matrículas" active={tab === 'enrollments'} onClick={() => handleTabChange('enrollments')} />
                    <AdminNavLink icon="chalkboard-user" label="Instrutores" active={tab === 'instructors'} onClick={() => handleTabChange('instructors')} />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="text-xs text-slate-400 mb-2 truncate">{currentUser?.email}</div>
                    <button onClick={onExit} className="flex items-center gap-3 text-red-600 hover:bg-red-50 w-full p-3 rounded-lg transition font-medium text-sm">
                        <i className="fas fa-right-from-bracket"></i> Sair do Painel
                    </button>
                </div>
            </aside>

            <main className="admin-content flex flex-col h-full w-full">
                <div className="md:hidden bg-white p-4 border-b flex items-center gap-4 sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-600"><i className="fas fa-bars text-xl"></i></button>
                    <span className="font-bold text-slate-800">Painel Administrativo</span>
                </div>

                <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                    {tab === 'dashboard' && <AdminDashboard courses={courses} instructors={instructors} />}
                    {tab === 'courses' && <AdminCourses courses={courses} instructors={instructors} />}
                    {tab === 'enrollments' && <AdminEnrollments courses={courses} />}
                    {tab === 'instructors' && <AdminInstructors instructors={instructors} />}
                </div>
            </main>
        </div>
    );
};

const AdminNavLink = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-lg transition font-medium text-sm ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
        <i className={`fas fa-${icon} w-5 text-center`}></i> {label}
    </button>
);

// --- Sub-componentes Admin ---

const AdminDashboard = ({ courses, instructors }) => {
    const [stats, setStats] = React.useState({ enrollments: 0, checkins: 0, nps: 0 });
    const [enrollmentData, setEnrollmentData] = React.useState({ labels: [], datasets: [] });
    const [ratingsData, setRatingsData] = React.useState({ labels: [], datasets: [] });
    const [comments, setComments] = React.useState([]);
    const [isExporting, setIsExporting] = React.useState(false);

    React.useEffect(() => {
        const loadStats = async () => {
            const enrSnap = await getDocs(getCol('enrollments'));
            const chkSnap = await getDocs(getCol('checkins'));
            const ratSnap = await getDocs(getCol('ratings'));
            
            let promoters=0, detractors=0, total=0;
            const commentsList = [];
            const instructorScores = {};

            ratSnap.forEach(d => {
                const r = d.data();
                if(r.rating === 5) promoters++;
                if(r.rating <= 3) detractors++;
                total++;
                if(r.comment) commentsList.push(r);

                if(r.instructorName) {
                    if(!instructorScores[r.instructorName]) instructorScores[r.instructorName] = {sum:0, count:0};
                    instructorScores[r.instructorName].sum += r.rating;
                    instructorScores[r.instructorName].count++;
                }
            });

            const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
            setStats({ enrollments: enrSnap.size, checkins: chkSnap.size, nps });
            
            commentsList.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            setComments(commentsList);

            const dates = {};
            enrSnap.forEach(d => {
                const date = d.data().createdAt?.toDate();
                if(date) {
                    const key = date.toLocaleDateString('pt-BR').slice(0,5);
                    dates[key] = (dates[key] || 0) + 1;
                }
            });
            const sortedDates = Object.keys(dates).sort();
            setEnrollmentData({
                labels: sortedDates,
                datasets: [{
                    label: 'Novas Matrículas',
                    data: sortedDates.map(d => dates[d]),
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            });

            const instLabels = Object.keys(instructorScores);
            setRatingsData({
                labels: instLabels,
                datasets: [{
                    label: 'Média Avaliação',
                    data: instLabels.map(i => (instructorScores[i].sum / instructorScores[i].count).toFixed(1)),
                    backgroundColor: '#fbbf24'
                }]
            });
        };
        loadStats();
    }, []);

    const exportCompleteReport = async () => {
        setIsExporting(true);
        try {
            const doc = new window.jspdf.jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const today = new Date().toLocaleDateString('pt-PT');

            // Buscar todos os dados atualizados
            const [enrSnap, chkSnap, ratSnap] = await Promise.all([
                getDocs(getCol('enrollments')),
                getDocs(getCol('checkins')),
                getDocs(getCol('ratings'))
            ]);

            const enrollments = enrSnap.docs.map(d => d.data());
            const checkins = chkSnap.docs.map(d => d.data());
            const ratings = ratSnap.docs.map(d => d.data());

            // --- PÁGINA 1: CAPA E DASHBOARD ---
            
            // Cabeçalho Azul
            doc.setFillColor(0, 102, 204); 
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("Relatório Executivo - Evereste Academy", 14, 20);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em ${today}`, 14, 30);

            // KPIs Principais
            doc.setTextColor(0, 0, 0);
            let yPos = 60;
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text("Visão Geral", 14, yPos);
            yPos += 10;

            const totalEnrollments = enrollments.length;
            const totalCheckins = checkins.length;
            let promoters = 0, detractors = 0;
            ratings.forEach(r => { if(r.rating === 5) promoters++; if(r.rating <= 3) detractors++; });
            const nps = ratings.length > 0 ? Math.round(((promoters - detractors) / ratings.length) * 100) : 0;

            const drawCard = (x, label, value, color) => {
                doc.setDrawColor(220);
                doc.setFillColor(250);
                doc.roundedRect(x, yPos, 55, 35, 3, 3, 'FD');
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(label, x + 5, yPos + 10);
                doc.setFontSize(18);
                doc.setTextColor(color[0], color[1], color[2]);
                doc.setFont('helvetica', 'bold');
                doc.text(String(value), x + 5, yPos + 25);
            };

            drawCard(14, "TOTAL MATRÍCULAS", totalEnrollments, [0, 102, 204]);
            drawCard(80, "TOTAL CHECK-INS", totalCheckins, [0, 168, 150]);
            drawCard(146, "NPS SCORE", nps, [106, 76, 147]);

            yPos += 50;

            // Tabela Performance por Curso
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("Desempenho por Curso", 14, yPos);
            yPos += 6;

            const courseStats = courses.map(c => {
                const cEnr = enrollments.filter(e => e.courseId === c.id).length;
                const cChk = checkins.filter(k => k.courseId === c.id).length;
                const cRats = ratings.filter(r => r.courseId === c.id);
                const avgRat = cRats.length ? (cRats.reduce((a,b)=>a+b.rating,0)/cRats.length).toFixed(1) : "N/A";
                return [c.title, cEnr, cChk, avgRat];
            });

            doc.autoTable({
                startY: yPos,
                head: [['Curso', 'Matrículas', 'Check-ins', 'Média Avaliação']],
                body: courseStats,
                theme: 'grid',
                headStyles: { fillColor: [0, 102, 204] },
                styles: { fontSize: 10 }
            });

            // --- PÁGINA 2: FEEDBACKS ---
            doc.addPage();
            doc.text("Feedbacks e Comentários Recentes", 14, 20);

            const feedbackRows = ratings
                .filter(r => r.comment)
                .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
                .map(r => [
                    r.instructorName || '-',
                    r.rating + ' ★',
                    r.comment,
                    r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString('pt-PT') : '-'
                ]);

            doc.autoTable({
                startY: 25,
                head: [['Instrutor', 'Nota', 'Comentário', 'Data']],
                body: feedbackRows,
                theme: 'striped',
                headStyles: { fillColor: [255, 193, 7], textColor: [50,50,50] },
                columnStyles: { 2: { cellWidth: 90 } },
                styles: { fontSize: 9 }
            });

            // --- PÁGINA 3: LISTA DE ALUNOS ---
            doc.addPage();
            doc.text("Lista Completa de Matrículas", 14, 20);

            const studentRows = enrollments
                .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
                .map(e => [
                    e.protocol || '-',
                    e.name,
                    e.courseName,
                    e.email,
                    e.sector,
                    e.createdAt ? new Date(e.createdAt.seconds*1000).toLocaleDateString('pt-PT') : '-'
                ]);

            doc.autoTable({
                startY: 25,
                head: [['Protocolo', 'Nome', 'Curso', 'Email', 'Setor', 'Data']],
                body: studentRows,
                theme: 'grid',
                headStyles: { fillColor: [60, 60, 60] },
                styles: { fontSize: 8 }
            });

            doc.save(`Relatorio_Evereste_Completo_${Date.now()}.pdf`);

        } catch (err) {
            console.error("Erro exportação:", err);
            alert("Erro ao gerar relatório.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <button onClick={exportCompleteReport} disabled={isExporting} className="btn-primary px-4 py-2 text-sm">
                    {isExporting ? <LoadingSpinner/> : <><i className="fas fa-file-pdf mr-2"></i>Exportar Relatório Completo</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Matrículas</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.enrollments}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Check-ins</p>
                    <p className="text-3xl font-bold text-teal-600">{stats.checkins}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">NPS Estimado</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.nps}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold mb-4">Evolução Matrículas</h3>
                    <div className="h-64">
                         {enrollmentData.labels.length > 0 && <DashboardChart id="chart1" type="line" data={enrollmentData} options={{responsive:true, maintainAspectRatio:false}} />}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-bold mb-4">Avaliação Média</h3>
                    <div className="h-64">
                        {ratingsData.labels.length > 0 && <DashboardChart id="chart2" type="bar" data={ratingsData} options={{responsive:true, maintainAspectRatio:false, scales:{y:{max:5}}}} />}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold mb-4">Feedback Recente</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {comments.map((c, i) => (
                        <div key={i} className="border-b border-slate-50 pb-2 last:border-0">
                            <div className="flex justify-between">
                                <span className="font-bold text-sm text-slate-700">{c.instructorName}</span>
                                <span className="text-xs text-yellow-500">{Array(c.rating).fill('★').join('')}</span>
                            </div>
                            <p className="text-sm text-slate-500 italic">"{c.comment}"</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AdminEnrollments = ({ courses }) => {
    const [enrollments, setEnrollments] = React.useState([]);
    const [filterCourse, setFilterCourse] = React.useState('all');

    React.useEffect(() => {
        const load = async () => {
            let q = getCol('enrollments');
            if(filterCourse !== 'all') q = query(q, where('courseId', '==', filterCourse));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
            list.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            setEnrollments(list);
        };
        load();
    }, [filterCourse]);

    const exportPDF = () => {
        const doc = new window.jspdf.jsPDF();
        doc.text("Relatório de Matrículas", 14, 20);
        const tableBody = enrollments.map(e => [
            e.protocol, e.name, e.email, e.courseName, e.sector, e.createdAt?.toDate().toLocaleDateString()
        ]);
        doc.autoTable({
            head: [['Protocolo', 'Aluno', 'Email', 'Curso', 'Setor', 'Data']],
            body: tableBody,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 102, 204] }
        });
        doc.save('matriculas.pdf');
    };

    const handleDelete = async (id) => {
        if(confirm("Tem certeza?")) {
            await deleteDoc(doc(getCol('enrollments'), id));
            setEnrollments(prev => prev.filter(e => e.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Matrículas</h2>
                <div className="flex gap-2">
                    <select className="border rounded p-2 text-sm" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                        <option value="all">Todos os Cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <button onClick={exportPDF} className="bg-slate-700 text-white px-4 py-2 rounded text-sm hover:bg-slate-800"><i className="fas fa-file-pdf"></i> PDF</button>
                </div>
            </div>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Protocolo</th><th>Aluno</th><th>Curso</th><th>Data</th><th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrollments.map(e => (
                            <tr key={e.id}>
                                <td className="font-mono text-xs font-bold text-blue-600">{e.protocol}</td>
                                <td>
                                    <div className="font-bold text-slate-700">{e.name}</div>
                                    <div className="text-xs text-slate-400">{e.email}</div>
                                </td>
                                <td className="text-sm">{e.courseName}</td>
                                <td className="text-sm text-slate-500">{e.createdAt?.toDate().toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminCourses = ({ courses, instructors }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingCourse, setEditingCourse] = React.useState(null);

    const openModal = (course = null) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if(confirm("Excluir curso permanentemente?")) {
            await deleteDoc(doc(getCol('courses'), id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerir Cursos</h2>
                <button onClick={() => openModal()} className="btn-primary px-4 py-2 text-sm"><i className="fas fa-plus mr-2"></i> Novo Curso</button>
            </div>
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Curso</th><th>Status</th><th>Avaliação</th><th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(c => (
                            <tr key={c.id}>
                                <td><div className="font-bold">{c.title}</div></td>
                                <td><span className={`badge-status ${c.status === 'aberto' ? 'status-open' : 'status-soon'}`}>{c.status}</span></td>
                                <td><span className={`text-xs ${c.isRatingEnabled ? 'text-green-600' : 'text-slate-400'}`}><i className={`fas fa-circle text-[8px] mr-1`}></i>{c.isRatingEnabled ? 'Ativa' : 'Inativa'}</span></td>
                                <td className="flex gap-2">
                                    <button onClick={() => openModal(c)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><i className="fas fa-pencil"></i></button>
                                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <CourseFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} course={editingCourse} instructors={instructors} />
        </div>
    );
};

const AdminInstructors = ({ instructors }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingInst, setEditingInst] = React.useState(null);

    const handleSave = async (e) => {
        e.preventDefault();
        const data = {
            name: e.target.name.value,
            title: e.target.title.value,
            image: e.target.image.value,
            bio: e.target.bio.value
        };
        if(editingInst) await updateDoc(doc(getCol('instructors'), editingInst.id), data);
        else await addDoc(getCol('instructors'), data);
        setIsModalOpen(false);
    };
    
    const handleDelete = async (id) => {
        if(confirm("Excluir instrutor?")) await deleteDoc(doc(getCol('instructors'), id));
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Instrutores</h2>
                <button onClick={() => {setEditingInst(null); setIsModalOpen(true);}} className="btn-primary px-4 py-2 text-sm"><i className="fas fa-plus mr-2"></i> Novo</button>
            </div>
            <div className="table-container">
                 <table className="admin-table">
                    <thead><tr><th>Perfil</th><th>Nome</th><th>Cargo</th><th>Ações</th></tr></thead>
                    <tbody>
                        {instructors.map(i => (
                            <tr key={i.id}>
                                <td><img src={i.image} className="w-10 h-10 rounded-full object-cover"/></td>
                                <td className="font-bold">{i.name}</td>
                                <td className="text-sm text-slate-500">{i.title}</td>
                                <td>
                                     <button onClick={() => {setEditingInst(i); setIsModalOpen(true);}} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><i className="fas fa-pencil"></i></button>
                                     <button onClick={() => handleDelete(i.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInst ? 'Editar' : 'Novo Instrutor'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <input className="admin-input w-full border rounded p-2" name="name" placeholder="Nome" defaultValue={editingInst?.name} required />
                    <input className="admin-input w-full border rounded p-2" name="title" placeholder="Cargo/Título" defaultValue={editingInst?.title} required />
                    <input className="admin-input w-full border rounded p-2" name="image" placeholder="URL Foto" defaultValue={editingInst?.image} required />
                    <textarea className="admin-input w-full border rounded p-2" name="bio" placeholder="Biografia" rows="3" defaultValue={editingInst?.bio}></textarea>
                    <button className="btn-primary w-full py-2">Salvar</button>
                </form>
            </Modal>
        </div>
    );
};

// --- Modais de Formulário Complexos (COMPLETO AGORA) ---

const CourseFormModal = ({ isOpen, onClose, course, instructors }) => {
    const [formData, setFormData] = React.useState({
        title: '', subtitle: '', themeColor: '#0066cc', icon: 'fa-star', status: 'aberto',
        headerOverlayImage: '', summary: '', fullDescription: '', targetAudience: '', isRatingEnabled: false
    });
    
    // Arrays dinâmicos (Restaurados todos os campos do original)
    const [details, setDetails] = React.useState([{key:'', value:''}]); 
    const [objectives, setObjectives] = React.useState(['']);
    const [requirements, setRequirements] = React.useState(['']); // Novo
    const [activities, setActivities] = React.useState([{title:'', description:''}]); // Novo
    const [modules, setModules] = React.useState([{title:'', topics:['']}]);
    const [selInstructors, setSelInstructors] = React.useState([]);

    React.useEffect(() => {
        if(course) {
            setFormData({
                title: course.title, subtitle: course.subtitle, themeColor: course.themeColor,
                icon: course.icon, status: course.status, headerOverlayImage: course.headerOverlayImage,
                summary: course.summary, fullDescription: course.fullDescription,
                targetAudience: course.targetAudience, isRatingEnabled: course.isRatingEnabled
            });
            const dArr = course.details ? Object.entries(course.details).map(([k,v]) => ({key:k, value:v})) : [];
            setDetails(dArr.length ? dArr : [{key:'', value:''}]);
            setObjectives(course.learningObjectives?.length ? course.learningObjectives : ['']);
            setRequirements(course.requirements?.length ? course.requirements : ['']);
            setActivities(course.practicalActivities?.length ? course.practicalActivities : [{title:'', description:''}]);
            setModules(course.modules?.length ? course.modules : [{title:'', topics:['']}]);
            setSelInstructors(course.instructors?.map(i => i.id) || []);
        } else {
            setFormData({
                title: '', subtitle: '', themeColor: '#0066cc', icon: 'fa-star', status: 'aberto',
                headerOverlayImage: '', summary: '', fullDescription: '', targetAudience: '', isRatingEnabled: false
            });
            setDetails([{key:'', value:''}]);
            setObjectives(['']);
            setRequirements(['']);
            setActivities([{title:'', description:''}]);
            setModules([{title:'', topics:['']}]);
            setSelInstructors([]);
        }
    }, [course, isOpen]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({...formData, [e.target.name]: value});
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const finalDetails = {};
        details.forEach(d => { if(d.key) finalDetails[d.key] = d.value; });
        
        const finalModules = modules.filter(m => m.title).map(m => ({
            title: m.title, topics: m.topics.filter(t => t)
        }));

        const finalInstructors = instructors.filter(i => selInstructors.includes(i.id));

        const payload = {
            ...formData,
            details: finalDetails,
            learningObjectives: objectives.filter(o => o),
            requirements: requirements.filter(r => r),
            practicalActivities: activities.filter(a => a.title),
            modules: finalModules,
            instructors: finalInstructors
        };

        if(course) await updateDoc(doc(getCol('courses'), course.id), payload);
        else await addDoc(getCol('courses'), payload);

        onClose();
    };

    const updateModule = (idx, field, val) => {
        const newMods = [...modules]; newMods[idx][field] = val; setModules(newMods);
    };
    const updateTopic = (mIdx, tIdx, val) => {
        const newMods = [...modules]; newMods[mIdx].topics[tIdx] = val; setModules(newMods);
    };
    const updateActivity = (idx, field, val) => {
        const newActs = [...activities]; newActs[idx][field] = val; setActivities(newActs);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={course ? "Editar Curso" : "Criar Curso"} size="modal-xl">
            <form onSubmit={handleSave} className="space-y-6">
                
                <div className="grid md:grid-cols-2 gap-4">
                    <input className="border p-2 rounded" name="title" placeholder="Título" value={formData.title} onChange={handleChange} required />
                    <input className="border p-2 rounded" name="subtitle" placeholder="Subtítulo" value={formData.subtitle} onChange={handleChange} required />
                    <select className="border p-2 rounded" name="status" value={formData.status} onChange={handleChange}>
                        <option value="aberto">Aberto</option>
                        <option value="em_breve">Em Breve</option>
                        <option value="fechado">Fechado</option>
                    </select>
                    <input className="border p-2 rounded" name="themeColor" type="color" value={formData.themeColor} onChange={handleChange} />
                </div>
                
                <textarea className="border p-2 rounded w-full" name="summary" placeholder="Resumo curto" value={formData.summary} onChange={handleChange} />
                <textarea className="border p-2 rounded w-full h-24" name="fullDescription" placeholder="Descrição completa" value={formData.fullDescription} onChange={handleChange} />
                <input className="border p-2 rounded w-full" name="headerOverlayImage" placeholder="URL da Imagem de Capa" value={formData.headerOverlayImage} onChange={handleChange} />

                {/* Objetivos */}
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Objetivos de Aprendizagem</h4>
                    {objectives.map((obj, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <input className="border p-1 w-full" value={obj} onChange={e => {
                                const newObjs = [...objectives]; newObjs[idx] = e.target.value; setObjectives(newObjs);
                            }} placeholder="Objetivo" />
                            <button type="button" onClick={() => setObjectives(objectives.filter((_,i) => i !== idx))} className="text-red-500"><i className="fas fa-times"></i></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setObjectives([...objectives, ''])} className="text-sm text-blue-600">+ Adicionar</button>
                </div>

                {/* Requisitos (NOVO) */}
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Requisitos</h4>
                    {requirements.map((req, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                            <input className="border p-1 w-full" value={req} onChange={e => {
                                const newReqs = [...requirements]; newReqs[idx] = e.target.value; setRequirements(newReqs);
                            }} placeholder="Requisito (Ex: Conhecimento básico de...)" />
                            <button type="button" onClick={() => setRequirements(requirements.filter((_,i) => i !== idx))} className="text-red-500"><i className="fas fa-times"></i></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setRequirements([...requirements, ''])} className="text-sm text-blue-600">+ Adicionar</button>
                </div>

                {/* Atividades Práticas (NOVO) */}
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Atividades Práticas</h4>
                    {activities.map((act, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded mb-2 border border-slate-200">
                            <input className="border p-1 w-full mb-2" placeholder="Título da Atividade" value={act.title} onChange={e => updateActivity(idx, 'title', e.target.value)} />
                            <textarea className="border p-1 w-full text-sm" placeholder="Descrição" value={act.description} onChange={e => updateActivity(idx, 'description', e.target.value)} />
                            <button type="button" onClick={() => setActivities(activities.filter((_,i) => i !== idx))} className="text-red-500 text-xs mt-1">Remover Atividade</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setActivities([...activities, {title:'', description:''}])} className="text-sm text-blue-600">+ Adicionar Atividade</button>
                </div>

                {/* Módulos */}
                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Módulos</h4>
                    {modules.map((mod, mIdx) => (
                        <div key={mIdx} className="bg-slate-50 p-3 rounded mb-2 border border-slate-200">
                            <input className="border p-1 w-full mb-2 font-bold" placeholder="Título do Módulo" value={mod.title} onChange={e => updateModule(mIdx, 'title', e.target.value)} />
                            <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                                {mod.topics.map((top, tIdx) => (
                                    <div key={tIdx} className="flex gap-2">
                                        <input className="border p-1 w-full text-sm" placeholder="Tópico" value={top} onChange={e => updateTopic(mIdx, tIdx, e.target.value)} />
                                        <button type="button" onClick={() => {
                                            const newMods = [...modules]; newMods[mIdx].topics = newMods[mIdx].topics.filter((_, i) => i !== tIdx); setModules(newMods);
                                        }} className="text-red-400"><i className="fas fa-times"></i></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => {
                                    const newMods = [...modules]; newMods[mIdx].topics.push(''); setModules(newMods);
                                }} className="text-xs text-blue-600 font-bold">+ Tópico</button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => setModules([...modules, {title:'', topics:['']}])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded">Add Módulo</button>
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-bold mb-2">Instrutores</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {instructors.map(inst => (
                            <label key={inst.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={selInstructors.includes(inst.id)} 
                                    onChange={e => {
                                        if(e.target.checked) setSelInstructors([...selInstructors, inst.id]);
                                        else setSelInstructors(selInstructors.filter(id => id !== inst.id));
                                    }}
                                />
                                {inst.name}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <input type="checkbox" name="isRatingEnabled" checked={formData.isRatingEnabled} onChange={handleChange} />
                    <label className="text-sm">Habilitar avaliações para este curso?</label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn-ghost px-4 py-2">Cancelar</button>
                    <button type="submit" className="btn-primary px-6 py-2">Salvar Curso</button>
                </div>
            </form>
        </Modal>
    );
};

// --- Modais do Aluno ---

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
            onSuccess();
        } catch(err) {
            setError("Login falhou. Verifique suas credenciais.");
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Acesso Admin" size="modal-sm">
            <form onSubmit={handleLogin} className="space-y-4">
                <input className="w-full border rounded p-3" name="email" type="email" placeholder="admin@evereste.org" required />
                <input className="w-full border rounded p-3" name="password" type="password" placeholder="Senha" required />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button disabled={loading} className="btn-primary w-full py-3 font-bold">
                    {loading ? <LoadingSpinner/> : 'Entrar'}
                </button>
            </form>
        </Modal>
    );
};

const EnrollModal = ({ isOpen, onClose, course, user }) => {
    const [loading, setLoading] = React.useState(false);
    const [step, setStep] = React.useState('form');
    const [protocol, setProtocol] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!user) return alert("Erro de autenticação");
        setLoading(true);
        try {
            const protocolGen = `EVR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            await addDoc(getCol('enrollments'), {
                courseId: course.id,
                courseName: course.title,
                userId: user.uid,
                name: e.target.name.value,
                email: e.target.email.value,
                phone: e.target.phone.value,
                sector: e.target.sector.value,
                protocol: protocolGen,
                createdAt: serverTimestamp()
            });
            setProtocol(protocolGen);
            setStep('success');
        } catch(err) {
            alert("Erro ao inscrever");
        } finally {
            setLoading(false);
        }
    };

    if(!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 'form' ? "Ficha de Inscrição" : "Sucesso!"} size="modal-md">
            {step === 'form' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-slate-500">Curso: <strong className="text-blue-600">{course.title}</strong></p>
                    <input className="w-full border rounded p-3" name="name" placeholder="Nome Completo" required />
                    <input className="w-full border rounded p-3" name="email" type="email" placeholder="Email" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full border rounded p-3" name="phone" placeholder="Telefone" required />
                        <input className="w-full border rounded p-3" name="sector" placeholder="Setor" required />
                    </div>
                    <div className="text-sm space-y-2 pt-2">
                        <label className="flex gap-2"><input type="checkbox" required /> Concordo com Termo de Uso de Imagem</label>
                        <label className="flex gap-2"><input type="checkbox" required /> Concordo com Política LGPD</label>
                    </div>
                    <button disabled={loading} className="btn-primary w-full py-3 font-bold mt-4">
                        {loading ? <LoadingSpinner/> : 'Confirmar Inscrição'}
                    </button>
                </form>
            ) : (
                <div className="text-center py-6">
                    <i className="fas fa-check-circle text-6xl text-green-500 mb-4 animate-bounce"></i>
                    <h3 className="text-2xl font-bold mb-2">Inscrição Realizada!</h3>
                    <p className="text-slate-500">Seu protocolo:</p>
                    <div className="bg-slate-100 p-4 rounded-lg text-2xl font-mono font-bold text-blue-600 my-4 border-dashed border-2 border-blue-200">
                        {protocol}
                    </div>
                    <button onClick={onClose} className="btn-ghost w-full">Fechar</button>
                </div>
            )}
        </Modal>
    );
};

const CheckinModal = ({ isOpen, onClose, courseId, user, onSuccess }) => {
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const CHECKIN_PASSWORD = "@Academy3v3r3st3";

    const handleCheckin = async (e) => {
        e.preventDefault();
        setError('');
        
        if (password !== CHECKIN_PASSWORD) {
            setError("Senha inválida.");
            return;
        }

        setLoading(true);
        try {
            await addDoc(getCol('checkins'), {
                userId: user.uid,
                courseId: courseId,
                createdAt: serverTimestamp(),
                password: password 
            });
            onSuccess(courseId);
            alert("Check-in realizado com sucesso!");
            onClose();
        } catch(err) {
            setError("Erro ao salvar check-in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Presença" size="modal-sm">
            <div className="text-center mb-6">
                <i className="fas fa-qrcode text-4xl text-blue-500 mb-2"></i>
                <p className="text-sm text-slate-500">Insira o código fornecido pelo instrutor.</p>
            </div>
            <form onSubmit={handleCheckin} className="space-y-4">
                <input className="w-full border rounded p-3 text-center tracking-widest font-bold" type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
                <button disabled={loading} className="btn-primary w-full py-3 font-bold">
                    {loading ? <LoadingSpinner/> : 'Validar Presença'}
                </button>
            </form>
        </Modal>
    );
};

const RatingModal = ({ isOpen, onClose, course, user }) => {
    const [rating, setRating] = React.useState(0);
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(rating === 0) return alert("Selecione as estrelas");
        setLoading(true);
        try {
            await addDoc(getCol('ratings'), {
                userId: user.uid,
                courseId: course.id,
                rating,
                instructorName: e.target.instructor.value,
                comment: e.target.comment.value,
                createdAt: serverTimestamp()
            });
            alert("Obrigado pelo feedback!");
            onClose();
        } catch(err) {
            alert("Erro ao enviar");
        } finally {
            setLoading(false);
        }
    };

    if(!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Avaliar Experiência">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Instrutor</label>
                    <select name="instructor" className="w-full border rounded p-2" required>
                        {course.instructors?.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-center gap-2 text-3xl my-4 cursor-pointer text-slate-300">
                    {[1,2,3,4,5].map(star => (
                        <i key={star} onClick={() => setRating(star)} className={`fas fa-star hover:text-yellow-400 transition ${star <= rating ? 'text-yellow-400' : ''}`}></i>
                    ))}
                </div>
                <textarea name="comment" className="w-full border rounded p-2" rows="3" placeholder="Comentário (opcional)"></textarea>
                <button disabled={loading} className="btn-primary w-full py-3">Enviar Avaliação</button>
            </form>
        </Modal>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
