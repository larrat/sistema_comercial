import { useEffect, useState, useRef, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FormField,
  StatusBadge,
  Modal,
  Button,
  Input,
  Select
} from '../../../shared/ui';
import { useClienteMutations } from '../hooks/useClienteMutations';
import { useRcas } from '../hooks/useRcas';
import { useClienteStore, selectSegmentos } from '../store/useClienteStore';
import { useShallow } from 'zustand/shallow';

type ClienteFormValues = {
  nome: string;
  apelido: string;
  doc: string;
  tipo: string;
  status: string;
  tel: string;
  whatsapp: string;
  email: string;
  resp: string;
  rca_id: string;
  rca_nome: string;
  seg: string[];
  tab: string;
  prazo: string;
  cidade: string;
  estado: string;
  data_aniversario: string;
  optin_marketing: boolean;
  optin_email: boolean;
  optin_sms: boolean;
  obs: string;
};

const INITIAL_VALUES: ClienteFormValues = {
  nome: '',
  apelido: '',
  doc: '',
  tipo: 'PJ',
  status: 'ativo',
  tel: '',
  whatsapp: '',
  email: '',
  resp: '',
  rca_id: '',
  rca_nome: '',
  seg: [],
  tab: 'varejo',
  prazo: 'a_vista',
  cidade: '',
  estado: '',
  data_aniversario: '',
  optin_marketing: true,
  optin_email: false,
  optin_sms: true,
  obs: ''
};

type SectionId = 'essencial' | 'comercial' | 'endereco' | 'preferencias';

const SECTIONS: { id: SectionId; label: string; number: number }[] = [
  { id: 'essencial', label: 'Essencial', number: 1 },
  { id: 'comercial', label: 'Comercial', number: 2 },
  { id: 'endereco', label: 'Endereço', number: 3 },
  { id: 'preferencias', label: 'Preferências', number: 4 }
];

