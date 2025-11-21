// Importar funções do Firebase (compatíveis com CDN do index.html)
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
  Timestamp,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// === CONFIGURAÇÃO E INICIALIZAÇÃO ===

// Configuração do Firebase
let firebaseConfig;
let appId;

try {
  // Tenta usar as variáveis injetadas (ambiente de produção)
  firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  
  // MODIFICADO: Se __app_id não existir, usa 'academylids' para recuperar dados antigos
  appId = typeof __app_id !== 'undefined' ? __app_id : 'academylids';

  // Fallback (plano B) se as variáveis não forem injetadas
  if (!firebaseConfig.apiKey) {
    console.warn("Variáveis de ambiente não encontradas, usando fallback.");
    firebaseConfig = {
      apiKey: "AIzaSyB0xvVzytOx4dumokND-dr926krSO4-CqU",
      authDomain: "academylids.firebaseapp.com",
      projectId: "academylids",
      storageBucket: "academylids.firebasestorage.app",
      messagingSenderId: "826478835273",
      appId: "1:826478835273:web:0995d64419276b932cb198",
      measurementId: "G-T2TN7FL590"
    };
    // MODIFICADO: Força o ID correto no fallback
    appId = 'academylids'; 
  }

} catch (e) {
  console.error("Erro ao parsear configuração do Firebase:", e);
  // Fallback crítico em caso de erro de parse
  firebaseConfig = {
    apiKey: "AIzaSyB0xvVzytOx4dumokND-dr926krSO4-CqU",
    authDomain: "academylids.firebaseapp.com",
    projectId: "academylids",
    storageBucket: "academylids.firebasestorage.app",
    messagingSenderId: "826478835273",
    appId: "1:826478835273:web:0995d64419276b932cb198",
    measurementId: "G-T2TN7FL590"
  };
  // MODIFICADO: Força o ID correto no fallback
  appId = 'academylids';
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Estado da Aplicação
let currentUser = null;
let isAdmin = false;
let localCourses = []; // Cache local de cursos
let localInstructors = []; // Cache local de instrutores
let userCheckins = {}; // Cache de check-ins do usuário
let currentCourseId = null; // ID do curso na página de detalhes

// Referências de Coleções (Baseado nas Regras e no AppID correto)
// O appId agora é 'academylids', então vai buscar em /artifacts/academylids/...
const coursesCollection = collection(db, `artifacts/${appId}/public/data/courses`);
const instructorsCollection = collection(db, `artifacts/${appId}/public/data/instructors`);
const enrollmentsCollection = collection(db, `artifacts/${appId}/public/data/enrollments`);
const checkinsCollection = collection(db, `artifacts/${appId}/public/data/checkins`);
const ratingsCollection = collection(db, `artifacts/${appId}/public/data/ratings`);
const adminsCollection = collection(db, 'admins'); // Coleção raiz

// === GESTÃO DE ESTADO E UI ===

// Elementos DOM
const mainView = document.getElementById('main-view');
const courseDetailView = document.getElementById('course-detail-view');
const adminPanelView = document.getElementById('admin-panel-view');
const coursesListOpen = document.getElementById('courses-list-open');
const coursesListSoon = document.getElementById('courses-list-soon');

// Botões de Admin/Logout
const adminBtnHeader = document.getElementById('adminBtnHeader');
const logoutBtnHeader = document.getElementById('logoutBtnHeader');
const adminBtnFooter = document.getElementById('adminBtnFooter');
const logoutBtnFooter = document.getElementById('logoutBtnFooter');
const adminLogoutNav = document.getElementById('admin-logout-nav');
const adminUserEmail = document.getElementById('admin-user-email');

// Modais
const modalLogin = document.getElementById('modalLogin');
const modalEnroll = document.getElementById('modalEnroll');
const modalEnrollSuccess = document.getElementById('modalEnrollSuccess');
const modalCheckin = document.getElementById('modalCheckin');
const modalRating = document.getElementById('modalRating');
const modalConfirmDelete = document.getElementById('modalConfirmDelete');
const modalEditCourse = document.getElementById('modalEditCourse');
const modalEditInstructor = document.getElementById('modalEditInstructor');

// Função para mostrar/esconder o painel de Admin
function setAdminUI(isAdmin) {
  if (isAdmin) {
    adminBtnHeader.textContent = "Painel Admin";
    adminBtnHeader.onclick = () => showView('admin');
    adminBtnFooter.textContent = "Painel Admin";
    adminBtnFooter.onclick = () => showView('admin');
    logoutBtnHeader.classList.remove('hidden');
    logoutBtnFooter.classList.remove('hidden');
    adminUserEmail.textContent = currentUser ? currentUser.email : '';
  } else {
    adminBtnHeader.textContent = "Admin";
    adminBtnHeader.onclick = () => _openModal(modalLogin);
    adminBtnFooter.textContent = "Acesso Admin";
    adminBtnFooter.onclick = () => _openModal(modalLogin);
    logoutBtnHeader.classList.add('hidden');
    logoutBtnFooter.classList.add('hidden');
  }
}

// Função para navegar entre as vistas
function showView(viewName) {
  mainView.classList.add('hidden');
  courseDetailView.classList.add('hidden');
  adminPanelView.classList.add('hidden');

  if (viewName === 'main') {
    mainView.classList.remove('hidden');
    window.scrollTo(0, 0);
  } else if (viewName === 'detail') {
    courseDetailView.classList.remove('hidden');
    window.scrollTo(0, 0);
  } else if (viewName === 'admin') {
    if (isAdmin) {
      adminPanelView.classList.remove('hidden');
      // Resetar para a aba padrão (Dashboard)
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector('.admin-nav-link[data-target="admin-dashboard"]').classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
      document.getElementById('admin-dashboard').classList.remove('hidden');
      
      // Carregar dados iniciais do Dashboard
      loadAdminDashboardData();
      renderEnrollmentsChart();
      renderRatingsChart();
      updateRecentComments();
      
      window.scrollTo(0, 0);
    } else {
      // Se não for admin, volta para a main e abre o login
      mainView.classList.remove('hidden');
      _openModal(modalLogin);
    }
  }
}

// Função para mostrar notificações (toast)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-times-circle';
  toast.className = `toast ${type === 'success' ? 'toast-success' : 'toast-error'}`;
  
  toast.innerHTML = `
    <i class="fas ${iconClass} icon"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  container.appendChild(toast);
  
  // Animação de entrada
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Fechar
  const closeBtn = toast.querySelector('.toast-close');
  const closeToast = () => {
    toast.classList.remove('show');
    // Remover da DOM após a animação
    setTimeout(() => toast.remove(), 500);
  };
  
  closeBtn.onclick = closeToast;
  // Fechar automaticamente
  setTimeout(closeToast, 5000);
}

// === AUTENTICAÇÃO ===

onAuthStateChanged(auth, async (user) => {
  // Tentativa de login com Custom Token (se injetado)
  if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && !auth.currentUser) {
      try {
          console.log("A tentar login com Custom Token...");
          await signInWithCustomToken(auth, __initial_auth_token);
          // O onAuthStateChanged será chamado novamente com o usuário logado
          return; // Saia por agora, deixe o próximo onAuthStateChanged tratar
      } catch (error) {
          console.error("Erro no login com Custom Token:", error);
          // Continua para login anônimo se o token falhar
      }
  }
  
  if (user) {
    // Usuário está logado
    currentUser = user;
    
    if (user.isAnonymous) {
      console.log("Usuário logado anonimamente:", user.uid);
      isAdmin = false;
      setAdminUI(false);
    } else {
      console.log("Usuário logado:", user.email);
      // É um usuário com e-mail, verificar se é admin
      await checkAdminStatus(user.uid);
      setAdminUI(isAdmin);
      if (isAdmin) {
        // Se for admin e estiver na view admin, recarrega dashboard
        if (!adminPanelView.classList.contains('hidden')) {
             loadAdminDashboardData();
             renderEnrollmentsChart();
             renderRatingsChart();
             updateRecentComments();
        }
      }
    }
    
    // Carregar dados públicos (cursos, instrutores)
    // Isso agora acontece DEPOIS que a autenticação (anônima ou não) foi estabelecida
    loadCourses();
    loadInstructors(); // Carrega instrutores para o cache
    
    // Carregar dados privados do usuário (check-ins)
    loadUserCheckins(user.uid);
    
  } else {
    // Usuário está deslogado
    console.log("Nenhum usuário logado. A tentar login anônimo...");
    currentUser = null;
    isAdmin = false;
    setAdminUI(false);
    
    // Tentar login anônimo para ter permissão de leitura
    try {
      await signInAnonymously(auth);
      // O onAuthStateChanged será chamado novamente com o usuário anônimo
    } catch (error) {
      console.error("Erro no login anônimo:", error);
      showToast("Não foi possível conectar. Verifique a sua rede.", "error");
    }
  }
});

// Função de verificação de Admin
async function checkAdminStatus(uid) {
  try {
    const adminDocRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminDocRef);
    isAdmin = adminDoc.exists();
    console.log(`Status de Admin para ${uid}: ${isAdmin}`);
  } catch (error) {
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      // Isso é esperado se o usuário for um usuário normal (não-admin)
      console.log("Verificação de admin falhou (permissões), assumindo não-admin.");
    } else {
      // Outros erros (ex: rede)
      console.error("Erro ao verificar status de admin:", error);
    }
    isAdmin = false;
  }
}

// Formulário de Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  try {
    errorEl.classList.add('hidden');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Sucesso, o onAuthStateChanged vai tratar o resto
    _closeModal(modalLogin);
    showView('admin'); // Força a ida ao admin
    showToast(`Bem-vindo, ${userCredential.user.email}!`, 'success');
  } catch (error) {
    console.error("Erro de login:", error.code, error.message);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorEl.textContent = "E-mail ou senha inválidos.";
    } else if (error.code === 'auth/operation-not-allowed') {
       errorEl.textContent = "Login por email e senha não está ativado no Firebase.";
    } else {
      errorEl.textContent = `Erro: ${error.message}`;
    }
    errorEl.classList.remove('hidden');
  }
});

// Função de Logout
async function handleLogout() {
  try {
    await signOut(auth);
    // Sucesso, o onAuthStateChanged vai tratar o login anônimo
    showView('main');
    showToast("Logout realizado com sucesso.", 'success');
  } catch (error) {
    console.error("Erro no logout:", error);
  }
}
logoutBtnHeader.addEventListener('click', handleLogout);
logoutBtnFooter.addEventListener('click', handleLogout);
adminLogoutNav.addEventListener('click', (e) => {
  e.preventDefault();
  handleLogout();
});

// === CARREGAMENTO DE DADOS PÚBLICOS ===

// Carregar Cursos
async function loadCourses() {
  try {
    const querySnapshot = await getDocs(coursesCollection);
    localCourses = [];
    querySnapshot.forEach((doc) => {
      localCourses.push({ id: doc.id, ...doc.data() });
    });
    
    // Ordenar cursos (opcional, mas bom)
    localCourses.sort((a, b) => a.title.localeCompare(b.title));
    
    renderCoursesLists();
    
    // Se estiver na página de detalhes, re-renderize
    if (currentCourseId) {
      const course = localCourses.find(c => c.id === currentCourseId);
      if (course) {
        renderCourseDetail(course);
      } else {
        showView('main'); // Curso não existe mais
      }
    }
    
  } catch (error) {
    console.error("Erro ao carregar cursos:", error);
    coursesListOpen.innerHTML = `<p class="text-center md:col-span-2 text-red-500">Erro ao carregar cursos. Verifique as permissões do Firestore.</p>`;
    coursesListSoon.innerHTML = `<p class="text-center md:col-span-3 text-red-500">Erro ao carregar cursos.</p>`;
  }
}

// Carregar Instrutores
async function loadInstructors() {
  try {
    const querySnapshot = await getDocs(instructorsCollection);
    localInstructors = [];
    querySnapshot.forEach((doc) => {
      localInstructors.push({ id: doc.id, ...doc.data() });
    });
    localInstructors.sort((a, b) => a.name.localeCompare(b.name));
    
    // renderInstructorsList(); // Função removida da UI principal
    
  } catch (error) {
    console.error("Erro ao carregar instrutores:", error);
    // instructorsList.innerHTML = `<p class="text-center md:col-span-3 text-red-500">Erro ao carregar instrutores.</p>`;
  }
}

// Carregar Check-ins do Usuário
async function loadUserCheckins(uid) {
  if (!uid) return;
  try {
    const q = query(checkinsCollection, where("userId", "==", uid));
    const snapshot = await getDocs(q);
    userCheckins = {};
    snapshot.forEach(doc => {
      const checkin = doc.data();
      userCheckins[checkin.courseId] = true; // Marca que o usuário fez check-in neste curso
    });
    console.log("Check-ins do usuário carregados:", userCheckins);
    
    // Se estiver na página de detalhes, atualize os botões
    if (currentCourseId) {
      const course = localCourses.find(c => c.id === currentCourseId);
      if(course) updateCourseDetailButtons(course);
    }
    
  } catch (error) {
    console.error("Erro ao carregar check-ins:", error);
  }
}

// === RENDERIZAÇÃO (PÁGINA PÚBLICA) ===

// Renderizar Cards de Cursos na Home
function renderCoursesLists() {
  coursesListOpen.innerHTML = '';
  coursesListSoon.innerHTML = '';
  
  const openCourses = localCourses.filter(c => c.status === 'aberto');
  const soonCourses = localCourses.filter(c => c.status === 'em_breve');

  if (openCourses.length === 0) {
    coursesListOpen.innerHTML = `<p class="text-center md:col-span-2 text-gray-500">Nenhum curso com vagas abertas no momento.</p>`;
  } else {
    openCourses.forEach(course => {
      const cardHTML = `
        <article class="card-3d p-6 reveal stagger-1 cursor-pointer course-card-solid" data-course-id="${course.id}" style="background: ${course.themeColor}; color: white; border-bottom: 5px solid ${course.themeColorDark || course.themeColor};">
          <div class="flex items-center gap-4 mb-4">
            <i class="fa-solid ${course.icon} text-3xl opacity-80" style="width: 40px;"></i>
            <div>
              <h3 class="text-2xl font-bold">${course.title}</h3>
              <p class="text-sm opacity-90">${course.subtitle}</p>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg mb-5 shadow-inner">
            <img src="${course.headerOverlayImage}" alt="${course.title}" class="w-full h-40 object-cover opacity-90 transition-transform duration-300 hover:scale-105" />
          </div>
          <p class="mb-6 opacity-90 text-sm">${course.summary}</p>
          <button class="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold py-3 px-4 rounded-lg transition-all"><i class="fa-solid fa-arrow-right mr-2"></i>Ver Detalhes</button>
        </article>
      `;
      coursesListOpen.innerHTML += cardHTML;
    });
  }
  
  if (soonCourses.length === 0) {
    coursesListSoon.innerHTML = `<p class="text-center w-full text-gray-500">Nenhum curso futuro programado.</p>`;
  } else {
     soonCourses.forEach(course => {
        // Card "Em Breve" com aparência indisponível
        const cardHTML = `
          <div class="card-3d p-5 bg-gray-100 border-gray-200 shadow-inner opacity-70">
            <span class="badge-soon-updated mb-3"><i class="fa-solid fa-clock mr-2"></i>Em breve</span>
            <h4 class="font-bold text-lg mb-2 text-gray-700">${course.title}</h4>
            <p class="text-sm text-gray-500">${course.instructors ? course.instructors.map(i => i.name).join(', ') : 'Instrutores a definir'}</p>
          </div>
        `;
        coursesListSoon.innerHTML += cardHTML;
     });
  }
  
  // Re-anexar observador de animação
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// Renderizar Página de Detalhes do Curso
function renderCourseDetail(course) {
  currentCourseId = course.id; // Define o curso atual
  
  // Garantir que os dados dos construtores de formulário sejam arrays/objetos
  const details = course.details || {};
  const objectives = course.learningObjectives || [];
  const modules = course.modules || [];
  const activities = course.practicalActivities || [];
  const requirements = course.requirements || [];
  
  const detailsHTML = Object.entries(details).map(([key, value]) => `
    <div class="flex items-start">
      <i class="fas fa-check mt-1 mr-3" style="color: ${course.themeColor};"></i>
      <span><strong>${key}:</strong> ${value}</span>
    </div>
  `).join('');

  const instructorsHTML = (course.instructors || []).map(instructor => `
    <div class="flex items-start space-x-4">
      <img class="h-16 w-16 rounded-full object-cover shadow-lg" src="${instructor.image}" alt="${instructor.name}">
      <div>
        <p class="font-bold text-lg text-gray-800">${instructor.name}</p>
        <p class="text-sm text-gray-500">${instructor.title}</p>
        ${instructor.bio ? `<p class="text-xs text-gray-400 mt-1">${instructor.bio}</p>` : ''}
      </div>
    </div>
  `).join('');

  const modulesHTML = modules.map(module => `
    <div class="bg-gray-50 p-5 rounded-lg border-l-4" style="border-color: ${course.themeColor};">
      <h4 class="font-bold text-lg" style="color: ${course.themeColorDark || course.themeColor};">${module.title}</h4>
      <ul class="mt-3 space-y-2 list-disc list-inside text-gray-600">
        ${(module.topics || []).map(topic => `<li>${topic}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const practicalActivitiesHTML = activities.map(activity => `
    <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
      <h4 class="font-bold flex items-center text-lg" style="color: ${course.themeColor};"><i class="fas fa-flask mr-3"></i>${activity.title}</h4>
      <p class="text-gray-600 mt-2 pl-8">${activity.description}</p>
    </div>
  `).join('');

  const courseHTML = `
    <section class="relative text-white py-20 md:py-32 overflow-hidden course-detail-hero" style="background: linear-gradient(-45deg, ${course.themeColor}, ${course.themeColorDark || course.themeColor});">
      <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image: url('${course.headerOverlayImage}');"></div>
      <div class="container mx-auto px-6 relative">
        <p class="text-lg font-semibold mb-2"><i class="fas ${course.icon} mr-2"></i>Evereste Academy</p>
        <h1 class="text-4xl md:text-6xl font-extrabold leading-tight">${course.title}</h1>
        <p class="mt-2 text-xl md:text-2xl opacity-90">${course.subtitle}</p>
      </div>
    </section>
    <div class="bg-white shadow-lg -mt-16 md:-mt-20 relative z-10 max-w-6xl mx-auto rounded-t-2xl">
      <button id="back-to-courses-btn" class="mb-10 font-semibold hover:underline block p-8 pb-0" style="color: ${course.themeColor};">
        <i class="fas fa-arrow-left mr-2"></i>Voltar para todos os cursos
      </button>
      
      <div class="container mx-auto px-6 md:px-10 py-10 course-detail-content">
        <div class="grid lg:grid-cols-3 gap-12">
          <div class="lg:col-span-2">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Sobre a atividade</h2>
            <p class="text-gray-600 leading-relaxed mb-8">${course.fullDescription}</p>
            
            <h2 class="text-2xl font-bold text-gray-800 mb-4">O que irá aprender</h2>
            <ul class="space-y-3 mb-8">${objectives.map(obj => `<li class="flex items-start"><i class="fas fa-check-circle mt-1 mr-3" style="color: ${course.themeColor};"></i><span>${obj}</span></li>`).join('')}</ul>
            
            <h2 class="text-2xl font-bold text-gray-800 mb-6 mt-12">Conteúdo Programático</h2>
            <div class="space-y-6 mb-12">${modulesHTML}</div>
            
            ${practicalActivitiesHTML.length > 0 ? `
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Atividades Práticas</h2>
            <div class="space-y-4 mb-12">${practicalActivitiesHTML}</div>` : ''}

            <h2 class="text-2xl font-bold text-gray-800 mb-4">Requisitos</h2>
            <ul class="space-y-3">${requirements.map(req => `<li class="flex items-start"><i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i><span>${req}</span></li>`).join('')}</ul>
          </div>
          <div class="lg:col-span-1">
            <div class="bg-gray-50 border p-6 rounded-lg shadow-xl sticky top-24">
              <span class="inline-block text-sm font-semibold mb-4 px-3 py-1 rounded-full" style="background-color: ${course.themeColor}20; color: ${course.themeColor};">Inscrições abertas</span>
              <h3 class="text-xl font-bold mb-4" style="color: var(--primary);">${course.title}</h3>
              <div class="space-y-3 mb-6 text-gray-700">${detailsHTML}</div>
              
              <!-- Botões de Ação do Aluno -->
              <div class="space-y-3">
                <button id="enroll-btn-detail" class="btn-primary w-full" style="background: ${course.themeColor}; border: none;">
                  <i class="fas fa-paper-plane mr-2"></i>Inscreva-se
                </button>
                <button id="checkin-btn-detail" class="btn-primary w-full">
                  <i class="fas fa-check-circle mr-2"></i>Fazer Check-in
                </button>
                <!-- REMOVIDO: Botão Materiais -->
                <button id="rating-btn-detail" class="btn-primary w-full btn-disabled">
                  <i class="fas fa-star mr-2"></i>Avaliar Instrutor
                </button>
                <!-- REMOVIDO: Botão Certificado -->
              </div>
            </div>
          </div>
        </div>
        
        ${instructorsHTML.length > 0 ? `
        <div class="mt-16 pt-8 border-t">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">Instrutores</h2>
          <div class="flex flex-col md:flex-row gap-8">${instructorsHTML}</div>
        </div>` : ''}
        
        <div class="mt-16 pt-8 border-t">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">Público-alvo</h2>
          <p class="text-gray-600">${course.targetAudience}</p>
        </div>
      </div>
    </div>
  `;
  
  courseDetailView.innerHTML = courseHTML;
  showView('detail');
  updateCourseDetailButtons(course);
}

// Atualizar botões da página de detalhes (Check-in, Materiais, etc.)
function updateCourseDetailButtons(course) {
  const hasCheckedIn = userCheckins[course.id];
  const isRatingEnabled = course.isRatingEnabled === true;

  const checkinBtn = document.getElementById('checkin-btn-detail');
  const ratingBtn = document.getElementById('rating-btn-detail');
  
  if (hasCheckedIn) {
    checkinBtn.innerHTML = '<i class="fas fa-check-double mr-2"></i>Check-in Realizado';
    checkinBtn.classList.add('btn-disabled');
    
    // Habilitar avaliação APENAS se fez check-in E admin liberou
    if (isRatingEnabled) {
      ratingBtn.classList.remove('btn-disabled');
    } else {
      ratingBtn.innerHTML = '<i class="fas fa-star mr-2"></i>Avaliação Fechada';
      ratingBtn.classList.add('btn-disabled');
    }
    
  } else {
    checkinBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Fazer Check-in';
    checkinBtn.classList.remove('btn-disabled');
    
    ratingBtn.innerHTML = '<i class="fas fa-star mr-2"></i>Avaliar Instrutor';
    ratingBtn.classList.add('btn-disabled'); // Desabilitado se não fez check-in
  }
}


// === AÇÕES DO ALUNO (MODAIS) ===

// Abrir modal de Inscrição
function openEnrollModal(courseId, courseName) {
  document.getElementById('enrollForm').reset();
  document.getElementById('enrollCourseName').textContent = courseName;
  document.getElementById('enrollError').classList.add('hidden');
  document.getElementById('enrollForm').dataset.courseId = courseId;
  document.getElementById('enrollForm').dataset.courseName = courseName;
  _openModal(modalEnroll);
}

// Submeter formulário de Inscrição
document.getElementById('enrollForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) {
    showToast("Erro: Usuário não autenticado.", "error");
    return;
  }
  
  const courseId = e.target.dataset.courseId;
  const courseName = e.target.dataset.courseName;
  
  const spinner = document.getElementById('enrollSpinner');
  const btnText = document.getElementById('enrollSubmitBtnText');
  const errorEl = document.getElementById('enrollError');
  
  spinner.classList.remove('hidden');
  btnText.classList.add('hidden');
  e.target.querySelector('button[type="submit"]').disabled = true;
  errorEl.classList.add('hidden');

  try {
    const enrollmentData = {
      userId: currentUser.uid,
      courseId: courseId,
      courseName: courseName,
      name: document.getElementById('enrollName').value,
      email: document.getElementById('enrollEmail').value,
      phone: document.getElementById('enrollPhone').value,
      sector: document.getElementById('enrollSector').value,
      createdAt: serverTimestamp(),
      protocol: `EVR-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    };
    
    const docRef = await addDoc(enrollmentsCollection, enrollmentData);
    
    _closeModal(modalEnroll);
    document.getElementById('enrollProtocol').textContent = enrollmentData.protocol;
    _openModal(modalEnrollSuccess);
    
  } catch (error) {
    console.error("Erro ao inscrever:", error);
    errorEl.textContent = `Erro ao processar inscrição. Tente novamente. (${error.message})`;
    errorEl.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    btnText.classList.remove('hidden');
    e.target.querySelector('button[type="submit"]').disabled = false;
  }
});

