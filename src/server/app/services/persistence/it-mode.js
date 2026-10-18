const mode = process.env.PERSISTENCE_IT ?? 'stubs'
export const runsIt = (kind) => mode === kind || mode === 'all'
