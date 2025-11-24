// ... existing code ... -->
let localInstructors = []; // Cache local de instrutores
let userCheckins = {}; // Cache de check-ins do usuário
let currentCourseId = null; // ID do curso na página de detalhes

// RE-ADICIONADO: Instâncias dos Gráficos
let enrollmentsChartInstance = null;
let ratingsChartInstance = null;

// Referências de Coleções (Baseado nas Regras)
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
// ... existing code ... -->
  } else if (viewName === 'admin') {
    if (isAdmin) {
      adminPanelView.classList.remove('hidden');
      
      // *** ALTERADO: Carregar dados da aba "Dashboard" como padrão ***
      loadAdminDashboardData(); 
      renderEnrollmentsChart();
      renderRatingsChart();
      
      // *** ALTERADO: Resetar para a aba "Dashboard" ***
      document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector('.admin-nav-link[data-target="admin-dashboard"]').classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
      document.getElementById('admin-dashboard').classList.remove('hidden');
      
      window.scrollTo(0, 0);
    } else {
      // Se não for admin, volta para a main e abre o login
// ... existing code ... -->
  e.preventDefault();
  handleLogout();
});

// RE-ADICIONADO: Funções do Dashboard

/**
 * Destrói as instâncias ativas dos gráficos para evitar memory leaks e bugs de renderização.
 */
function destroyCharts() {
  if (enrollmentsChartInstance) {
    enrollmentsChartInstance.destroy();
    enrollmentsChartInstance = null;
  }
  if (ratingsChartInstance) {
    ratingsChartInstance.destroy();
    ratingsChartInstance = null;
  }
}

/**
 * Carrega as estatísticas (cards) para o dashboard do admin.
 */
async function loadAdminDashboardData() {
  try {
    const enrollmentsSnap = await getDocs(enrollmentsCollection);
    document.getElementById('stats-total-enrollments').textContent = enrollmentsSnap.size;
  } catch (e) { console.error("Erro ao carregar stats matrículas:", e); }

  try {
    const checkinsSnap = await getDocs(checkinsCollection);
    document.getElementById('stats-total-checkins').textContent = checkinsSnap.size;
  } catch (e) { console.error("Erro ao carregar stats checkins:", e); }
}

/**
 * Renderiza o gráfico de matrículas ao longo do tempo.
 */
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
        enrollmentsChartInstance.destroy(); // Destrói gráfico anterior se existir
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
    console.error("Erro ao renderizar gráfico de matrículas:", e);
  }
}

/**
 * Renderiza o gráfico de média de avaliações por instrutor.
 */
async function renderRatingsChart() {
  let ratingsData = [];
  try {
    // Assumindo que as regras do Firestore permitem leitura de 'ratings' pelo admin
    const q = query(ratingsCollection);
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      ratingsData.push(doc.data());
    });

    // Agrupar avaliações por instrutor
    const ratingsByInstructor = ratingsData.reduce((acc, curr) => {
      const instructorName = curr.instructorName || 'N/A';
      if (!acc[instructorName]) {
        acc[instructorName] = { total: 0, count: 0 };
      }
      acc[instructorName].total += curr.rating;
      acc[instructorName].count += 1;
      return acc;
    }, {});

    // Calcular médias
    const labels = Object.keys(ratingsByInstructor);
    const data = labels.map(instructorName => {
      const { total, count } = ratingsByInstructor[instructorName];
      return (total / count).toFixed(1); // Média com 1 casa decimal
    });

    const ctx = document.getElementById('ratingsChart').getContext('2d');
    
    if (ratingsChartInstance) {
        ratingsChartInstance.destroy(); // Destrói gráfico anterior se existir
    }

    ratingsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Média de Avaliação (1-5)',
          data: data,
          backgroundColor: [
            'rgba(0, 168, 150, 0.6)',
            'rgba(255, 107, 53, 0.6)',
            'rgba(106, 76, 147, 0.6)',
            'rgba(0, 102, 204, 0.6)',
            'rgba(255, 200, 87, 0.6)',
          ],
          borderColor: [
            'rgba(0, 168, 150, 1)',
            'rgba(255, 107, 53, 1)',
            'rgba(106, 76, 147, 1)',
            'rgba(0, 102, 204, 1)',
            'rgba(255, 200, 87, 1)',
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 5, // A avaliação é de 1 a 5
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false // Oculta a legenda para um gráfico mais limpo
          }
        }
      }
    });

  } catch (e) {
    console.error("Erro ao renderizar gráfico de avaliações:", e);
  }
}

