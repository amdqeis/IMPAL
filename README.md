Markdown
# 🚀 Tugas Besar: SiBooking - Web reservasi meja Billiard

> **Dosen Pengampu:** Muhammad Shiddiq Azis, S.T., MBA

---

## 📊 Perancangan Sistem (DFD)

### DFD Level 0
![DFD Level 0](assets/DFD/DFD-Level-0.png)
*Diagram Konteks yang menunjukkan aliran data global.*

### DFD Level 1
![DFD Level 1](assets/DFD/DFD-Level 1-Proses-1.png)
*Detail proses bisnis dan integrasi database.*

### ERD
![ERD](assets/ERD/ERD.png)
*Rancangan Database.*

### Class Diagram
![Class Diagram](assets/ClassDiragram/ClassDiagram.png)
*Detail Behavior setiap kelas.*
---

## 🎨 Mockup Antarmuka
Rancangan UI aplikasi yang berfokus pada pengalaman pengguna.

| Login Page | Register Page | Dashboard Admin |
| :---: | :---: | :---: |
| ![Login](assets/mock/LoginPage.png) | ![Regis](assets/mock/RegisterPage.png) | ![DashAdm](assets/mock/DashboardAdmin.png) |
| Dashboard User | Payment Page | Booking completed |
| :---: | :---: | :---: |
| ![DashUsr](assets/mock/DashboardUser.png) | ![Payment](assets/mock/BayarDongs.png) | ![Booked](assets/mock/BookingCompleted.png) |
| Status Booking | History |
| :---: | :---: | :---: |
| ![Status](assets/mock/BookingUser.png) | ![Dash](assets/mock/HistoryUser.png) |
---

## 🛠️ Stack Teknologi
- **Frontend:** Next.js
- **Backend:** Fast API 
- **Database:** PostgreSQL

---

## 📂 Cara Instalasi
1. `git clone https://github.com/amdqeis/IMPAL`
2. `cd frontend`
3. `npm install`
4. `npm run dev`
5. `cd backend`
6. `python -m venv venv`
7. `source venv/bin/activate`  # Linux / Mac
8. `venv\Scripts\activate`     # Windows
9. `pip install -r requirements.txt`
10. `uvicorn main:app --reload`


