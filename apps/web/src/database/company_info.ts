interface CompanyInfo {
  name: string
  city: string
  address: string
  tel_no: string
}

const company_info: CompanyInfo[] = [
  {
    name: 'Advanced World Solutions, Inc.',
    city: 'Makati',
    address: '3F Multinational Bancorporation Centre 6805 Ayala Avenue, Makati City',
    tel_no: '+63 (2) 8889 5070',
  },
  {
    name: 'Advanced World Solutions, Inc.',
    city: 'Alabang',
    address: '5th Floor ATC BPO1 Madrigal Avenue, Alabang Town Center Ayala Alabang, Muntinlupa City',
    tel_no: '+63 (2) 8816 7741',
  },
  {
    name: 'Advanced World Systems, Inc.',
    city: 'Cebu',
    address: '5F PDI Condominium Archbishop Reyes Ave. cor. Panis St. Banilad, Cebu City',
    tel_no: '+63 (32) 231 0321',
  },
  {
    name: 'Advanced World Systems, Inc.',
    city: 'Cebu',
    address: '6th Floor, i1 Building Cebu IT Park, Apas, Cebu City',
    tel_no: '+63 (32) 268 6405',
  },
  {
    name: 'Advanced World Systems, Inc.',
    city: 'Alabang',
    address: '5th Floor ATC BPO1 Madrigal Avenue, Alabang Town Center Ayala Alabang, Muntinlupa City',
    tel_no: '+63 (2) 8807 5521',
  },
]

export type { CompanyInfo }
export { company_info }
