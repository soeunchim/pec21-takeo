# ការណែនាំលម្អិតអំពីការ Deploy និងប្រើប្រាស់ Online លើ Render.com
### ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21 - ខេត្តតាកែវ)

ការដំណើរការប្រព័ន្ធលើ **Render.com** ជួយឱ្យលោកអ្នកទទួលបាន Web Application ដំណើរការលើ Internet ជាសាធារណៈ (ឧទាហរណ៍៖ `https://pec21-kkb-2027.onrender.com`) ដែលអាចឱ្យគ្រូឧទ្ទេសទាំង ២០ គណនី និងមន្ត្រីឃុំ-សង្កាត់ទាំង ១០០ គណនី អាចចូលប្រើប្រាស់តាមទូរសព្ទដៃ Tablet ឬកុំព្យូទ័របានគ្រប់ពេលវេលា និងគ្រប់ទីកន្លែង ដោយមិនចាំបាច់បើកកុំព្យូទ័រ Server ផ្ទាល់ខ្លួនឡើយ។

ទិន្នន័យទាំងអស់នឹងត្រូវរក្សាទុកក្នុង **Google Sheets** ដោយស្វ័យប្រវត្តិ ធានាថាទិន្នន័យមិនបាត់បង់ជារៀងរហូត។

---

## ជំហានទី ១ ៖ រៀបចំ Google Sheet សម្រាប់ផ្ទុកទិន្នន័យ (Database)

