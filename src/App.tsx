import {
  createContext,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useState,
} from "react"

export type PageId = "monitor" | "sensors" | "range" | "medical" | "contacts" | "settings"
export type MonitorVariant = "normal" | "elevated" | "critical"
export type DemoMode = "live" | "offline" | "first-use"
export type AlertState = "none" | "are-you-ok" | "alert-sent"
export type SensorVariantMode = "live" | "measuring" | "permission"
export type Spo2ScreenState = "idle" | "measuring" | "result" | "error"
export type Spo2ResultVariant = "optimal" | "low" | "very-low"

export type DemoConfig = {
  variant: MonitorVariant
  spo2: boolean
  temperature: boolean
  fallDetection: boolean
  mode: DemoMode
  alertState: AlertState
  sensorMode: SensorVariantMode
  spo2ScreenState: Spo2ScreenState
  spo2Result: Spo2ResultVariant
  spo2MovementDetected: boolean
  activeDetail: "none" | "spo2"
  medicalEmpty: boolean
  contactsEmpty: boolean
}

export type DemoContextType = {
  config: DemoConfig
  update: (next: Partial<DemoConfig>) => void
  triggerAreYouOk: () => void
  triggerAlertSent: () => void
  dismissAlertWithToast: () => void
  dismissAlert: () => void
  openSpo2Detail: () => void
  closeSpo2Detail: () => void
  toastMessage: string | null
}

const DemoContext = createContext<DemoContextType | null>(null)

export function useDemo() {
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
    | "users"
    | "settings"
    | "check"
    | "warning"
    | "wifiOff"
    | "close"
    | "lock"
    | "oxygen"
    | "thermometer"
    | "fall"
    | "walking"
    | "location"
    | "arrowLeft"
    | "chevronLeft"
    | "smartphone"
    | "pill"
    | "shield"
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
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19.2c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
        <circle cx="17.4" cy="9" r="2.4" />
        <path d="M15.4 14.3c3.2-.2 5.6 1.6 5.6 4.9" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1 3.1-2.7 1.6-2.6-1.5a7.7 7.7 0 0 1-4.4 0l-2.6 1.5-2.7-1.6.1-3a7.4 7.4 0 0 1-1.1-3.1c0-1.1.4-2.2 1.1-3l-.1-3.1 2.7-1.6 2.6 1.5a7.7 7.7 0 0 1-4.4 0l2.6-1.5 2.7 1.6-.1 3a7.4 7.4 0 0 1 1.1 3.1c0 1.1-.4 2.2-1.1 3Z" />
      </>
    ),
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    warning: (
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />
    ),
    wifiOff: (
      <>
        <line x1="2" x2="22" y1="2" y2="22" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M5 12.5a10 10 0 0 1 5.3-2.6" />
        <path d="M19 12.5a10 10 0 0 0-2.3-1.5" />
        <circle cx="12" cy="20" r="1" />
      </>
    ),
    close: <path d="M18 6 6 18M6 6l12 12" />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    oxygen: (
      <>
        <path d="M12 2.5a5.5 5.5 0 0 1 5.5 5.5c0 4-5.5 13-5.5 13S6.5 12 6.5 8A5.5 5.5 0 0 1 12 2.5Z" />
        <circle cx="12" cy="9.5" r="1.5" />
      </>
    ),
    thermometer: (
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
    ),
    fall: (
      <>
        <circle cx="16" cy="4" r="2" />
        <path d="m14 8-4 5-3-2-3 4M10 13l4 3 4-2" />
      </>
    ),
    walking: (
      <>
        <circle cx="13" cy="4" r="2" />
        <path d="M12.5 6.5 10.5 12.5l3.8 2.2 1.2 4.8M10.5 12.5 7 18.5M11.5 8.5 7.5 10.5M12 7.8l4-2" />
      </>
    ),
    location: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8Z" />
      </>
    ),
    arrowLeft: <path d="m12 19-7-7 7-7M5 12h14" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    smartphone: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M12 18h.01" />
      </>
    ),
    pill: (
      <>
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </>
    ),
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    ),
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

/* Botón de regresar compartido: círculo de 48 px, flecha clara y siempre
   completamente dentro del círculo del reloj. Se coloca como hijo directo
   de la pantalla para que sus % se midan sobre los 466x466 px del reloj. */
function WatchBackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="watch-back-48-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name="chevronLeft" />
    </button>
  )
}

export const monitorVariants: Record<
  MonitorVariant,
  {
    bpm: number
    label: string
    color: string
    markerAngle: number
    movement: { label: string; color: string }
    spo2Num: number
    spo2: string
    tempNum: number
    temp: string
    next: MonitorVariant
  }
> = {
  normal: {
    bpm: 78,
    label: "Ritmo normal",
    color: "#34C759",
    markerAngle: 245,
    movement: { label: "Caminando", color: "#34C759" },
    spo2Num: 98,
    spo2: "98%",
    tempNum: 36.5,
    temp: "36.5°C",
    next: "elevated",
  },
  elevated: {
    bpm: 104,
    label: "Pulso elevado",
    color: "#FF9500",
    markerAngle: 295,
    movement: { label: "En reposo", color: "#FF9500" },
    spo2Num: 93,
    spo2: "93%",
    tempNum: 37.4,
    temp: "37.4°C",
    next: "critical",
  },
  critical: {
    bpm: 132,
    label: "Revisa tu estado",
    color: "#FF3B30",
    markerAngle: 346,
    movement: { label: "Inmóvil", color: "#FF3B30" },
    spo2Num: 88,
    spo2: "88%",
    tempNum: 38.6,
    temp: "38.6°C",
    next: "normal",
  },
}

function getSpo2Color(value: number): string {
  if (value >= 95) return "#34C759"
  if (value >= 90) return "#FF9500"
  return "#FF3B30"
}

function getTemperatureColor(value: number): string {
  if (value < 37.5) return "#34C759"
  if (value <= 38) return "#FF9500"
  return "#FF3B30"
}

const gaugeSegments = [
  { color: "#32ADE6", start: 170, end: 216 },
  { color: "#34C759", start: 222, end: 267 },
  { color: "#FF9500", start: 273, end: 318 },
  { color: "#FF3B30", start: 324, end: 370 },
]