// Abrir modal de Check-in
function openCheckinModal(courseId) {
  document.getElementById('checkinForm').reset();
  document.getElementById('checkinError').classList.add('hidden');
  document.getElementById('checkinForm').dataset.courseId = courseId;
  _openModal(modalCheckin);
}

// Submeter formulário de Check-in (SENHA FIXA)
document.getElementById('checkinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  
  const courseId = e.target.dataset.courseId;
  const password = document.getElementById('checkinPassword').value;
  
  const spinner = document.getElementById('checkinSpinner');
  const btnText = document.getElementById('checkinSubmitBtnText');
  const errorEl = document.getElementById('checkinError');
  
  spinner.classList.remove('hidden');
  btnText.classList.add('hidden');
  e.target.querySelector('button[type="submit"]').disabled = true;
  errorEl.classList.add('hidden');
  
  try {
    // A lógica de validação da senha está 100% nas Regras de Segurança do Firestore
    // A regra vai comparar o campo 'password' com a string fixa
    await addDoc(checkinsCollection, {
      userId: currentUser.uid,
      courseId: courseId,
      password: password, // A regra vai comparar isso com "@Academy3v3r3st3"
      createdAt: serverTimestamp()
    });
    
    // Sucesso!
    userCheckins[courseId] = true; // Atualiza cache local
    _closeModal(modalCheckin);
    showToast("Check-in realizado com sucesso!", "success");
    
    // Atualiza botões na página de detalhes
    const course = localCourses.find(c => c.id === courseId);
    if(course) updateCourseDetailButtons(course);
    
  } catch (error) {
    console.error("Erro no check-in:", error);
    if (error.code === 'permission-denied') {
      errorEl.textContent = "Senha incorreta. Tente novamente.";
    } else {
      errorEl.textContent = `Erro ao validar. (${error.message})`;
    }
    errorEl.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    btnText.classList.remove('hidden');
    e.target.querySelector('button[type="submit"]').disabled = false;
  }
});

