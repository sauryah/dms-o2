import { DIE_ACTIVE_STATUSES } from '../contracts/dieContracts'

export const isDieActive = (die: { status?: string }) => {
  return (DIE_ACTIVE_STATUSES as readonly string[]).includes(die.status || '')
}
