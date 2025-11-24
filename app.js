(function() {
  // === 1. Espera Ativa pelo Firebase ===
  const waitForFirebase = setInterval(() => {
    if (window.FirebaseSDK) {
      clearInterval(waitForFirebase);
      initApp();
    }
  }, 100);

  function initApp() {
    const { useState, useEffect, useMemo, useRef } = React;
    const { 
      auth, db, appId, 
      signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously,
      doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp 
    } = window.FirebaseSDK;
    const { jsPDF } = window.jspdf;

    // === UTILS ===
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('pt-PT') : 'N/A';

    // === COMPONENTES UI GERAIS ===
    const Header = ({ user, isAdmin, onAdminClick, onLogout, goHome }) => (
      <header className="header-glass py-4 px-6 flex justify-between items-center sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
          <img src="https://i.postimg.cc/hvvWCwnk/Prancheta-1-1.png" alt="Logo" className="h-10" />
        </div>
        <div className="flex gap-4">
          <button onClick={onAdminClick} className="text-sm font-semibold text-blue-800 hover:text-blue-600">
            <i className="fas fa-lock mr-2"></i>{isAdmin ? 'Painel Admin' : 'Admin'}
          </button>
          {isAdmin && (
            <button onClick={onLogout} className="text-sm font-semibold text-red-600 hover:text-red-400">
              <i className="fas fa-sign-out-alt mr-2"></i>Sair
            </button>
          )}
        </div>
      </header>
    );

    const Hero = () => (
      <section className="relative py-24 px-6 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url(https://i.postimg.cc/4xNpxRZJ/capabannerlids.png)' }}></div>
        <div className="relative z-10 container mx-auto text-center max-w-4xl">
          <span className="inline-block py-1 px-3 rounded-full bg-white/20 border border-white/30 text-sm font-bold mb-6 backdrop-blur-sm">
            <i className="fas fa-bolt mr-2"></i>Inscrições Abertas
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">Evereste Academy</h1>
          <p className="text-xl text-slate-200 mb-8 leading-relaxed">Formações práticas e focadas em resultados para elevar a excelência do Instituto Evereste.</p>
          <a href="#cursos" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-transform hover:-translate-y-1 shadow-lg shadow-blue-600/30">
            Ver Cursos Disponíveis
          </a>
        </div>
      </section>
    );

    const AboutSection = ({ images }) => {
      // Adicionando a imagem solicitada manualmente à lista de exibição
      const staticImage = { id: 'manual-added-1', url: 'https://i.postimg.cc/SRMSF4W1/workshop-ia-1.jpg' };
      // Combina a imagem estática com as imagens vindas do banco de dados
      // Filtra valores nulos/undefined para evitar erros
      const dbImages = images || [];
      const displayImages = [staticImage, ...dbImages];
      const hasMultipleImages = displayImages.length > 1;

      return (
        <section className="py-24 px-6 bg-slate-50 overflow-hidden relative">
           {/* Elemento decorativo de fundo */}
           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="container mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
            {/* Coluna de Texto */}
            <div className="order-2 md:order-1">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight">Sobre o Projeto</h2>
              <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                O Programa Evereste Academy é uma iniciativa estratégica do Instituto Evereste. 
                Nossa missão é oferecer experiências imersivas que unem design moderno, 
                tecnologia de ponta e didática avançada para acelerar o desenvolvimento profissional.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="bg-teal-100 text-teal-600 p-3 rounded-lg text-xl"><i className="fas fa-bullseye"></i></div>
                    <div>
                        <h4 className="font-bold text-slate-800">Foco em Resultados</h4>
                        <p className="text-sm text-slate-500">Aprendizado prático aplicável ao dia a dia.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-lg text-xl"><i className="fas fa-chalkboard-teacher"></i></div>
                    <div>
                        <h4 className="font-bold text-slate-800">Mentoria Expert</h4>
                        <p className="text-sm text-slate-500">Acompanhamento com profissionais seniores.</p>
                    </div>
                </div>
              </div>
            </div>

            {/* Coluna de Imagem - Lógica Adaptativa */}
            <div className="order-1 md:order-2 relative group">
               {/* Efeito de sombra colorida atrás da imagem */}
               <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-20 transform translate-y-4 group-hover:translate-y-6 transition-transform duration-500"></div>
               
               {!hasMultipleImages ? (
                   // LAYOUT PARA IMAGEM ÚNICA (CASO ATUAL)
                   <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform md:rotate-2 hover:rotate-0 transition-all duration-700 ease-out">
                       <img 
                         src={displayImages[0].url} 
                         alt="Workshop IA" 
                         className="w-full h-auto object-cover min-h-[300px]"
                       />
                       {/* Overlay gradiente sutil */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                       <div className="absolute bottom-4 left-4 text-white font-medium text-sm bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                         <i className="fas fa-camera mr-2"></i>Registro Oficial
                       </div>
                   </div>
               ) : (
                   // LAYOUT MOSAICO (CASO TENHA MAIS IMAGENS NO FUTURO)
                   <div className="grid grid-cols-2 gap-3 relative bg-white p-2 rounded-2xl shadow-xl rotate-1">
                       {displayImages.slice(0, 3).map((img, idx) => (
                           <div 
                             key={img.id || idx} 
                             className={`rounded-xl overflow-hidden relative ${idx === 0 ? 'col-span-2 h-48 sm:h-64' : 'h-32 sm:h-40'}`}
                           >
                               <img src={img.url} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" alt="Galeria" />
                           </div>
                       ))}
                       {displayImages.length > 3 && (
                          <div className="h-32 sm:h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-200">
                              +{displayImages.length - 3}
                          </div>
                       )}
                   </div>
               )}
            </div>
          </div>
        </section>
      );
    };

    const CourseCard = ({ course, onClick }) => {
      const isCompleted = course.status === 'concluido';
      return (
        <div 
          onClick={() => onClick(course)}
          className={`card-3d overflow-hidden cursor-pointer flex flex-col h-full bg-white rounded-xl shadow-lg transition-all hover:shadow-2xl ${isCompleted ? 'border-l-8 border-green-500' : ''}`}
        >
          <div className="h-48 overflow-hidden relative">
            <div className="absolute inset-0 bg-black/40 z-10"></div>
            <img src={course.headerOverlayImage} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
            <div className="absolute bottom-4 left-4 z-20 text-white">
               <span className={`text-xs font-bold px-2 py-1 rounded mb-2 inline-block ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}>
                 {isCompleted ? 'CONCLUÍDO' : 'DISPONÍVEL'}
               </span>
               <h3 className="text-xl font-bold leading-tight">{course.title}</h3>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <p className="text-slate-600 text-sm mb-4 flex-1">{course.summary}</p>
            {isCompleted ? (
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(course.flickrLink || '#', '_blank'); }}
                className="w-full py-3 rounded-lg font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                <i className="fas fa-images mr-2"></i>Ver Galeria de Fotos
              </button>
            ) : (
              <button className="w-full py-3 rounded-lg font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                Ver Detalhes <i className="fas fa-arrow-right ml-2"></i>
              </button>
            )}
          </div>
        </div>
      );
    };

    const CourseDetail = ({ course, onBack, user, onEnroll, checkins }) => {
      const hasCheckedIn = checkins[course.id];
      const canCheckin = course.isCheckinEnabled === true;
      const canRate = course.isRatingEnabled === true && hasCheckedIn;
      const [showCheckinModal, setShowCheckinModal] = useState(false);
      const [showRatingModal, setShowRatingModal] = useState(false);

      return (
        <div className="animate-fade-in pb-20">
          <div className="relative py-20 bg-slate-900 text-white">
            <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${course.headerOverlayImage})` }}></div>
            <div className="container mx-auto px-6 relative z-10">
              <button onClick={onBack} className="mb-6 hover:underline opacity-80"><i className="fas fa-arrow-left mr-2"></i>Voltar</button>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl opacity-90 max-w-2xl">{course.subtitle}</p>
            </div>
          </div>
          <div className="container mx-auto px-6 -mt-10 relative z-20 grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Sobre o Curso</h3>
              <p className="text-slate-600 mb-8 whitespace-pre-line">{course.fullDescription}</p>
              {course.learningObjectives && course.learningObjectives.length > 0 && (
                <>
                  <h3 className="text-xl font-bold mb-4 text-slate-800">Objetivos de Aprendizagem</h3>
                  <ul className="mb-8 space-y-2">
                    {course.learningObjectives.map((obj, i) => (
                      <li key={i} className="flex gap-2"><i className="fas fa-check text-green-500 mt-1"></i> {obj}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3 className="text-xl font-bold mb-4 text-slate-800">Conteúdo</h3>
              <div className="space-y-4 mb-8">
                {course.modules && course.modules.map((mod, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-slate-800">{mod.title}</h4>
                    <ul className="mt-2 list-disc list-inside text-sm text-slate-600">
                      {mod.topics && mod.topics.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                <div className="mb-6 space-y-3">
                  {course.details && Object.entries(course.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b pb-2">
                      <span className="font-semibold text-slate-600">{k}:</span>
                      <span className="text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => onEnroll(course)} className="w-full btn-primary mb-3 text-center block">
                  <i className="fas fa-paper-plane mr-2"></i>Inscreva-se
                </button>
                <button onClick={() => setShowCheckinModal(true)} disabled={!canCheckin || hasCheckedIn} className={`w-full py-3 rounded-lg font-bold mb-3 border ${hasCheckedIn ? 'bg-green-100 text-green-700 border-green-200' : (!canCheckin ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50')}`}>
                  {hasCheckedIn ? <><i className="fas fa-check mr-2"></i>Check-in Feito</> : <><i className="fas fa-qrcode mr-2"></i>Fazer Check-in</>}
                </button>
                <button onClick={() => setShowRatingModal(true)} disabled={!canRate} className={`w-full py-3 rounded-lg font-bold border ${!canRate ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'}`}>
                  <i className="fas fa-star mr-2"></i>Avaliar
                </button>
              </div>
            </div>
          </div>
          {showCheckinModal && <CheckinModal course={course} user={user} onClose={() => setShowCheckinModal(false)} />}
          {showRatingModal && <RatingModal course={course} user={user} onClose={() => setShowRatingModal(false)} />}
        </div>
      );
    };

    // === MODAIS ===
    const ModalWrapper = ({ title, onClose, children }) => (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
          </div>
          {children}
        </div>
      </div>
    );

    const EnrollModal = ({ course, user, onClose, onSuccess }) => {
      const [loading, setLoading] = useState(false);
      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const form = e.target;
        const data = {
          userId: user ? user.uid : 'anon',
          courseId: course.id,
          courseName: course.title,
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          sector: form.sector.value,
          createdAt: serverTimestamp(),
          protocol: 'EVR-' + Math.random().toString(36).substr(2, 8).toUpperCase()
        };
        try {
          await addDoc(collection(db, `artifacts/${appId}/public/data/enrollments`), data);
          onSuccess(data.protocol);
          onClose();
        } catch (error) { alert('Erro: ' + error.message); } finally { setLoading(false); }
      };
      return (
        <ModalWrapper title={`Inscrição: ${course.title}`} onClose={onClose}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" placeholder="Nome Completo" required className="w-full border p-3 rounded-lg" />
            <input name="email" type="email" placeholder="E-mail" required className="w-full border p-3 rounded-lg" />
            <input name="phone" placeholder="Telefone" required className="w-full border p-3 rounded-lg" />
            <input name="sector" placeholder="Setor/Departamento" required className="w-full border p-3 rounded-lg" />
            <div className="text-sm text-gray-600 space-y-2">
              <label className="flex gap-2"><input type="checkbox" required /> Concordo com o uso de imagem.</label>
              <label className="flex gap-2"><input type="checkbox" required /> Aceito a política de privacidade.</label>
            </div>
            <button disabled={loading} className="w-full btn-primary mt-4">{loading ? '...' : 'Confirmar'}</button>
          </form>
        </ModalWrapper>
      );
    };

    const CheckinModal = ({ course, user, onClose }) => {
      const handleCheckin = async (e) => {
        e.preventDefault();
        const pwd = e.target.password.value;
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/checkins`), {
                userId: user.uid,
                courseId: course.id,
                password: pwd,
                createdAt: serverTimestamp()
            });
            alert('Check-in realizado!');
            window.location.reload(); 
        } catch (err) { alert('Erro ou Senha incorreta.'); }
      };
      return (
          <ModalWrapper title="Realizar Check-in" onClose={onClose}>
              <form onSubmit={handleCheckin}>
                  <p className="mb-4 text-gray-600">Insira a senha fornecida pelo instrutor.</p>
                  <input name="password" type="password" placeholder="Senha do dia" className="w-full border p-3 rounded-lg mb-4" />
                  <button className="w-full btn-primary">Validar Presença</button>
              </form>
          </ModalWrapper>
      )
    };

    const RatingModal = ({ course, user, onClose }) => {
        const [rating, setRating] = useState(0);
        const handleSubmit = async (e) => {
            e.preventDefault();
            await addDoc(collection(db, `artifacts/${appId}/public/data/ratings`), {
                userId: user.uid,
                courseId: course.id,
                rating,
                comment: e.target.comment.value,
                createdAt: serverTimestamp()
            });
            alert('Avaliação enviada!');
            onClose();
        };
        return (
            <ModalWrapper title="Avaliar Curso" onClose={onClose}>
                <form onSubmit={handleSubmit} className="text-center">
                    <div className="flex justify-center gap-2 mb-4 text-3xl text-yellow-400">
                        {[1,2,3,4,5].map(star => (
                            <i key={star} className={`fas fa-star cursor-pointer ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`} onClick={() => setRating(star)}></i>
                        ))}
                    </div>
                    <textarea name="comment" className="w-full border p-3 rounded-lg mb-4" placeholder="Deixe um comentário..."></textarea>
                    <button className="w-full btn-primary">Enviar</button>
                </form>
            </ModalWrapper>
        )
    };

    // === ADMIN PANEL ===
    const DashboardCharts = ({ enrollments, ratings }) => {
      const enrollCanvas = useRef(null);
      const ratingCanvas = useRef(null);
      const enrollmentsChartRef = useRef(null);
      const ratingsChartRef = useRef(null);

      useEffect(() => {
        if (enrollCanvas.current && enrollments.length > 0) {
           if (enrollmentsChartRef.current) enrollmentsChartRef.current.destroy();
           const dataByDate = {};
           enrollments.forEach(e => {
             const date = e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
             dataByDate[date] = (dataByDate[date] || 0) + 1;
           });
           enrollmentsChartRef.current = new window.Chart(enrollCanvas.current, {
             type: 'line',
             data: {
               labels: Object.keys(dataByDate),
               datasets: [{
                 label: 'Novas Matrículas',
                 data: Object.values(dataByDate),
                 borderColor: '#0066cc',
                 backgroundColor: 'rgba(0, 102, 204, 0.1)',
                 fill: true
               }]
             },
             options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
           });
        }
        if (ratingCanvas.current && ratings.length > 0) {
           if (ratingsChartRef.current) ratingsChartRef.current.destroy();
           const avg = ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length;
           ratingsChartRef.current = new window.Chart(ratingCanvas.current, {
             type: 'bar',
             data: {
               labels: ['Média Geral'],
               datasets: [{
                 label: 'Satisfação (1-5)',
                 data: [avg],
                 backgroundColor: '#ffc857'
               }]
             },
             options: { responsive: true, scales: { y: { beginAtZero: true, max: 5 } } }
           });
        }
        return () => {
           if (enrollmentsChartRef.current) enrollmentsChartRef.current.destroy();
           if (ratingsChartRef.current) ratingsChartRef.current.destroy();
        }
      }, [enrollments, ratings]);

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
           <div className="bg-white p-6 rounded-xl shadow h-80">
              <h3 className="font-bold mb-4">Matrículas no Tempo</h3>
              <canvas ref={enrollCanvas}></canvas>
           </div>
           <div className="bg-white p-6 rounded-xl shadow h-80">
              <h3 className="font-bold mb-4">Satisfação Geral</h3>
              <canvas ref={ratingCanvas}></canvas>
           </div>
        </div>
      );
    };

    const AdminPanel = ({ 
        courses, enrollments, instructors, aboutImages, ratings, allCheckins,
        onUpdateCourse, onDeleteCourse, 
        onAddImage, onDeleteImage,
        onAddInstructor, onUpdateInstructor, onDeleteInstructor,
        onDeleteEnrollment,
        onPopulateDB,
        onExit // Novo prop para sair do admin
    }) => {
      const [activeTab, setActiveTab] = useState('dashboard');
      const [editingCourse, setEditingCourse] = useState(null);
      const [editingInstructor, setEditingInstructor] = useState(null);

      // --- RELATÓRIO PDF AVANÇADO (Igual ao Modelo) ---
      const exportPDF = () => {
        const doc = new jsPDF();
        const now = new Date().toLocaleDateString('pt-PT');
        const colors = { blue: [0, 102, 204], white: [255, 255, 255], gray: [240, 240, 240] };

        // === PÁGINA 1: VISÃO GERAL ===
        
        // Header
        doc.setFillColor(...colors.blue);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Relatório Executivo", 14, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("Evereste Academy", 14, 30);
        doc.text(`Gerado em: ${now}`, 160, 30, { align: 'right' });

        // KPIs (Cartões)
        const kpiY = 55;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Visão Geral", 14, kpiY);

        // Funções para NPS
        const promoters = ratings.filter(r => r.rating === 5).length;
        const detractors = ratings.filter(r => r.rating <= 3).length;
        const nps = ratings.length > 0 ? Math.round(((promoters - detractors) / ratings.length) * 100) : 0;

        const kpis = [
            { label: "TOTAL MATRÍCULAS", value: enrollments.length },
            { label: "TOTAL CHECK-INS", value: allCheckins.length },
            { label: "NPS SCORE", value: nps }
        ];

        kpis.forEach((kpi, i) => {
            const x = 14 + (i * 65);
            doc.setFillColor(...colors.gray);
            doc.roundedRect(x, kpiY + 5, 55, 30, 3, 3, 'F');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(kpi.label, x + 5, kpiY + 15);
            doc.setFontSize(20);
            doc.setTextColor(...colors.blue);
            doc.setFont('helvetica', 'bold');
            doc.text(String(kpi.value), x + 5, kpiY + 28);
        });

        // Tabela Desempenho por Curso
        doc.setFontSize(14);
        doc.setTextColor(0,0,0);
        doc.text("Desempenho por Curso", 14, 105);

        const coursePerfBody = courses.map(c => {
            const enrollCount = enrollments.filter(e => e.courseId === c.id).length;
            const checkinCount = allCheckins.filter(ch => ch.courseId === c.id).length;
            const courseRatings = ratings.filter(r => r.courseId === c.id);
            const avgRating = courseRatings.length > 0 
                ? (courseRatings.reduce((a, b) => a + b.rating, 0) / courseRatings.length).toFixed(1)
                : 'N/A';
            return [c.title, enrollCount, checkinCount, avgRating];
        });

        doc.autoTable({
            startY: 110,
            head: [['Curso', 'Matrículas', 'Check-ins', 'Média Avaliação']],
            body: coursePerfBody,
            headStyles: { fillColor: colors.blue },
            theme: 'grid'
        });

        // === PÁGINA 2: FEEDBACKS ===
        doc.addPage();
        doc.setFillColor(...colors.blue);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(16);
        doc.text("Feedbacks e Comentários Recentes", 14, 13);

        const feedbackBody = ratings.map(r => {
             const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('pt-PT') : '-';
             // Tenta achar o nome do instrutor (se não salvo no rating, tenta pegar do curso)
             const course = courses.find(c => c.id === r.courseId);
             const instructorName = course && course.instructors && course.instructors.length > 0 
                                    ? course.instructors.map(i => i.name).join(', ') 
                                    : 'N/A';
             
             return [instructorName, r.comment || '(Sem comentário)', `${r.rating} ★`, date];
        });

        doc.autoTable({
            startY: 30,
            head: [['Instrutor / Curso', 'Comentário', 'Nota', 'Data']],
            body: feedbackBody,
            headStyles: { fillColor: colors.blue },
            theme: 'striped',
            columnStyles: { 1: { cellWidth: 90 } } // Coluna comentário mais larga
        });

        // === PÁGINA 3: LISTA COMPLETA MATRÍCULAS ===
        doc.addPage();
        doc.setFillColor(...colors.blue);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(...colors.white);
        doc.setFontSize(16);
        doc.text("Lista Completa de Matrículas", 14, 13);

        const enrollBody = enrollments.map(e => [
            e.protocol || '-', e.name, e.courseName, e.email, e.sector, 
            e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleDateString('pt-PT') : '-'
        ]);

        doc.autoTable({
            startY: 30,
            head: [['Protocolo', 'Nome', 'Curso', 'Email', 'Setor', 'Data']],
            body: enrollBody,
            headStyles: { fillColor: colors.blue },
            theme: 'grid',
            styles: { fontSize: 8 }
        });

        doc.save('Relatorio_Evereste_Completo.pdf');
      };

      const renderTabContent = () => {
        switch(activeTab) {
          case 'dashboard':
            return (
              <div className="space-y-8">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">Matrículas Totais</h3>
                      <p className="text-3xl font-bold text-blue-600">{enrollments.length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">Total Check-ins</h3>
                      <p className="text-3xl font-bold text-green-600">{allCheckins.length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">Avaliações</h3>
                      <p className="text-3xl font-bold text-purple-600">{ratings.length}</p>
                   </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
                    <h3 className="font-bold">Ações Rápidas</h3>
                    <div className="flex gap-2">
                        <button onClick={exportPDF} className="btn-primary text-sm"><i className="fas fa-file-pdf mr-2"></i>Exportar Relatório Completo</button>
                        <button onClick={onPopulateDB} className="btn-secondary text-sm"><i className="fas fa-database mr-2"></i>Popular DB</button>
                    </div>
                </div>

                <DashboardCharts enrollments={enrollments} ratings={ratings} />

                {/* ADICIONADO: Lista de Comentários e Avaliações */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                         <h3 className="font-bold text-gray-700">Comentários Recentes</h3>
                         <span className="text-sm text-gray-500">{ratings.length} avaliações</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {ratings.length === 0 ? (
                            <p className="p-8 text-center text-gray-500">Nenhuma avaliação encontrada.</p>
                        ) : (
                            <div className="divide-y">
                                {ratings.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).map((r, i) => (
                                    <div key={i} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800">{r.rating}.0 ★</span>
                                                <span className="text-sm text-gray-500">
                                                    {courses.find(c => c.id === r.courseId)?.title || 'Curso Removido'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm italic">"{r.comment || 'Sem comentário por escrito'}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              </div>
            );
          case 'courses': return (
               <div>
                  <div className="flex justify-between mb-4">
                      <h2 className="text-2xl font-bold">Gerir Cursos</h2>
                      <button onClick={() => setEditingCourse({})} className="btn-primary">Novo Curso</button>
                  </div>
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b">
                              <tr><th className="p-4">Título</th><th className="p-4">Status</th><th className="p-4">Check-in</th><th className="p-4">Ações</th></tr>
                          </thead>
                          <tbody>{courses.map(c => (
                              <tr key={c.id} className="border-b hover:bg-gray-50">
                                  <td className="p-4 font-medium">{c.title}</td>
                                  <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${c.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{c.status}</span></td>
                                  <td className="p-4">{c.isCheckinEnabled ? '✅' : '❌'}</td>
                                  <td className="p-4"><button onClick={() => setEditingCourse(c)} className="text-blue-600 mr-3"><i className="fas fa-edit"></i></button><button onClick={() => onDeleteCourse(c.id)} className="text-red-600"><i className="fas fa-trash"></i></button></td>
                              </tr>
                          ))}</tbody>
                      </table>
                  </div>
               </div>
            );
          case 'instructors': return (
              <div>
                  <div className="flex justify-between mb-4">
                      <h2 className="text-2xl font-bold">Gerir Instrutores</h2>
                      <button onClick={() => setEditingInstructor({})} className="btn-primary">Novo Instrutor</button>
                  </div>
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b">
                              <tr><th className="p-4">Avatar</th><th className="p-4">Nome</th><th className="p-4">Título</th><th className="p-4">Ações</th></tr>
                          </thead>
                          <tbody>{instructors.map(inst => (
                              <tr key={inst.id} className="border-b hover:bg-gray-50">
                                  <td className="p-4"><img src={inst.image} className="w-10 h-10 rounded-full object-cover"/></td>
                                  <td className="p-4 font-medium">{inst.name}</td>
                                  <td className="p-4 text-sm text-gray-500">{inst.title}</td>
                                  <td className="p-4"><button onClick={() => setEditingInstructor(inst)} className="text-blue-600 mr-3"><i className="fas fa-edit"></i></button><button onClick={() => onDeleteInstructor(inst.id)} className="text-red-600"><i className="fas fa-trash"></i></button></td>
                              </tr>
                          ))}</tbody>
                      </table>
                  </div>
              </div>
            );
          case 'enrollments': return (
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Matrículas</h2>
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr><th className="p-4">Protocolo</th><th className="p-4">Aluno</th><th className="p-4">Curso</th><th className="p-4">Setor</th><th className="p-4">Ações</th></tr>
                            </thead>
                            <tbody>{enrollments.map(e => (
                                <tr key={e.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-xs">{e.protocol}</td><td className="p-4">{e.name}</td><td className="p-4">{e.courseName}</td><td className="p-4 text-sm">{e.sector}</td>
                                    <td className="p-4"><button onClick={() => onDeleteEnrollment(e.id)} className="text-red-600"><i className="fas fa-trash"></i></button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                 </div>
             );
          case 'about_images': return (
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Galeria "Sobre"</h2>
                    <p className="mb-4 text-sm text-gray-600 bg-blue-50 p-2 rounded">Nota: Uma imagem fixa do workshop já está sendo exibida automaticamente na página inicial.</p>
                    <form onSubmit={(e) => { e.preventDefault(); onAddImage(e.target.url.value); e.target.reset(); }} className="flex gap-4 mb-6"><input name="url" placeholder="Cole a URL da imagem aqui..." className="flex-1 border p-3 rounded-lg" required /><button className="btn-primary">Adicionar</button></form>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{aboutImages.map(img => (<div key={img.id} className="relative group"><img src={img.url} className="w-full h-32 object-cover rounded-lg" /><button onClick={() => onDeleteImage(img.id)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100"><i className="fas fa-trash"></i></button></div>))}</div>
                 </div>
             )
          default: return null;
        }
      };

      return (
        <div className="flex min-h-screen bg-gray-100">
           <nav className="w-64 bg-white border-r p-6 flex-shrink-0 flex flex-col">
              <h2 className="font-bold text-xl mb-8 text-slate-800">Admin Panel</h2>
              <ul className="space-y-2 flex-1">
                 {[{id: 'dashboard', label: 'Dashboard', icon: 'chart-line'},{id: 'courses', label: 'Cursos', icon: 'graduation-cap'},{id: 'instructors', label: 'Instrutores', icon: 'chalkboard-teacher'},{id: 'enrollments', label: 'Matrículas', icon: 'users'},{id: 'about_images', label: 'Imagens Sobre', icon: 'images'}].map(item => (
                     <li key={item.id}><button onClick={() => setActiveTab(item.id)} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}><i className={`fas fa-${item.icon} w-6`}></i> {item.label}</button></li>
                 ))}
              </ul>
              {/* === BOTÃO DE SAIR DO ADMIN (NOVO) === */}
              <div className="pt-6 border-t mt-4">
                  <button onClick={onExit} className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 font-medium">
                      <i className="fas fa-sign-out-alt w-6"></i> Voltar ao Site
                  </button>
              </div>
           </nav>
           <main className="flex-1 p-8 overflow-y-auto">{renderTabContent()}</main>
           {editingCourse && <CourseEditorModal course={editingCourse} instructors={instructors} onClose={() => setEditingCourse(null)} onSave={onUpdateCourse} />}
           {editingInstructor && <InstructorEditorModal instructor={editingInstructor} onClose={() => setEditingInstructor(null)} onSave={info => { if (editingInstructor.id) onUpdateInstructor({...info, id: editingInstructor.id}); else onAddInstructor(info); setEditingInstructor(null); }} />}
        </div>
      );
    };

    const InstructorEditorModal = ({ instructor, onClose, onSave }) => {
       const handleSubmit = (e) => { e.preventDefault(); onSave({name: e.target.name.value, title: e.target.title.value, image: e.target.image.value, bio: e.target.bio.value}); };
       return (
           <ModalWrapper title={instructor.id ? "Editar Instrutor" : "Novo Instrutor"} onClose={onClose}>
               <form onSubmit={handleSubmit} className="space-y-4">
                   <input name="name" defaultValue={instructor.name} placeholder="Nome" className="w-full border p-2 rounded" required />
                   <input name="title" defaultValue={instructor.title} placeholder="Título (Ex: Designer)" className="w-full border p-2 rounded" required />
                   <input name="image" defaultValue={instructor.image} placeholder="URL da Foto" className="w-full border p-2 rounded" required />
                   <textarea name="bio" defaultValue={instructor.bio} placeholder="Biografia Curta" className="w-full border p-2 rounded" />
                   <button className="w-full btn-primary">Salvar</button>
               </form>
           </ModalWrapper>
       );
    };

    const CourseEditorModal = ({ course, instructors, onClose, onSave }) => {
        const [formData, setFormData] = useState({ title: '', status: 'aberto', isCheckinEnabled: false, isRatingEnabled: false, flickrLink: '', details: {}, learningObjectives: [], modules: [], instructors: [], ...course });
        const handleChange = (e) => { const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setFormData({...formData, [e.target.name]: val}); };
        
        const addObj = () => setFormData({...formData, learningObjectives: [...(formData.learningObjectives||[]), ""]});
        const updateObj = (idx, val) => { const newArr = [...formData.learningObjectives]; newArr[idx] = val; setFormData({...formData, learningObjectives: newArr}); };
        const removeObj = (idx) => { const newArr = formData.learningObjectives.filter((_,i) => i !== idx); setFormData({...formData, learningObjectives: newArr}); };

        const addMod = () => setFormData({...formData, modules: [...(formData.modules||[]), {title: "", topics: []}]});
        const updateModTitle = (idx, val) => { const newArr = [...formData.modules]; newArr[idx].title = val; setFormData({...formData, modules: newArr}); };
        const addTopic = (modIdx) => { const newArr = [...formData.modules]; newArr[modIdx].topics = [...(newArr[modIdx].topics||[]), ""]; setFormData({...formData, modules: newArr}); };
        const updateTopic = (modIdx, topIdx, val) => { const newArr = [...formData.modules]; newArr[modIdx].topics[topIdx] = val; setFormData({...formData, modules: newArr}); };
        const removeMod = (idx) => { const newArr = formData.modules.filter((_, i) => i !== idx); setFormData({...formData, modules: newArr}); }

        const toggleInstructor = (instId, instData) => { const currentIds = (formData.instructors || []).map(i => i.id); if (currentIds.includes(instId)) { setFormData({...formData, instructors: formData.instructors.filter(i => i.id !== instId)}); } else { setFormData({...formData, instructors: [...(formData.instructors||[]), instData]}); } };

        return (
            <ModalWrapper title={course.id ? "Editar Curso" : "Novo Curso"} onClose={onClose}>
                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4"><input name="title" value={formData.title} onChange={handleChange} placeholder="Título" className="border p-2 rounded" required /><select name="status" value={formData.status} onChange={handleChange} className="border p-2 rounded"><option value="aberto">Aberto</option><option value="em_breve">Em Breve</option><option value="fechado">Fechado</option><option value="concluido">Concluído</option></select></div>
                    <textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="Resumo" className="w-full border p-2 rounded h-20"></textarea>
                    <input name="headerOverlayImage" value={formData.headerOverlayImage} onChange={handleChange} placeholder="URL Imagem Capa" className="w-full border p-2 rounded" />
                    <div className="bg-gray-50 p-3 rounded border"><h4 className="font-bold text-sm mb-2">Módulos</h4>{(formData.modules || []).map((mod, mIdx) => (<div key={mIdx} className="mb-3 pl-3 border-l-2 border-blue-400"><div className="flex gap-2 mb-2"><input value={mod.title} onChange={(e) => updateModTitle(mIdx, e.target.value)} placeholder="Título" className="flex-1 border p-1 text-sm rounded" /><button type="button" onClick={() => removeMod(mIdx)} className="text-red-500"><i className="fas fa-trash"></i></button></div>{(mod.topics || []).map((top, tIdx) => (<input key={tIdx} value={top} onChange={(e) => updateTopic(mIdx, tIdx, e.target.value)} placeholder="Tópico" className="w-full border p-1 text-xs rounded mb-1 bg-white" />))}<button type="button" onClick={() => addTopic(mIdx)} className="text-xs text-blue-600 underline">+ Tópico</button></div>))}<button type="button" onClick={addMod} className="text-sm btn-secondary py-1 px-3">+ Módulo</button></div>
                    <div className="bg-gray-50 p-3 rounded border"><h4 className="font-bold text-sm mb-2">Objetivos</h4>{(formData.learningObjectives || []).map((obj, i) => (<div key={i} className="flex gap-2 mb-1"><input value={obj} onChange={(e) => updateObj(i, e.target.value)} className="flex-1 border p-1 text-sm rounded" /><button type="button" onClick={() => removeObj(i)} className="text-red-500"><i className="fas fa-times"></i></button></div>))}<button type="button" onClick={addObj} className="text-xs text-blue-600 underline">+ Objetivo</button></div>
                    <div className="bg-gray-50 p-3 rounded border max-h-40 overflow-y-auto"><h4 className="font-bold text-sm mb-2">Instrutores</h4><div className="space-y-1">{instructors.map(inst => (<label key={inst.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={(formData.instructors || []).some(i => i.id === inst.id)} onChange={() => toggleInstructor(inst.id, inst)} />{inst.name}</label>))}</div></div>
                    {formData.status === 'concluido' && (<input name="flickrLink" value={formData.flickrLink || ''} onChange={handleChange} placeholder="Link Galeria Flickr" className="w-full border p-2 rounded bg-orange-50 border-orange-200" />)}
                    <div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="isCheckinEnabled" checked={formData.isCheckinEnabled} onChange={handleChange} /> Liberar Check-in</label><label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" name="isRatingEnabled" checked={formData.isRatingEnabled} onChange={handleChange} /> Liberar Avaliação</label></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
                </form>
            </ModalWrapper>
        )
    };

    // === APP MAIN COMPONENT ===
    const App = () => {
      const [user, setUser] = useState(null);
      const [isAdmin, setIsAdmin] = useState(false);
      const [view, setView] = useState('home'); 
      const [selectedCourse, setSelectedCourse] = useState(null);
      const [courses, setCourses] = useState([]);
      const [enrollments, setEnrollments] = useState([]);
      const [aboutImages, setAboutImages] = useState([]);
      const [instructors, setInstructors] = useState([]);
      const [ratings, setRatings] = useState([]);
      const [userCheckins, setUserCheckins] = useState({});
      // Novo estado para TODOS os checkins (para o admin)
      const [allCheckins, setAllCheckins] = useState([]);

      useEffect(() => {
        document.getElementById('app-loader').classList.add('opacity-0');
        setTimeout(() => document.getElementById('app-loader').classList.add('hidden'), 500);

        window.addEventListener('scroll', () => {
             const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
             const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
             const scrolled = (winScroll / height) * 100;
             document.getElementById('scroll-progress').style.width = scrolled + "%";
        });

        const unsubAuth = onAuthStateChanged(auth, async (u) => {
           setUser(u);
           if (u && !u.isAnonymous) {
               try {
                   const adminDoc = await getDoc(doc(db, 'admins', u.uid));
                   setIsAdmin(adminDoc.exists());
               } catch (e) { setIsAdmin(false); }
           } else {
               setIsAdmin(false);
               if (!u) signInAnonymously(auth).catch(console.error);
           }
        });

        // Listeners Globais
        const unsubCourses = onSnapshot(collection(db, `artifacts/${appId}/public/data/courses`), (snap) => setCourses(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubEnroll = onSnapshot(collection(db, `artifacts/${appId}/public/data/enrollments`), (snap) => setEnrollments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubAbout = onSnapshot(collection(db, `artifacts/${appId}/public/data/about_images`), (snap) => setAboutImages(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubInst = onSnapshot(collection(db, `artifacts/${appId}/public/data/instructors`), (snap) => setInstructors(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubRatings = onSnapshot(collection(db, `artifacts/${appId}/public/data/ratings`), (snap) => setRatings(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        // Novo listener para todos os checkins (usado pelo Admin)
        const unsubAllCheckins = onSnapshot(collection(db, `artifacts/${appId}/public/data/checkins`), (snap) => setAllCheckins(snap.docs.map(d => ({id: d.id, ...d.data()}))));

        return () => { unsubAuth(); unsubCourses(); unsubEnroll(); unsubAbout(); unsubInst(); unsubRatings(); unsubAllCheckins(); };
      }, []);

      useEffect(() => {
          if (!user) return;
          const q = query(collection(db, `artifacts/${appId}/public/data/checkins`), where("userId", "==", user.uid));
          const unsub = onSnapshot(q, (snap) => {
              const checks = {};
              snap.forEach(doc => checks[doc.data().courseId] = true);
              setUserCheckins(checks);
          });
          return () => unsub();
      }, [user]);

      // Actions
      const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { alert('Erro no login'); } };
      const handleUpdateCourse = async (courseData) => { const { id, ...data } = courseData; try { if (id) await updateDoc(doc(db, `artifacts/${appId}/public/data/courses`, id), data); else await addDoc(collection(db, `artifacts/${appId}/public/data/courses`), data); } catch(e) { console.error(e); alert('Erro ao salvar'); } };
      const handleDeleteCourse = async (id) => { if(confirm('Excluir curso?')) await deleteDoc(doc(db, `artifacts/${appId}/public/data/courses`, id)); };
      const handleAddImage = async (url) => { await addDoc(collection(db, `artifacts/${appId}/public/data/about_images`), { url, createdAt: serverTimestamp() }); };
      const handleDeleteImage = async (id) => await deleteDoc(doc(db, `artifacts/${appId}/public/data/about_images`, id));
      const handleAddInstructor = async (data) => await addDoc(collection(db, `artifacts/${appId}/public/data/instructors`), data);
      const handleUpdateInstructor = async (data) => { const { id, ...info } = data; await updateDoc(doc(db, `artifacts/${appId}/public/data/instructors`, id), info); }
      const handleDeleteInstructor = async (id) => { if(confirm('Excluir instrutor?')) await deleteDoc(doc(db, `artifacts/${appId}/public/data/instructors`, id)); };
      const handleDeleteEnrollment = async (id) => { if(confirm('Excluir matrícula?')) await deleteDoc(doc(db, `artifacts/${appId}/public/data/enrollments`, id)); };
      const handlePopulateDB = async () => { if(!confirm("Popular dados?")) return; try { const dummyCourse = { title: "Workshop Foto", status: "aberto", themeColor: "#FFC107", headerOverlayImage: "https://i.postimg.cc/3rLTy2xn/medium-shot-people-with-camera.jpg", summary: "Resumo teste", isCheckinEnabled: true }; await addDoc(collection(db, `artifacts/${appId}/public/data/courses`), dummyCourse); alert("Dados inseridos!"); } catch(e) { alert("Erro: " + e.message); } };

      if (view === 'admin' && isAdmin) {
         return <AdminPanel 
                    courses={courses} enrollments={enrollments} instructors={instructors}
                    aboutImages={aboutImages} ratings={ratings} allCheckins={allCheckins}
                    onUpdateCourse={handleUpdateCourse} onDeleteCourse={handleDeleteCourse}
                    onAddImage={handleAddImage} onDeleteImage={handleDeleteImage}
                    onAddInstructor={handleAddInstructor} onUpdateInstructor={handleUpdateInstructor} onDeleteInstructor={handleDeleteInstructor}
                    onDeleteEnrollment={handleDeleteEnrollment} onPopulateDB={handlePopulateDB}
                    onExit={() => setView('home')} // Passando a função de sair
                />;
      }

      const activeCourses = courses.filter(c => c.status === 'aberto');
      const soonCourses = courses.filter(c => c.status === 'em_breve');
      const completedCourses = courses.filter(c => c.status === 'concluido');

      return (
        <div className="bg-gray-50 min-h-screen font-inter">
          <Header user={user} isAdmin={isAdmin} onAdminClick={() => { if(isAdmin) setView('admin'); else { const email = prompt("Email Admin:"); const pwd = prompt("Senha:"); if(email && pwd) handleLogin(email, pwd); }}} onLogout={() => signOut(auth)} goHome={() => { setView('home'); setSelectedCourse(null); }} />
          {view === 'home' && (
            <>
              <Hero />
              <main className="container mx-auto px-6 py-16 space-y-20">
                <section id="cursos"><h2 className="text-3xl font-bold mb-8 border-l-4 border-blue-600 pl-4 text-slate-800">Cursos Disponíveis</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">{activeCourses.length > 0 ? activeCourses.map(c => (<CourseCard key={c.id} course={c} onClick={(c) => { setSelectedCourse(c); setView('detail'); }} />)) : <p className="text-gray-500">Nenhum curso aberto no momento.</p>}</div></section>
                {soonCourses.length > 0 && (<section><h2 className="text-3xl font-bold mb-8 border-l-4 border-yellow-400 pl-4 text-slate-800">Em Breve</h2><div className="grid md:grid-cols-3 gap-6 opacity-75">{soonCourses.map(c => (<div key={c.id} className="bg-white p-6 rounded-xl border border-dashed border-gray-300"><span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold uppercase mb-2 inline-block">Aguarde</span><h3 className="font-bold text-lg">{c.title}</h3></div>))}</div></section>)}
                {completedCourses.length > 0 && (<section><h2 className="text-3xl font-bold mb-8 border-l-4 border-green-500 pl-4 text-slate-800">Realizados</h2><div className="grid md:grid-cols-4 gap-6">{completedCourses.map(c => (<CourseCard key={c.id} course={c} onClick={() => {}} />))}</div></section>)}
              </main>
              <AboutSection images={aboutImages} />
            </>
          )}
          {view === 'detail' && selectedCourse && (<CourseDetail course={selectedCourse} onBack={() => setView('home')} user={user} onEnroll={() => { document.querySelector('#enroll-trigger')?.click() }} checkins={userCheckins} />)}
          <footer className="bg-slate-900 text-slate-400 py-12 text-center mt-auto"><div className="container mx-auto"><p>&copy; 2025 Evereste Academy. Tecnologia LIDS.</p></div></footer>
        </div>
      );
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  }
})();
