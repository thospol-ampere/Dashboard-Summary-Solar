export interface LocationItem {
  id: string;
  name: string;
  subAgency: string; // e.g., "กรมประชาสัมพันธ์ เขต 3"
  capacityKWp: number;
  actualCapacityKWp: number;
  province: string;
  region: 'กรุงเทพมหานคร' | 'ภาคกลาง' | 'ภาคเหนือ' | 'ภาคตะวันออกเฉียงเหนือ' | 'ภาคตะวันออก' | 'ภาคตะวันตก' | 'ภาคใต้';
  status: 'ติดตั้งแล้ว' | 'อยู่ระหว่างดำเนินการ';
  mapX?: number; // percentage X on map (0-100)
  mapY?: number; // percentage Y on map (0-100)
}

export interface MEAContact {
  department: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
}

export interface CustomerContact {
  contactName: string;
  position: string;
  phone: string;
  email: string;
}

export interface ProjectData {
  id: string;
  projectName: string;
  customerName: string;
  projectType: 'Solar Rooftop' | 'Floating Solar' | 'Solar Farm';
  locations: LocationItem[];
  contractCapacityTotal: number; // kWp
  actualCapacityTotal: number; // kWp
  contractNumber: string; // e.g., "เลขที่ ฝรด.กร.2 (SA) 014/2566 ลงวันที่ 22 สิงหาคม 2566"
  serviceDiscountPercent: number; // %
  servicePeriodYears: number; // Years
  contractValue: number; // Baht
  meaContact: MEAContact;
  customerContact: CustomerContact;
  updatedDate: string; // e.g., "22 พ.ค. 2569"
  targetCO2ReductionFactor?: number; // e.g., 0.477
}

