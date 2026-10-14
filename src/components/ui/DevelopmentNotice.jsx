import { useEffect, useRef } from 'react'
import { Construction, X } from 'lucide-react'
import './DevelopmentNotice.css'

const completedUpdates = [
  'Trang chủ, thư viện nhạc và trang chi tiết album.',
  'Tìm kiếm bài hát theo tên, nghệ sĩ hoặc album.',
  'Phát / tạm dừng, chuyển bài, tua nhạc và chỉnh âm lượng.',
  'Phát ngẫu nhiên, lặp lại và xem danh sách phát.',
  'Lưu bài hát yêu thích trên trình duyệt.',
  'Giao diện cho máy tính và điện thoại; thu gọn, kéo chỉnh sidebar.',
]

export default function DevelopmentNotice() {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
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
        <section className="development-notice-updates" aria-labelledby="development-notice-updates-title">
          <div className="development-notice-updates-heading">
            <h3 id="development-notice-updates-title">Đã cập nhật</h3>
            <time dateTime="2026-10-14">14/10/2026</time>
          </div>
          <ul>
            {completedUpdates.map(update => <li key={update}>{update}</li>)}
          </ul>
        </section>
        <button type="submit" className="development-notice-confirm" autoFocus>Đã hiểu</button>
      </form>
    </dialog>
  )
}
