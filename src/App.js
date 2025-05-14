import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider, Typography, Button } from 'antd';
import styled, { keyframes } from 'styled-components';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import arEG from 'antd/lib/locale/ar_EG';
import moment from 'moment';
import stringSimilarity from 'string-similarity';
import Navigation from './components/Navigation';
import VotersFilter from './components/VotersFilter';
import Dashboard from './components/Dashboard';
import Certificate from './components/Certificate';
import CancellationList from './components/CancellationList';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const normalizeColumnName = (name) => {
  if (!name) return '';
  return name.replace(/\s+/g, '').toLowerCase();
};

const findBestMatch = (input, options) => {
  const matches = stringSimilarity.findBestMatch(input, options.map(normalizeColumnName));
  return options[matches.bestMatchIndex] || '';
};

const normalizeValue = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

const App = () => {
  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem('electionData');
    return savedData ? JSON.parse(savedData) : [];
  });
  const [cancelledVoters, setCancelledVoters] = useState(() => {
    const savedCancelled = localStorage.getItem('cancelledVoters');
    return savedCancelled ? JSON.parse(savedCancelled) : [];
  });
  const [pendingCancelledVoters, setPendingCancelledVoters] = useState(() => {
    const savedPending = localStorage.getItem('pendingCancelledVoters');
    return savedPending ? JSON.parse(savedPending) : [];
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    console.log('Saving electionData to localStorage:', data);
    localStorage.setItem('electionData', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    console.log('Saving cancelledVoters to localStorage:', cancelledVoters);
    localStorage.setItem('cancelledVoters', JSON.stringify(cancelledVoters));
  }, [cancelledVoters]);

  useEffect(() => {
    console.log('Saving pendingCancelledVoters to localStorage:', pendingCancelledVoters);
    localStorage.setItem('pendingCancelledVoters', JSON.stringify(pendingCancelledVoters));
  }, [pendingCancelledVoters]);

  const expectedColumns = [
    'الإسم الشخصي للناخب',
    'الإسم العائلي للناخب',
    'الجنس',
    'الجماعة',
    'الدائرة الإنتخابية',
    'مكتب التصويت',
    'عنوان مكتب التصويت',
    'مكان مكتب التصويت',
    'العمالة أو الإقليم',
    'تاريخ الازدياد',
    'بطاقة التعريف',
    'الرقم الترتيبي',
    'العنوان بدقة',
    'رقم التسجيل',
  ];

  const handleUpload = (file) => {
    toast.success('تم اختيار الملف بنجاح!', { position: 'top-right' });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        if (!jsonData.length) {
          toast.error('ملف Excel فارغ!');
          return;
        }

        const rawColumns = Object.keys(jsonData[0] || {});
        console.log('Raw Excel Columns:', rawColumns);
        console.log('Raw Excel Data:', JSON.stringify(jsonData, null, 2));

        if (!rawColumns.length) {
          toast.error('ملف Excel غير صالح أو فارغ!');
          return;
        }

        const columnMap = {};
        rawColumns.forEach((col) => {
          const bestMatch = findBestMatch(col, expectedColumns);
          if (bestMatch) {
            const key = normalizeColumnName(bestMatch);
            columnMap[key] = col;
          }
        });

        console.log('Column Mapping:', columnMap);

        const transformedData = jsonData.reduce((acc, row) => {
          const wilaya = String(row[columnMap[normalizeColumnName('العمالة أو الإقليم')]] || '').trim() || 'غير معروف';
          const jamaa = String(row[columnMap[normalizeColumnName('الجماعة')]] || '').trim() || 'غير معروف';
          const daira = String(row[columnMap[normalizeColumnName('الدائرة الإنتخابية')]] || '').trim() || 'غير معروف';
          let maktab = String(row[columnMap[normalizeColumnName('مكتب التصويت')]] || '').trim() || 'غير معروف';
          if (/^\d+$/.test(maktab)) {
            maktab = `مكتب ${maktab}`;
          }

          let birthDate = String(row[columnMap[normalizeColumnName('تاريخ الازدياد')]] || '').trim() || 'غير متوفر';
          if (birthDate && birthDate !== 'غير متوفر') {
            try {
              const parsedDate = moment(birthDate, ['M/D/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true);
              if (parsedDate.isValid()) {
                birthDate = parsedDate.format('YYYY-MM-DD');
              } else {
                const excelSerial = parseFloat(birthDate);
                if (!isNaN(excelSerial)) {
                  const jsDate = XLSX.SSF.parse_date_code(excelSerial);
                  birthDate = moment(jsDate).format('YYYY-MM-DD');
                } else {
                  console.warn(`Invalid date format for value: ${birthDate}, row:`, row);
                  birthDate = 'غير صالح';
                }
              }
            } catch (e) {
              console.warn('Date parsing error:', e.message, 'for value:', birthDate);
              birthDate = 'غير صالح';
            }
          }

          const serialNumber = normalizeValue(row[columnMap[normalizeColumnName('الرقم الترتيبي')]]);
          const cin = normalizeValue(row[columnMap[normalizeColumnName('بطاقة التعريف')]]);
          const registrationNumber = normalizeValue(row[columnMap[normalizeColumnName('رقم التسجيل')]] || 'غير متوفر');

          const voter = {
            key: serialNumber,
            firstName: String(row[columnMap[normalizeColumnName('الإسم الشخصي للناخب')]] || '').trim() || 'غير متوفر',
            lastName: String(row[columnMap[normalizeColumnName('الإسم العائلي للناخب')]] || '').trim() || 'غير متوفر',
            gender: String(row[columnMap[normalizeColumnName('الجنس')]] || '').trim() || 'غير متوفر',
            birthDate,
            cin,
            serialNumber,
            address: String(row[columnMap[normalizeColumnName('العنوان بدقة')]] || '').trim() || 'غير متوفر',
            maktabAddress: String(row[columnMap[normalizeColumnName('عنوان مكتب التصويت')]] || '').trim() || 'غير متوفر',
            maktabLocation: String(row[columnMap[normalizeColumnName('مكان مكتب التصويت')]] || '').trim() || 'غير متوفر',
            maktabName: maktab,
            registrationNumber,
          };

          console.log('Parsed Voter:', JSON.stringify(voter, null, 2));

          let wilayaObj = acc.find((w) => w.wilaya === wilaya);
          if (!wilayaObj) {
            wilayaObj = { wilaya, jamaat: [] };
            acc.push(wilayaObj);
          }

          let jamaaObj = wilayaObj.jamaat.find((j) => j.name === jamaa);
          if (!jamaaObj) {
            jamaaObj = { name: jamaa, dawair: [] };
            wilayaObj.jamaat.push(jamaaObj);
          }

          let dairaObj = jamaaObj.dawair.find((d) => d.name === daira);
          if (!dairaObj) {
            dairaObj = { name: daira, makatib: [] };
            jamaaObj.dawair.push(dairaObj);
          }

          let maktabObj = dairaObj.makatib.find((m) => m.name === maktab);
          if (!maktabObj) {
            maktabObj = { name: maktab, address: voter.maktabAddress, location: voter.maktabLocation, voters: [] };
            dairaObj.makatib.push(maktabObj);
          }

          maktabObj.voters.push(voter);
          return acc;
        }, []);

        console.log('Transformed Data:', transformedData);

        transformedData.forEach((wilaya) => {
          wilaya.jamaat.forEach((jamaa) => {
            jamaa.dawair.forEach((daira) => {
              daira.makatib.forEach((maktab) => {
                maktab.voters.sort((a, b) => {
                  const serialA = a.serialNumber || '0';
                  const serialB = b.serialNumber || '0';
                  return serialA.localeCompare(serialB, undefined, { numeric: true });
                });
              });
            });
          });
        });

        setData(transformedData);
        toast.success('تم تحميل البيانات بنجاح!', { position: 'top-right' });
      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast.error('حدث خطأ أثناء تحميل الملف!');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleClearData = () => {
    localStorage.removeItem('electionData');
    localStorage.removeItem('cancelledVoters');
    localStorage.removeItem('pendingCancelledVoters');
    setData([]);
    setCancelledVoters([]);
    setPendingCancelledVoters([]);
    toast.success('تم مسح جميع البيانات بنجاح!', { position: 'top-right' });
  };

  const handleCollapse = (collapsed) => {
    setCollapsed(collapsed);
  };

  return (
    <Router>
      <ConfigProvider locale={arEG} direction="rtl">
        <StyledLayout>
          <Navigation handleUpload={handleUpload} onCollapse={handleCollapse} />
          <StyledMainLayout style={{ marginRight: collapsed ? 80 : 250, transition: 'margin-right 0.3s ease' }}>
            <StyledHeader>
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                نظام إدارة الانتخابات
              </Title>
            </StyledHeader>
            <StyledContent>
              <ContentCard>
                <Button
                  type="danger"
                  onClick={handleClearData}
                  style={{ marginBottom: 20 }}
                >
                  مسح جميع البيانات
                </Button>
                <Routes>
                  <Route path="/" element={<VotersFilter data={data} setData={setData} cancelledVoters={cancelledVoters} setCancelledVoters={setCancelledVoters} />} />
                  <Route path="/dashboard" element={<Dashboard data={data} />} />
                  <Route path="/certificate" element={<Certificate data={data} />} />
                  <Route path="/cancellation" element={<CancellationList data={data} setData={setData} cancelledVoters={cancelledVoters} setCancelledVoters={setCancelledVoters} pendingCancelledVoters={pendingCancelledVoters} setPendingCancelledVoters={setPendingCancelledVoters} />} />
                </Routes>
              </ContentCard>
            </StyledContent>
            <StyledFooter>© 2025 نظام إدارة الانتخابات</StyledFooter>
          </StyledMainLayout>
        </StyledLayout>
      </ConfigProvider>
    </Router>
  );
};

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`;

const StyledMainLayout = styled(Layout)`
  background: #f0f2f5;
`;

const StyledHeader = styled(Header)`
  background: #003a8c;
  padding: 0 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const StyledContent = styled(Content)`
  margin: 24px 16px;
  padding: 24px;
  min-height: calc(100vh - 64px - 70px);
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  animation: ${fadeIn} 0.5s ease-out;
`;

const StyledFooter = styled(Footer)`
  text-align: center;
  background: #001529;
  color: white;
  padding: 16px;
`;

export default App;