export default function HomeCategories() {
  return (
    <div className="main-categories" role="group" aria-label="Music categories">
      {['All', 'Music', 'Podcasts'].map(category => (
        <button key={category} type="button" className="category-button" aria-pressed={category === 'All'}>
          {category}
        </button>
      ))}
    </div>
  )
}
