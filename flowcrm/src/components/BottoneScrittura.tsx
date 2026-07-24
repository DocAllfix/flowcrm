import { Button, type ButtonProps } from '@/components/ui/button'
import { useSolaLettura } from '@/hooks/useSolaLettura'

/**
 * Bottone per azioni di scrittura (es. "+ Nuovo"). Identico a <Button>, ma in
 * versione dimostrativa (sola lettura) al click mostra il toast "solo nella
 * versione completa" invece di eseguire l'azione — così il form non si apre
 * nemmeno. La barriera vera resta comunque il trigger nel database.
 */
export function BottoneScrittura({ onClick, ...props }: ButtonProps) {
  const { blocca } = useSolaLettura()
  return <Button onClick={onClick ? blocca(onClick) : onClick} {...props} />
}