// Abrir modal de Avaliação
function openRatingModal(courseId) {
  const form = document.getElementById('ratingForm');
  form.reset();
  document.getElementById('ratingError').classList.add('hidden');
  form.dataset.courseId = courseId;
  
  // Limpar estrelas
  document.querySelectorAll('#ratingStars i').forEach(star => {
    star.classList.remove('text-yellow-400');
    star.classList.add('text-gray-300');
  });
  document.getElementById('ratingValue').value = "0";
  
  // Popular select de instrutores
  const select = document.getElementById('ratingInstructorSelect');
  select.innerHTML = '<option value="">Selecione um instrutor</option>';
  const course = localCourses.find(c => c.id === courseId);
  if (course && course.instructors) {
    course.instructors.forEach(inst => {
      select.innerHTML += `<option value="${inst.name}">${inst.name}</option>`;
    });
  }
  _openModal(modalRating);
}

// Lógica das estrelas de avaliação
document.getElementById('ratingStars').addEventListener('click', (e) => {
  const star = e.target.closest('i');
  if (!star) return;
  const value = star.dataset.value;
  document.getElementById('ratingValue').value = value;
  // Atualizar visual
  document.querySelectorAll('#ratingStars i').forEach(s => {
    if (s.dataset.value <= value) {
      s.classList.add('text-yellow-400');
      s.classList.remove('text-gray-300');
    } else {
      s.classList.remove('text-yellow-400');
      s.classList.add('text-gray-300');
    }
  });
});