function HeartRateGauge({
  variant,
  isFirstUse = false,
}: {
  variant: MonitorVariant
  isFirstUse?: boolean
}) {
  const state = monitorVariants[variant]
  const cx = 135
  const cy = 126
  const outerRadius = 123
  const innerRadius = 108
  const marker = polarToCartesian(
    cx,
    cy,
    outerRadius,
    isFirstUse ? 170 : state.markerAngle,
  )

  return (
    <div
      className={`gauge ${isFirstUse ? "is-first-use" : ""}`}
      style={{ "--state-color": isFirstUse ? "#8e8e93" : state.color } as CSSProperties}
      aria-label={
        isFirstUse
          ? "Calibrando sensor de pulso cardíaco"
          : `Frecuencia cardíaca actual: ${state.bpm} pulsaciones por minuto`
      }
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
            opacity={isFirstUse ? 0.3 : 1}
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
        <strong className={`bpm-value ${!isFirstUse && state.bpm >= 100 ? "is-three-digit" : ""}`}>
          {isFirstUse ? "--" : state.bpm}
        </strong>
        <span className="bpm-label">BPM</span>
        <svg className="ecg-line" viewBox="0 0 150 26" aria-hidden="true">
          <path pathLength={100} d="M2 14h26l7-2 7-10 10 21 10-17 8 8h20l6-2 6-7 8 15 8-6h30" />
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
  const { config, update, openSpo2Detail, toastMessage } = useDemo()
  const isFirstUse = config.mode === "first-use"
  const isOffline = config.mode === "offline"
  const variant = config.variant
  const state = monitorVariants[variant]

  const movement = isFirstUse
    ? { label: "Calibrando", color: "var(--color-muted)" }
    : state.movement

  return (
    <section
      className={`watch-page monitor-page is-${variant} ${isFirstUse ? "is-first-use" : ""}`}
      style={{ "--state-color": isFirstUse ? "#8e8e93" : state.color } as CSSProperties}
      aria-label="Monitor"
    >
      {toastMessage && (
        <div className="watch-toast-cancelled" role="status" aria-live="polite">
          <Icon name="check" />
          <span>{toastMessage}</span>
        </div>
      )}

      <p className="live-label">
        <span aria-hidden="true" className={isOffline ? "is-offline" : ""} />
        {isFirstUse
          ? "PRIMER USO · CALIBRANDO"
          : isOffline
            ? "SIN CONEXIÓN · MODO LOCAL"
            : "MEDICIÓN EN VIVO"}
      </p>

      <HeartRateGauge variant={variant} isFirstUse={isFirstUse} />

      <button
        type="button"
        className="heart-status"
        onClick={() => {
          if (isFirstUse) return
          update({ variant: state.next })
        }}
        aria-label={`${isFirstUse ? "Calibrando" : state.label}, Ahora. Toca para cambiar estado`}
      >
        <span>{isFirstUse ? "Calibrando..." : state.label}</span>
        <small>{isFirstUse ? "Espera" : "Ahora"}</small>
      </button>

      {/* Chips del Monitor: SpO2 y Movimiento (misma altura y ancho) */}
      <div className="monitor-chips" aria-label="Sensores activos">
        <button
          type="button"
          className={`sensor-chip ${!config.spo2 ? "is-chip-disabled" : ""}`}
          onClick={openSpo2Detail}
          title={config.spo2 ? "Toca para abrir detalle de SpO2" : "Sensor SpO2 no disponible"}
          aria-label={
            config.spo2
              ? `Oxígeno SpO2 ${state.spo2}. Toca para abrir detalle`
              : "Sensor SpO2 no disponible, valor —"
          }
        >
          <span className="chip-label">SpO₂</span>
          <strong
            className="chip-value"
            style={config.spo2 && !isFirstUse ? { color: getSpo2Color(state.spo2Num) } : undefined}
          >
            {!config.spo2 ? (
              <span className="chip-disabled-val">
                <Icon name="lock" />—
              </span>
            ) : isFirstUse ? (
              "--"
            ) : (
              state.spo2
            )}
          </strong>
        </button>

        <div className="sensor-chip">
          <span className="chip-label">Movimiento</span>
          <strong className="chip-value" style={{ color: movement.color }}>
            {movement.label}
          </strong>
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
          <Icon name="users" />
        </button>
      </div>
    </section>
  )
}

/* =====================================================================
   PÁGINA SENSORES
   ===================================================================== */
type SensorTone = "normal" | "warning" | "critical"
type SensorVariantType = "active" | "measuring" | "permission" | "unavailable"

type SensorCardProps = {
  id: "heart" | "spo2" | "temp" | "fall" | "location"
  icon: Parameters<typeof Icon>[0]["name"]
  name: string
  value: string
  unit?: string
  statusLabel: string
  statusTone: SensorTone
  variantType: SensorVariantType
  valueIsText?: boolean
  onClick?: () => void
  onActivatePermission?: () => void
}

const sensorToneColors: Record<SensorTone, string> = {
  normal: "var(--color-green)",
  warning: "var(--color-orange)",
  critical: "var(--color-red)",
}

function SensorCardItem({
  id,
  icon,
  name,
  value,
  unit,
  statusLabel,
  statusTone,
  variantType,
  valueIsText = false,
  onClick,
  onActivatePermission,
}: SensorCardProps) {
  const isClickable = Boolean(onClick) && variantType === "active"
  const toneColor = sensorToneColors[statusTone]
  const valueColor = statusTone === "normal" ? "#ffffff" : toneColor

  return (
    <article
      className={`sensor-list-card is-type-${variantType} is-tone-${statusTone} ${isClickable ? "is-interactive" : ""}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <div className="sensor-card-top">
        <div className="sensor-card-meta">
          <div className="sensor-icon-wrapper">
            <Icon name={icon} />
          </div>
          <span className="sensor-card-title">{name}</span>
        </div>
      </div>

      <div className="sensor-card-bottom">
        {variantType === "active" && (
          <strong
            className={`sensor-value ${valueIsText ? "is-text" : ""}`}
            style={{ color: valueColor }}
          >
            {value} {unit && <small>{unit}</small>}
          </strong>
        )}

        {variantType === "measuring" && <div className="skeleton-value skeleton-shimmer" />}

        {variantType === "permission" && (
          <strong className="sensor-value is-permission">Sin lectura</strong>
        )}

        {variantType === "unavailable" && (
          <strong className="sensor-value is-unavailable">--</strong>
        )}

        {variantType === "active" && (
          <span className="sensor-state-pill is-active" style={{ color: toneColor }}>
            <Icon name={statusTone === "normal" ? "check" : "warning"} />
            {statusLabel}
          </span>
        )}

        {variantType === "measuring" && (
          <span className="sensor-state-pill is-measuring">
            <span className="skeleton-pill skeleton-shimmer" />
          </span>
        )}

        {variantType === "permission" && (
          <button
            type="button"
            className="sensor-state-pill is-permission"
            onClick={(event) => {
              event.stopPropagation()
              onActivatePermission?.()
            }}
          >
            <Icon name="warning" /> Activar
          </button>
        )}

        {variantType === "unavailable" && (
          <span className="sensor-state-pill is-unavailable" title="Sensor no equipado">
            <Icon name="lock" /> No disponible
          </span>
        )}
      </div>
    </article>
  )
}

function SensorsPage() {
  const { config, openSpo2Detail } = useDemo()
  const variant = monitorVariants[config.variant]
  const isFirstUse = config.mode === "first-use"
  const [permissionNotice, setPermissionNotice] = useState(false)
  const noticeTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  const handleActivatePermission = () => {
    setPermissionNotice(true)
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => {
      setPermissionNotice(false)
      noticeTimer.current = null
    }, 2600)
  }

  const getCardVariant = (hasHardware: boolean): SensorVariantType => {
    if (!hasHardware) return "unavailable"
    if (config.sensorMode === "permission") return "permission"
    if (config.sensorMode === "measuring" || isFirstUse) return "measuring"
    return "active"
  }

  const pulseStatus: Record<MonitorVariant, string> = {
    normal: "Normal",
    elevated: "Pulso elevado",
    critical: "Revisa tu estado",
  }
  const pulseTone: Record<MonitorVariant, SensorTone> = {
    normal: "normal",
    elevated: "warning",
    critical: "critical",
  }

  const spo2Color = getSpo2Color(variant.spo2Num)
  const spo2Tone: SensorTone =
    spo2Color === "#FF3B30" ? "critical" : spo2Color === "#FF9500" ? "warning" : "normal"
  const spo2Status =
    spo2Color === "#FF3B30" ? "Muy baja" : spo2Color === "#FF9500" ? "Baja" : "Normal"

  const tempColor = getTemperatureColor(variant.tempNum)
  const tempTone: SensorTone =
    tempColor === "#FF3B30" ? "critical" : tempColor === "#FF9500" ? "warning" : "normal"
  const tempStatus =
    tempColor === "#FF3B30" ? "Fiebre" : tempColor === "#FF9500" ? "Elevada" : "Estable"

  const spo2Type = getCardVariant(config.spo2)
  const spo2Card = (
    <SensorCardItem
      key="spo2"
      id="spo2"
      icon="oxygen"
      name="Oxigenación"
      value={variant.spo2}
      statusLabel={spo2Status}
      statusTone={spo2Tone}
      variantType={spo2Type}
      onClick={spo2Type === "active" ? openSpo2Detail : undefined}
      onActivatePermission={handleActivatePermission}
    />
  )

  const tempCard = (
    <SensorCardItem
      key="temp"
      id="temp"
      icon="thermometer"
      name="Temperatura"
      value={variant.temp}
      statusLabel={tempStatus}
      statusTone={tempTone}
      variantType={getCardVariant(config.temperature)}
      onActivatePermission={handleActivatePermission}
    />
  )

  const availableCards = [
    <SensorCardItem
      key="heart"
      id="heart"
      icon="heart"
      name="Ritmo cardiaco"
      value={String(variant.bpm)}
      unit="BPM"
      statusLabel={pulseStatus[config.variant]}
      statusTone={pulseTone[config.variant]}
      variantType={getCardVariant(true)}
      onActivatePermission={handleActivatePermission}
    />,
    ...(config.spo2 ? [spo2Card] : []),
    ...(config.temperature ? [tempCard] : []),
    <SensorCardItem
      key="fall"
      id="fall"
      icon="walking"
      name="Movimiento"
      value={variant.movement.label}
      valueIsText
      statusLabel={pulseStatus[config.variant]}
      statusTone={pulseTone[config.variant]}
      variantType={getCardVariant(true)}
      onActivatePermission={handleActivatePermission}
    />,
    <SensorCardItem
      key="location"
      id="location"
      icon="location"
      name="Ubicación"
      value="Señal precisa"
      valueIsText
      statusLabel="Se comparte en alertas"
      statusTone="normal"
      variantType={getCardVariant(true)}
      onActivatePermission={handleActivatePermission}
    />,
  ]

  const unavailableCards = [
    ...(config.spo2 ? [] : [spo2Card]),
    ...(config.temperature ? [] : [tempCard]),
  ]

  return (
    <section className="watch-page sensors-page" aria-label="Sensores">
      <div className="sensors-header-fixed">
        <PageHeader icon="sensor">Sensores</PageHeader>
      </div>

      <div className="sensors-scroll-wrap">
        <div className="sensors-scroll-container">
          <div className="sensors-vertical-list">{availableCards}</div>

          {unavailableCards.length > 0 && (
            <>
              <p className="sensors-unavailable-label">No disponibles en tu reloj</p>
              <div className="sensors-vertical-list">{unavailableCards}</div>
            </>
          )}
        </div>
      </div>

      {permissionNotice && (
        <div className="sensors-permission-notice" role="status">
          <Icon name="warning" />
          <span>Permiso solicitado · Actívalo en tu teléfono</span>
        </div>
      )}
    </section>
  )
}


/* =====================================================================
   PANTALLA DE DETALLE: OXIGENACIÓN (SpO2)
   - Porcentaje grande al centro dentro de un anillo (verde >=95%, naranja 90-94%, rojo <90%)
   - Botón "Medir ahora" y texto "Quédate quieto 30 s"
   - Estados: inicial, midiendo (anillo animado con cuenta regresiva), resultado, error
   - Si no tiene sensor: pantalla informativa sencilla ("Tu reloj no mide oxigenación")
   ===================================================================== */
function Spo2DetailScreen({
  onClose,
  onBackToSensors,
}: {
  onClose: () => void
  onBackToSensors: () => void
}) {
  const { config, update, triggerAreYouOk } = useDemo()
  const monitorVariant = monitorVariants[config.variant]
  const screenState = config.spo2ScreenState
  const [countdown, setCountdown] = useState(30)
  const timerRef = useRef<number | null>(null)
  const result = {
    optimal: { percentage: 98, color: "#34C759", label: "Óptimo" },
    low: { percentage: 92, color: "#FF9500", label: "Bajo" },
    "very-low": { percentage: 88, color: "#FF3B30", label: "Muy bajo" },
  }[config.spo2Result]
  const percentage = screenState === "result" ? result.percentage : monitorVariant.spo2Num
  const ringColor =
    percentage >= 95 ? "#34C759" : percentage >= 90 ? "#FF9500" : "#FF3B30"

  useEffect(() => {
    if (screenState === "measuring" && !config.spo2MovementDetected) {
      timerRef.current = window.setInterval(() => {
        setCountdown((current) => {
          if (current <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            update({ spo2ScreenState: "result" })
            return 0
          }
          return current - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [screenState, config.spo2MovementDetected, update])

  const handleStartMeasurement = () => {
    setCountdown(30)
    update({ spo2ScreenState: "measuring" })
  }

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    update({ spo2ScreenState: "idle" })
  }

  if (!config.spo2) {
    return (
      <div className="spo2-detail-screen is-unavailable" role="dialog" aria-modal="true">
        <WatchBackButton onClick={onBackToSensors} label="Volver a Sensores" />
        <header className="spo2-screen-header">
          <h2>Oxigenación</h2>
        </header>

        <div className="spo2-unavailable-view">
          <div className="spo2-unavailable-icon-bubble">
            <Icon name="lock" />
          </div>
          <h3>Tu reloj no mide oxigenación</h3>
          <p>Este modelo no tiene sensor de oxígeno</p>
        </div>

        <div className="spo2-actions-area">
          <button type="button" className="spo2-main-button" onClick={onBackToSensors}>
            Volver a Sensores
          </button>
        </div>
      </div>
    )
  }

  // Anillo de ~40cqw: viewBox 160 con radio 72 + trazo 10 = 154/160 del contenedor.
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const progressPercent =
    screenState === "measuring" ? ((30 - countdown) / 30) * 100 : percentage
  const strokeOffset = circumference - (circumference * progressPercent) / 100

  return (
    <div
      className={`spo2-detail-screen is-${screenState} ${screenState === "result" && config.spo2Result === "very-low" ? "is-very-low" : ""}`}
      role="dialog"
      aria-modal="true"
    >
      <WatchBackButton onClick={onClose} label="Volver" />
      <header className="spo2-screen-header">
        <h2>Oxigenación</h2>
      </header>

      <div className="spo2-ring-container">
        <svg className="spo2-ring-svg" viewBox="0 0 160 160" aria-hidden="true">
          <circle
            className={`spo2-ring-track ${screenState === "error" ? "is-error" : ""}`}
            cx="80"
            cy="80"
            r={radius}
            strokeWidth="10"
          />
          {screenState !== "error" && (
            <circle
              className={`spo2-ring-progress ${screenState === "measuring" ? "is-measuring" : ""} ${config.spo2MovementDetected ? "is-paused" : ""}`}
              cx="80"
              cy="80"
              r={radius}
              strokeWidth="10"
              stroke={config.spo2MovementDetected ? "#FF9500" : ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="spo2-ring-content">
          {screenState === "measuring" && (
            <div className="spo2-measuring-info">
              <strong className="spo2-countdown-value">{countdown}</strong>
              <span className="spo2-countdown-unit">segundos</span>
            </div>
          )}

          {screenState === "error" && (
            <div className="spo2-error-info">
              <Icon name="warning" className="spo2-error-icon" />
            </div>
          )}

          {(screenState === "idle" || screenState === "result") && (
            <div className="spo2-result-info">
              <div className="spo2-value-line">
                <strong
                  className={`spo2-percentage-number ${percentage >= 100 ? "is-three-digits" : ""}`}
                >
                  {percentage}
                </strong>
                <span className="spo2-percent-symbol">%</span>
              </div>
              <span
                className="spo2-level-badge"
                style={{
                  color: ringColor,
                  borderColor: `${ringColor}55`,
                  backgroundColor: `${ringColor}18`,
                }}
              >
                {screenState === "result"
                  ? result.label
                  : percentage >= 95
                    ? "Óptimo"
                    : percentage >= 90
                      ? "Bajo"
                      : "Muy bajo"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="spo2-actions-area">
        {screenState === "idle" && (
          <>
            <p className="spo2-guidance-text">Última medición · hace 12 min</p>
            <button type="button" className="spo2-main-button" onClick={handleStartMeasurement}>
              Medir ahora
            </button>
          </>
        )}

        {screenState === "measuring" && (
          <>
            <p
              className={`spo2-guidance-text ${config.spo2MovementDetected ? "is-movement" : "is-active-measure"}`}
            >
              {config.spo2MovementDetected
                ? "Movimiento detectado: quédate quieto"
                : "Quédate quieto"}
            </p>
            <button type="button" className="spo2-secondary-button" onClick={handleCancel}>
              Cancelar
            </button>
          </>
        )}

        {screenState === "result" && (
          <>
            {config.spo2Result === "optimal" && (
              <p className="spo2-guidance-text">Medición completada · Ahora</p>
            )}
            {config.spo2Result === "low" && (
              <p className="spo2-guidance-text is-low">
                Un poco bajo. Vuelve a medir
              </p>
            )}
            {config.spo2Result === "very-low" && (
              <>
                <p className="spo2-guidance-text is-error">
                  Si sientes falta de aire, pide ayuda
                </p>
                <button type="button" className="spo2-help-button" onClick={triggerAreYouOk}>
                  Pedir ayuda
                </button>
              </>
            )}
            <button
              type="button"
              className="spo2-secondary-button"
              onClick={handleStartMeasurement}
            >
              Medir de nuevo
            </button>
          </>
        )}

        {screenState === "error" && (
          <>
            <div className="spo2-error-copy">
              <strong>No se pudo medir</strong>
              <p>Ajusta el reloj y mantén el brazo quieto</p>
            </div>
            <button type="button" className="spo2-main-button" onClick={handleStartMeasurement}>
              Reintentar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* =====================================================================
   PÁGINA: TU RANGO NORMAL
   - Barra horizontal curva con rango personal (ej. 58-92 BPM) y valor actual marcado
   - Texto "Aprendido de tus últimos 7 días"
   - Estado "Aprendiendo tu ritmo… faltan 5 días" en "Primer uso"
   ===================================================================== */
function RangePage() {
  const { config } = useDemo()
  const isFirstUse = config.mode === "first-use"
  const variant = monitorVariants[config.variant]

  // Espectro de 40 a 160 BPM
  const minBpm = 40
  const maxBpm = 160
  const currentBpm = isFirstUse ? 75 : variant.bpm
  const t = Math.max(0.06, Math.min(0.94, (currentBpm - minBpm) / (maxBpm - minBpm)))

  // Curva cuadrática horizontal: P0(20, 52), P1(120, 16), P2(220, 52)
  const p0 = { x: 20, y: 52 }
  const p1 = { x: 120, y: 16 }
  const p2 = { x: 220, y: 52 }

  const markerX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x
  const markerY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y

  return (
    <section className="watch-page standard-page range-page-wrapper" aria-label="Tu rango normal">
      <PageHeader icon="heart">Tu rango normal</PageHeader>

      <div className="range-main-content">
        <p className="range-condition-label">
          {isFirstUse ? "Calibración inicial" : "En reposo"}
        </p>

        <div className="range-hero-numbers">
          <strong className="range-hero-value">{isFirstUse ? "--" : "58–92"}</strong>
          <span className="range-hero-unit">BPM</span>
        </div>

        {/* Barra horizontal curva SVG con rango personal 58-92 BPM y marcador */}
        <div className="range-curved-bar-container">
          <svg className="range-curved-svg" viewBox="0 0 240 70" aria-hidden="true">
            {/* Pista base curva */}
            <path
              className="range-curved-track"
              d="M 20 52 Q 120 16 220 52"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* Tramo del rango personal aprendido (58-92 BPM) */}
            {!isFirstUse && (
              <path
                className="range-curved-highlight"
                d="M 52 42 Q 120 22 156 36"
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
              />
            )}
            {/* Marcador del valor actual */}
            <circle
              className="range-curved-marker-shadow"
              cx={markerX}
              cy={markerY}
              r="7.5"
            />
            <circle
              className="range-curved-marker"
              cx={markerX}
              cy={markerY}
              r="6"
              fill={isFirstUse ? "#8e8e93" : variant.color}
            />
          </svg>
        </div>

        {/* Estado actual / días restantes */}
        {isFirstUse ? (
          <div className="range-status-box is-learning">
            <span className="range-learning-text">
              Aprendiendo tu ritmo… faltan 5 días
            </span>
          </div>
        ) : (
          <div className="range-status-box">
            <span className="range-current-badge" style={{ color: variant.color }}>
              Actual: {variant.bpm} BPM ({variant.label})
            </span>
            <small className="range-learned-footnote">
              Aprendido de tus últimos 7 días
            </small>
          </div>
        )}
      </div>
    </section>
  )
}

/* =====================================================================
   PÁGINA: FICHA MÉDICA
   - Tarjetas con tipo de sangre, alergias, medicamentos y condición
   - Estado vacío "Complétala en tu teléfono"
   ===================================================================== */
function MedicalPage() {
  const { config, update } = useDemo()
  const isFirstUse = config.mode === "first-use"
  const isEmpty = config.medicalEmpty || isFirstUse

  return (
    <section className="watch-page standard-page medical-page-wrapper" aria-label="Ficha médica">
      <PageHeader icon="medical">Ficha médica</PageHeader>

      <div className="medical-scroll-container">
        {isEmpty ? (
          <div className="medical-empty-view">
            <div className="medical-empty-icon-wrap">
              <Icon name="smartphone" />
            </div>
            <h3>Complétala en tu teléfono</h3>
            <p>
              Abre la aplicación de salud en tu teléfono para registrar tu grupo sanguíneo,
              alergias y medicamentos.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => update({ medicalEmpty: false })}
            >
              Simular datos
            </button>
          </div>
        ) : (
          <div className="medical-cards-stack">
            {/* 1. Tipo de sangre */}
            <div className="info-card medical-row-card">
              <div className="medical-row-label">
                <Icon name="heart" />
                <span>Tipo de sangre</span>
              </div>
              <strong className="medical-val-highlight">O+</strong>
            </div>

            {/* 2. Alergias */}
            <div className="info-card medical-row-card">
              <div className="medical-row-label">
                <Icon name="warning" />
                <span>Alergias</span>
              </div>
              <strong>Penicilina</strong>
            </div>

            {/* 3. Medicamentos */}
            <div className="info-card medical-row-card">
              <div className="medical-row-label">
                <Icon name="pill" />
                <span>Medicamentos</span>
              </div>
              <strong>Enalapril 10mg</strong>
            </div>

            {/* 4. Condición */}
            <div className="info-card medical-row-card">
              <div className="medical-row-label">
                <Icon name="shield" />
                <span>Condición</span>
              </div>
              <strong>Hipertensión</strong>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* =====================================================================
   PÁGINA: CONTACTOS
   - Lista con avatar de iniciales, nombre, relación y botón verde de llamar (máx 5)
   - Estado vacío con botón "Añadir" dentro de la zona segura
   - "Añadir contacto" dice "Elige desde tu teléfono" (no hay teclado en el reloj)
   - Botón de regresar de 48 px dentro del círculo
   ===================================================================== */
function ContactsPage({ onBackToMonitor }: { onBackToMonitor: () => void }) {
  const { config, update } = useDemo()
  const isFirstUse = config.mode === "first-use"
  const isEmpty = config.contactsEmpty || isFirstUse

  const [showPhonePickerModal, setShowPhonePickerModal] = useState(false)
  const [callingName, setCallingName] = useState<string | null>(null)

  const contactsList = [
    { id: "1", name: "María López", role: "Madre", initials: "ML", color: "#e05656" },
    { id: "2", name: "Carlos Gómez", role: "Hermano", initials: "CG", color: "#32ade6" },
    { id: "3", name: "Dra. Elena Ruiz", role: "Médica", initials: "ER", color: "#34c759" },
    { id: "4", name: "Pedro Morales", role: "Cónyuge", initials: "PM", color: "#ff9500" },
    { id: "5", name: "Emergencias 112", role: "Ambulancia", initials: "SOS", color: "#ff3b30" },
  ]

  const handleCall = (name: string) => {
    setCallingName(name)
    setTimeout(() => {
      setCallingName(null)
    }, 2500)
  }

  return (
    <section className="watch-page contacts-page-wrapper" aria-label="Contactos">
      <WatchBackButton onClick={onBackToMonitor} label="Volver al monitor principal" />
      <div className="contacts-top-bar">
        <PageHeader icon="phone">Contactos</PageHeader>
      </div>

      <div className="contacts-scroll-area">
        {isEmpty ? (
          <div className="contacts-empty-state">
            <div className="empty-icon-bubble">
              <Icon name="user" />
            </div>
            <strong>Sin contactos</strong>
            <span>Añade contactos de emergencia</span>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowPhonePickerModal(true)}
            >
              Añadir
            </button>
          </div>
        ) : (
          <div className="contacts-list-container">
            {contactsList.map((c) => (
              <article key={c.id} className="contact-item-row">
                <div
                  className="contact-avatar-bubble"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                <div className="contact-details-col">
                  <strong>{c.name}</strong>
                  <span>{c.role}</span>
                </div>
                <button
                  type="button"
                  className="contact-call-green-btn"
                  onClick={() => handleCall(c.name)}
                  aria-label={`Llamar a ${c.name}`}
                >
                  <Icon name="phone" />
                </button>
              </article>
            ))}

            <button
              type="button"
              className="contacts-add-phone-link"
              onClick={() => setShowPhonePickerModal(true)}
            >
              + Añadir otro contacto
            </button>
          </div>
        )}
      </div>

      {/* Modal / Mensaje: "Elige desde tu teléfono" (no hay teclado en el reloj) */}
      {showPhonePickerModal && (
        <div className="watch-modal-overlay" role="dialog" aria-modal="true">
          <div className="watch-modal-card">
            <div className="modal-phone-icon">
              <Icon name="smartphone" />
            </div>
            <h3>Elige desde tu teléfono</h3>
            <p>
              Por comodidad y seguridad, selecciona y administra tus contactos desde la app
              de salud en tu teléfono.
            </p>
            <div className="modal-buttons-row">
              <button
                type="button"
                className="safe-confirm-btn"
                onClick={() => {
                  setShowPhonePickerModal(false)
                  update({ contactsEmpty: false })
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de llamada en curso */}
      {callingName && (
        <div className="watch-calling-pill" role="status">
          <Icon name="phone" />
          <span>Llamando a {callingName}…</span>
        </div>
      )}
    </section>
  )
}

/* =====================================================================
   PÁGINA: AJUSTES
   - Sensibilidad (baja/media/alta)
   - Tiempo entre avisos (1/3/5/10 min)
   - Modo ejercicio (interruptor)
   - Ahorro de batería (interruptor)
   - Detección de caídas (deshabilitado si el reloj no la tiene)
   ===================================================================== */
function SettingsPage() {
  const { config, update } = useDemo()

  const [sensitivity, setSensitivity] = useState<"Baja" | "Media" | "Alta">("Media")
  const [noticeTime, setNoticeTime] = useState<"1 min" | "3 min" | "5 min" | "10 min">("5 min")
  const [exerciseMode, setExerciseMode] = useState(false)
  const [batterySaver, setBatterySaver] = useState(false)

  const cycleSensitivity = () => {
    if (sensitivity === "Baja") setSensitivity("Media")
    else if (sensitivity === "Media") setSensitivity("Alta")
    else setSensitivity("Baja")
  }

  const cycleNoticeTime = () => {
    if (noticeTime === "1 min") setNoticeTime("3 min")
    else if (noticeTime === "3 min") setNoticeTime("5 min")
    else if (noticeTime === "5 min") setNoticeTime("10 min")
    else setNoticeTime("1 min")
  }

  return (
    <section className="watch-page standard-page settings-page-wrapper" aria-label="Ajustes">
      <PageHeader icon="settings">Ajustes</PageHeader>

      <div className="settings-scroll-stack">
        {/* 1. Sensibilidad: baja / media / alta */}
        <button
          type="button"
          className="info-card setting-row-item"
          onClick={cycleSensitivity}
        >
          <div className="setting-label-block">
            <span>Sensibilidad</span>
            <small>Toca para cambiar</small>
          </div>
          <span className="setting-cycle-badge">{sensitivity}</span>
        </button>

        {/* 2. Tiempo entre avisos: 1 / 3 / 5 / 10 min */}
        <button
          type="button"
          className="info-card setting-row-item"
          onClick={cycleNoticeTime}
        >
          <div className="setting-label-block">
            <span>Tiempo avisos</span>
            <small>Intervalo de SOS</small>
          </div>
          <span className="setting-cycle-badge">{noticeTime}</span>
        </button>

        {/* 3. Modo ejercicio: interruptor */}
        <button
          type="button"
          className="info-card setting-row-item"
          onClick={() => setExerciseMode(!exerciseMode)}
        >
          <div className="setting-label-block">
            <span>Modo ejercicio</span>
            <small>Frecuencia de lectura alta</small>
          </div>
          <span
            className={`toggle ${exerciseMode ? "on" : ""}`}
            aria-label={exerciseMode ? "Modo ejercicio activo" : "Modo ejercicio desactivado"}
          >
            <i />
          </span>
        </button>

        {/* 4. Ahorro de batería: interruptor */}
        <button
          type="button"
          className="info-card setting-row-item"
          onClick={() => setBatterySaver(!batterySaver)}
        >
          <div className="setting-label-block">
            <span>Ahorro batería</span>
            <small>Atenúa lecturas de fondo</small>
          </div>
          <span
            className={`toggle ${batterySaver ? "on" : ""}`}
            aria-label={batterySaver ? "Ahorro de batería activo" : "Ahorro desactivado"}
          >
            <i />
          </span>
        </button>

        {/* 5. Detección de caídas: deshabilitado si el reloj no la tiene */}
        <button
          type="button"
          className={`info-card setting-row-item ${!config.fallDetection ? "is-disabled" : ""}`}
          onClick={() => {
            if (!config.fallDetection) return
            update({ fallDetection: false })
          }}
          disabled={!config.fallDetection}
          title={
            !config.fallDetection
              ? "Deshabilitado: el reloj no cuenta con sensor de caídas"
              : "Detección de caídas activa"
          }
        >
          <div className="setting-label-block">
            <span>Detección caídas</span>
            <small>
              {!config.fallDetection ? "No disponible en tu reloj" : "Acelerómetro continuo"}
            </small>
          </div>
          <span
            className={`toggle ${config.fallDetection ? "on" : ""}`}
            aria-label={config.fallDetection ? "Activada" : "Desactivada"}
          >
            <i />
          </span>
        </button>
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

function AreYouOkScreen({
  onSafe,
  onEmergency,
}: {
  onSafe: () => void
  onEmergency: () => void
}) {
  const [seconds, setSeconds] = useState(30)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          onEmergency()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [onEmergency])

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (circumference * (30 - seconds)) / 30

  return (
    <div className="are-you-ok-screen" role="alertdialog" aria-modal="true">
      <div className="are-you-ok-header">
        <h2>¿ESTÁS BIEN?</h2>
        <p>Avisaremos a tus contactos</p>
      </div>

      <div className="are-you-ok-countdown-container">
        <svg className="are-you-ok-ring-svg" viewBox="0 0 128 128" aria-hidden="true">
          <circle
            className="countdown-ring-track"
            cx="64"
            cy="64"
            r={radius}
            strokeWidth="8"
          />
          <circle
            className="countdown-ring-progress"
            cx="64"
            cy="64"
            r={radius}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
          />
        </svg>
        <div className="countdown-ring-text">
          <strong className="countdown-number">{seconds}</strong>
          <span className="countdown-unit">s</span>
        </div>
      </div>

      <div className="are-you-ok-stacked-buttons">
        <button
          type="button"
          className="btn-im-fine"
          onClick={onSafe}
          aria-label="Estoy bien, cancelar aviso"
        >
          Estoy bien
        </button>

        <button
          type="button"
          className="btn-help-now"
          onClick={onEmergency}
          aria-label="Pedir ayuda ya"
        >
          Pedir ayuda ya
        </button>
      </div>
    </div>
  )
}

function AlertSentScreen({
  onCancelAlert,
}: {
  onCancelAlert: () => void
}) {
  const { config } = useDemo()
  const variant = monitorVariants[config.variant]
  const isOffline = config.mode === "offline"

  const [nextNoticeSeconds, setNextNoticeSeconds] = useState(300)
  const [showConfirm, setShowConfirm] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setNextNoticeSeconds((prev) => (prev > 0 ? prev - 1 : 300))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const minutes = String(Math.floor(nextNoticeSeconds / 60)).padStart(2, "0")
  const secs = String(nextNoticeSeconds % 60).padStart(2, "0")
  const timerDisplay = `${minutes}:${secs}`

  const contacts = [
    {
      id: "1",
      name: "María López",
      role: "Madre",
      status: "Recibido",
      type: "received",
    },
    {
      id: "2",
      name: "Carlos Gómez",
      role: "Hermano",
      status: "Va en camino",
      type: "onway",
    },
  ]

  return (
    <div className="alert-sent-screen" role="alert" aria-modal="true">
      <div className="alert-sent-content-scroll">
        <div className="alert-sent-header">
          <div className="alert-sent-check-circle">
            <Icon name="check" />
          </div>
          <h2>Alerta enviada</h2>

          {isOffline ? (
            <div className="alert-offline-banner">
              <Icon name="wifiOff" />
              <span>Sin conexión: reintentando…</span>
            </div>
          ) : (
            <p className="alert-sent-subtitle">Alerta enviada a 2 contactos</p>
          )}
        </div>

        <div className="alert-contacts-container">
          {contacts.map((contact) => (
            <div key={contact.id} className="alert-contact-card">
              <div className="alert-contact-info">
                <strong>{contact.name}</strong>
                <span>{contact.role}</span>
              </div>
              <span className={`alert-status-badge is-${contact.type}`}>
                {contact.type === "onway" && <span className="alert-pulsing-dot" />}
                {contact.type === "received" && <Icon name="check" />}
                {contact.status}
              </span>
            </div>
          ))}
        </div>

        <div className="alert-metrics-card">
          <div className="alert-metric-row">
            <Icon name="heart" />
            <span>Frecuencia:</span>
            <strong>{variant.bpm} BPM</strong>
          </div>
          <div className="alert-metric-row">
            <Icon name="location" />
            <span>Ubicación compartida</span>
          </div>
        </div>

        <div className="alert-timer-banner">
          <small>Próximo aviso en {timerDisplay}</small>
        </div>

        <div className="alert-cancel-action-wrap">
          <button
            type="button"
            className="alert-cancel-button"
            onClick={() => setShowConfirm(true)}
            aria-label="Cancelar alerta de emergencia"
          >
            Cancelar alerta
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="alert-confirm-dialog-overlay" role="dialog" aria-modal="true">
          <div className="alert-confirm-dialog-card">
            <div className="confirm-warning-icon">
              <Icon name="warning" />
            </div>
            <h3>¿Cancelar alerta?</h3>
            <p>Se avisará a tus contactos de que la emergencia fue descartada.</p>
            <div className="confirm-buttons-stack">
              <button
                type="button"
                className="confirm-yes-btn"
                onClick={onCancelAlert}
              >
                Sí, cancelar alerta
              </button>
              <button
                type="button"
                className="confirm-stay-btn"
                onClick={() => setShowConfirm(false)}
              >
                Continuar alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DemoPanel() {
  const { config, update, triggerAreYouOk, triggerAlertSent, openSpo2Detail, closeSpo2Detail } =
    useDemo()
  const [isExpanded, setIsExpanded] = useState(true)
  const currentVariant = monitorVariants[config.variant]

  const pulseOptions: { id: MonitorVariant; label: string; bpm: number }[] = [
    { id: "normal", label: "Normal", bpm: 78 },
    { id: "elevated", label: "Elevado", bpm: 104 },
    { id: "critical", label: "Crítico", bpm: 132 },
  ]

  const sensorVariantOptions: { id: SensorVariantMode; label: string }[] = [
    { id: "live", label: "a) Activo" },
    { id: "measuring", label: "b) Midiendo (Skeleton)" },
    { id: "permission", label: "c) Permiso requerido" },
  ]

  const spo2States: { id: Spo2ScreenState; label: string }[] = [
    { id: "idle", label: "Inicial" },
    { id: "measuring", label: "Midiendo" },
    { id: "result", label: "Resultado" },
    { id: "error", label: "Error" },
  ]
  const spo2ResultOptions: { id: Spo2ResultVariant; label: string }[] = [
    { id: "optimal", label: "Óptimo" },
    { id: "low", label: "Bajo" },
    { id: "very-low", label: "Muy bajo" },
  ]

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="demo-floating-trigger"
        onClick={() => setIsExpanded(true)}
        aria-label="Mostrar panel de demostración"
      >
        <span className="demo-trigger-icon">⚙️</span>
        <span className="demo-trigger-label">Panel Demo</span>
        <span
          className="demo-trigger-dot"
          style={{ backgroundColor: currentVariant.color }}
          title={`Estado actual: ${currentVariant.label}`}
        />
      </button>
    )
  }

  return (
    <aside className="demo-panel-container" aria-label="Panel de demostración">
      <div className="demo-panel-header">
        <div className="demo-panel-title">
          <span className="demo-panel-badge">DEMO</span>
          <h3>Control de Estados</h3>
        </div>
        <button
          type="button"
          className="demo-collapse-btn"
          onClick={() => setIsExpanded(false)}
          title="Plegar panel"
          aria-label="Plegar panel de demostración"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="demo-panel-body">
        {/* Selector de estado del pulso */}
        <div className="demo-group">
          <div className="demo-group-label-row">
            <span className="demo-group-label">Selector de estado del pulso</span>
            <small style={{ color: currentVariant.color }}>
              {config.mode === "first-use"
                ? "-- BPM"
                : `${currentVariant.bpm} BPM · ${currentVariant.label}`}
            </small>
          </div>
          <div className="demo-segmented">
            {pulseOptions.map((option) => {
              const opt = monitorVariants[option.id]
              const isSelected =
                config.variant === option.id && config.mode !== "first-use"
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`demo-segment-btn ${isSelected ? "is-selected" : ""}`}
                  style={
                    isSelected
                      ? {
                          borderColor: opt.color,
                          color: opt.color,
                          backgroundColor: `${opt.color}1c`,
                        }
                      : {}
                  }
                  onClick={() => {
                    if (option.id === "critical") {
                      update({
                        variant: "critical",
                        alertState: "are-you-ok",
                        mode: config.mode === "first-use" ? "live" : config.mode,
                      })
                    } else {
                      update({
                        variant: option.id,
                        mode: config.mode === "first-use" ? "live" : config.mode,
                      })
                    }
                  }}
                >
                  <span
                    className="demo-dot"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span>{option.label}</span>
                  <small>{option.bpm} BPM</small>
                </button>
              )
            })}
          </div>
        </div>

        {/* Interruptores de hardware */}
        <div className="demo-group">
          <span className="demo-group-label">Sensores del reloj (Hardware)</span>
          <div className="demo-switch-list">
            <label className="demo-switch-item">
              <span className="demo-switch-label">
                <strong>Reloj con sensor de oxigenación (SpO2)</strong>
                <small>
                  {config.spo2
                    ? "Equipado (lectura y detalle)"
                    : "No equipado (Variante d: opacidad 40% y candado)"}
                </small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.spo2}
                className={`demo-switch-toggle ${config.spo2 ? "is-on" : ""}`}
                onClick={() => update({ spo2: !config.spo2 })}
              >
                <span className="demo-switch-thumb" />
              </button>
            </label>

            <label className="demo-switch-item">
              <span className="demo-switch-label">
                <strong>Reloj con sensor de temperatura</strong>
                <small>
                  {config.temperature
                    ? "Equipado (lectura en vivo)"
                    : "No equipado (Variante d: no disponible)"}
                </small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.temperature}
                className={`demo-switch-toggle ${config.temperature ? "is-on" : ""}`}
                onClick={() => update({ temperature: !config.temperature })}
              >
                <span className="demo-switch-thumb" />
              </button>
            </label>

            <label className="demo-switch-item">
              <span className="demo-switch-label">
                <strong>Reloj con detección de caídas</strong>
                <small>
                  {config.fallDetection
                    ? "Acelerómetro activo"
                    : "No equipado (Variante d: deshabilitado en ajustes)"}
                </small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.fallDetection}
                className={`demo-switch-toggle ${config.fallDetection ? "is-on" : ""}`}
                onClick={() => update({ fallDetection: !config.fallDetection })}
              >
                <span className="demo-switch-thumb" />
              </button>
            </label>
          </div>
        </div>

        {/* Variantes de listas y estados vacíos */}
        <div className="demo-group">
          <span className="demo-group-label">Estados de pantallas</span>
          <div className="demo-switch-list">
            <label className="demo-switch-item">
              <span className="demo-switch-label">
                <strong>Ficha médica vacía</strong>
                <small>Muestra "Complétala en tu teléfono"</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.medicalEmpty}
                className={`demo-switch-toggle ${config.medicalEmpty ? "is-on" : ""}`}
                onClick={() => update({ medicalEmpty: !config.medicalEmpty })}
              >
                <span className="demo-switch-thumb" />
              </button>
            </label>

            <label className="demo-switch-item">
              <span className="demo-switch-label">
                <strong>Contactos vacíos</strong>
                <small>Muestra botón "Añadir" y aviso teléfono</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={config.contactsEmpty}
                className={`demo-switch-toggle ${config.contactsEmpty ? "is-on" : ""}`}
                onClick={() => update({ contactsEmpty: !config.contactsEmpty })}
              >
                <span className="demo-switch-thumb" />
              </button>
            </label>
          </div>
        </div>

        {/* Selector de variantes para tarjetas de sensores */}
        <div className="demo-group">
          <div className="demo-group-label-row">
            <span className="demo-group-label">Variantes lista Sensores</span>
            <small style={{ color: "#a1a1aa" }}>a, b ó c</small>
          </div>
          <div className="demo-segmented">
            {sensorVariantOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`demo-segment-btn ${config.sensorMode === opt.id ? "is-selected" : ""}`}
                onClick={() => update({ sensorMode: opt.id })}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle SpO2 */}
        <div className="demo-group">
          <div className="demo-group-label-row">
            <span className="demo-group-label">Detalle SpO2</span>
            <button
              type="button"
              className="demo-inline-btn"
              onClick={() => {
                if (config.activeDetail === "spo2") closeSpo2Detail()
                else openSpo2Detail()
              }}
            >
              {config.activeDetail === "spo2" ? "Cerrar" : "Abrir pantalla"}
            </button>
          </div>
          <div className="demo-segmented">
            {spo2States.map((st) => (
              <button
                key={st.id}
                type="button"
                className={`demo-segment-btn ${config.spo2ScreenState === st.id ? "is-selected" : ""}`}
                onClick={() => {
                  update({ spo2ScreenState: st.id })
                  openSpo2Detail()
                }}
              >
                <span>{st.label}</span>
              </button>
            ))}
          </div>
          <span className="demo-group-label">Resultado SpO2:</span>
          <div className="demo-segmented">
            {spo2ResultOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`demo-segment-btn ${config.spo2Result === option.id ? "is-selected" : ""}`}
                onClick={() => {
                  update({ spo2Result: option.id, spo2ScreenState: "result" })
                  openSpo2Detail()
                }}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <div className="demo-switch-list">
            <button
              type="button"
              className="demo-switch-item"
              role="switch"
              aria-checked={config.spo2MovementDetected}
              onClick={() =>
                update({ spo2MovementDetected: !config.spo2MovementDetected })
              }
            >
              <span className="demo-switch-label">
                <strong>Movimiento detectado durante la medición</strong>
                <small>{config.spo2MovementDetected ? "Activado" : "Desactivado"}</small>
              </span>
              <span
                className={`demo-switch-toggle ${config.spo2MovementDetected ? "is-on" : ""}`}
                aria-hidden="true"
              >
                <span className="demo-switch-thumb" />
              </span>
            </button>
          </div>
        </div>

        {/* Botones de acción y flujo de emergencia */}
        <div className="demo-group">
          <span className="demo-group-label">Flujo de Emergencia y Modos</span>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-action-btn demo-alert-btn"
              onClick={triggerAreYouOk}
            >
              <div className="demo-action-text">
                <Icon name="warning" className="demo-btn-icon" />
                <span>Simular alerta</span>
              </div>
              <small>Lanza ¿Estás bien?</small>
            </button>

            <button
              type="button"
              className="demo-action-btn"
              onClick={triggerAlertSent}
            >
              <div className="demo-action-text">
                <Icon name="check" className="demo-btn-icon" />
                <span>Ver Alerta enviada</span>
              </div>
              <small>Pantalla 2 directa</small>
            </button>

            <button
              type="button"
              className={`demo-action-btn ${config.mode === "offline" ? "is-active" : ""}`}
              onClick={() =>
                update({ mode: config.mode === "offline" ? "live" : "offline" })
              }
            >
              <div className="demo-action-text">
                <Icon name="wifiOff" className="demo-btn-icon" />
                <span>Sin conexión</span>
              </div>
              <small>
                {config.mode === "offline" ? "Modo offline ON" : "Desconectado"}
              </small>
            </button>

            <button
              type="button"
              className={`demo-action-btn ${config.mode === "first-use" ? "is-active" : ""}`}
              onClick={() =>
                update({ mode: config.mode === "first-use" ? "live" : "first-use" })
              }
            >
              <div className="demo-action-text">
                <Icon name="sensor" className="demo-btn-icon" />
                <span>Primer uso (sin datos)</span>
              </div>
              <small>
                {config.mode === "first-use" ? "Calibrando" : "Sin historial"}
              </small>
            </button>
          </div>
        </div>
      </div>

      <div className="demo-panel-footer">
        <button
          type="button"
          className="demo-hide-link"
          onClick={() => setIsExpanded(false)}
        >
          Ocultar panel
        </button>
      </div>
    </aside>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState(0)
  const [demoConfig, setDemoConfig] = useState<DemoConfig>({
    variant: "normal",
    spo2: true,
    temperature: true,
    fallDetection: true,
    mode: "live",
    alertState: "none",
    sensorMode: "live",
    spo2ScreenState: "idle",
    spo2Result: "optimal",
    spo2MovementDetected: false,
    activeDetail: "none",
    medicalEmpty: false,
    contactsEmpty: false,
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

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
    if (!gestureStart.current || demoConfig.alertState !== "none") return

    const deltaX = (event.clientX - gestureStart.current.x) / watchScale
    const deltaY = (event.clientY - gestureStart.current.y) / watchScale
    gestureStart.current = null

    if (demoConfig.activeDetail === "spo2") {
      if (deltaX > 55) {
        setDemoConfig((curr) => ({ ...curr, activeDetail: "none" }))
      }
      return
    }

    // Swipe horizontal para volver a Monitor
    if (deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setActivePage((page) => Math.max(0, page - 1))
      return
    }

    // Swipe vertical entre páginas del reloj
    if (Math.abs(deltaY) > 45 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setActivePage((page) =>
        Math.min(pages.length - 1, Math.max(0, page + (deltaY < 0 ? 1 : -1))),
      )
    }
  }

  const updateDemo = useCallback((next: Partial<DemoConfig>) => {
    setDemoConfig((current) => ({ ...current, ...next }))
  }, [])

  const triggerAreYouOk = () => {
    setActivePage(0)
    setToastMessage(null)
    setDemoConfig((curr) => ({ ...curr, alertState: "are-you-ok", activeDetail: "none" }))
  }

  const triggerAlertSent = () => {
    setActivePage(0)
    setToastMessage(null)
    setDemoConfig((curr) => ({ ...curr, alertState: "alert-sent", activeDetail: "none" }))
  }

  const dismissAlertWithToast = () => {
    setActivePage(0)
    setDemoConfig((curr) => ({ ...curr, alertState: "none", activeDetail: "none" }))
    setToastMessage("Alerta cancelada")
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const dismissAlert = () => {
    setDemoConfig((curr) => ({ ...curr, alertState: "none" }))
  }

  const openSpo2Detail = () => {
    setDemoConfig((curr) => ({ ...curr, activeDetail: "spo2" }))
  }

  const closeSpo2Detail = () => {
    setDemoConfig((curr) => ({ ...curr, activeDetail: "none" }))
  }

  return (
    <DemoContext.Provider
      value={{
        config: demoConfig,
        update: updateDemo,
        triggerAreYouOk,
        triggerAlertSent,
        dismissAlertWithToast,
        dismissAlert,
        openSpo2Detail,
        closeSpo2Detail,
        toastMessage,
      }}
    >
      <main
        ref={shellRef}
        className="app-shell"
        style={{ "--watch-scale": watchScale } as CSSProperties}
      >
        <div className="watch-stage">
          <div
            className="watch-frame"
            onPointerDown={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  "button, [role='button'], input, label, .sensor-list-card, .sensor-chip",
                )
              )
                return
              gestureStart.current = { x: event.clientX, y: event.clientY }
            }}
            onPointerUp={finishGesture}
            onPointerCancel={() => {
              gestureStart.current = null
            }}
          >
            {/* Indicador de modo offline en el reloj */}
            {demoConfig.mode === "offline" && (
              <div className="watch-offline-pill" aria-label="Modo sin conexión">
                <Icon name="wifiOff" />
                <span>Sin conexión</span>
              </div>
            )}

            <div
              className="page-track"
              style={{ transform: `translateY(-${activePage * 100}%)` }}
            >
              <MonitorPage
                onSos={triggerAreYouOk}
                onContacts={() => setActivePage(4)}
              />
              <SensorsPage />
              <RangePage />
              <MedicalPage />
              <ContactsPage onBackToMonitor={() => setActivePage(0)} />
              <SettingsPage />
            </div>

            {/* Indicador de página lateral continuo */}
            <PageIndicator active={activePage} onSelect={setActivePage} />

            {/* Pantalla de detalle OXIGENACIÓN (SpO2) */}
            {demoConfig.activeDetail === "spo2" && (
              <Spo2DetailScreen
                onClose={closeSpo2Detail}
                onBackToSensors={() => {
                  closeSpo2Detail()
                  setActivePage(1)
                }}
              />
            )}

            {/* Pantalla 1: ¿ESTÁS BIEN? */}
            {demoConfig.alertState === "are-you-ok" && (
              <AreYouOkScreen
                onSafe={dismissAlertWithToast}
                onEmergency={triggerAlertSent}
              />
            )}

            {/* Pantalla 2: ALERTA ENVIADA */}
            {demoConfig.alertState === "alert-sent" && (
              <AlertSentScreen onCancelAlert={dismissAlertWithToast} />
            )}
          </div>
        </div>

        {/* Panel de demostración externo */}
        <DemoPanel />
      </main>
    </DemoContext.Provider>
  )
}