1. បើក Browser ចូលទៅកាន់ [Google Drive](https://drive.google.com) រួចបង្កើត **Google Sheet ថ្មីមួយ** (ដាក់ឈ្មោះថា `PEC21_KKB_2027_Database`)។
2. នៅលើ Menu ខាងលើ ចុចលើ **Extensions (ផ្នែកបន្ថែម)** ➡️ ជ្រើសរើស **Apps Script**។
3. លុបកូដចាស់ដែលមានស្រាប់ចោលទាំងអស់។
4. បើកឯកសារ **`google-apps-script.gs`** ក្នុង Folder គម្រោង រួច **Copy កូដទាំងអស់** យកទៅ Paste ក្នុងផ្ទាំង Apps Script នោះ។
5. ចុចប៊ូតុង **Save (រូបថាស diskette)** 💾។
6. ចុចលើប៊ូតុងពណ៌ខៀវ **Deploy (ដាក់ឱ្យប្រើប្រាស់)** នៅជ្រុងខាងស្តាំខាងលើ ➡️ ជ្រើសរើស **New deployment (ការដាក់ឱ្យប្រើប្រាស់ថ្មី)** ៖
   * **Select type (ជ្រើសរើសប្រភេទ)** ៖ ចុចរូបកង់ធ្មេញ ⚙️ រួចរើសយក **Web app**
   * **Description** ៖ ដាក់ថា `PEC21 KKB API`
   * **Execute as (ប្រតិបត្តិជា)** ៖ រើសយក **Me (គណនី Gmail របស់អ្នក)**
   * **Who has access (អ្នកណាខ្លះអាចចូលប្រើបាន)** ៖ រើសយក **Anyone (អ្នកណាក៏បាន)** 👈 *ចំណុចនេះសំខាន់ណាស់*
7. ចុចប៊ូតុង **Deploy** ➡️ ប្រសិនបើ Google សួររក Permission សូមចុច *Authorize access* ➡️ រើសយក Gmail របស់អ្នក ➡️ ចុច *Advanced* ➡️ ចុច *Go to Untitled project (unsafe)* ➡️ ចុច *Allow*។
8. Google នឹងបង្ហាញផ្ទាំងមួយដែលមាន **Web app URL** (តំណភ្ជាប់ដែលបញ្ចប់ដោយ `/exec`)។
9. **សូម Copy ទុក URL នេះ** ពីព្រោះយើងនឹងយកវាទៅប្រើក្នុងជំហានទី ៣!

---

## ជំហានទី ២ ៖ Push គម្រោងទៅកាន់ GitHub

1. ចូលទៅកាន់គណនី [GitHub](https://github.com) របស់អ្នក ➡️ ចុចប៊ូតុងពណ៌បៃតង **New** ដើម្បីបង្កើត Repository ថ្មី។
2. ដាក់ឈ្មោះ Repository (ឧទាហរណ៍៖ `pec21-kkb-2027`) ➡️ ជ្រើសរើស **Public** ឬ **Private** ➡️ ចុច **Create repository**។
3. Copy អាសយដ្ឋានតំណភ្ជាប់ Repository នោះ (ឧ. `https://github.com/your-username/pec21-kkb-2027.git`)។
4. នៅក្នុង Folder គម្រោង `pec21_kkb_web` សូមចុច Double-click លើឯកសារ **`Push_To_GitHub.bat`** ៖
   * វានឹងសួររក GitHub URL របស់អ្នក ➡️ សូម Paste URL ដែលបាន Copy អម្បាញ់មិញ រួចចុច Enter។
   * កម្មវិធីនឹងធ្វើការ Add, Commit និង Push កូដទាំងអស់ឡើងទៅកាន់ GitHub ដោយស្វ័យប្រវត្តិ!

---

## ជំហានទី ៣ ៖ បង្កើត Web Service លើ Render.com

1. ចូលទៅកាន់គេហទំព័រ [Render.com](https://render.com) (ប្រសិនបើមិនទាន់មានគណនីទេ សូមចុច *Sign Up* ដោយជ្រើសរើសយក *Continue with GitHub* ដើម្បីងាយស្រួលភ្ជាប់)។
2. នៅលើផ្ទាំង Dashboard របស់ Render សូមចុចប៊ូតុង **New +** នៅជ្រុងខាងលើ ➡️ ជ្រើសរើស **Web Service**។
3. ជ្រើសរើស **Build and deploy from a Git repository** ➡️ ចុច **Next**។
4. ស្វែងរក និងជ្រើសរើស Repository ឈ្មោះ **`pec21-kkb-2027`** ដែលបាន Push ក្នុងជំហានទី ២ រួចចុច **Connect**។
5. បំពេញព័ត៌មានកំណត់ប្រព័ន្ធដូចខាងក្រោម ៖
   * **Name** ៖ ដាក់ឈ្មោះ Web App របស់អ្នក (ឧទាហរណ៍៖ `pec21-kkb-2027`)
   * **Region** ៖ ជ្រើសរើស **Singapore (Southeast Asia)** ដើម្បីឱ្យការតភ្ជាប់ពីកម្ពុជាមានល្បឿនលឿនបំផុត
   * **Branch** ៖ ជ្រើសរើស `main`
   * **Runtime** ៖ ជ្រើសរើស `Node`
   * **Build Command** ៖ ទុកទំនេរ (ឬវាយ `npm install`)
   * **Start Command** ៖ វាយបញ្ចូល `node server.js`
   * **Instance Type** ៖ ជ្រើសរើស **Free** ($0/month)
6. អូសចុះក្រោមបន្តិច ត្រង់ផ្នែក **Environment Variables** (អថេរប្រព័ន្ធ) ៖
   * ចុចលើ **Add Environment Variable**
   * **Key** ៖ វាយបញ្ចូល `GOOGLE_SHEET_URL`
   * **Value** ៖ Paste យក **Web app URL** របស់ Google Sheets ដែលបាន Copy ពីជំហានទី ១ ចូល!
7. ចុចប៊ូតុង **Deploy Web Service** នៅខាងក្រោមបំផុត។

---

## ជំហានទី ៤ ៖ ការរង់ចាំ និងការចូលប្រើប្រាស់ Online

1. Render នឹងចំណាយពេលប្រហែល ១ ទៅ ២ នាទីដើម្បីដំណើរការ Build និង Start Server។
2. នៅពេលវាបង្ហាញពាក្យពណ៌បៃតង **Live** មានន័យថាប្រព័ន្ធដំណើរការជាស្ថាពរហើយ!
3. លោកអ្នកនឹងឃើញតំណភ្ជាប់ Website ផ្លូវការរបស់អ្នកនៅខាងលើ (ឧទាហរណ៍៖ `https://pec21-kkb-2027.onrender.com`)។
4. ឥឡូវនេះ លោកអ្នកអាច Copy តំណភ្ជាប់នោះផ្ញើជូន ៖
   * **គ្រូប្រចាំក្រុង-ស្រុកទាំង ២០ គណនី** ឱ្យចូលតាម Username របស់ពួកគាត់ (ឧ. `PEC2101T001`, `PEC2101R001`...)
   * **គណនីឃុំ-សង្កាត់ទាំង ១០០ គណនី** ឱ្យចូលតាម Username របស់ឃុំនីមួយៗ (ឧ. `COM21001T001` ដល់ `COM21100T001`)
   * **SuperAdmin (`soeunchim`)** និង **Admin (`admin`)** សម្រាប់ត្រួតពិនិត្យទូទាំងខេត្ត!

---

## 💡 ចំណុចគួរកត់សម្គាល់លើ Render.com Free Tier ៖

> [!NOTE]
> * **Free Tier Instance Sleep** ៖ ប្រសិនបើគ្មានអ្នកចូលប្រើប្រាស់លើសពី ១៥ នាទី Render Free Web Service នឹងចូលដំណេក (Spin down/Sleep) ដើម្បីសន្សំសំចៃ Resource។ នៅពេលមានអ្នកចុចចូល Link សារជាថ្មី វានឹងចំណាយពេលប្រហែល ៣០ វិនាទីដើម្បីដាស់ Server ឱ្យដំណើរការឡើងវិញ (Wake up)។
> * **ទិន្នន័យមិនបាត់បង់ដាច់ខាត** ៖ ដោយសារប្រព័ន្ធត្រូវបានភ្ជាប់ជាមួយ **Google Sheets Database** ដូច្នេះរាល់ពេលដែល Server ភ្ញាក់ឡើងវិញ ឬ Restart វានឹងទាញទិន្នន័យចុងក្រោយទាំងអស់ពី Google Sheet របស់អ្នកមកបង្ហាញវិញភ្លាមៗ ១០០%!
