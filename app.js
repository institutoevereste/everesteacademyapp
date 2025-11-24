(function() {
  // === 1. Espera Ativa pelo Firebase ===
  const waitForFirebase = setInterval(() => {
    if (window.FirebaseSDK) {
      clearInterval(waitForFirebase);
      initApp();
    }
  }, 100);

  function initApp() {
    // Destructuring de dependências globais
    const { useState, useEffect, useMemo, useRef } = React;
    const { 
      auth, db, appId, 
      signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously,
      doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp 
    } = window.FirebaseSDK;
    const { jsPDF } = window.jspdf;

    // === UTILS ===
    const formatCurrency = (val) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleDateString('pt-PT') : 'N/A';

    // === COMPONENTES UI ===
    
    // Header
    const Header = ({ user, isAdmin, onAdminClick, onLogout, goHome }) => (
      <header className="header-glass py-4 px-6 flex justify-between items-center">
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

    // Hero Section
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

    // About Section (Com Nova Galeria)
    const AboutSection = ({ images }) => (
      <section className="py-20 px-6 bg-slate-50">
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-slate-800">Sobre o Projeto</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              O Programa Evereste Academy é uma iniciativa do Instituto Evereste que oferece experiências imersivas.
              Unimos design moderno, tecnologia e didática para acelerar o desenvolvimento.
            </p>
            <ul className="space-y-3 mb-8">
               <li className="flex items-center gap-3"><i className="fas fa-check-circle text-teal-500"></i> Foco em resultados</li>
               <li className="flex items-center gap-3"><i className="fas fa-check-circle text-teal-500"></i> Instrutores experientes</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {images && images.length > 0 ? images.slice(0, 4).map((img, idx) => (
               <div key={img.id} className="rounded-xl overflow-hidden shadow-lg h-40">
                 <img src={img.url} alt="Sobre" className="w-full h-full object-cover" />
               </div>
            )) : (
              <div className="col-span-2 bg-gray-200 h-64 rounded-xl flex items-center justify-center text-gray-400">Sem imagens na galeria</div>
            )}
          </div>
        </div>
      </section>
    );

    // Course Card
    const CourseCard = ({ course, onClick }) => {
      const isCompleted = course.status === 'concluido';
      
      return (
        <div 
          onClick={() => onClick(course)}
          className={`card-3d overflow-hidden cursor-pointer flex flex-col h-full ${isCompleted ? 'border-l-8 border-green-500' : ''}`}
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

    // Course Detail View
    const CourseDetail = ({ course, onBack, user, onEnroll, checkins }) => {
      const hasCheckedIn = checkins[course.id];
      // Regras de bloqueio
      const canCheckin = course.isCheckinEnabled === true;
      const canRate = course.isRatingEnabled === true && hasCheckedIn;

      const [showCheckinModal, setShowCheckinModal] = useState(false);
      const [showRatingModal, setShowRatingModal] = useState(false);

      return (
        <div className="animate-fade-in pb-20">
          {/* Hero do Curso */}
          <div className="relative py-20 bg-slate-900 text-white">
            <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${course.headerOverlayImage})` }}></div>
            <div className="container mx-auto px-6 relative z-10">
              <button onClick={onBack} className="mb-6 hover:underline opacity-80"><i className="fas fa-arrow-left mr-2"></i>Voltar</button>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl opacity-90 max-w-2xl">{course.subtitle}</p>
            </div>
          </div>

          <div className="container mx-auto px-6 -mt-10 relative z-20 grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Sobre o Curso</h3>
              <p className="text-slate-600 mb-8 whitespace-pre-line">{course.fullDescription}</p>

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

            {/* Sidebar Actions */}
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

                <button 
                  onClick={() => setShowCheckinModal(true)} 
                  disabled={!canCheckin || hasCheckedIn}
                  className={`w-full py-3 rounded-lg font-bold mb-3 border ${hasCheckedIn ? 'bg-green-100 text-green-700 border-green-200' : (!canCheckin ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50')}`}
                >
                  {hasCheckedIn ? <><i className="fas fa-check mr-2"></i>Check-in Feito</> : <><i className="fas fa-qrcode mr-2"></i>Fazer Check-in</>}
                </button>

                <button 
                  onClick={() => setShowRatingModal(true)}
                  disabled={!canRate}
                  className={`w-full py-3 rounded-lg font-bold border ${!canRate ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50'}`}
                >
                  <i className="fas fa-star mr-2"></i>Avaliar
                </button>

                {!canCheckin && !hasCheckedIn && <p className="text-xs text-center text-red-400 mt-2">Check-in bloqueado pelo instrutor.</p>}
                {!canRate && hasCheckedIn && <p className="text-xs text-center text-orange-400 mt-2">Avaliação disponível após liberação.</p>}
              </div>
            </div>
          </div>

          {/* Modais Internos */}
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
        } catch (error) {
          alert('Erro ao inscrever: ' + error.message);
        } finally {
          setLoading(false);
        }
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
            <button disabled={loading} className="w-full btn-primary mt-4">
              {loading ? 'Processando...' : 'Confirmar Inscrição'}
            </button>
          </form>
        </ModalWrapper>
      );
    };

    const CheckinModal = ({ course, user, onClose }) => {
      const handleCheckin = async (e) => {
        e.preventDefault();
        const pwd = e.target.password.value;
        try {
            // A validação de senha real deve ser feita nas Security Rules, mas simulamos aqui o envio
            await addDoc(collection(db, `artifacts/${appId}/public/data/checkins`), {
                userId: user.uid,
                courseId: course.id,
                password: pwd,
                createdAt: serverTimestamp()
            });
            alert('Check-in realizado com sucesso!');
            window.location.reload(); // Recarrega para atualizar estado
        } catch (err) {
            alert('Erro ou Senha incorreta.');
        }
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
    const AdminPanel = ({ courses, enrollments, instructors, aboutImages, onUpdateCourse, onDeleteCourse, onAddImage, onDeleteImage }) => {
      const [activeTab, setActiveTab] = useState('dashboard');
      const [editingCourse, setEditingCourse] = useState(null);

      // PDF Export
      const exportPDF = () => {
        const doc = new jsPDF();
        doc.text("Relatório Geral - Evereste Academy", 14, 20);
        
        // KPIs
        doc.setFontSize(10);
        doc.text(`Total Matrículas: ${enrollments.length}`, 14, 30);
        doc.text(`Total Cursos: ${courses.length}`, 14, 35);
        
        // Tabela Alunos
        const tableData = enrollments.map(e => [
             e.protocol || '-', e.name, e.courseName, e.sector
        ]);
        
        doc.autoTable({
            startY: 45,
            head: [['Protocolo', 'Nome', 'Curso', 'Setor']],
            body: tableData,
        });
        doc.save('relatorio-evereste.pdf');
      };

      const renderTabContent = () => {
        switch(activeTab) {
          case 'dashboard':
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-xl shadow border border-blue-100">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">Matrículas Totais</h3>
                      <p className="text-3xl font-bold text-blue-600">{enrollments.length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow border border-green-100">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">Cursos Ativos</h3>
                      <p className="text-3xl font-bold text-green-600">{courses.filter(c => c.status === 'aberto').length}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow border border-purple-100">
                      <h3 className="text-gray-500 uppercase text-xs font-bold">NPS Estimado</h3>
                      <p className="text-3xl font-bold text-purple-600">92</p>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">Ações Rápidas</h3>
                        <button onClick={exportPDF} className="btn-primary text-sm"><i className="fas fa-file-pdf mr-2"></i>Exportar Relatório PDF</button>
                    </div>
                </div>
              </div>
            );
          case 'courses':
            return (
               <div>
                  <div className="flex justify-between mb-4">
                      <h2 className="text-2xl font-bold">Gerir Cursos</h2>
                      <button onClick={() => setEditingCourse({})} className="btn-primary">Novo Curso</button>
                  </div>
                  <div className="bg-white rounded-xl shadow overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b">
                              <tr>
                                  <th className="p-4">Título</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Check-in Lib.</th>
                                  <th className="p-4">Ações</th>
                              </tr>
                          </thead>
                          <tbody>
                              {courses.map(c => (
                                  <tr key={c.id} className="border-b hover:bg-gray-50">
                                      <td className="p-4 font-medium">{c.title}</td>
                                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${c.status === 'aberto' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{c.status}</span></td>
                                      <td className="p-4 text-center">{c.isCheckinEnabled ? '✅' : '❌'}</td>
                                      <td className="p-4">
                                          <button onClick={() => setEditingCourse(c)} className="text-blue-600 hover:underline mr-3">Editar</button>
                                          <button onClick={() => onDeleteCourse(c.id)} className="text-red-600 hover:underline">Excluir</button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
               </div>
            );
          case 'about_images':
             return (
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Galeria "Sobre"</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        onAddImage(e.target.url.value);
                        e.target.reset();
                    }} className="flex gap-4 mb-6">
                        <input name="url" placeholder="Cole a URL da imagem aqui..." className="flex-1 border p-3 rounded-lg" required />
                        <button className="btn-primary">Adicionar</button>
                    </form>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {aboutImages.map(img => (
                            <div key={img.id} className="relative group">
                                <img src={img.url} className="w-full h-32 object-cover rounded-lg" />
                                <button onClick={() => onDeleteImage(img.id)} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
             )
          default: return null;
        }
      };

      return (
        <div className="flex min-h-screen bg-gray-100">
           <nav className="w-64 bg-white border-r p-6 flex-shrink-0">
              <h2 className="font-bold text-xl mb-8">Admin Panel</h2>
              <ul className="space-y-2">
                 {[
                     {id: 'dashboard', label: 'Dashboard', icon: 'chart-line'},
                     {id: 'courses', label: 'Cursos', icon: 'graduation-cap'},
                     {id: 'about_images', label: 'Imagens Sobre', icon: 'images'},
                 ].map(item => (
                     <li key={item.id}>
                         <button 
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                         >
                            <i className={`fas fa-${item.icon} w-6`}></i> {item.label}
                         </button>
                     </li>
                 ))}
              </ul>
           </nav>
           <main className="flex-1 p-8 overflow-y-auto">
              {renderTabContent()}
           </main>

           {editingCourse && (
             <CourseEditorModal 
                course={editingCourse} 
                onClose={() => setEditingCourse(null)} 
                onSave={onUpdateCourse} 
             />
           )}
        </div>
      );
    };

    // Modal Editor de Curso (Complexo)
    const CourseEditorModal = ({ course, onClose, onSave }) => {
        const [formData, setFormData] = useState({
            title: '', status: 'aberto', isCheckinEnabled: false, isRatingEnabled: false,
            flickrLink: '', ...course
        });

        const handleChange = (e) => {
            const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            setFormData({...formData, [e.target.name]: val});
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            onSave(formData);
            onClose();
        };

        return (
            <ModalWrapper title={course.id ? "Editar Curso" : "Novo Curso"} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input name="title" value={formData.title} onChange={handleChange} placeholder="Título" className="border p-2 rounded" required />
                        <select name="status" value={formData.status} onChange={handleChange} className="border p-2 rounded">
                            <option value="aberto">Aberto</option>
                            <option value="em_breve">Em Breve</option>
                            <option value="fechado">Fechado</option>
                            <option value="concluido">Concluído</option>
                        </select>
                    </div>
                    
                    <textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="Resumo" className="w-full border p-2 rounded h-20"></textarea>
                    <input name="headerOverlayImage" value={formData.headerOverlayImage} onChange={handleChange} placeholder="URL Imagem Capa" className="w-full border p-2 rounded" />

                    {/* Campos Condicionais para CONCLUÍDO */}
                    {formData.status === 'concluido' && (
                        <div className="bg-orange-50 p-4 rounded border border-orange-200">
                            <h4 className="font-bold text-orange-800 mb-2">Configurações de Conclusão</h4>
                            <input name="flickrLink" value={formData.flickrLink || ''} onChange={handleChange} placeholder="Link Galeria Flickr" className="w-full border p-2 rounded" />
                        </div>
                    )}

                    {/* Checkboxes de Controle */}
                    <div className="flex gap-4 p-4 bg-gray-50 rounded border">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isCheckinEnabled" checked={formData.isCheckinEnabled} onChange={handleChange} />
                            Liberar Check-in
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="isRatingEnabled" checked={formData.isRatingEnabled} onChange={handleChange} />
                            Liberar Avaliação
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar</button>
                    </div>
                </form>
            </ModalWrapper>
        )
    };

    // === APP MAIN COMPONENT ===
    const App = () => {
      const [user, setUser] = useState(null);
      const [isAdmin, setIsAdmin] = useState(false);
      const [view, setView] = useState('home'); // home, detail, admin
      const [selectedCourse, setSelectedCourse] = useState(null);
      const [courses, setCourses] = useState([]);
      const [enrollments, setEnrollments] = useState([]);
      const [aboutImages, setAboutImages] = useState([]);
      const [userCheckins, setUserCheckins] = useState({});

      // Initial Data Load
      useEffect(() => {
        // Remove Loader
        document.getElementById('app-loader').classList.add('opacity-0');
        setTimeout(() => document.getElementById('app-loader').classList.add('hidden'), 500);

        // Scroll Handler
        window.addEventListener('scroll', () => {
             const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
             const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
             const scrolled = (winScroll / height) * 100;
             document.getElementById('scroll-progress').style.width = scrolled + "%";
        });

        // Auth Listener
        const unsubAuth = onAuthStateChanged(auth, async (u) => {
           setUser(u);
           if (u && !u.isAnonymous) {
               // Check Admin
               try {
                   const adminDoc = await getDoc(doc(db, 'admins', u.uid));
                   setIsAdmin(adminDoc.exists());
               } catch (e) { setIsAdmin(false); }
           } else {
               setIsAdmin(false);
               if (!u) signInAnonymously(auth).catch(console.error);
           }
        });

        // Data Listeners
        const unsubCourses = onSnapshot(collection(db, `artifacts/${appId}/public/data/courses`), 
          (snap) => setCourses(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        
        const unsubEnroll = onSnapshot(collection(db, `artifacts/${appId}/public/data/enrollments`), 
          (snap) => setEnrollments(snap.docs.map(d => ({id: d.id, ...d.data()}))));
          
        const unsubAbout = onSnapshot(collection(db, `artifacts/${appId}/public/data/about_images`), 
          (snap) => setAboutImages(snap.docs.map(d => ({id: d.id, ...d.data()}))));

        return () => { unsubAuth(); unsubCourses(); unsubEnroll(); unsubAbout(); };
      }, []);

      // User Checkins Listener
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
      const handleLogin = async (email, password) => {
         try { await signInWithEmailAndPassword(auth, email, password); } 
         catch (e) { alert('Erro no login'); }
      };

      const handleUpdateCourse = async (courseData) => {
          const { id, ...data } = courseData;
          try {
              if (id) await updateDoc(doc(db, `artifacts/${appId}/public/data/courses`, id), data);
              else await addDoc(collection(db, `artifacts/${appId}/public/data/courses`), data);
          } catch(e) { console.error(e); alert('Erro ao salvar'); }
      };

      const handleDeleteCourse = async (id) => {
          if(confirm('Excluir curso?')) await deleteDoc(doc(db, `artifacts/${appId}/public/data/courses`, id));
      };
      
      const handleAddAboutImage = async (url) => {
          await addDoc(collection(db, `artifacts/${appId}/public/data/about_images`), { url, createdAt: serverTimestamp() });
      };

      const handleDeleteAboutImage = async (id) => {
          await deleteDoc(doc(db, `artifacts/${appId}/public/data/about_images`, id));
      };

      // Navigation Logic
      if (view === 'admin' && isAdmin) {
         return <AdminPanel 
                    courses={courses} 
                    enrollments={enrollments} 
                    aboutImages={aboutImages}
                    onUpdateCourse={handleUpdateCourse}
                    onDeleteCourse={handleDeleteCourse}
                    onAddImage={handleAddAboutImage}
                    onDeleteImage={handleDeleteAboutImage}
                />;
      }

      const activeCourses = courses.filter(c => c.status === 'aberto');
      const soonCourses = courses.filter(c => c.status === 'em_breve');
      const completedCourses = courses.filter(c => c.status === 'concluido');

      return (
        <div className="bg-gray-50 min-h-screen font-inter">
          <Header 
            user={user} 
            isAdmin={isAdmin} 
            onAdminClick={() => {
                if(isAdmin) setView('admin');
                else {
                    const email = prompt("Email Admin:");
                    const pwd = prompt("Senha:");
                    if(email && pwd) handleLogin(email, pwd);
                }
            }}
            onLogout={() => signOut(auth)}
            goHome={() => { setView('home'); setSelectedCourse(null); }}
          />

          {view === 'home' && (
            <>
              <Hero />
              
              <main className="container mx-auto px-6 py-16 space-y-20">
                {/* ABERTOS */}
                <section id="cursos">
                  <h2 className="text-3xl font-bold mb-8 border-l-4 border-blue-600 pl-4 text-slate-800">Cursos Disponíveis</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeCourses.length > 0 ? activeCourses.map(c => (
                        <CourseCard key={c.id} course={c} onClick={(c) => { setSelectedCourse(c); setView('detail'); }} />
                    )) : <p className="text-gray-500">Nenhum curso aberto no momento.</p>}
                  </div>
                </section>

                {/* EM BREVE */}
                {soonCourses.length > 0 && (
                  <section>
                    <h2 className="text-3xl font-bold mb-8 border-l-4 border-yellow-400 pl-4 text-slate-800">Em Breve</h2>
                    <div className="grid md:grid-cols-3 gap-6 opacity-75">
                       {soonCourses.map(c => (
                           <div key={c.id} className="bg-white p-6 rounded-xl border border-dashed border-gray-300">
                               <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded font-bold uppercase mb-2 inline-block">Aguarde</span>
                               <h3 className="font-bold text-lg">{c.title}</h3>
                           </div>
                       ))}
                    </div>
                  </section>
                )}

                {/* CONCLUÍDOS */}
                {completedCourses.length > 0 && (
                   <section>
                      <h2 className="text-3xl font-bold mb-8 border-l-4 border-green-500 pl-4 text-slate-800">Realizados</h2>
                      <div className="grid md:grid-cols-4 gap-6">
                         {completedCourses.map(c => (
                             <CourseCard key={c.id} course={c} onClick={() => {}} /> 
                             // onClick vazio pois o card trata o clique no botão
                         ))}
                      </div>
                   </section>
                )}
              </main>

              <AboutSection images={aboutImages} />
            </>
          )}

          {view === 'detail' && selectedCourse && (
            <CourseDetail 
                course={selectedCourse} 
                onBack={() => setView('home')} 
                user={user}
                onEnroll={() => { document.querySelector('#enroll-trigger')?.click() }} // Lógica simplificada
                checkins={userCheckins}
            />
          )}

          <footer className="bg-slate-900 text-slate-400 py-12 text-center mt-auto">
             <div className="container mx-auto">
                <p>&copy; 2025 Evereste Academy. Tecnologia LIDS.</p>
             </div>
          </footer>
        </div>
      );
    };

    // Renderização
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  }
})();
