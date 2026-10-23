import '../id_style.css'

interface IdCardBackProps {
  employeeNumber?: string
  dateEmployed?: string
  bloodType?: string
  sss?: string
  tin?: string
  homeAddress?: string
  emergencyContactName?: string
  emergencyContactNumber?: string
  emergencyContactAddress?: string
  companyName?: string
}

export default function IdCardBack({
  employeeNumber = 'EMPLOYEE NUMBER',
  dateEmployed = 'DATE EMPLOYED',
  bloodType = 'BLOOD TYPE',
  sss = 'SSS',
  tin = 'TIN',
  homeAddress = 'HOME ADDRESS',
  emergencyContactName = '',
  emergencyContactNumber = '',
  emergencyContactAddress = '',
  companyName = '[ Company Name ]',
}: IdCardBackProps) {
  return (
    <section className="card-panel" aria-labelledby="back-title">
      <h1 className="panel-title" id="back-title">BACK ID</h1>
      <article className="id-card id-card--back">
        <div className="details-grid">
          <div className="detail-cell"><span className="detail-label">EMPLOYEE NO.</span><span>{employeeNumber}</span></div>
          <div className="detail-cell"><span className="detail-label">START DATE</span><span>{dateEmployed}</span></div>
          <div className="detail-cell detail-cell--blood"><span className="detail-label">BLOOD TYPE</span><span>{bloodType}</span></div>
          <div className="detail-cell"><span className="detail-label">SSS</span><span>{sss}</span></div>
          <div className="detail-cell"><span className="detail-label">TIN</span><span>{tin}</span></div>
          <div className="detail-cell detail-cell--address"><span className="detail-label">HOME ADDRESS</span><span>{homeAddress}</span></div>
          <div className="detail-cell detail-cell--emergency">
            <span>EMERGENCY CONTACT</span>
            <p>NAME: {emergencyContactName}</p>
            <p>CONTACT: {emergencyContactNumber}</p>
            <p>ADDRESS: {emergencyContactAddress}</p>
          </div>
        </div>

        <div className="card-notice">
          <p>
            This serves as the identity of the bearer.<br />
            Please call to verify employment status.
          </p>
          <p>
            This remains a property of <strong>{companyName}</strong>.<br />
            Must be surrendered upon cessation of employment. Unauthorized use
            would result in criminal and civil action.
          </p>
        </div>

        <footer className="signature-line">AUTHORIZED SIGNATURE</footer>
      </article>
    </section>
  )
}