// Submeter formulário de Avaliação
document.getElementById('ratingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const courseId = e.target.dataset.courseId;
  const ratingValue = document.getElementById('ratingValue').value;
  
  if (ratingValue === "0") {
    document.getElementById('ratingError').textContent = "Por favor, selecione de 1 a 5 estrelas.";
    document.getElementById('ratingError').classList.remove('hidden');
    return;
  }
  
  const spinner = document.getElementById('ratingSpinner');
  const btnText = document.getElementById('ratingSubmitBtnText');
  const errorEl = document.getElementById('ratingError');
  
  spinner.classList.remove('hidden');
  btnText.classList.add('hidden');
  e.target.querySelector('button[type="submit"]').disabled = true;
  errorEl.classList.add('hidden');

  try {
    await addDoc(ratingsCollection, {
      userId: currentUser.uid,
      courseId: courseId,
      instructorName: document.getElementById('ratingInstructorSelect').value,
      rating: parseInt(ratingValue, 10),
      comment: document.getElementById('ratingComment').value,
      createdAt: serverTimestamp()
    });
    
    _closeModal(modalRating);
    showToast("Avaliação enviada. Obrigado!", "success");
    
  } catch (error) {
    console.error("Erro ao enviar avaliação:", error);
    errorEl.textContent = `Erro ao enviar. Tente novamente. (${error.message})`;
    errorEl.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    btnText.classList.remove('hidden');
    e.target.querySelector('button[type="submit"]').disabled = false;
  }
});

// === PAINEL DE ADMINISTRAÇÃO ===

// Navegação do Painel Admin
document.getElementById('admin-nav').addEventListener('click', (e) => {
  const link = e.target.closest('.admin-nav-link');
  if (link && link.dataset.target) {
    e.preventDefault();
    // Mudar tab ativa
    document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    // Mudar seção visível
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(link.dataset.target).classList.remove('hidden');
    
    // Carregar dados da seção
    switch(link.dataset.target) {
      case 'admin-dashboard': loadAdminDashboardData(); renderEnrollmentsChart(); renderRatingsChart(); updateRecentComments(); break;
      case 'admin-cursos': loadAdminCourses(); break;
      case 'admin-matriculas': loadAdminEnrollments(); break;
      case 'admin-instrutores': loadAdminInstructors(); break;
      // REMOVIDO: case 'admin-config'
    }
  }
});

// Carregar dados do Dashboard (Stats e Gráfico)
let enrollmentsChartInstance = null;
let ratingsChartInstance = null;