export function ClienteCreateForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<ClienteFormValues>(INITIAL_VALUES);
  const [activeSection, setActiveSection] = useState<SectionId>('essencial');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const { submitCliente, saving, error } = useClienteMutations();
  const rcas = useRcas();
  const segmentosStore = useClienteStore(useShallow(selectSegmentos));
  
  const sectionRefs = {
    essencial: useRef<HTMLElement>(null),
    comercial: useRef<HTMLElement>(null),
    endereco: useRef<HTMLElement>(null),
    preferencias: useRef<HTMLElement>(null)
  };

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => {
      const val = values[key as keyof ClienteFormValues];
      const initial = INITIAL_VALUES[key as keyof ClienteFormValues];
      if (Array.isArray(val)) return val.length > 0;
      return val !== initial;
    });
  }, [values]);

  const progress = useMemo(() => {
    const sectionsFilled = [
      values.nome.trim() !== '', // Essencial
      values.resp !== '' || values.rca_id !== '' || values.seg.length > 0, // Comercial
      values.cidade !== '' || values.estado !== '', // Endereco
      values.obs !== '' // Preferencias (simplificado)
    ].filter(Boolean).length;
    return (sectionsFilled / 4) * 100;
  }, [values]);

  const initials = useMemo(() => {
    if (!values.nome.trim()) return '?';
    const parts = values.nome.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }, [values.nome]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { threshold: [0.5], rootMargin: '-80px 0px -50% 0px' }
    );

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  function update<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleCepBlur(cep: string) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      .then(res => res.json())
      .then(data => {
        if (!data.erro) {
          setValues(prev => ({
            ...prev,
            cidade: data.localidade,
            estado: data.uf
          }));
        }
      })
      .catch(() => {});
  }

  function formatCpfCnpj(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  function handleDocChange(v: string) {
    const doc = formatCpfCnpj(v);
    const digits = v.replace(/\D/g, '');
    let tipo = values.tipo;
    if (digits.length > 11) tipo = 'PJ';
    else if (digits.length > 0) tipo = 'PF';
    
    setValues(prev => ({ ...prev, doc, tipo }));
  }

  function toggleTag(tag: string) {
    setValues(prev => {
      const next = prev.seg.includes(tag) 
        ? prev.seg.filter(t => t !== tag)
        : [...prev.seg, tag];
      return { ...prev, seg: next };
    });
  }

  function handleAddTag() {
    if (!newTag.trim()) return;
    toggleTag(newTag.trim());
    setNewTag('');
    setIsAddingTag(false);
  }

  async function handleSave() {
    if (!values.nome.trim()) {
      sectionRefs.essencial.current?.scrollIntoView({ behavior: 'smooth' });
      // Adicionar destaque visual temporário ao campo seria bom aqui
      return;
    }

    try {
      const saved = await submitCliente({
        ...values,
        seg: values.seg.join(', ')
      }, {
        eventName: 'cliente_criado',
        metadata: { origin: 'cliente_create_page', mode: 'create' }
      });
      navigate(`/app/clientes/${saved.id}`);
    } catch (e) {
      // Erro já é tratado pelo hook com toast
    }
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      navigate('/app/clientes');
    }
  }

  function scrollToSection(id: SectionId) {
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="rf-cliente-novo-page">
      {/* TOPBAR */}
      <header className="rf-cliente-novo-topbar">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel}>← Clientes</Button>
          <h1 className="text-xl font-bold">Novo cliente</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            loading={saving}
          >
            Salvar cliente
          </Button>
        </div>
      </header>

      <div className="rf-cliente-novo-layout">
        {/* SIDEBAR */}
        <aside className="rf-cliente-novo-sidebar bg-slate-900/50 border-r border-white/5">
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((section) => {
              const isFilled = (section.id === 'essencial' && values.nome.trim() !== '') ||
                               (section.id === 'comercial' && (values.resp || values.rca_id || values.seg.length > 0)) ||
                               (section.id === 'endereco' && (values.cidade || values.estado)) ||
                               (section.id === 'preferencias' && values.obs);
              
              return (
                <button
                  key={section.id}
                  className={`rf-nav-item ${activeSection === section.id ? 'is-active' : ''}`}
                  onClick={() => scrollToSection(section.id)}
                >
                  <span className={`rf-nav-icon ${isFilled ? 'is-done' : ''}`}>
                    {isFilled ? '✓' : section.number}
                  </span>
                  <span className="rf-nav-label">{section.label}</span>
                  {isFilled && <span className="ml-auto text-emerald-400">✓</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-8 border-t border-white/5">
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress / 25)} de 4</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <main className="rf-cliente-novo-main">
          {/* ESSENCIAL */}
          <section 
            id="essencial" 
            ref={sectionRefs.essencial}
            className={`rf-section-card ${activeSection === 'essencial' ? 'is-focused' : ''}`}
          >
            <div className="rf-section-header">
              <div>
                <h2 className="text-lg font-bold text-white">Essencial</h2>
                <p className="text-sm text-slate-400">Identificação básica e contatos principais.</p>
              </div>
              <StatusBadge tone={values.nome.trim() ? 'success' : 'warning'}>
                {values.nome.trim() ? 'Preenchido' : 'Obrigatório'}
              </StatusBadge>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Identificação do avatar</p>
                <p className="text-xs text-slate-500">Gerado automaticamente pelo nome</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Nome / Razão social *"
                required
                value={values.nome}
                onChange={e => update('nome', e.target.value)}
                placeholder="Nome completo ou Razão Social"
                error={!values.nome && activeSection === 'essencial' ? 'Obrigatório' : undefined}
              />
              <Input
                label="Apelido / Fantasia"
                value={values.apelido}
                onChange={e => update('apelido', e.target.value)}
                placeholder="Como é conhecido"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <Input
                label="CPF / CNPJ"
                value={values.doc}
                onChange={e => handleDocChange(e.target.value)}
                placeholder="000.000.000-00"
              />
              <Select
                label="Tipo"
                value={values.tipo}
                onChange={e => update('tipo', e.target.value)}
                options={[
                  { value: 'PF', label: 'PF' },
                  { value: 'PJ', label: 'PJ' }
                ]}
              />
              <Select
                label="Status"
                value={values.status}
                onChange={e => update('status', e.target.value)}
                options={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
                  { value: 'prospecto', label: 'Prospecto' }
                ]}
              />
            </div>

            <div className="border-t border-white/5 pt-6 grid grid-cols-3 gap-4">
              <Input
                label="Telefone"
                value={values.tel}
                onChange={e => update('tel', e.target.value)}
                placeholder="(00) 0000-0000"
              />
              <Input
                label="WhatsApp"
                value={values.whatsapp}
                onChange={e => update('whatsapp', e.target.value)}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="E-mail"
                type="email"
                value={values.email}
                onChange={e => update('email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
          </section>

          {/* COMERCIAL */}
          <section 
            id="comercial" 
            ref={sectionRefs.comercial}
            className={`rf-section-card ${activeSection === 'comercial' ? 'is-focused' : ''}`}
          >
            <div className="rf-section-header">
              <div>
                <h2 className="text-lg font-bold text-white">Comercial</h2>
                <p className="text-sm text-slate-400">Definições de venda e atendimento.</p>
              </div>
              <StatusBadge tone="info">Opcional</StatusBadge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Responsável / Comprador"
                value={values.resp}
                onChange={e => update('resp', e.target.value)}
                placeholder="Nome do contato principal"
              />
              <Select
                label="Vendedor / RCA"
                value={values.rca_id}
                onChange={e => {
                  const rca = rcas.find(r => r.id === e.target.value);
                  setValues(prev => ({ ...prev, rca_id: e.target.value, rca_nome: rca?.nome || '' }));
                }}
                options={[
                  { value: '', label: 'Selecione um vendedor' },
                  ...rcas.map(r => ({ value: r.id, label: r.nome }))
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <Select
                label="Tabela de preço"
                value={values.tab}
                onChange={e => update('tab', e.target.value)}
                options={[
                  { value: 'varejo', label: 'Varejo' },
                  { value: 'atacado', label: 'Atacado' }
                ]}
              />
              <Input
                label="Limite de crédito"
                disabled
                value="R$ 0,00"
                placeholder="R$ 0,00"
                helperText="* Campo em implantação"
              />
            </div>

            <div className="border-t border-white/5 pt-6">
              <label className="text-sm font-medium text-slate-300 mb-3 block">Segmento</label>
              <div className="flex flex-wrap gap-2">
                {['Varejo', 'Atacado', 'Salão', 'Academia', 'Revendedor'].map(tag => (
                  <Button
                    key={tag}
                    variant={values.seg.includes(tag) ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <Input 
                      autoFocus
                      className="w-32"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                      onBlur={handleAddTag}
                    />
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" className="rounded-full border-dashed" onClick={() => setIsAddingTag(true)}>+ Novo</Button>
                )}
              </div>
            </div>
          </section>

          {/* ENDERECO */}
          <section 
            id="endereco" 
            ref={sectionRefs.endereco}
            className={`rf-section-card ${activeSection === 'endereco' ? 'is-focused' : ''}`}
          >
            <div className="rf-section-header">
              <div>
                <h2 className="text-lg font-bold text-white">Endereço</h2>
                <p className="text-sm text-slate-400">Localização física do cliente.</p>
              </div>
              <StatusBadge tone="info">Opcional</StatusBadge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <Input
                label="CEP"
                onBlur={e => handleCepBlur(e.target.value)}
                placeholder="00000-000"
              />
              <Input
                label="Estado"
                value={values.estado}
                onChange={e => update('estado', e.target.value.toUpperCase().slice(0, 2))}
                placeholder="UF"
              />
              <Input
                label="Cidade"
                value={values.cidade}
                onChange={e => update('cidade', e.target.value)}
                placeholder="Cidade"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 opacity-60">
              <Input label="Logradouro" disabled placeholder="Rua, Av..." />
              <Input label="Número / Complemento" disabled placeholder="123, Bloco A" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">* Endereço detalhado em implantação</p>
          </section>

          {/* PREFERENCIAS */}
          <section 
            id="preferencias" 
            ref={sectionRefs.preferencias}
            className={`rf-section-card ${activeSection === 'preferencias' ? 'is-focused' : ''}`}
          >
            <div className="rf-section-header">
              <div>
                <h2 className="text-lg font-bold text-white">Preferências e opt-ins</h2>
                <p className="text-sm text-slate-400">Permissões de comunicação e notas.</p>
              </div>
              <StatusBadge tone="info">Opcional</StatusBadge>
            </div>

            <div className="flex flex-col gap-4 mb-8">
              <label className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Aceita WhatsApp</span>
                <input 
                  type="checkbox" 
                  className="toggle"
                  checked={values.optin_sms}
                  onChange={e => update('optin_sms', e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Aceita e-mail marketing</span>
                <input 
                  type="checkbox" 
                  className="toggle"
                  checked={values.optin_email}
                  onChange={e => update('optin_email', e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Participa de campanhas</span>
                <input 
                  type="checkbox" 
                  className="toggle"
                  checked={values.optin_marketing}
                  onChange={e => update('optin_marketing', e.target.checked)}
                />
              </label>
            </div>

            <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Data de aniversário"
                type="date"
                value={values.data_aniversario}
                onChange={e => update('data_aniversario', e.target.value)}
              />
              <Input
                label="Observação interna"
                type="textarea"
                className="h-20 resize-none"
                value={values.obs}
                onChange={e => update('obs', e.target.value)}
                placeholder="Anotações para a equipe"
              />
            </div>
          </section>

          <div className="h-40" /> {/* Spacer for scroll bottom */}
        </main>
      </div>

      <Modal
        open={showDiscardModal}
        title="Descartar cadastro?"
        onClose={() => setShowDiscardModal(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowDiscardModal(false)}>Continuar editando</Button>
            <Button variant="danger" onClick={() => navigate('/app/clientes')}>Descartar</Button>
          </div>
        }
      >
        <p className="text-slate-400">As informações preenchidas serão perdidas.</p>
      </Modal>

      {error && <div className="fixed bottom-8 right-8 bg-red-600 text-white p-4 rounded-lg shadow-xl animate-bounce">{error}</div>}
    </div>
  );
}
