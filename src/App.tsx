import { Dashboard } from '@/components/dashboard/Dashboard'
import { useInvestmentEvolution } from '@/hooks/useInvestmentEvolution'
import { appConfig } from '@/lib/firebase/config'

export default function App() {
  const state = useInvestmentEvolution(appConfig)
  return <Dashboard state={state} />
}