async function loadAdminDashboardData() {
  // Carregar Stats
  try {
    const enrollmentsSnap = await getDocs(enrollmentsCollection);
    document.getElementById('stats-total-enrollments').textContent = enrollmentsSnap.size;
  } catch (e) { console.error("Erro ao carregar stats matrículas:", e); }
  
  try {
    const checkinsSnap = await getDocs(checkinsCollection);
    document.getElementById('stats-total-checkins').textContent = checkinsSnap.size;
  } catch (e) { console.error("Erro ao carregar stats checkins:", e); }

  // Calcular NPS (Estimado)
  try {
      const ratingsSnap = await getDocs(ratingsCollection);
      let promoters = 0;
      let detractors = 0;
      let totalRatings = 0;

      ratingsSnap.forEach(doc => {
          const rating = doc.data().rating;
          if (rating === 5) promoters++;
          if (rating >= 1 && rating <= 3) detractors++;
          totalRatings++;
      });

      if (totalRatings > 0) {
          const nps = Math.round(((promoters - detractors) / totalRatings) * 100);
          document.getElementById('stats-nps-score').textContent = nps;
      } else {
          document.getElementById('stats-nps-score').textContent = "N/A";
      }

  } catch(e) { console.error("Erro ao calcular NPS:", e); }
}

// Renderizar Gráfico de Matrículas
async function renderEnrollmentsChart() {
  let enrollmentsData = [];
  try {
    const q = query(enrollmentsCollection);
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        enrollmentsData.push({ date: data.createdAt.toDate() });
      }
    });
    
    // Agrupar por dia
    const enrollmentsByDay = enrollmentsData.reduce((acc, curr) => {
      const day = curr.date.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
    
    // Preparar dados para o gráfico
    const sortedDays = Object.keys(enrollmentsByDay).sort();
    const labels = sortedDays.map(day => {
      const [year, month, d] = day.split('-');
      return `${d}/${month}`;
    });
    const data = sortedDays.map(day => enrollmentsByDay[day]);
    
    const ctx = document.getElementById('enrollmentsChart').getContext('2d');
    
    if (enrollmentsChartInstance) {
      enrollmentsChartInstance.destroy(); // Destrói gráfico anterior
    }
    
    enrollmentsChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Novas Matrículas',
          data: data,
          borderColor: 'rgba(0, 102, 204, 1)',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
    
  } catch (e) {
    console.error("Erro ao renderizar gráfico:", e);
  }
}

// Renderizar Gráfico de Avaliações (Média por Instrutor)
async function renderRatingsChart() {
    try {
        const ratingsSnap = await getDocs(ratingsCollection);
        const instructorRatings = {};

        ratingsSnap.forEach(doc => {
            const data = doc.data();
            if (data.instructorName) {
                if (!instructorRatings[data.instructorName]) {
                    instructorRatings[data.instructorName] = { total: 0, count: 0 };
                }
                instructorRatings[data.instructorName].total += data.rating;
                instructorRatings[data.instructorName].count += 1;
            }
        });

        const labels = Object.keys(instructorRatings);
        const data = labels.map(name => (instructorRatings[name].total / instructorRatings[name].count).toFixed(1));

        const ctx = document.getElementById('ratingsChart').getContext('2d');

        if (ratingsChartInstance) {
            ratingsChartInstance.destroy();
        }

        ratingsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Média de Avaliação (Estrelas)',
                    data: data,
                    backgroundColor: 'rgba(255, 193, 7, 0.6)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        });

    } catch (e) {
        console.error("Erro ao renderizar gráfico de avaliações:", e);
    }
}

// Atualizar Lista de Comentários Recentes
async function updateRecentComments() {
    const list = document.getElementById('recent-comments-list');
    list.innerHTML = '<p class="text-gray-500 text-sm">A carregar...</p>';

    try {
        // Busca as últimas 10 avaliações (idealmente usar orderBy e limit, mas requires index)
        const q = query(ratingsCollection); 
        const snapshot = await getDocs(q);
        let comments = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.comment) {
                comments.push(data);
            }
        });

        // Ordenar por data (desc) no cliente
        comments.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        // comments = comments.slice(0, 10); // REMOVIDO: Removido limite de 10 comentários

        if (comments.length === 0) {
            list.innerHTML = '<p class="text-gray-500 text-sm">Nenhum comentário ainda.</p>';
            return;
        }

        list.innerHTML = comments.map(c => `
            <div class="border-b pb-3 last:border-0">
                <div class="flex justify-between items-start">
                    <p class="font-bold text-sm text-gray-800">${c.instructorName}</p>
                    <span class="text-xs text-gray-500">${c.createdAt ? c.createdAt.toDate().toLocaleDateString('pt-PT') : ''}</span>
                </div>
                <div class="flex text-yellow-400 text-xs mb-1">
                    ${Array(c.rating).fill('<i class="fas fa-star"></i>').join('')}
                </div>
                <p class="text-sm text-gray-600 italic">"${c.comment}"</p>
            </div>
        `).join('');

    } catch (e) {
        console.error("Erro ao carregar comentários:", e);
        list.innerHTML = '<p class="text-red-500 text-sm">Erro ao carregar.</p>';
    }
}


// Carregar Cursos (Admin)
async function loadAdminCourses() {
  const tableBody = document.getElementById('admin-courses-table-body');
  tableBody.innerHTML = '<tr><td colspan="5">A carregar cursos...</td></tr>';
  
  // Re-usa o cache local
  if (localCourses.length === 0) {
    await loadCourses(); // Garante que temos os dados
  }
  
  // FILTRO: Mostrar apenas cursos 'aberto' ou 'em_breve'
  const visibleCourses = localCourses.filter(
    course => course.status === 'aberto' || course.status === 'em_breve'
  );

  if (visibleCourses.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">Nenhum curso "Aberto" ou "Em Breve" encontrado. (Cursos fechados ficam ocultos)</td></tr>';
    return;
  }
  
  tableBody.innerHTML = visibleCourses.map(course => {
    let statusClass = 'bg-yellow-100 text-yellow-700'; // Default 'em_breve'
    if (course.status === 'aberto') statusClass = 'bg-green-100 text-green-700';

    // Tenta buscar a data
    const courseDate = course.details && course.details.Data ? course.details.Data : 'N/A';

    return `
      <tr data-id="${course.id}">
        <td class="font-medium">${course.title}</td>
        <td><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${course.status}</span></td>
        <td class="text-sm">${courseDate}</td>
        <td>
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${course.isRatingEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">
            ${course.isRatingEnabled ? 'Aberta' : 'Fechada'}
          </span>
        </td>
        <td class="actions">
          <button class="btn-edit !px-3 !py-2 !text-xs" data-action="edit-course" title="Editar"><i class="fas fa-pencil"></i></button>
          <button class="btn-danger !px-3 !py-2 !text-xs" data-action="delete-course" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `
  }).join('');
}

// Carregar Matrículas (Admin)
async function loadAdminEnrollments() {
  const tableBody = document.getElementById('admin-enrollments-table-body');
  const filterSelect = document.getElementById('admin-enrollments-filter');
  
  tableBody.innerHTML = '<tr><td colspan="7">A carregar matrículas...</td></tr>';

  // Popula o filtro de cursos
  if (filterSelect.options.length === 1) { // Se só tem "Todos"
      localCourses.forEach(course => {
          const option = document.createElement('option');
          option.value = course.id;
          option.text = course.title;
          filterSelect.appendChild(option);
      });
  }
  
  const selectedCourseId = filterSelect.value;

  try {
    let q = collection(db, `artifacts/${appId}/public/data/enrollments`);
    
    if (selectedCourseId !== 'all') {
        q = query(q, where('courseId', '==', selectedCourseId));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="7">Nenhuma matrícula encontrada.</td></tr>';
      return;
    }
    
    let rows = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      rows.push({ id: doc.id, ...data });
    });
    
    // Ordenar por data (mais recente primeiro) - CLIENT SIDE SORT
    rows.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
    
    tableBody.innerHTML = rows.map(data => `
      <tr data-id="${data.id}">
        <td class="font-mono text-xs">${data.protocol}</td>
        <td class="font-medium">${data.name}</td>
        <td>${data.email}</td>
        <td>${data.courseName}</td>
        <td>${data.createdAt ? data.createdAt.toDate().toLocaleDateString('pt-PT') : 'N/A'}</td>
        <td>${data.sector}</td>
        <td class="actions">
          <button class="btn-danger !px-3 !py-2 !text-xs" data-action="delete-enrollment" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
    
  } catch (e) {
    console.error("Erro ao carregar matrículas:", e);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-red-500">Erro ao carregar matrículas: ${e.message}</td></tr>`;
  }
}

