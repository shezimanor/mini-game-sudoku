/** 共用彈窗：置中對話框 + 模糊遮罩（§5、§9.6） */

import type { ReactNode } from 'react'
import './Modal.css'

export interface ModalAction {
  label: string
  variant?: 'primary' | 'secondary'
  onClick: () => void
}

interface Props {
  title: string
  tone?: 'default' | 'danger'
  children?: ReactNode
  actions: ModalAction[]
}

export function Modal({ title, tone = 'default', children, actions }: Props) {
  return (
    // FR-0.3、FR-0.4：遮罩攔住後方所有互動，且不因點擊遮罩或 Esc 而關閉
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h2 className={`modal__title${tone === 'danger' ? ' modal__title--danger' : ''}`}>
          {title}
        </h2>

        {children && <div className="modal__body">{children}</div>}

        <div className="modal__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`modal__button modal__button--${action.variant ?? 'secondary'}`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
