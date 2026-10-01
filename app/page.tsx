'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import LogoEscola from './components/logo-escola'

export default function Home() {
  const [copiado, setCopiado] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({})
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)

  const iban = 'AO06 0040 0000 5640 2025 1014 3'

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Intersection Observer para animações de entrada
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.15 }
    )

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Mouse tracking para efeito parallax no hero
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const copiar = () => {
    navigator.clipboard.writeText(iban)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#fafbff] to-white text-slate-900 antialiased overflow-x-hidden">

      {/* ============================================================
          CABEÇALHO FIXO
          ============================================================ */}
     <header
  className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
    scrollY > 10
      ? 'bg-white/90 backdrop-blur border-b border-gray-200'
      : 'bg-transparent'
  }`}
>
  <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
    <Link href="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 relative shrink-0">
        <Image
          src="/logo.png"
          alt="Escola Primária Privada Nlenda Y'Nlenda"
          fill
          className="object-contain"
          priority
          sizes="36px"
        />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-sm text-slate-900">
          Nlenda YNlenda
        </p>
        <p className="text-[10px] text-slate-500 hidden sm:block">
          Escola Primária Privada 1992
        </p>
      </div>
    </Link>
    <Link
      href="/login"
      className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
    >
      Entrar →
    </Link>
  </div>
</header>

      {/* ============================================================
          HERO COM IMAGEM
          ============================================================ */}
      <section ref={heroRef} className="relative pt-28 overflow-hidden">
        {/* Fundo decorativo interativo */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-transparent rounded-full blur-3xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(-50%, ${mousePosition.y * 30}px)`,
            }}
          />
          <div
            className="absolute top-40 right-20 w-64 h-64 bg-gradient-to-br from-indigo-100/30 to-blue-100/20 rounded-full blur-3xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 40}px)`,
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          {/* Faixa de estado */}
          <div className="animate-fade-in flex justify-center">
            <div className="group inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-full px-4 py-1.5 shadow-sm shadow-blue-600/5 hover:shadow-blue-600/15 hover:border-blue-200 transition-all duration-300 cursor-default">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-blue-600" />
              </span>
              Ano letivo 2025/2026 · Pagamentos abertos até dia 10
            </div>
          </div>

          {/* Grid: texto + imagem */}
          <div className="mt-12 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <div>
              <h1
                className="text-4xl md:text-[44px] lg:text-5xl font-semibold leading-[1.1] tracking-tight text-slate-900 animate-fade-up"
                style={{ animationDelay: '80ms' }}
              >
                Educação de qualidade,
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                    no coração do Zaire.
                  </span>
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600/40 to-indigo-600/40 rounded-full scale-x-0 animate-underline" />
                </span>
              </h1>

              <p
                className="mt-6 text-slate-600 text-base leading-relaxed animate-fade-up max-w-md"
                style={{ animationDelay: '160ms' }}
              >
                A Escola primária privada Nlenda YNlenda acompanha cada aluno desde os
                primeiros anos. Aqui encontra as notas, o estado dos
                pagamentos e os comprovativos — tudo num só lugar.
              </p>

              <div
                className="mt-8 flex flex-wrap gap-3 animate-fade-up"
                style={{ animationDelay: '240ms' }}
              >
                <a
                  href="/login"
                  className="group relative inline-flex items-center px-5 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 active:scale-[0.97] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Entrar no portal
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </a>
                <a
                  href="#como-pagar"
                  className="group inline-flex items-center px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-sm font-medium transition-all hover:shadow-md hover:shadow-blue-600/5 active:scale-[0.97]"
                >
                  Como pagar
                  <span className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">↓</span>
                </a>
              </div>

              {/* Micro-stats */}
              <div
                className="mt-10 flex items-center gap-6 animate-fade-up"
                style={{ animationDelay: '320ms' }}
              >
                <div className="group cursor-default">
                  <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">48h</p>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Validação</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="group cursor-default">
                  <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">2 ciclos</p>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Ensino</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="group cursor-default">
                  <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Seg–Sex</p>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Atendimento</p>
                </div>
              </div>
            </div>

            {/* Imagem */}
            <div
              className="relative animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              <div
                className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 group transition-all duration-500 hover:shadow-blue-600/10 hover:shadow-3xl"
                style={{
                  transform: `perspective(1000px) rotateY(${mousePosition.x * 4}deg) rotateX(${-mousePosition.y * 4}deg)`,
                }}
              >
                <Image
                  src="/imagens/escola-nlenda.jpg"
                  alt="Escola Nlenda e Nlenda"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Overlay informativo ao hover */}
                <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="bg-white/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg">
                    <p className="text-xs font-semibold text-slate-900">Escola Nlenda e Nlenda</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Nzetu, Zaire — Angola</p>
                  </div>
                </div>
              </div>
              {/* Elementos decorativos flutuantes */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/10 -z-10 blur-2xl animate-pulse-slow" />
              <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/10 to-blue-500/10 -z-10 blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          O QUE PODE FAZER AQUI
          ============================================================ */}
      <section
        id="funcionalidades"
        data-animate
        className={`max-w-6xl mx-auto px-6 py-24 transition-all duration-700 ${
          visibleSections['funcionalidades'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.15em] text-blue-600 font-semibold">
            Funcionalidades
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
            O que pode fazer no portal
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Três coisas simples, pensadas para poupar tempo às famílias.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          <BlocoCard
            numero="01"
            titulo="Consultar notas"
            texto="Veja o boletim do seu educando sempre que for publicado pela escola."
            delay={0}
            visible={visibleSections['funcionalidades']}
          />
          <BlocoCard
            numero="02"
            titulo="Enviar comprovativo"
            texto="Anexe foto ou PDF do depósito ou transferência, sem sair de casa."
            delay={100}
            visible={visibleSections['funcionalidades']}
          />
          <BlocoCard
            numero="03"
            titulo="Confirmar pagamento"
            texto="Depois da validação, descarregue o recibo oficial com código verificável."
            delay={200}
            visible={visibleSections['funcionalidades']}
          />
        </div>
      </section>

      {/* ============================================================
          COMO PAGAR
          ============================================================ */}
      <section id="como-pagar" className="relative bg-gradient-to-b from-slate-50/80 to-white border-t border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Passos */}
            <div
              data-animate
              id="passos"
              className={`transition-all duration-700 ${
                visibleSections['passos'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.15em] text-blue-600 font-semibold">
                Como pagar
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
                Três passos, sem filas.
              </h2>
              <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-md">
                Se ainda não fez o pagamento deste mês, siga os passos ao lado.
                A secretaria valida em até 48 horas úteis.
              </p>

              <ol className="mt-10 space-y-6">
                <Passo
                  numero={1}
                  titulo="Transfira o valor"
                  texto="Use o IBAN da escola abaixo. Guarde o comprovativo do depósito."
                />
                <Passo
                  numero={2}
                  titulo="Envie o comprovativo"
                  texto="Entre no portal, escolha o mês, indique o valor e anexe o ficheiro."
                />
                <Passo
                  numero={3}
                  titulo="Aguarde a validação"
                  texto="Depois de aprovado, o mês fica marcado como pago no seu painel."
                />
              </ol>
            </div>

            {/* Cartão IBAN */}
            <div
              data-animate
              id="iban-card"
              className={`relative bg-white border border-slate-200/80 rounded-2xl p-7 md:sticky md:top-24 shadow-xl shadow-slate-900/5 transition-all duration-700 hover:shadow-2xl hover:shadow-blue-600/10 ${
                visibleSections['iban-card'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
            >
              {/* Gradiente decorativo */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] animate-gradient-x" />

              <p className="text-xs uppercase tracking-[0.15em] text-slate-500 font-semibold">
                Dados para transferência
              </p>

              <div className="mt-6 space-y-5">
                <div className="group">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Banco</p>
                  <p className="text-sm text-slate-900 font-semibold mt-1 group-hover:text-blue-600 transition-colors">BAI</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">IBAN</p>
                  <p className="font-mono text-sm text-slate-900 mt-1 break-all select-all bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-text">
                    {iban}
                  </p>
                </div>
                <div className="group">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Titular</p>
                  <p className="text-sm text-slate-900 font-semibold mt-1 group-hover:text-blue-600 transition-colors">
                    Escola Nlenda Nlenda
                  </p>
                </div>
              </div>

              <button
                onClick={copiar}
                className={`mt-6 w-full text-sm font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] relative overflow-hidden ${
                  copiado
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40'
                }`}
              >
                {copiado ? (
                  <>
                    <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px] animate-bounce-in">
                      ✓
                    </span>
                    IBAN copiado
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] group-hover:bg-white/30 transition-colors">
                      ⧉
                    </span>
                    Copiar IBAN
                  </>
                )}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
              </button>

              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs">
                <div className="flex justify-between items-center group">
                  <span className="text-slate-500">Prazo</span>
                  <span className="text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-all">até dia 10</span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-slate-500">Validação</span>
                  <span className="text-slate-900 font-medium bg-slate-50 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-all">48 horas úteis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CONTACTOS
          ============================================================ */}
      <section
        id="contactos"
        data-animate
        className={`relative bg-gradient-to-b from-slate-50/80 to-white border-t border-slate-200/70 transition-all duration-700 ${
          visibleSections['contactos'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-blue-600 font-semibold">
              Contactos
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 tracking-tight">
              Falar com a secretaria
            </h2>
            <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              Se tiver alguma dúvida sobre pagamentos, notas ou documentos,
              estamos disponíveis durante o horário de expediente.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <ContactoCard
              icone="📞"
              titulo="Telefone"
              valor="+244 923 318 758 · 962 125 122"
              delay={0}
              visible={visibleSections['contactos']}
            />
            <ContactoCard
              icone="✉️"
              titulo="Email"
              valor="nlendaynlenda93@gmail.com"
              delay={100}
              visible={visibleSections['contactos']}
            />
            <ContactoCard
              icone="📍"
              titulo="Localização"
              valor="Nzetu, Zaire — Angola"
              delay={200}
              visible={visibleSections['contactos']}
            />
            <ContactoCard
              icone="🕐"
              titulo="Horário"
              valor="Seg–Sex, 8h às 16h"
              delay={300}
              visible={visibleSections['contactos']}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          RODAPÉ
          ============================================================ */}
      <footer className="bg-white border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div>
              <LogoEscola tamanho="sm" comTexto />
              <p className="mt-4 text-xs text-slate-500 max-w-xs leading-relaxed">
                Portal oficial de gestão escolar. Notas, pagamentos e
                documentação num só lugar.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-16 gap-y-8 text-xs">
              <div>
                <p className="font-semibold text-slate-700 mb-3 uppercase tracking-wider text-[10px]">Portal</p>
                <ul className="space-y-2 text-slate-500">
                  <li><a href="/login" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"><span className="w-0 h-px bg-blue-600 group-hover:w-3 transition-all duration-300" />Entrar</a></li>
                  <li><a href="#como-pagar" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"><span className="w-0 h-px bg-blue-600 group-hover:w-3 transition-all duration-300" />Como pagar</a></li>
                  <li><a href="#sobre" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"><span className="w-0 h-px bg-blue-600 group-hover:w-3 transition-all duration-300" />Sobre</a></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-3 uppercase tracking-wider text-[10px]">Contactos</p>
                <ul className="space-y-2 text-slate-500">
                  <li className="hover:text-blue-600 transition-colors cursor-default">+244 923 318 758 · 962 125 122</li>
                  <p className="text-[10px] text-gray-400">NIF: 5417251704</p>
                           
                  <li className="hover:text-blue-600 transition-colors cursor-default">nlendaynlenda93@gmail.com</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} Escola Primária Nlenda YNlenda · Todos os direitos reservados - Rafael DevTec</p>
            
          </div>
        </div>
      </footer>
    </main>
  )
}

