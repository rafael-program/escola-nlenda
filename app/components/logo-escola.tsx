import Image from 'next/image'

type Tamanho = 'sm' | 'md' | 'lg' | 'xl'

const tamanhos: Record<Tamanho, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export default function LogoEscola({
  tamanho = 'md',
  comTexto = false,
  subtitulo,
  className = '',
}: {
  tamanho?: Tamanho
  comTexto?: boolean
  subtitulo?: string
  className?: string
}) {
  const px = tamanhos[tamanho]
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative shrink-0"
        style={{ width: px, height: px }}
      >
        <Image
          src="/logo.png"
          alt="Escola Primária Privada Nlenda Y'Nlenda"
          fill
          className="object-contain"
          priority
          sizes={`${px}px`}
        />
      </div>
      {comTexto && (
        <div className="leading-tight min-w-0">
          <p className="font-semibold text-slate-900 truncate">
            Nlenda Y'Nlenda
          </p>
          {subtitulo && (
            <p className="text-[10px] text-slate-500 truncate">
              {subtitulo}
            </p>
          )}
        </div>
      )}
    </div>
  )
}