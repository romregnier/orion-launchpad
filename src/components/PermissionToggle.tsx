import { motion } from 'framer-motion'

interface PermissionToggleProps {
  isOn: boolean
  isDisabled?: boolean
  onChange?: (v: boolean) => void
  layoutId?: string
}

export function PermissionToggle({ isOn, isDisabled = false, onChange, layoutId }: PermissionToggleProps) {
  return (
    <div
      onClick={() => !isDisabled && onChange?.(!isOn)}
      title={isDisabled ? 'Cette permission ne peut pas être modifiée' : undefined}
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: isOn ? '#22C55E' : 'rgba(255,255,255,0.10)',
        border: isOn ? 'none' : '1px solid rgba(255,255,255,0.15)',
        position: 'relative',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s ease',
        opacity: isDisabled ? 0.40 : 1,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <motion.div
        layoutId={layoutId}
        animate={{ x: isOn ? 15 : 2 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}
