import { DIE_ACTIVE_STATUSES } from '../contracts/dieContracts'

export const isDieActive = (die: any) => {
  return DIE_ACTIVE_STATUSES.includes(die.status)
}
