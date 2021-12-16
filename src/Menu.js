import './Menu.css'

export function Menu({ element, children, transition = false }) {
  return (
    <div className={`Menu${transition ? ' transition' : ''}`}>
      <div className="element">
        {element}
      </div>
      <div className="overlay" />
      <div className="container">
        {children}
      </div>
    </div>
  )
}

export function MenuItem({ message, onClick }) {
  return (
    <div className={`content ${onClick && 'clickable'}`} onClick={()=> onClick && onClick()}>
      {message}
    </div>  
  )
}
