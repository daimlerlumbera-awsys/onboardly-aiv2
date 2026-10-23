import { useEffect, useRef } from 'react'
import logo from '../assets/logo.png'
import icon from '../assets/icon.png'
import '../id_style.css'

interface IdCardFrontProps {
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  employeeName?: string
  employeePhoto?: string
}

const MAX_FONT_PX = 15
const MIN_FONT_PX = 7

export default function IdCardFront({
  companyName = '[ Company Name ]',
  companyAddress = '[ Company Address ]',
  companyPhone = '[ Company Tel. No. ]',
  employeeName = "EMPLOYEE'S NAME",
  employeePhoto,
}: IdCardFrontProps) {
  const nameRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = nameRef.current
    if (!el) return
    el.style.fontSize = `${MAX_FONT_PX}px`
    while (el.scrollWidth > el.clientWidth && parseFloat(el.style.fontSize) > MIN_FONT_PX) {
      el.style.fontSize = `${parseFloat(el.style.fontSize) - 0.5}px`
    }
  }, [companyName])

  return (
    <section className="card-panel" aria-labelledby="front-title">
      <h1 className="panel-title" id="front-title">FRONT ID</h1>
      <article className="id-card id-card--front">
        <header className="front-header">
          <img className="company-logo" src={logo} alt="Company logo" />
          <div className="company-details">
            <h2 ref={nameRef}>{companyName}</h2>
            <p>{companyAddress}</p>
            <p className="company-phone">{companyPhone}</p>
          </div>
        </header>

        <div className="portrait">
          <img src={employeePhoto ?? icon} alt="Employee photo" />
        </div>

        <div className="employee-name">{employeeName}</div>
        <footer className="signature-line">EMPLOYEE&apos;S SIGNATURE</footer>
      </article>
    </section>
  )
}
