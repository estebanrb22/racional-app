import type { ReactNode } from 'react'
import {
  AlertTriangle,
  CloudOff,
  FileQuestion,
  Inbox,
  KeyRound,
  Lock,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EvolutionViewState } from '@/hooks/useInvestmentEvolution'

type NonReady = Exclude<EvolutionViewState, { kind: 'ready' } | { kind: 'connecting' }>

/** Full-width message for every state in which there is nothing to chart. */
export function StatusPanel({ state }: { state: NonReady }) {
  const { icon, title, body, retry } = content(state)
  return (
    <section
      role={state.kind === 'empty' ? 'status' : 'alert'}
      className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{body}</div>
      {retry && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      )}
    </section>
  )
}

const iconClass = 'size-6'

function content(state: NonReady): {
  icon: ReactNode
  title: string
  body: ReactNode
  retry: boolean
} {
  switch (state.kind) {
    case 'config-error':
      return {
        icon: <KeyRound className={iconClass} aria-hidden="true" />,
        title: 'Falta la configuración de Firebase',
        body: (
          <>
            {state.missing.length > 0 && (
              <p>
                Variables faltantes:{' '}
                <code className="text-foreground">{state.missing.join(', ')}</code>
              </p>
            )}
            {state.invalidDocumentPath !== undefined && (
              <p>
                <code className="text-foreground">{state.invalidDocumentPath}</code> no es la ruta
                de un documento (debe tener la forma <code>colección/documento</code>).
              </p>
            )}
            <p>
              Ejecuta <code className="text-foreground">npm run env:from-config</code> con el
              archivo <code>config.js</code> en la raíz y reinicia el servidor.
            </p>
          </>
        ),
        retry: false,
      }
    case 'not-found':
      return {
        icon: <FileQuestion className={iconClass} aria-hidden="true" />,
        title: 'El documento no existe',
        body: (
          <p>
            Firestore confirmó que <code className="text-foreground">{state.path}</code> no existe.
            Si se crea, aparecerá aquí automáticamente.
          </p>
        ),
        retry: false,
      }
    case 'offline':
      return {
        icon: <WifiOff className={iconClass} aria-hidden="true" />,
        title: 'Sin conexión con Firestore',
        body: (
          <p>
            No hay datos confirmados por el servidor ni guardados localmente. La conexión se
            reintenta automáticamente.
          </p>
        ),
        retry: true,
      }
    case 'invalid-data':
      return {
        icon: <AlertTriangle className={iconClass} aria-hidden="true" />,
        title: 'Estructura de datos no reconocida',
        body: (
          <p>
            El documento no contiene la serie <code className="text-foreground">array</code>{' '}
            esperada. No se muestran datos para no presentar una interpretación incorrecta.
          </p>
        ),
        retry: false,
      }
    case 'empty':
      return {
        icon: <Inbox className={iconClass} aria-hidden="true" />,
        title: 'Aún no hay observaciones',
        body: (
          <p>
            El documento existe pero no contiene puntos válidos. Se actualizará en cuanto lleguen.
          </p>
        ),
        retry: false,
      }
    case 'error':
      return errorContent(state.error.kind, state.error.code)
  }
}

function errorContent(kind: string, code: string) {
  const codeLine = (
    <p className="text-xs">
      Código: <code>{code}</code>
    </p>
  )
  switch (kind) {
    case 'permission-denied':
      return {
        icon: <Lock className={iconClass} aria-hidden="true" />,
        title: 'Sin permisos para leer los datos',
        body: (
          <>
            <p>
              Las reglas de seguridad de Firestore no permiten leer este documento con esta
              configuración.
            </p>
            {codeLine}
          </>
        ),
        retry: true,
      }
    case 'unauthenticated':
      return {
        icon: <Lock className={iconClass} aria-hidden="true" />,
        title: 'Se requiere autenticación',
        body: (
          <>
            <p>
              El documento solo es accesible para usuarios autenticados y esta app no tiene sesión.
            </p>
            {codeLine}
          </>
        ),
        retry: false,
      }
    case 'unavailable':
      return {
        icon: <CloudOff className={iconClass} aria-hidden="true" />,
        title: 'Firestore no está disponible',
        body: (
          <>
            <p>
              No fue posible contactar al servidor. Revisa tu conexión o si una red bloquea
              Firestore.
            </p>
            {codeLine}
          </>
        ),
        retry: true,
      }
    case 'not-configured':
      return {
        icon: <KeyRound className={iconClass} aria-hidden="true" />,
        title: 'Proyecto de Firebase no válido',
        body: (
          <>
            <p>Revisa el identificador del proyecto y la ruta del documento en la configuración.</p>
            {codeLine}
          </>
        ),
        retry: false,
      }
    default:
      return {
        icon: <AlertTriangle className={iconClass} aria-hidden="true" />,
        title: 'No pudimos cargar tus inversiones',
        body: codeLine,
        retry: true,
      }
  }
}
