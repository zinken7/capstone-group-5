interface StateMessageProps {
  title: string
  message: string
  variant?: 'empty' | 'loading' | 'error'
}

function StateMessage({ title, message, variant = 'empty' }: StateMessageProps) {
  return (
    <section className={`state-message state-message--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  )
}

export default StateMessage
