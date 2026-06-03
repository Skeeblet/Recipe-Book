export default function RecipeListEnd() {
  return (
    <div className="deck-end">
      <svg className="deck-end-web" viewBox="0 0 100 92" fill="none"
           stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
        {/* 6 spokes from centre */}
        <line x1="50" y1="50" x2="50" y2="10"/>
        <line x1="50" y1="50" x2="84" y2="30"/>
        <line x1="50" y1="50" x2="84" y2="70"/>
        <line x1="50" y1="50" x2="50" y2="90"/>
        <line x1="50" y1="50" x2="16" y2="70"/>
        <line x1="50" y1="50" x2="16" y2="30"/>
        {/* Inner ring */}
        <polygon points="50,33 65,41.5 65,58.5 50,67 35,58.5 35,41.5"/>
        {/* Middle ring */}
        <polygon points="50,22 74,36 74,64 50,78 26,64 26,36"/>
        {/* Outer ring */}
        <polygon points="50,10 84,30 84,70 50,90 16,70 16,30"/>
        {/* Thread + spider */}
        <line x1="50" y1="10" x2="50" y2="25.5" strokeWidth="0.7"/>
        <circle cx="50" cy="27" r="2.5" fill="currentColor" stroke="none"/>
        <ellipse cx="50" cy="34.5" rx="4" ry="5.5" fill="currentColor" stroke="none"/>
        {/* Left legs */}
        <line x1="46" y1="32" x2="37" y2="28" strokeWidth="0.8"/>
        <line x1="46" y1="34.5" x2="36" y2="34.5" strokeWidth="0.8"/>
        <line x1="46" y1="37" x2="37" y2="41" strokeWidth="0.8"/>
        {/* Right legs */}
        <line x1="54" y1="32" x2="63" y2="28" strokeWidth="0.8"/>
        <line x1="54" y1="34.5" x2="64" y2="34.5" strokeWidth="0.8"/>
        <line x1="54" y1="37" x2="63" y2="41" strokeWidth="0.8"/>
      </svg>
      <p className="deck-end-text">no more recipes...</p>
    </div>
  )
}