export const PROVINCE_MAP: Record<string, { region: LocationItem['region']; x: number; y: number }> = {
  'กรุงเทพมหานคร': { region: 'กรุงเทพมหานคร', x: 45, y: 48 },
  'นนทบุรี': { region: 'กรุงเทพมหานคร', x: 44, y: 47 },
  'ปทุมธานี': { region: 'กรุงเทพมหานคร', x: 45, y: 46 },
  'สมุทรปราการ': { region: 'กรุงเทพมหานคร', x: 46, y: 49 },
  'เชียงใหม่': { region: 'ภาคเหนือ', x: 32, y: 20 },
  'ลำปาง': { region: 'ภาคเหนือ', x: 35, y: 23 },
  'พิษณุโลก': { region: 'ภาคเหนือ', x: 40, y: 36 },
  'เชียงราย': { region: 'ภาคเหนือ', x: 38, y: 12 },
  'แพร่': { region: 'ภาคเหนือ', x: 39, y: 24 },
  'แม่ฮ่องสอน': { region: 'ภาคเหนือ', x: 24, y: 18 },
  'น่าน': { region: 'ภาคเหนือ', x: 43, y: 20 },
  'พะเยา': { region: 'ภาคเหนือ', x: 39, y: 17 },
  'ลำพูน': { region: 'ภาคเหนือ', x: 32, y: 22 },
  'อุตรดิตถ์': { region: 'ภาคเหนือ', x: 43, y: 30 },
  'สุโขทัย': { region: 'ภาคเหนือ', x: 38, y: 33 },
  'ตาก': { region: 'ภาคเหนือ', x: 30, y: 38 },
  'ขอนแก่น': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 65, y: 40 },
  'อุบลราชธานี': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 82, y: 48 },
  'นครราชสีมา': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 57, y: 50 },
  'อุดรธานี': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 64, y: 32 },
  'บุรีรัมย์': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 66, y: 52 },
  'สุรินทร์': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 70, y: 52 },
  'ศรีสะเกษ': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 76, y: 52 },
  'ร้อยเอ็ด': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 69, y: 44 },
  'ชัยภูมิ': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 54, y: 43 },
  'สกลนคร': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 74, y: 32 },
  'กาฬสินธุ์': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 70, y: 38 },
  'มหาสารคาม': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 67, y: 44 },
  'หนองคาย': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 65, y: 28 },
  'เลย': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 50, y: 32 },
  'นครพนม': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 79, y: 31 },
  'มุกดาหาร': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 78, y: 39 },
  'บึงกาฬ': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 73, y: 26 },
  'หนองบัวลำภู': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 59, y: 33 },
  'ยโสธร': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 74, y: 46 },
  'อำนาจเจริญ': { region: 'ภาคตะวันออกเฉียงเหนือ', x: 79, y: 45 },
  'สระบุรี': { region: 'ภาคกลาง', x: 46, y: 52 },
  'นครสวรรค์': { region: 'ภาคกลาง', x: 41, y: 42 },
  'อุทัยธานี': { region: 'ภาคกลาง', x: 37, y: 45 },
  'ชัยนาท': { region: 'ภาคกลาง', x: 41, y: 47 },
  'สิงห์บุรี': { region: 'ภาคกลาง', x: 43, y: 49 },
  'อ่างทอง': { region: 'ภาคกลาง', x: 43, y: 51 },
  'ลพบุรี': { region: 'ภาคกลาง', x: 46, y: 48 },
  'พระนครศรีอยุธยา': { region: 'ภาคกลาง', x: 45, y: 53 },
  'นครปฐม': { region: 'ภาคกลาง', x: 40, y: 47 },
  'สุพรรณบุรี': { region: 'ภาคกลาง', x: 40, y: 51 },
  'สมุทรสาคร': { region: 'ภาคกลาง', x: 42, y: 49 },
  'สมุทรสงคราม': { region: 'ภาคกลาง', x: 39, y: 50 },
  'จันทบุรี': { region: 'ภาคตะวันออก', x: 58, y: 66 },
  'ชลบุรี': { region: 'ภาคตะวันออก', x: 50, y: 62 },
  'ระยอง': { region: 'ภาคตะวันออก', x: 52, y: 65 },
  'ตราด': { region: 'ภาคตะวันออก', x: 63, y: 70 },
  'ฉะเชิงเทรา': { region: 'ภาคตะวันออก', x: 51, y: 59 },
  'ปราจีนบุรี': { region: 'ภาคตะวันออก', x: 53, y: 56 },
  'สระแก้ว': { region: 'ภาคตะวันออก', x: 59, y: 57 },
  'กาญจนบุรี': { region: 'ภาคตะวันตก', x: 28, y: 56 },
  'ราชบุรี': { region: 'ภาคตะวันตก', x: 35, y: 49 },
  'เพชรบุรี': { region: 'ภาคตะวันตก', x: 36, y: 55 },
  'ประจวบคีรีขันธ์': { region: 'ภาคตะวันตก', x: 35, y: 62 },
  'สุราษฎร์ธานี': { region: 'ภาคใต้', x: 35, y: 82 },
  'สงขลา': { region: 'ภาคใต้', x: 42, y: 92 },
  'ภูเก็ต': { region: 'ภาคใต้', x: 27, y: 86 },
  'กระบี่': { region: 'ภาคใต้', x: 32, y: 86 },
  'พังงา': { region: 'ภาคใต้', x: 28, y: 83 },
  'ระนอง': { region: 'ภาคใต้', x: 29, y: 77 },
  'ชุมพร': { region: 'ภาคใต้', x: 33, y: 76 },
  'นครศรีธรรมราช': { region: 'ภาคใต้', x: 38, y: 84 },
  'ตรัง': { region: 'ภาคใต้', x: 34, y: 89 },
  'พัทลุง': { region: 'ภาคใต้', x: 38, y: 88 },
  'สตูล': { region: 'ภาคใต้', x: 36, y: 92 },
  'ปัตตานี': { region: 'ภาคใต้', x: 46, y: 93 },
  'ยะลา': { region: 'ภาคใต้', x: 44, y: 95 },
  'นราธิวาส': { region: 'ภาคใต้', x: 49, y: 95 },
  'นครนายก': { region: 'ภาคกลาง', x: 49, y: 51 },
  'พิจิตร': { region: 'ภาคเหนือ', x: 41, y: 39 },
  'กำแพงเพชร': { region: 'ภาคเหนือ', x: 34, y: 41 },
  'เพชรบูรณ์': { region: 'ภาคเหนือ', x: 46, y: 39 },
};
