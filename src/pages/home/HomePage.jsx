import { useState } from 'react'
import DiscoverSection from './components/DiscoverSection.jsx'
import WelcomeSection from './components/WelcomeSection.jsx'
import HomeCategories from './components/HomeCategories.jsx'
import MainContent from '../../layouts/music/main-content/MainContent.jsx'
import { artworkColors } from '../../lib/artwork.js'
import TrackLibrary from '../../features/library/components/TrackLibrary.jsx'

export default function HomePage({ library, player, libraryRef, onLibrary, mainRef }) {
  const [bannerColor, setBannerColor] = useState('#32297b')
  const onAlbumHover = album => setBannerColor(artworkColors(album)[0])

  return (
    <MainContent scrollRef={mainRef} className="home-page" style={{ '--home-banner-color': bannerColor }} header={<HomeCategories />}>
      <WelcomeSection library={library} onAlbumHover={onAlbumHover} />
      <div className="content-sections">
        <DiscoverSection library={library} player={player} onLibrary={onLibrary} />
        <TrackLibrary library={library} player={player} libraryRef={libraryRef} />
        <footer className="page-footer"><span>Music for every moment.</span><span>YOUR MUSIC. YOUR SPACE.</span></footer>
      </div>
    </MainContent>
  )
}
