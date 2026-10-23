import { Router, Request, Response } from 'express'

const router = Router()

// ── Module 2 stub — Documents ─────────────────────────────────────────────
// Shape: { employeeId, documents: Array<{ id, name, type, uploadedAt, url }> }
router.get('/documents/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params
  res.json({
    employeeId,
    documents: [
      {
        id: 'doc-001',
        name: 'Employment Contract',
        type: 'contract',
        uploadedAt: '2024-03-01T09:00:00Z',
        url: '/files/mock/employment-contract.pdf',
      },
      {
        id: 'doc-002',
        name: 'Non-Disclosure Agreement',
        type: 'nda',
        uploadedAt: '2024-03-01T09:05:00Z',
        url: '/files/mock/nda.pdf',
      },
    ],
  })
})

// ── Module 3 stub — ID Cards ──────────────────────────────────────────────
// Shape: { employeeId, idCard: { id, employeeId, issuedAt, expiresAt, imageUrl } | null }
router.get('/id-cards/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params
  res.json({
    employeeId,
    idCard: {
      id: 'id-001',
      employeeId,
      issuedAt: '2024-03-01',
      expiresAt: '2026-03-01',
      imageUrl: '/files/mock/id-card.png',
    },
  })
})

export default router
