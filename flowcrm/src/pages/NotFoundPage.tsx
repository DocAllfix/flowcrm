import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
        <Compass className="h-7 w-7 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La pagina che cercavi non esiste o è stata spostata.
      </p>
      <Button className="mt-6" onClick={() => navigate('/')}>Torna alla dashboard</Button>
    </div>
  )
}