// Listener para o filtro de matrículas
document.getElementById('admin-enrollments-filter').addEventListener('change', () => {
    loadAdminEnrollments();
});

// Exportar PDF de Matrículas
document.getElementById('btn-export-enrollments-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Relatório de Matrículas - Evereste Academy", 14, 20);
    doc.autoTable({ 
        html: '#enrollments-table',
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
    });
    doc.save('matriculas_evereste.pdf');
});

// Carregar Instrutores (Admin)
async function loadAdminInstructors() {
  const tableBody = document.getElementById('admin-instructors-table-body');
  tableBody.innerHTML = '<tr><td colspan="4">A carregar instrutores...</td></tr>';
  
  // Re-usa o cache local
  if (localInstructors.length === 0) {
    await loadInstructors(); // Garante que temos os dados
  }
  
  if (localInstructors.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4">Nenhum instrutor encontrado.</td></tr>';
    return;
  }
  
  tableBody.innerHTML = localInstructors.map(inst => `
    <tr data-id="${inst.id}">
      <td><img src="${inst.image}" alt="${inst.name}" class="w-10 h-10 rounded-full object-cover"></td>
      <td class="font-medium">${inst.name}</td>
      <td class="text-sm">${inst.title}</td>
      <td class="actions">
        <button class="btn-edit !px-3 !py-2 !text-xs" data-action="edit-instructor" title="Editar"><i class="fas fa-pencil"></i></button>
        <button class="btn-danger !px-3 !py-2 !text-xs" data-action="delete-instructor" title="Excluir"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

// REMOVIDO: loadCheckinPasswords
// REMOVIDO: Salvar Senhas de Check-in

// --- ADMIN: ABRIR MODAIS ---

// Abrir Modal de Curso (para Adicionar ou Editar)
document.getElementById('admin-add-course-btn').addEventListener('click', () => openCourseModal());

function openCourseModal(course = null) {
  const form = document.getElementById('courseForm');
  form.reset();
  document.getElementById('courseFormError').classList.add('hidden');
  
  const modalTitle = document.getElementById('modalCourseTitle');
  const courseIdField = document.getElementById('courseId');
  
  // Popular checkboxes de instrutores
  const instList = document.getElementById('courseInstructorsList');
  instList.innerHTML = localInstructors.map(inst => `
    <label>
      <input type="checkbox" value="${inst.id}">
      <span>${inst.name}</span>
    </label>
  `).join('');
  
  // Limpar construtores dinâmicos
  document.getElementById('courseDetails-builder').innerHTML = '';
  document.getElementById('courseObjectives-builder').innerHTML = '';
  document.getElementById('courseRequirements-builder').innerHTML = '';
  document.getElementById('courseActivities-builder').innerHTML = '';
  document.getElementById('courseModules-builder').innerHTML = '';
  
  if (course) {
    // --- MODO EDIÇÃO ---
    modalTitle.textContent = "Editar Curso";
    courseIdField.value = course.id;
    document.getElementById('courseTitle').value = course.title || '';
    document.getElementById('courseSubtitle').value = course.subtitle || '';
    document.getElementById('courseThemeColor').value = course.themeColor || '';
    document.getElementById('courseIcon').value = course.icon || '';
    document.getElementById('courseStatus').value = course.status || 'aberto';
    document.getElementById('courseHeaderImage').value = course.headerOverlayImage || '';
    document.getElementById('courseSummary').value = course.summary || '';
    document.getElementById('courseFullDescription').value = course.fullDescription || '';
    document.getElementById('courseTargetAudience').value = course.targetAudience || '';
    document.getElementById('courseIsRatingEnabled').checked = course.isRatingEnabled || false;
    
    // Popular construtores dinâmicos
    (course.details ? Object.entries(course.details) : []).forEach(([key, value]) => addDetailField(key, value));
    (course.learningObjectives || []).forEach(value => addListItemField('courseObjectives-builder', value));
    (course.requirements || []).forEach(value => addListItemField('courseRequirements-builder', value));
    (course.practicalActivities || []).forEach(activity => addActivityField(activity));
    (course.modules || []).forEach(module => addModuleField(module));
    
    // Marcar checkboxes de instrutores
    const instructorIds = (course.instructors || []).map(i => i.id);
    instList.querySelectorAll('input').forEach(checkbox => {
      if (instructorIds.includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });

  } else {
    // --- MODO ADICIONAR NOVO ---
    modalTitle.textContent = "Adicionar Novo Curso";
    courseIdField.value = '';
    // Adiciona um campo vazio para começar
    addDetailField();
    addListItemField('courseObjectives-builder');
    addListItemField('courseRequirements-builder');
    addActivityField();
    addModuleField();
  }
  
  _openModal(modalEditCourse);
}

// Abrir Modal de Instrutor (para Adicionar ou Editar)
document.getElementById('admin-add-instructor-btn').addEventListener('click', () => openInstructorModal());

function openInstructorModal(instructor = null) {
  const form = document.getElementById('instructorForm');
  form.reset();
  document.getElementById('instructorFormError').classList.add('hidden');
  
  const modalTitle = document.getElementById('modalInstructorTitle');
  const idField = document.getElementById('instructorId');
  
  if (instructor) {
    // Editar
    modalTitle.textContent = "Editar Instrutor";
    idField.value = instructor.id;
    document.getElementById('instructorName').value = instructor.name || '';
    document.getElementById('instructorTitle').value = instructor.title || '';
    document.getElementById('instructorImage').value = instructor.image || '';
    document.getElementById('instructorBio').value = instructor.bio || '';
  } else {
    // Adicionar
    modalTitle.textContent = "Adicionar Novo Instrutor";
    idField.value = '';
  }
  _openModal(modalEditInstructor);
}

// Abrir Modal de Confirmação de Exclusão
let _onConfirmDelete = null; // Armazena a função a ser chamada
function openConfirmModal(message, onConfirm) {
  document.getElementById('modalConfirmMessage').textContent = message;
  _onConfirmDelete = onConfirm;
  _openModal(modalConfirmDelete);
}

document.getElementById('modalConfirmCancel').addEventListener('click', () => {
  _onConfirmDelete = null;
  _closeModal(modalConfirmDelete);
});

document.getElementById('modalConfirmDeleteBtn').addEventListener('click', async () => {
  if (typeof _onConfirmDelete === 'function') {
    const btn = document.getElementById('modalConfirmDeleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i>';
    
    try {
      await _onConfirmDelete(); // Executa a função de exclusão
    } catch (e) {
      console.error("Erro ao excluir:", e);
      showToast(`Erro ao excluir: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Sim, Excluir';
      _onConfirmDelete = null;
      _closeModal(modalConfirmDelete);
    }
  }
});


// --- ADMIN: SALVAR DADOS (FORMULÁRIOS) ---

