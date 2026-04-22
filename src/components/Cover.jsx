export default function Cover({ totalRecipes }) {
  return (
    <div className="cover">
      <div className="cover-label">Weekly meal prep</div>
      <h1>My Low Calorie<br />Recipe Book</h1>
      <p className="cover-sub">{totalRecipes} recipes · High protein · High fiber · Under 1,200 cal/day</p>
    </div>
  )
}
