import {
  createContext,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useContext,
  useRef,
  useState,
} from "react"

type PageId = "monitor" | "sensors" | "range" | "medical" | "contacts" | "settings"
type MonitorVariant = "normal" | "elevated" | "critical"
type DemoMode = "live" | "offline" | "first-use"

type DemoConfig = {
  variant: MonitorVariant
  spo2: boolean
  temperature: boolean
  fallDetection: boolean
  mode: DemoMode
}

const DemoContext = createContext<{
  config: DemoConfig
  update: (next: Partial<DemoConfig>) => void
} | null>(null)

function useDemo() {
  const context = useContext(DemoContext)
  if (!context) throw new Error("useDemo must be used within DemoContext")
  return context
}

type Page = {
  id: PageId
  label: string
}

const WATCH_SIZE = 466
const VIEWPORT_MARGIN = 28

function computeWatchScale(width: number, height: number): number {
  const scaleX = (width - VIEWPORT_MARGIN) / WATCH_SIZE
  const scaleY = (height - VIEWPORT_MARGIN) / WATCH_SIZE
  return Math.max(0.25, Math.min(1, scaleX, scaleY))
}

const pages: Page[] = [
  { id: "monitor", label: "Monitor" },
  { id: "sensors", label: "Sensores" },
  { id: "range", label: "Tu rango normal" },
  { id: "medical", label: "Ficha médica" },
  { id: "contacts", label: "Contactos" },
  { id: "settings", label: "Ajustes" },
]

const indicatorAngles = [-27.5, -16.5, -5.5, 5.5, 16.5, 27.5]

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

