import { useRef } from 'react'
import { Construction, Info, X } from 'lucide-react'
import './DevelopmentNotice.css'

const updates = [
  {
    date: '2026-10-27',
    label: '27/10/2026',
    items: ['Đăng nhập bằng tài khoản Google.'],
  },
  {
    date: '2026-10-24',
    label: '24/10/2026',
    items: [
      'Đăng nhập và đăng ký tài khoản Spotifi.',
      'Duyệt nhạc khi chưa đăng nhập; đăng nhập để nghe.',
      'Đăng xuất về trang đăng nhập; đăng nhập lại về trang chủ.',
    ],
  },
  {
    date: '2026-10-14',
    label: '14/10/2026',
    items: [
      'Trang chủ, thư viện nhạc và chi tiết album.',
      'Tìm kiếm bài hát, nghệ sĩ và album.',
      'Phát nhạc và điều khiển trình phát.',
    ],
  },
]

export default function DevelopmentNotice() {
  const dialogRef = useRef(null)

  return (
    <>
      <button
        type="button"
        className="development-notice-trigger"
        aria-label="Xem tiến trình dự án"
        title="Tiến trình dự án"
        aria-haspopup="dialog"
        aria-controls="development-notice-dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Info size={20} aria-hidden="true" />
      </button>
      <dialog
        id="development-notice-dialog"
        ref={dialogRef}
        className="development-notice"
        aria-labelledby="development-notice-title"
        aria-describedby="development-notice-description"
      >
        <form method="dialog">
          <button type="submit" className="development-notice-close" aria-label="Đóng thông báo">
            <X size={20} aria-hidden="true" />
          </button>
          <div className="development-notice-icon" aria-hidden="true">
            <Construction size={28} />
          </div>
          <h2 id="development-notice-title">Thông báo</h2>
          <p id="development-notice-description">Project này còn đang trong giai đoạn phát triển.</p>
          {updates.map(({ date, label, items }) => (
            <section key={date} className="development-notice-updates" aria-labelledby={`development-notice-updates-${date}`}>
              <div className="development-notice-updates-heading">
                <h3 id={`development-notice-updates-${date}`}>Đã cập nhật</h3>
                <time dateTime={date}>{label}</time>
              </div>
              <ul>
                {items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
          <button type="submit" className="development-notice-confirm" autoFocus>Okeee</button>
        </form>
      </dialog>
    </>
  )
}
