/**
 * ModuleSwitcher — selettore del "prodotto" in demo/istanza multi-modulo.
 * Dropdown nell'Header: "CRM completo" + un modulo per voce. Selezionando
 * un modulo la Sidebar mostra le sue sezioni sopra la base CRM e si naviga
 * alla sua pagina principale. Con nessun modulo attivo il componente
 * sparisce (istanza solo-CRM: zero rumore).
 */
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FAMIGLIE, moduliAttivi, moduloBySlug } from '@/config/moduli.config'
import { useVistaModulo } from '@/components/layout/VistaModuloContext'
import { cn } from '@/lib/utils'

export function ModuleSwitcher() {
  const { vista, setVista } = useVistaModulo()
  const navigate = useNavigate()
  const moduli = moduliAttivi()
  // Con pochi moduli i titoli delle famiglie sono rumore; da quattro in su orientano.
  const raggruppa = moduli.length >= 4

  if (moduli.length === 0) return null

  const corrente = vista === 'tutti' ? null : moduloBySlug(vista)
  const CorrenteIcon = corrente?.icon ?? LayoutGrid

  function scegli(slug: string) {
    setVista(slug)
    if (slug === 'tutti') {
      navigate('/')
      return
    }
    const mod = moduloBySlug(slug)
    const primaPagina = mod?.nav[0]?.items[0]?.path
    if (primaPagina) navigate(primaPagina)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-tour="moduli-switcher"
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        aria-label="Scegli modulo"
      >
        <CorrenteIcon className="h-4 w-4 text-primary-testo" />
        <span className="hidden md:inline">{corrente?.label ?? 'CRM completo'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(36rem,calc(100dvh-5rem))] w-80 overflow-y-auto">
        <DropdownMenuLabel>Moduli</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => scegli('tutti')} className="gap-3">
          <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">CRM completo</p>
            <p className="truncate text-xs text-muted-foreground">
              Tutte le funzioni e i moduli insieme
            </p>
          </div>
          {vista === 'tutti' && <Check className="h-4 w-4 shrink-0 text-primary-testo" />}
        </DropdownMenuItem>
        {FAMIGLIE.map((fam) => {
          const della = moduli.filter((m) => m.famiglia === fam)
          if (della.length === 0) return null
          return (
            <DropdownMenuGroup key={fam}>
              <DropdownMenuSeparator />
              {raggruppa && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{fam}</DropdownMenuLabel>}
              {della.map((m) => (
          <DropdownMenuItem key={m.slug} onClick={() => scegli(m.slug)} className="gap-3">
            <m.icon
              className={cn(
                'h-4 w-4 shrink-0',
                vista === m.slug ? 'text-primary-testo' : 'text-muted-foreground'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="truncate text-xs text-muted-foreground">{m.descrizione}</p>
            </div>
            {vista === m.slug && <Check className="h-4 w-4 shrink-0 text-primary-testo" />}
          </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