function Icon({
  name,
  className = "",
}: {
  name:
    | "heart"
    | "sensor"
    | "user"
    | "medical"
    | "phone"
    | "contact"
    | "settings"
    | "check"
  className?: string
}) {
  const paths: Record<typeof name, ReactNode> = {
    heart: (
      <path d="M12 21S3.2 15.5 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4C20.8 15.5 12 21 12 21Z" />
    ),
    sensor: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M7.1 7.1a7 7 0 0 0 0 9.8M16.9 7.1a7 7 0 0 1 0 9.8M4.3 4.3a11 11 0 0 0 0 15.4M19.7 4.3a11 11 0 0 1 0 15.4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21c.7-4.6 3.2-7 7.5-7s6.8 2.4 7.5 7" />
      </>
    ),
    medical: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M9 3V2h6v1M12 8v8M8 12h8" />
      </>
    ),
    phone: (
      <path d="M7.2 3.5 9.8 7l-2 2.2a15.4 15.4 0 0 0 7 7l2.2-2 3.5 2.6-.8 3.1c-.2.7-.8 1.1-1.5 1.1A15.2 15.2 0 0 1 3 5.8c0-.7.4-1.3 1.1-1.5l3.1-.8Z" />
    ),
    contact: (
      <>
        <circle cx="8.2" cy="7" r="3.2" />
        <path d="M2.8 18.7c.5-4 2.3-6.1 5.4-6.1 1.5 0 2.7.4 3.6 1.2M15.2 10.8l1.9 2.5-1.5 1.6a10.4 10.4 0 0 0 4 4l1.6-1.5 2.5 1.9-.6 2.2c-.1.5-.6.8-1.1.8a10.8 10.8 0 0 1-10.7-10.7c0-.5.3-.9.8-1.1l2.2-.6.9.9Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1 3.1-2.7 1.6-2.6-1.5a7.7 7.7 0 0 1-4.4 0l-2.6 1.5-2.7-1.6.1-3a7.4 7.4 0 0 1-1.1-3.1c0-1.1.4-2.2 1.1-3l-.1-3.1 2.7-1.6 2.6 1.5a7.7 7.7 0 0 1-4.4 0l2.6-1.5 2.7 1.6-.1 3a7.4 7.4 0 0 1 1.1 3.1c0 1.1-.4 2.2-1.1 3Z" />
      </>
    ),
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
  }

  return (
    <svg
      className={`line-icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function PageHeader({
  icon,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"]
  children: ReactNode
}) {
  return (
    <header className="page-header">
      <Icon name={icon} />
      <h1>{children}</h1>
    </header>
  )
}

const monitorVariants: Record<
  MonitorVariant,
  {
    bpm: number
    label: string
    color: string
    markerAngle: number
    next: MonitorVariant
  }
> = {
  normal: {
    bpm: 78,
    label: "Ritmo normal",
    color: "#34C759",
    markerAngle: 245,
    next: "elevated",
  },
  elevated: {
    bpm: 104,
    label: "Pulso elevado",
    color: "#FF9500",
    markerAngle: 295,
    next: "critical",
  },
  critical: {
    bpm: 132,
    label: "Revisa tu estado",
    color: "#FF3B30",
    markerAngle: 346,
    next: "normal",
  },
}

const gaugeSegments = [
  { color: "#32ADE6", start: 170, end: 216 },
  { color: "#34C759", start: 222, end: 267 },
  { color: "#FF9500", start: 273, end: 318 },
  { color: "#FF3B30", start: 324, end: 370 },
]

function HeartRateGauge({ variant }: { variant: MonitorVariant }) {
  const state = monitorVariants[variant]
  const cx = 135
  const cy = 126
  const outerRadius = 123
  const innerRadius = 108
  const marker = polarToCartesian(cx, cy, outerRadius, state.markerAngle)

  return (
    <div
      className="gauge"
      style={{ "--state-color": state.color } as CSSProperties}
      aria-label={`Frecuencia cardíaca actual: ${state.bpm} pulsaciones por minuto`}
    >
      <svg className="gauge-rings" viewBox="0 0 270 154" aria-hidden="true">
        <path
          className="gauge-track"
          d={describeArc(cx, cy, outerRadius, 170, 370)}
        />
        {gaugeSegments.map((segment) => (
          <path
            key={segment.color}
            className="gauge-segment"
            d={describeArc(cx, cy, outerRadius, segment.start, segment.end)}
            stroke={segment.color}
          />
        ))}
        <path
          className="gauge-state-ring"
          d={describeArc(cx, cy, innerRadius, 170, 370)}
        />
        <circle
          className="gauge-marker"
          cx={marker.x}
          cy={marker.y}
          r="6.5"
        />
      </svg>
      <div className="gauge-content">
        <strong className={`bpm-value ${state.bpm >= 100 ? "is-three-digit" : ""}`}>
          {state.bpm}
        </strong>
        <span className="bpm-label">BPM</span>
        <svg className="ecg-line" viewBox="0 0 150 26" aria-hidden="true">
          <path d="M2 14h26l7-2 7-10 10 21 10-17 8 8h20l6-2 6-7 8 15 8-6h30" />
        </svg>
      </div>
    </div>
  )
}

function SosButton({ onActivate }: { onActivate: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | null>(null)

  function stopHolding() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  function startHolding(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setHolding(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setHolding(false)
      onActivate()
    }, 2000)
  }

  return (
    <button
      type="button"
      className={`sos-button ${holding ? "is-holding" : ""}`}
      onPointerDown={startHolding}
      onPointerUp={stopHolding}
      onPointerCancel={stopHolding}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Mantén presionado dos segundos para activar SOS"
    >
      <span className="sos-button-inner">
        <strong>SOS</strong>
        <small>2s</small>
      </span>
    </button>
  )
}

function MonitorPage({
  onSos,
  onContacts,
}: {
  onSos: () => void
  onContacts: () => void
}) {
  const { config, update } = useDemo()
  const variant = config.variant
  const state = monitorVariants[variant]
  const movement = {
    normal: { label: "Caminando", color: "#34C759" },
    elevated: { label: "En reposo", color: "#FF9500" },
    critical: { label: "Sin movimiento", color: "#FF3B30" },
  }[variant]

  return (
    <section
      className={`watch-page monitor-page is-${variant}`}
      style={{ "--state-color": state.color } as CSSProperties}
      aria-label="Monitor"
    >
      <p className="live-label">
        <span aria-hidden="true" />
        MEDICIÓN EN VIVO
      </p>

      <HeartRateGauge variant={variant} />

      <button
        type="button"
        className="heart-status"
        onClick={() => update({ variant: state.next })}
        aria-label={`${state.label}, Ahora. Toca para cambiar estado`}
      >
        <span>{state.label}</span>
        <small>Ahora</small>
      </button>

      <div className="monitor-chips" aria-label="Sensores activos">
        <div className="sensor-chip">
          <span>SpO₂</span>
          <strong>{config.spo2 ? "98%" : "No disponible"}</strong>
        </div>
        <div className="sensor-chip">
          <span>Movimiento</span>
          <strong style={{ color: movement.color }}>{movement.label}</strong>
        </div>
      </div>

      <div className="monitor-actions">
        <SosButton onActivate={onSos} />
        <button
          type="button"
          className="contacts-icon-button"
          onClick={onContacts}
          aria-label="Contactos de emergencia"
        >
          <Icon name="contact" />
        </button>
      </div>
    </section>
  )
}

function SensorsPage() {
  return (
    <section className="watch-page standard-page" aria-label="Sensores">
      <PageHeader icon="sensor">Sensores</PageHeader>
      <div className="page-stack">
        <div className="info-card sensor-card">
          <div className="sensor-card-copy">
            <span>Frecuencia</span>
            <strong>
              78 <small>BPM</small>
            </strong>
          </div>
          <span className="status-pill">
            <Icon name="check" /> Activo
          </span>
        </div>
        <div className="info-card sensor-card">
          <div className="sensor-card-copy">
            <span>Oxígeno</span>
            <strong>
              98 <small>%</small>
            </strong>
          </div>
          <span className="status-pill">
            <Icon name="check" /> Activo
          </span>
        </div>
      </div>
    </section>
  )
}

function RangePage() {
  return (
    <section className="watch-page standard-page" aria-label="Tu rango normal">
      <PageHeader icon="heart">Tu rango normal</PageHeader>
      <div className="range-content">
        <p>En reposo</p>
        <strong>58–92</strong>
        <span>BPM</span>
        <div className="range-bar" aria-label="Rango normal de 58 a 92 BPM">
          <i />
        </div>
        <small>Aprendido en 14 días</small>
      </div>
    </section>
  )
}

function MedicalPage() {
  return (
    <section className="watch-page standard-page" aria-label="Ficha médica">
      <PageHeader icon="medical">Ficha médica</PageHeader>
      <div className="page-stack medical-stack">
        <div className="info-card medical-row">
          <span>Tipo de sangre</span>
          <strong>O+</strong>
        </div>
        <div className="info-card medical-row">
          <span>Alergias</span>
          <strong>Penicilina</strong>
        </div>
        <div className="info-card medical-row">
          <span>Condición</span>
          <strong>Hipertensión</strong>
        </div>
      </div>
    </section>
  )
}

function ContactsPage() {
  const [hasContact, setHasContact] = useState(true)

  return (
    <section className="watch-page standard-page" aria-label="Contactos">
      <PageHeader icon="phone">Contactos</PageHeader>
      {hasContact ? (
        <div className="contact-content">
          <article className="contact-card">
            <div className="avatar">ML</div>
            <div className="contact-copy">
              <strong>María López</strong>
              <span>Madre</span>
            </div>
            <button
              type="button"
              className="call-button"
              aria-label="Llamar a María López"
            >
              <Icon name="phone" />
            </button>
          </article>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setHasContact(false)}
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="user" />
          </div>
          <strong>Sin contactos</strong>
          <span>Añade un contacto cercano</span>
          <button
            type="button"
            className="primary-button"
            onClick={() => setHasContact(true)}
          >
            Añadir
          </button>
        </div>
      )}
    </section>
  )
}

function SettingsPage() {
  const [alerts, setAlerts] = useState(true)

  return (
    <section className="watch-page standard-page" aria-label="Ajustes">
      <PageHeader icon="settings">Ajustes</PageHeader>
      <div className="page-stack settings-stack">
        <button
          type="button"
          className="info-card setting-row"
          onClick={() => setAlerts(!alerts)}
        >
          <span>Alertas</span>
          <span
            className={`toggle ${alerts ? "on" : ""}`}
            aria-label={alerts ? "Alertas activadas" : "Alertas desactivadas"}
          >
            <i />
          </span>
        </button>
        <div className="info-card setting-row">
          <span>Vibración</span>
          <strong>Alta</strong>
        </div>
        <div className="info-card setting-row">
          <span>Ubicación</span>
          <strong className="status-active">Activa</strong>
        </div>
      </div>
    </section>
  )
}

function PageIndicator({
  active,
  onSelect,
}: {
  active: number
  onSelect: (index: number) => void
}) {
  return (
    <nav className="page-indicator" aria-label="Páginas">
      {pages.map((page, index) => {
        const angle = indicatorAngles[index] ?? 0
        const pos = polarToCartesian(50, 50, 44.6, angle)
        return (
          <button
            type="button"
            key={page.id}
            className={index === active ? "active" : ""}
            style={
              {
                left: `${pos.x.toFixed(2)}%`,
                top: `${pos.y.toFixed(2)}%`,
                "--dot-angle": `${angle}deg`,
              } as CSSProperties
            }
            onClick={() => onSelect(index)}
            aria-label={`Ir a ${page.label}`}
            aria-current={index === active ? "page" : undefined}
          >
            <span />
          </button>
        )
      })}
    </nav>
  )
}

function SosOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="sos-overlay" role="alert">
      <div className="sos-alert-icon">
        <Icon name="phone" />
      </div>
      <h2>SOS activado</h2>
      <p>Avisando a María López</p>
      <span>Ubicación compartida</span>
      <button type="button" onClick={onClose}>
        Cancelar alerta
      </button>
    </div>
  )
}

const variantOptions: { id: MonitorVariant; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "elevated", label: "Elevado" },
  { id: "critical", label: "Crítico" },
]

function DemoPanel({ onSimulateAlert }: { onSimulateAlert: () => void }) {
  const { config, update } = useDemo()
  const toggles: { key: "spo2" | "temperature" | "fallDetection"; label: string }[] = [
    { key: "spo2", label: "Reloj con SpO₂" },
    { key: "temperature", label: "Reloj con temperatura" },
    { key: "fallDetection", label: "Reloj con detección de caídas" },
  ]

  return (
    <details className="demo-panel">
      <summary>Panel de demo</summary>
      <div className="demo-panel-content">
        <fieldset>
          <legend>Estado del pulso</legend>
          <div className="segmented-control">
            {variantOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={config.variant === option.id ? "active" : ""}
                aria-pressed={config.variant === option.id}
                onClick={() => update({ variant: option.id, mode: "live" })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="demo-toggles">
          {toggles.map((toggle) => (
            <label key={toggle.key}>
              <span>{toggle.label}</span>
              <input
                type="checkbox"
                checked={config[toggle.key]}
                onChange={(event) => update({ [toggle.key]: event.target.checked })}
              />
            </label>
          ))}
        </div>

        <div className="demo-actions">
          <button type="button" onClick={onSimulateAlert}>
            Simular alerta
          </button>
          <button
            type="button"
            aria-pressed={config.mode === "offline"}
            onClick={() =>
              update({ mode: config.mode === "offline" ? "live" : "offline" })
            }
          >
            Sin conexión
          </button>
          <button
            type="button"
            aria-pressed={config.mode === "first-use"}
            onClick={() =>
              update({ mode: config.mode === "first-use" ? "live" : "first-use" })
            }
          >
            Primer uso
          </button>
        </div>
        <p className="demo-status" aria-live="polite">
          {config.mode === "offline"
            ? "Demo sin conexión"
            : config.mode === "first-use"
              ? "Vista de primer uso"
              : `Monitor ${variantOptions.find((item) => item.id === config.variant)?.label.toLowerCase()}`}
        </p>
      </div>
    </details>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState(0)
  const [sosActive, setSosActive] = useState(false)
  const [demoConfig, setDemoConfig] = useState<DemoConfig>({
    variant: "normal",
    spo2: true,
    temperature: false,
    fallDetection: true,
    mode: "live",
  })
  const [watchScale, setWatchScale] = useState(() =>
    typeof window === "undefined"
      ? 1
      : computeWatchScale(window.innerWidth, window.innerHeight),
  )
  const shellRef = useRef<HTMLElement | null>(null)
  const gestureStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const element = shellRef.current
    if (!element) return

    const updateScale = () => {
      setWatchScale(computeWatchScale(element.clientWidth, element.clientHeight))
    }

    updateScale()

    const observer = new ResizeObserver(updateScale)
    observer.observe(element)
    window.addEventListener("resize", updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateScale)
    }
  }, [])

  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    if (!gestureStart.current || sosActive) return
    const deltaX = (event.clientX - gestureStart.current.x) / watchScale
    const deltaY = (event.clientY - gestureStart.current.y) / watchScale
    gestureStart.current = null

    if (deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setActivePage((page) => Math.max(0, page - 1))
      return
    }
    if (Math.abs(deltaY) > 45 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setActivePage((page) =>
        Math.min(pages.length - 1, Math.max(0, page + (deltaY < 0 ? 1 : -1))),
      )
    }
  }

  const updateDemo = (next: Partial<DemoConfig>) => {
    setDemoConfig((current) => ({ ...current, ...next }))
  }

  return (
    <DemoContext.Provider value={{ config: demoConfig, update: updateDemo }}>
      <main
        ref={shellRef}
        className="app-shell"
        style={{ "--watch-scale": watchScale } as CSSProperties}
      >
        <div className="watch-stage">
          <div
            className="watch-frame"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) return
              gestureStart.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={finishGesture}
            onPointerCancel={() => {
              gestureStart.current = null
            }}
          >
            <div
              className="page-track"
              style={{ transform: `translateY(-${activePage * 100}%)` }}
            >
              <MonitorPage
                onSos={() => setSosActive(true)}
                onContacts={() => setActivePage(4)}
              />
              <SensorsPage />
              <RangePage />
              <MedicalPage />
              <ContactsPage />
              <SettingsPage />
            </div>
            <PageIndicator active={activePage} onSelect={setActivePage} />
            {sosActive && <SosOverlay onClose={() => setSosActive(false)} />}
          </div>
        </div>
        <DemoPanel
          onSimulateAlert={() => {
            setActivePage(0)
            setSosActive(true)
          }}
        />
      </main>
    </DemoContext.Provider>
  )
}