/* ============================================================
   COMPONENTES AUXILIARES
   ============================================================ */

function BlocoCard({
  numero,
  titulo,
  texto,
  delay = 0,
  visible = true,
}: {
  numero: string
  titulo: string
  texto: string
  delay?: number
  visible?: boolean
}) {
  return (
    <div
      className={`group relative bg-white border border-slate-200/80 rounded-2xl p-7 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-500 hover:-translate-y-1 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradiente no topo ao hover */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/40 transition-all duration-500" />

      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-100/60 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          {numero}
        </span>
        <p className="font-semibold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{titulo}</p>
      </div>
      <p className="mt-4 text-sm text-slate-600 leading-relaxed">{texto}</p>

      {/* Seta indicativa ao hover */}
      <div className="mt-4 flex items-center text-blue-600 text-xs font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        Saber mais <span className="ml-1">→</span>
      </div>
    </div>
  )
}

function Passo({
  numero,
  titulo,
  texto,
}: {
  numero: number
  titulo: string
  texto: string
}) {
  return (
    <li className="group flex gap-5">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
          {numero}
        </div>
        {numero < 3 && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-px h-6 bg-gradient-to-b from-slate-200 to-transparent group-hover:from-blue-300 transition-colors duration-300" />
        )}
      </div>
      <div className="pt-1.5">
        <p className="font-semibold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{titulo}</p>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{texto}</p>
      </div>
    </li>
  )
}

function ContactoCard({
  icone,
  titulo,
  valor,
  delay = 0,
  visible = true,
}: {
  icone: string
  titulo: string
  valor: string
  delay?: number
  visible?: boolean
}) {
  return (
    <div
      className={`group bg-white border border-slate-200/80 rounded-2xl p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 hover:-translate-y-1 transition-all duration-500 cursor-default ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-lg group-hover:from-blue-50 group-hover:to-indigo-50 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
        {icone}
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold group-hover:text-blue-500 transition-colors">
        {titulo}
      </p>
      <p className="mt-1.5 text-sm text-slate-900 font-medium break-words group-hover:text-blue-700 transition-colors">
        {valor}
      </p>
    </div>
  )
}