// Salvar Curso (Adicionar ou Editar)
document.getElementById('courseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = document.getElementById('courseSubmitBtnText');
  const spinner = document.getElementById('courseFormSpinner');
  const errorEl = document.getElementById('courseFormError');
  
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;
  errorEl.classList.add('hidden');
  
  const courseId = document.getElementById('courseId').value;
  const finalCourseId = courseId || doc(collection(db, 'temp')).id; // Gere um ID se for novo

  try {
    // --- 1. Coletar Dados (dos formulários dinâmicos) ---
    let courseData;
    let selectedInstructors = [];
    
    // Coletar instrutores selecionados
    document.querySelectorAll('#courseInstructorsList input:checked').forEach(checkbox => {
      const inst = localInstructors.find(i => i.id === checkbox.value);
      if (inst) {
        selectedInstructors.push({
          id: inst.id, name: inst.name, title: inst.title, image: inst.image, bio: inst.bio || ''
        });
      }
    });
      
    // Coletar Detalhes (Key-Value)
    const details = {};
    document.querySelectorAll('#courseDetails-builder .form-builder-item').forEach(pair => {
        const key = pair.querySelector('.key').value;
        const value = pair.querySelector('.value').value;
        if (key && value) details[key] = value;
    });

    // Coletar Objetivos (Lista)
    const objectives = [];
    document.querySelectorAll('#courseObjectives-builder .form-builder-item').forEach(item => {
        const value = item.querySelector('.value').value;
        if (value) objectives.push(value);
    });
    
    // Coletar Requisitos (Lista)
    const requirements = [];
    document.querySelectorAll('#courseRequirements-builder .form-builder-item').forEach(item => {
        const value = item.querySelector('.value').value;
        if (value) requirements.push(value);
    });
    
    // Coletar Atividades (Title-Desc)
    const activities = [];
    document.querySelectorAll('#courseActivities-builder .form-builder-item').forEach(item => {
        const title = item.querySelector('.title').value;
        const description = item.querySelector('.description').value;
        if (title && description) activities.push({ title, description });
    });
    
    // Coletar Módulos (Title-Topics)
    const modules = [];
    document.querySelectorAll('#courseModules-builder .form-builder-item').forEach(item => {
        const title = item.querySelector('.title').value;
        const topics = [];
        item.querySelectorAll('.module-topic-item').forEach(topicItem => {
          const topicValue = topicItem.querySelector('.value').value;
          if (topicValue) topics.push(topicValue);
        });
        if (title) modules.push({ title, topics });
    });

    courseData = {
      title: document.getElementById('courseTitle').value,
      subtitle: document.getElementById('courseSubtitle').value,
      themeColor: document.getElementById('courseThemeColor').value,
      themeColorDark: document.getElementById('courseThemeColor').value, // Pode ser customizado
      icon: document.getElementById('courseIcon').value,
      status: document.getElementById('courseStatus').value,
      headerOverlayImage: document.getElementById('courseHeaderImage').value,
      summary: document.getElementById('courseSummary').value,
      fullDescription: document.getElementById('courseFullDescription').value,
      targetAudience: document.getElementById('courseTargetAudience').value,
      isRatingEnabled: document.getElementById('courseIsRatingEnabled').checked,
      
      // Dados dos construtores
      details: details,
      learningObjectives: objectives,
      requirements: requirements,
      practicalActivities: activities,
      modules: modules,
      instructors: selectedInstructors
    };
    
    // --- 2. Salvar no Firestore ---
    try {
      const docRef = doc(coursesCollection, finalCourseId);
      await setDoc(docRef, courseData, { merge: true });
    } catch (dbError) {
      console.error("Erro ao salvar no Firestore:", dbError);
      throw new Error(`Erro ao Salvar: Não foi possível salvar no banco de dados. ${dbError.message}`);
    }
    
    // --- 3. Sucesso ---
    _closeModal(modalEditCourse);
    showToast(`Curso "${courseData.title}" salvo com sucesso!`, 'success');
    loadCourses(); // Recarrega a lista principal
    loadAdminCourses(); // Recarrega a tabela do admin
    
  } catch (error) {
    // Captura qualquer erro
    console.error("Erro geral ao salvar curso:", error);
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  } finally {
    // Sempre reabilita o botão e esconde o spinner
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// --- INSTRUTORES ---
document.getElementById('instructorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = document.getElementById('instructorSubmitBtnText');
  const spinner = document.getElementById('instructorFormSpinner');
  const errorEl = document.getElementById('instructorFormError');
  
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;
  errorEl.classList.add('hidden');
  
  const instructorId = document.getElementById('instructorId').value;
  
  const instructorData = {
    name: document.getElementById('instructorName').value,
    title: document.getElementById('instructorTitle').value,
    image: document.getElementById('instructorImage').value,
    bio: document.getElementById('instructorBio').value,
  };
  
  try {
    let docRef;
    if (instructorId) {
      // Editar
      docRef = doc(instructorsCollection, instructorId);
      await updateDoc(docRef, instructorData);
    } else {
      // Adicionar
      docRef = await addDoc(instructorsCollection, instructorData);
    }
    
    _closeModal(modalEditInstructor);
    showToast(`Instrutor "${instructorData.name}" salvo com sucesso!`, 'success');
    loadInstructors(); // Recarrega o cache
    loadAdminInstructors(); // Recarrega a tabela
    
  } catch (error) {
    console.error("Erro ao salvar instrutor:", error);
    errorEl.textContent = `Erro ao salvar: ${error.message}`;
    errorEl.classList.remove('hidden');
  } finally {
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// --- Funções Helper do Construtor de Formulário ---

// Adicionar Key-Value (Detalhes)
function addDetailField(key = '', value = '') {
  const container = document.getElementById('courseDetails-builder');
  const div = document.createElement('div');
  div.className = 'form-builder-item key-value-pair';
  div.innerHTML = `
    <div class="form-builder-item-content">
      <input type="text" placeholder="Chave (Ex: Carga)" class="admin-input key" value="${key}">
      <input type="text" placeholder="Valor (Ex: 4 horas)" class="admin-input value" value="${value}">
    </div>
    <button type="button" class="btn-danger-outline remove-item-btn"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

// Adicionar Item de Lista Simples (Objetivos, Requisitos)
function addListItemField(containerId, value = '') {
  const container = document.getElementById(containerId);
  const div = document.createElement('div');
  div.className = 'form-builder-item list-item';
  div.innerHTML = `
    <div class="form-builder-item-content">
      <input type="text" placeholder="Texto do item" class="admin-input value" value="${value}">
    </div>
    <button type="button" class="btn-danger-outline remove-item-btn !mt-0"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

// Adicionar Atividade (Title-Description)
function addActivityField(activity = { title: '', description: '' }) {
  const container = document.getElementById('courseActivities-builder');
  const div = document.createElement('div');
  div.className = 'form-builder-item activity';
  div.innerHTML = `
    <div class="form-builder-item-content">
      <input type="text" placeholder="Título da Atividade" class="admin-input title" value="${activity.title}">
      <textarea placeholder="Descrição da Atividade" class="admin-input description">${activity.description}</textarea>
    </div>
    <button type="button" class="btn-danger-outline remove-item-btn"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

// Adicionar Módulo (Title-Topics List)
function addModuleField(module = { title: '', topics: [] }) {
  const container = document.getElementById('courseModules-builder');
  const div = document.createElement('div');
  div.className = 'form-builder-item module';
  
  const topicsHTML = module.topics.map(topic => `
    <div class="module-topic-item">
      <input type="text" placeholder="Tópico" class="admin-input value" value="${topic}">
      <button type="button" class="btn-danger-outline remove-sub-item-btn !mt-0"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
  
  div.innerHTML = `
    <div class="form-builder-item-content">
      <input type="text" placeholder="Título do Módulo" class="admin-input title" value="${module.title}">
      <div class="module-topics-container space-y-2">
        <label class="admin-label !text-xs !mb-0">Tópicos do Módulo:</label>
        ${topicsHTML}
        <button type="button" class="btn-add-item !text-xs !px-2 !py-1 add-topic-btn"><i class="fas fa-plus mr-1"></i>Tópico</button>
      </div>
    </div>
    <button type="button" class="btn-danger-outline remove-item-btn"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

// Listeners para botões "Adicionar"
document.getElementById('addDetail-btn').addEventListener('click', () => addDetailField());
document.getElementById('addObjective-btn').addEventListener('click', () => addListItemField('courseObjectives-builder'));
document.getElementById('addRequirement-btn').addEventListener('click', () => addListItemField('courseRequirements-builder'));
document.getElementById('addActivity-btn').addEventListener('click', () => addActivityField());
document.getElementById('addModule-btn').addEventListener('click', () => addModuleField());

// Listener para "Remover" itens (delegação de evento)
document.getElementById('courseForm').addEventListener('click', (e) => {
  // Remover item principal
  if (e.target.closest('.remove-item-btn')) {
    e.target.closest('.form-builder-item').remove();
  }
  
  // Adicionar tópico de módulo
  if (e.target.closest('.add-topic-btn')) {
    const topicsContainer = e.target.closest('.module-topics-container');
    const div = document.createElement('div');
    div.className = 'module-topic-item';
    div.innerHTML = `
      <input type="text" placeholder="Tópico" class="admin-input value" value="">
      <button type="button" class="btn-danger-outline remove-sub-item-btn !mt-0"><i class="fas fa-times"></i></button>
    `;
    // Insere antes do botão "Adicionar Tópico"
    topicsContainer.insertBefore(div, e.target.closest('.add-topic-btn'));
  }
  
  // Remover tópico de módulo
  if (e.target.closest('.remove-sub-item-btn')) {
    e.target.closest('.module-topic-item').remove();
  }
});


// === GESTÃO DE CLIQUES (Event Delegation) ===

// Cliques na Lista de Cursos (Home)
document.getElementById('courses-list-open').addEventListener('click', (e) => {
  const card = e.target.closest('[data-course-id]');
  if (card) {
    const courseId = card.dataset.courseId;
    const course = localCourses.find(c => c.id === courseId);
    if (course) {
      renderCourseDetail(course);
    } else {
      console.warn("Curso não encontrado no cache:", courseId);
    }
  }
});

// Cliques na Página de Detalhes do Curso
courseDetailView.addEventListener('click', (e) => {
  const course = localCourses.find(c => c.id === currentCourseId);
  if (!course) return; // Não faz nada se o curso não estiver carregado

  // Voltar
  if (e.target.closest('#back-to-courses-btn')) {
    showView('main');
    currentCourseId = null; // Limpa o ID do curso atual
  }
  // Abrir modal de inscrição
  if (e.target.closest('#enroll-btn-detail')) {
    openEnrollModal(course.id, course.title);
  }
  // Abrir modal de check-in (se o botão não estiver desabilitado)
  if (e.target.closest('#checkin-btn-detail') && !e.target.closest('.btn-disabled')) {
    openCheckinModal(course.id);
  }
  // Abrir modal de avaliação (se o botão não estiver desabilitado)
  if (e.target.closest('#rating-btn-detail') && !e.target.closest('.btn-disabled')) {
    openRatingModal(course.id);
  }
});

// Cliques no Painel de Admin
document.getElementById('admin-panel-view').addEventListener('click', async (e) => {
  const actionButton = e.target.closest('[data-action]');
  if (!actionButton) return;
  
  const action = actionButton.dataset.action;
  const row = actionButton.closest('tr');
  const id = row?.dataset.id;
  
  switch (action) {
    // --- Ações de Curso ---
    case 'edit-course':
      const course = localCourses.find(c => c.id === id);
      if (course) openCourseModal(course);
      break;
    case 'delete-course':
      openConfirmModal(`Tem a certeza que quer excluir o curso "${id}"? Esta ação não pode ser desfeita.`, async () => {
        await deleteDoc(doc(coursesCollection, id));
        showToast("Curso excluído com sucesso.", "success");
        loadCourses(); // Recarrega cache
        loadAdminCourses(); // Recarrega tabela
      });
      break;
      
    // --- Ações de Instrutor ---
    case 'edit-instructor':
      const instructor = localInstructors.find(i => i.id === id);
      if (instructor) openInstructorModal(instructor);
      break;
    case 'delete-instructor':
      openConfirmModal(`Tem a certeza que quer excluir o instrutor "${id}"?`, async () => {
        await deleteDoc(doc(instructorsCollection, id));
        showToast("Instrutor excluído com sucesso.", "success");
        loadInstructors(); // Recarrega cache
        loadAdminInstructors(); // Recarrega tabela
      });
      break;
    
    // --- Ações de Matrícula ---
    case 'delete-enrollment':
      openConfirmModal(`Tem a certeza que quer excluir esta matrícula ("${id}")?`, async () => {
        await deleteDoc(doc(enrollmentsCollection, id));
        showToast("Matrícula excluída com sucesso.", "success");
        loadAdminEnrollments(); // Recarrega tabela
        loadAdminDashboardData(); // Atualiza contagem
      });
      break;
  }
});


// === GESTÃO DE MODAIS (Genérico) ===

// Abrir Modal
function _openModal(modal) {
  if (!modal) return;
  modal.classList.add('show');
}

// Fechar Modal
function _closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('show');
}

// Fechar ao clicar no backdrop
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      _closeModal(backdrop);
    }
  });
});

// Botões de fechar específicos
document.getElementById('closeLogin')?.addEventListener('click', () => _closeModal(modalLogin));
document.getElementById('closeEnroll')?.addEventListener('click', () => _closeModal(modalEnroll));
document.getElementById('closeEnrollSuccess')?.addEventListener('click', () => _closeModal(modalEnrollSuccess));
document.getElementById('closeCheckin')?.addEventListener('click', () => _closeModal(modalCheckin));
document.getElementById('closeRating')?.addEventListener('click', () => _closeModal(modalRating));
document.getElementById('closeEditCourse')?.addEventListener('click', () => _closeModal(modalEditCourse));
document.getElementById('courseFormCancel')?.addEventListener('click', () => _closeModal(modalEditCourse));
document.getElementById('closeEditInstructor')?.addEventListener('click', () => _closeModal(modalEditInstructor));
document.getElementById('instructorFormCancel')?.addEventListener('click', () => _closeModal(modalEditInstructor));


// Animação de Scroll (Reveal)
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('show');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Scroll Progress
const scrollProgress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const st = h.scrollTop || document.body.scrollTop;
  const sh = h.scrollHeight || document.body.scrollHeight;
  const percent = (st / (sh - h.clientHeight)) * 100;
  scrollProgress.style.width = percent + '%';
});

// Header Scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) header.classList.add('header-scrolled');
  else header.classList.remove('header-scrolled');
});

// Particles
const particles = document.getElementById('particles');
const createParticle = () => {
  const s = document.createElement('span');
  s.style.left = Math.random() * 100 + 'vw';
  s.style.bottom = '-10px';
  s.style.width = (Math.random() * 2 + 1) + 'px';
  s.style.height = (Math.random() * 2 + 1) + 'px';
  s.style.animationDelay = Math.random() * 8 + 's';
  particles.appendChild(s);
  setTimeout(() => s.remove(), 14000);
};
for (let i = 0; i < 60; i++) createParticle();
setInterval(createParticle, 600);

// Link do Logo para Home
document.getElementById('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  showView('main');
});

// Link Política de Privacidade (placeholder)
document.getElementById('privacy-policy-link').addEventListener('click', (e) => {
  e.preventDefault();
  showToast("Página de Política de Privacidade ainda não implementada.", "error");
});

// Carregar dados do gráfico no início (apenas se for admin)
onAuthStateChanged(auth, (user) => {
  if (user && !user.isAnonymous) {
    checkAdminStatus(user.uid).then(() => {
      if (isAdmin) {
        renderEnrollmentsChart();
        renderRatingsChart();
        updateRecentComments();
      }
    });
  }
});