// === CARREGAMENTO DE DADOS PÚBLICOS ===
// ... existing code ... -->
// ... existing code ... -->
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(link.dataset.target).classList.remove('hidden');
    
    // Carregar dados da seção
    switch(link.dataset.target) {
      // RE-ADICIONADO: case 'admin-dashboard'
      case 'admin-dashboard':
        destroyCharts(); // Limpa gráficos de outras abas (se houver no futuro)
        loadAdminDashboardData();
        renderEnrollmentsChart();
        renderRatingsChart();
        break;
      case 'admin-cursos': 
        destroyCharts(); // Limpa gráficos do dashboard
        loadAdminCourses(); 
        break;
      case 'admin-matriculas': 
        destroyCharts(); // Limpa gráficos do dashboard
        loadAdminEnrollments(); 
        break;
      case 'admin-instrutores': 
        destroyCharts(); // Limpa gráficos do dashboard
        loadAdminInstructors(); 
        break;
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
    // MUDANÇA: Tratar erro de permissão como "não-admin" sem poluir a consola
    if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
      console.log("Verificação de admin falhou (permissões), assumindo não-admin.");
    } else {
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
    
    localCourses.sort((a, b) => a.title.localeCompare(b.title));
    
    renderCoursesLists();
    
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
    
  } catch (error) {
    console.error("Erro ao carregar instrutores:", error);
  }
}

// Carregar Check-ins do Usuário
async function loadUserCheckins(uid) {
  if (!uid) return;
  try {
    const q = query(checkinsCollection, where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    userCheckins = {};
    querySnapshot.forEach((doc) => {
      const checkin = doc.data();
      userCheckins[checkin.courseId] = true;
    });
    console.log("Check-ins do usuário carregados:", userCheckins);
    
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
  currentCourseId = course.id;
  
  const parseJSON = (data, fallback = []) => {
    if (!data) return fallback;
    if (Array.isArray(data) || typeof data === 'object') return data;
    if (typeof data === 'string' && !data.startsWith('[') && !data.startsWith('{')) {
      return [data];
    }
    try {
      return JSON.parse(data) || fallback;
    } catch (e) {
      console.warn("Falha ao parsear JSON, tratando como texto:", data, e);
      return [data];
    }
  };
  
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
                <button id="rating-btn-detail" class="btn-primary w-full btn-disabled">
                  <i class="fas fa-star mr-2"></i>Avaliar Instrutor
                </button>
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
    ratingBtn.classList.add('btn-disabled');
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
    
    document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(link.dataset.target).classList.remove('hidden');
    
    // Carregar dados da seção
    switch(link.dataset.target) {
      // REMOVIDO: case 'admin-dashboard'
      case 'admin-cursos': loadAdminCourses(); break;
      case 'admin-matriculas': loadAdminEnrollments(); break;
      case 'admin-instrutores': loadAdminInstructors(); break;
    }
  }
});

// REMOVIDO: loadAdminDashboardData()
// REMOVIDO: renderEnrollmentsChart()

