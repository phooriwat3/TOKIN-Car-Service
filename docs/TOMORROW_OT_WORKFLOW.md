# งานพรุ่งนี้: ระบบตรวจ OT จาก Tiger Space

วันที่จัดทำ: 5 สิงหาคม 2026

## เป้าหมาย

ทดสอบให้มั่นใจว่า HR สามารถนำรายงาน OT ที่อนุมัติแล้วจาก Tiger Space
เข้าระบบรถ ตรวจผลการจับคู่ และยืนยันคำขอรถได้โดยไม่ต้องค้นทีละคน

## 1. เตรียมข้อมูลทดสอบ

- Export รายงาน OT ที่อนุมัติแล้วจาก Tiger Space สำหรับวันที่ปัจจุบันหรือวันที่ในอนาคต
- ใช้ไฟล์ .xls หรือ .xlsx ได้
- ยืนยันกับ HR ว่ารายงานที่ Export มีเฉพาะรายการที่อนุมัติแล้ว
- เตรียมคำขอรถสถานะ Waiting for OT verification อย่างน้อย 3 กรณี:
  - รหัสพนักงาน วันที่ และเวลาตรงทั้งหมด
  - รหัสพนักงานและวันที่ตรง แต่เวลาไม่ตรง
  - ไม่พบรหัสพนักงานหรือวันที่ในรายงาน

> ไฟล์ Test_Report_05082026 144841.xls เป็นข้อมูลเดือนกรกฎาคม 2026
> จึงใช้ทดสอบการอ่านไฟล์ได้ แต่คำขอใหม่จากฟอร์มจะไม่สามารถใช้วันที่ย้อนหลังเพื่อ
> ทดสอบ Exact match ได้

## 2. ทดสอบหน้า Import

1. รันระบบด้วย npm run dev
2. เปิด http://localhost:3000/admin/login
3. Login ด้วยบัญชี Admin
4. เปิด http://localhost:3000/admin/bookings
5. ที่หัวข้อ Tiger Space report matching กด Choose report
6. เลือกไฟล์รายงานจาก Tiger Space
7. ตรวจจำนวน Report rows
8. ตรวจผลการจับคู่:
   - Exact match — รหัส วันที่ และเวลาตรง
   - Check time — รหัสและวันที่ตรง แต่เวลาต่าง
   - Multiple matches — พบหลายรายการที่อาจตรงกัน
   - Not found yet — ยังไม่พบรายการ

## 3. ทดสอบการยืนยันโดย HR

- ตรวจว่า Exact match ถูกเลือกให้อัตโนมัติ
- ตรวจรายการ Check time ด้วยตาก่อนเลือก
- รายการ Multiple matches และ Not found yet ต้องไม่ถูกยืนยันอัตโนมัติ
- ติ๊ก HR confirms this is an approved-OT report
- กด Confirm selected matches
- ตรวจว่าสถานะรายการที่ยืนยันเปลี่ยนเป็น Ready for transport planning
- ตรวจว่ารายการที่ไม่พบยังเป็น Waiting for OT verification
- เปิดรายละเอียดคำขอและตรวจว่า Verification note บันทึกชื่อไฟล์ วันที่ และเวลา

## 4. ตกลงกติกากับ HR/GA

- เวลาปิดรับคำขอรถ
- เวลาสุดท้ายที่ยอมรับผลอนุมัติ OT
- ผู้มีสิทธิ์กด Confirm ผลจาก Tiger Space
- วิธีจัดการกรณีอนุมัติหลังเส้นตาย
- วิธีจัดการเวลา OT ในคำขอรถกับรายงานต่างกัน
- ยืนยันว่ารายงาน Tiger Space ที่ใช้ Import เป็นรายการอนุมัติแล้วเท่านั้น

## 5. ก่อน Deploy

- สำรองฐานข้อมูล Supabase
- ตรวจ Migration:
  - 202608040001_transport_only_daily_assignment.sql
  - 202608050001_tiger_space_ot_verification.sql
- ระวัง: Migration จะเปลี่ยน OT เดิมที่เป็น Approved แต่ยังไม่ได้จัดรถ
  กลับเป็น Waiting for OT verification
- ตรวจรายการเดิมกับ HR ก่อน Apply Migration
- รัน npm run lint
- รัน npm run build

## 6. Deploy เมื่อ HR ยืนยันผลทดสอบ

1. Apply Supabase migrations
2. Deploy Edge Functions ที่แก้ไข:
   - public-submit-request
   - public-request-access
   - public-update-request
   - public-assignment-access
   - notify-requester-assignment
3. Deploy Web application
4. ทดสอบ Production ด้วยคำขอจริงหนึ่งรายการก่อนเปิดใช้งานทั่วไป

## เกณฑ์พร้อมใช้งาน

- ระบบอ่านไฟล์ .xls และ .xlsx จาก Tiger Space ได้
- Exact match ทำงานถูกต้อง
- รายการเวลาไม่ตรง/กำกวม/ไม่พบไม่ถูกยืนยันอัตโนมัติ
- HR เป็นผู้กดยืนยันขั้นสุดท้าย
- คำขอที่ยังรอ OT สามารถใช้วางแผนรถได้ แต่ยังยืนยันรถไม่ได้
- หลังยืนยัน OT แล้ว GA สามารถจัดรถและส่งข้อมูลให้พนักงานได้
- ไม่มีไฟล์รายงานที่มีข้อมูลพนักงานถูก Commit เข้า Git

## สิ่งที่ยังไม่ทำ

- ยังไม่ได้ Deploy Migration และ Edge Functions
- ยังไม่ได้ทดสอบกับรายงานวันที่ปัจจุบันหรืออนาคต
- ยังไม่ได้กำหนดเส้นตายยืนยัน OT อย่างเป็นทางการ
- ยังไม่ได้ทำ Import แบบบันทึกประวัติไฟล์หรือ Audit log แยกรายครั้ง
