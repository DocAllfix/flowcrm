import { PageHeader } from '@/components/ui/page-header'
import { FeedSection } from '@/components/FeedSection'

/** Canale di discussione generale del team (entita='team', nessun record). */
export function TeamPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Canale del team"
        description="Discussione generale con tutti i colleghi. Usa @nome per menzionare qualcuno."
      />
      <FeedSection target={{ entita: 'team' }} />
    </div>
  )
}
