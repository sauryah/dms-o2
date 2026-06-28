export const isDieActive = (die: any) => {
  return ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING'].includes(die.status)
}