// Carregar Cursos (Admin)
async function loadAdminCourses() {
  const tableBody = document.getElementById('admin-courses-table-body');
  tableBody.innerHTML = '<tr><td colspan="5">A carregar cursos...</td></tr>';
  
  if (localCourses.length === 0) {
    await loadCourses();
  }
  
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
  tableBody.innerHTML = '<tr><td colspan="7">A carregar matrículas...</td></tr>';
  
  try {
    const q = query(enrollmentsCollection);
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="7">Nenhuma matrícula encontrada.</td></tr>';
      return;
    }
    
    let rows = [];
    snapshot.forEach(doc => {
      rows.push({ id: doc.id, ...doc.data() });
    });
    
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

// Carregar Instrutores (Admin)
async function loadAdminInstructors() {
  const tableBody = document.getElementById('admin-instructors-table-body');
  tableBody.innerHTML = '<tr><td colspan="4">A carregar instrutores...</td></tr>';
  
  if (localInstructors.length === 0) {
    await loadInstructors();
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

// --- ADMIN: ABRIR MODAIS ---

// Abrir Modal de Curso (para Adicionar ou Editar)
document.getElementById('admin-add-course-btn').addEventListener('click', () => openCourseModal());

function openCourseModal(course = null) {
  const form = document.getElementById('courseForm');
  form.reset();
  document.getElementById('courseFormError').classList.add('hidden');
  
  const modalTitle = document.getElementById('modalCourseTitle');
  const courseIdField = document.getElementById('courseId');
  
  const instList = document.getElementById('courseInstructorsList');
  instList.innerHTML = localInstructors.map(inst => `
    <label>
      <input type="checkbox" value="${inst.id}">
      <span>${inst.name}</span>
    </label>
  `).join('');
  
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
    
    (course.details ? Object.entries(course.details) : []).forEach(([key, value]) => addDetailField(key, value));
    (course.learningObjectives || []).forEach(value => addListItemField('courseObjectives-builder', value));
    (course.requirements || []).forEach(value => addListItemField('courseRequirements-builder', value));
    (course.practicalActivities || []).forEach(activity => addActivityField(activity));
    (course.modules || []).forEach(module => addModuleField(module));
    
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
    modalTitle.textContent = "Editar Instrutor";
    idField.value = instructor.id;
    document.getElementById('instructorName').value = instructor.name || '';
    document.getElementById('instructorTitle').value = instructor.title || '';
    document.getElementById('instructorImage').value = instructor.image || '';
    document.getElementById('instructorBio').value = instructor.bio || '';
  } else {
    modalTitle.textContent = "Adicionar Novo Instrutor";
    idField.value = '';
  }
  _openModal(modalEditInstructor);
}

// Abrir Modal de Confirmação de Exclusão
let _onConfirmDelete = null;
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
      await _onConfirmDelete();
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
  const finalCourseId = courseId || doc(collection(db, 'temp')).id;

  try {
    let courseData;
    let selectedInstructors = [];
    
    document.querySelectorAll('#courseInstructorsList input:checked').forEach(checkbox => {
      const inst = localInstructors.find(i => i.id === checkbox.value);
      if (inst) {
        selectedInstructors.push({
          id: inst.id, name: inst.name, title: inst.title, image: inst.image, bio: inst.bio || ''
        });
      }
    });
      
    const details = {};
    document.querySelectorAll('#courseDetails-builder .form-builder-item').forEach(pair => {
        const key = pair.querySelector('.key').value;
        const value = pair.querySelector('.value').value;
        if (key && value) details[key] = value;
    });

    const objectives = [];
    document.querySelectorAll('#courseObjectives-builder .form-builder-item').forEach(item => {
        const value = item.querySelector('.value').value;
        if (value) objectives.push(value);
    });
    
    const requirements = [];
    document.querySelectorAll('#courseRequirements-builder .form-builder-item').forEach(item => {
        const value = item.querySelector('.value').value;
        if (value) requirements.push(value);
    });
    
    const activities = [];
    document.querySelectorAll('#courseActivities-builder .form-builder-item').forEach(item => {
        const title = item.querySelector('.title').value;
        const description = item.querySelector('.description').value;
        if (title && description) activities.push({ title, description });
    });
    
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
      themeColorDark: document.getElementById('courseThemeColor').value,
      icon: document.getElementById('courseIcon').value,
      status: document.getElementById('courseStatus').value,
      headerOverlayImage: document.getElementById('courseHeaderImage').value,
      summary: document.getElementById('courseSummary').value,
      fullDescription: document.getElementById('courseFullDescription').value,
      targetAudience: document.getElementById('courseTargetAudience').value,
      isRatingEnabled: document.getElementById('courseIsRatingEnabled').checked,
      
      details: details,
      learningObjectives: objectives,
      requirements: requirements,
      practicalActivities: activities,
      modules: modules,
      instructors: selectedInstructors
    };
    
    try {
      const docRef = doc(coursesCollection, finalCourseId);
      await setDoc(docRef, courseData, { merge: true });
    } catch (dbError) {
      console.error("Erro ao salvar no Firestore:", dbError);
      throw new Error(`Erro ao Salvar: Não foi possível salvar no banco de dados. ${dbError.message}`);
    }
    
    _closeModal(modalEditCourse);
    showToast(`Curso "${courseData.title}" salvo com sucesso!`, 'success');
    loadCourses();
    loadAdminCourses();
    
  } catch (error) {
    console.error("Erro geral ao salvar curso:", error);
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
  } finally {
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
      docRef = doc(instructorsCollection, instructorId);
      await updateDoc(docRef, instructorData);
    } else {
      docRef = await addDoc(instructorsCollection, instructorData);
    }
    
    _closeModal(modalEditInstructor);
    showToast(`Instrutor "${instructorData.name}" salvo com sucesso!`, 'success');
    loadInstructors();
    loadAdminInstructors();
    
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
  if (e.target.closest('.remove-item-btn')) {
    e.target.closest('.form-builder-item').remove();
  }
  
  if (e.target.closest('.add-topic-btn')) {
    const topicsContainer = e.target.closest('.module-topics-container');
    const div = document.createElement('div');
    div.className = 'module-topic-item';
    div.innerHTML = `
      <input type="text" placeholder="Tópico" class="admin-input value" value="">
      <button type="button" class="btn-danger-outline remove-sub-item-btn !mt-0"><i class="fas fa-times"></i></button>
    `;
    topicsContainer.insertBefore(div, e.target.closest('.add-topic-btn'));
  }
  
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
  if (!course) return;

  if (e.target.closest('#back-to-courses-btn')) {
    showView('main');
    currentCourseId = null;
  }
  if (e.target.closest('#enroll-btn-detail')) {
    openEnrollModal(course.id, course.title);
  }
  if (e.target.closest('#checkin-btn-detail') && !e.target.closest('.btn-disabled')) {
    openCheckinModal(course.id);
  }
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
    case 'edit-course':
      const course = localCourses.find(c => c.id === id);
      if (course) openCourseModal(course);
      break;
    case 'delete-course':
      openConfirmModal(`Tem a certeza que quer excluir o curso "${id}"? Esta ação não pode ser desfeita.`, async () => {
        await deleteDoc(doc(coursesCollection, id));
        showToast("Curso excluído com sucesso.", "success");
        loadCourses();
        loadAdminCourses();
      });
      break;
      
    case 'edit-instructor':
      const instructor = localInstructors.find(i => i.id === id);
      if (instructor) openInstructorModal(instructor);
      break;
    case 'delete-instructor':
      openConfirmModal(`Tem a certeza que quer excluir o instrutor "${id}"?`, async () => {
        await deleteDoc(doc(instructorsCollection, id));
        showToast("Instrutor excluído com sucesso.", "success");
        loadInstructors();
        loadAdminInstructors();
      });
      break;
// ... existing code ... -->
    case 'delete-enrollment':
      openConfirmModal(`Tem a certeza que quer excluir esta matrícula ("${id}")?`, async () => {
        await deleteDoc(doc(enrollmentsCollection, id));
        showToast("Matrícula excluída com sucesso.", "success");
        loadAdminEnrollments();
        loadAdminDashboardData(); // RE-ADICIONADO: Atualiza contagem
      });
      break;
  }
});

