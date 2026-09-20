import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

/**
 * Avatar con iniziali.
 *
 * ── Perché su Radix e non a mano ────────────────────────────────────
 * `@radix-ui/react-avatar` era **già installato e mai importato**: una
 * dipendenza pagata e non usata. Porta con sé la cosa che a mano si
 * sbaglia sempre — il ripiego sulle iniziali compare solo dopo che
 * l'immagine ha davvero fallito, invece di lampeggiare a ogni render.
 *
 * ── Perché non c'è più il gradiente blu ─────────────────────────────
 * Nella barra laterale le iniziali stavano su
 * `bg-gradient-to-br from-blue-400 to-blue-600`: un blu fisso, fuori dai
 * token, uguale per ogni cliente qualunque colore avesse comprato. Qui il
 * fondo è la velatura del marchio, quindi segue la tinta configurata.
 */

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-9 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