// Botão de Popular DB
document.getElementById('populate-db-btn').addEventListener('click', async (e) => {
  if (!isAdmin) {
    showToast("Apenas administradores podem executar esta ação.", "error");
    return;
  }
  
  const btn = e.target.closest('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>A popular...';

  try {
    const { initialCourses, initialInstructors } = getInitialData();
    
    const batch = writeBatch(db);
    
    initialInstructors.forEach(inst => {
      const docRef = doc(instructorsCollection, inst.id);
      batch.set(docRef, inst);
    });
    
    initialCourses.forEach(course => {
      const docRef = doc(coursesCollection, course.id);
      batch.set(docRef, course);
    });
    
    await batch.commit();
    showToast("Banco de dados populado com dados iniciais!", "success");
    
    loadCourses();
    loadInstructors();
    loadAdminCourses();
    loadAdminInstructors();
    
  } catch (error) {
    console.error("Erro ao popular DB:", error);
    showToast(`Erro ao popular banco de dados: ${error.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-database mr-2"></i>Popular Dados Iniciais';
  }
});

// === DADOS INICIAIS (POPULAR DB) ===
function getInitialData() {
  const initialInstructors = [
    { id: "marllon", name: "Marllon Costa", title: "Técnico em TI | Designer | Inovação e IA", image: "https://i.postimg.cc/sxm4TVvF/IMG-9781.jpg", bio: "Designer gráfico, graduando em marketing e autodidata em Inovação e IA." },
    { id: "vinicius", name: "Vinícius Sena", title: "Fotógrafo Documental | Pós-produção", image: "https://i.postimg.cc/bw7kHG3D/vinicius.jpg", bio: "Formado em Animação, estudante e entusiasta de fotografia desde 2019." },
    { id: "bruno", name: "Bruno Diogo", title: "Supervisor de Marketing | Designer | UX/UI", image: "https://i.postimg.cc/yNhgmLJK/IMG-7311.avif", bio: "Supervisor de Marketing e Mídias Visuais | Designer Gráfico e Digital." },
    { id: "keven", name: "Keven Menezes", title: "Analista de TI | Designer Gráfico | Motion", image: "https://i.postimg.cc/fTgkcmpP/Whats-App-Image-2025-10-27-at-12-11-25.jpg", bio: "Formado em Design Gráfico e possui mais de 5 anos de experiência." },
    { id: "deyse", name: "Deyse Pereira", title: "Estrategista em Comunicação | Gestão de Projetos", image: "https://i.postimg.cc/T1sL3bXz/IMG-7381-jpg.png", bio: "Mestre em Design de Artefatos Digitais, pós-graduanda em Gestão de Projetos." }
  ];
  
  const initialCourses = [
    {
      id: "fotografia",
      title: "Workshop de Fotografia",
      subtitle: "O Olhar que Conecta Histórias",
      summary: "Aprenda a capturar a essência dos nossos projetos com sensibilidade e técnica.",
      fullDescription: "No Instituto Evereste, cada imagem conta uma parte da nossa história. Este workshop é um convite para desenvolver a sua percepção e criatividade.",
      targetAudience: "O Curso de Fotografia é voltado para pessoas que desejam explorar o poder da imagem como forma de expressão, comunicação e transformação social.",
      themeColor: "#FFC107",
      themeColorDark: "#E6A700",
      icon: "fa-camera-retro",
      status: "aberto",
      headerOverlayImage: "https://i.postimg.cc/3rLTy2xn/medium-shot-people-with-camera.jpg",
      details: {"Data": "28 de Outubro de 2025", "Horário": "08:30h - 12:15h", "Carga": "4 horas", "Modalidade": "Presencial e Online"},
      learningObjectives: [
        "Introduzir conceitos básicos de fotografia.",
        "Desenvolver habilidades práticas com câmaras e celulares.",
        "Capacitar para o registo de eventos e projetos."
      ],
      modules: [
        { "title": "Módulo 1: Fundamentos", "topics": ["Introdução", "Equipamento", "ISO, lentes e flash"] },
        { "title": "Módulo 2: Composição", "topics": ["Enquadramento", "Luz dura e suave", "Regra dos terços"] },
        { "title": "Módulo 3: Edição", "topics": ["Introdução ao Lightroom", "Correção de cores", "Exercícios práticos"] }
      ],
      practicalActivities: [
        { "title": "Exercício de Teste", "description": "Em duplas, os participantes tiram 3 fotos um do outro." },
        { "title": "Exercício de Conhecimento", "description": "Os participantes tiram 3-5 fotos com diferentes tipos de iluminação." }
      ],
      requirements: ["Não são necessários pré-requisitos.", "Incentivamos a trazer o seu próprio smartphone ou câmara."],
      instructors: [
        { id: "bruno", name: "Bruno Diogo", title: "Supervisor de Marketing | Designer | UX/UI", image: "https://i.postimg.cc/yNhgmLJK/IMG-7311.avif", bio: "Supervisor de Marketing e Mídias Visuais | Designer Gráfico e Digital." },
        { id: "vinicius", name: "Vinícius Sena", title: "Fotógrafo Documental | Pós-produção", image: "https://i.postimg.cc/bw7kHG3D/vinicius.jpg", bio: "Formado em Animação, estudante e entusiasta de fotografia desde 2019." }
      ],
      isRatingEnabled: true
    },
    {
      id: "ia",
      title: "IA Aplicada à Análise de Dados",
      subtitle: "Do Relatório ao Insight",
      summary: "Transforme relatórios e dados brutos em dashboards web interativos e de alto impacto.",
      fullDescription: "Num mundo movido por dados, a capacidade de extrair insights rápidos é um superpoder. Com o 'Método Evereste Ágil', este curso vai desmistificar a IA.",
      targetAudience: "Para todos os colaboradores, entusiastas de tecnologia e qualquer pessoa curiosa sobre o poder da inteligência artificial.",
      themeColor: "#4CAF50",
      themeColorDark: "#388E3C",
      icon: "fa-brain",
      status: "aberto",
      headerOverlayImage: "https://i.postimg.cc/bv25v2BZ/relat-rio-1.png",
      details: {"Data": "06 de Novembro de 2025", "Carga": "4 horas", "Modalidade": "Presencial ou Online", "Público": "Livre"},
      learningObjectives: [
        "Formular prompts eficazes no Gemini.",
        "Publicar um dashboard interativo na web.",
        "Estruturar uma apresentação de resultados."
      ],
      modules: [
        { "title": "Módulo 1: Fundamentos", "topics": ["Método Evereste Ágil", "Ferramentas de IA", "Construindo o prompt"] },
        { "title": "Módulo 2: Publicação", "topics": ["GitHub Pages", "Publicando o dashboard", "Refinamento"] },
        { "title": "Módulo 3: Apresentação", "topics": ["Técnicas para apresentar", "Simulação", "Próximos passos"] }
      ],
      practicalActivities: [
        { "title": "Oficina: O Prompt Perfeito", "description": "Participantes recebem um relatório e devem construir um prompt." },
        { "title": "Oficina: Dashboard no Ar", "description": "Passo a passo guiado para publicar o dashboard online." }
      ],
      requirements: ["Indispensável ter um notebook.", "Conta Google (Gemini)", "Conta no GitHub."],
      instructors: [
        { id: "marllon", name: "Marllon Costa", title: "Técnico em TI | Designer | Inovação e IA", image: "https://i.postimg.cc/sxm4TVvF/IMG-9781.jpg", bio: "Designer gráfico, graduando em marketing e autodidata em Inovação e IA." }
      ],
      isRatingEnabled: false
    }
  ];
  
  return { initialCourses, initialInstructors };
}


// === GESTÃO DE MODAIS (Genérico) ===

function _openModal(modal) {
  if (!modal) return;
  modal.classList.add('show');
}

function _closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('show');
}

document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      _closeModal(backdrop);
    }
  });
});

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

// REMOVIDO: Carregamento inicial do gráfico

