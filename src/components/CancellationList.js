import React, { useState, useEffect } from 'react';
import { Table, Typography, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import * as XLSX from 'xlsx';
import moment from 'moment';
import stringSimilarity from 'string-similarity';

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

const CancellationList = ({ data, setData, cancelledVoters, setCancelledVoters, pendingCancelledVoters, setPendingCancelledVoters }) => {
  const [tableData, setTableData] = useState([]);

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
    'رقم التسجيل', // إضافة حقل رقم التسجيل
  ];

  useEffect(() => {
    console.log('Current pendingCancelledVoters:', pendingCancelledVoters);
    console.log('Current cancelledVoters:', cancelledVoters);
    const formattedData = [...pendingCancelledVoters, ...cancelledVoters].map((voter) => ({
      key: voter.serialNumber,
      firstName: voter.firstName || 'غير متوفر',
      lastName: voter.lastName || 'غير متوفر',
      cin: voter.cin || 'غير متوفر',
      serialNumber: voter.serialNumber || 'غير متوفر',
      address: voter.address || 'غير متوفر',
      gender: voter.gender || 'غير متوفر',
      birthDate: voter.birthDate || 'غير متوفر',
      registrationNumber: voter.registrationNumber || 'غير متوفر',
      status: pendingCancelledVoters.some((p) => p.serialNumber === voter.serialNumber && p.cin === voter.cin && p.maktabName === voter.maktabName && p.registrationNumber === voter.registrationNumber) ? 'معلق' : 'مشطوب',
    }));
    setTableData(formattedData);
    console.log('Updated tableData for CancellationList:', formattedData);
  }, [pendingCancelledVoters, cancelledVoters]);

  const handleUploadCancellation = (file) => {
    message.success('تم اختيار ملف التشطيب بنجاح!');
    console.log('Uploading cancellation file:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const excelData = new Uint8Array(e.target.result);
        const workbook = XLSX.read(excelData, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        if (!jsonData.length) {
          message.error('ملف Excel فارغ!');
          console.log('Empty cancellation Excel file');
          return;
        }

        const rawColumns = Object.keys(jsonData[0] || {});
        console.log('Raw Cancellation Excel Columns:', rawColumns);
        console.log('Raw Cancellation Excel Data:', jsonData);

        const columnMap = {};
        rawColumns.forEach((col) => {
          const bestMatch = findBestMatch(col, expectedColumns);
          if (bestMatch) {
            columnMap[normalizeColumnName(bestMatch)] = col;
          }
        });

        console.log('Cancellation Column Mapping:', columnMap);

        const transformedPendingVoters = jsonData.map((row) => {
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
              console.warn('Cancellation Date parsing error:', e.message, 'for value:', birthDate);
              birthDate = 'غير صالح';
            }
          }

          const maktab = String(row[columnMap[normalizeColumnName('مكتب التصويت')]] || '').trim() || 'غير معروف';
          const serialNumber = normalizeValue(row[columnMap[normalizeColumnName('الرقم الترتيبي')]]);
          const cin = normalizeValue(row[columnMap[normalizeColumnName('بطاقة التعريف')]]);
          const registrationNumber = normalizeValue(row[columnMap[normalizeColumnName('رقم التسجيل')]] || 'غير متوفر');

          return {
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
        });

        console.log('Transformed Pending Voters:', transformedPendingVoters);

        setPendingCancelledVoters([...pendingCancelledVoters, ...transformedPendingVoters]);
        console.log('Updated pendingCancelledVoters with:', transformedPendingVoters);
        message.success('تم تحميل بيانات التشطيب بنجاح!');
      } catch (error) {
        console.error('Error processing cancellation Excel file:', error);
        message.error('حدث خطأ أثناء تحميل ملف التشطيب!');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmAllCancellations = () => {
    try {
      console.log('Confirming all cancellations. Pending voters:', pendingCancelledVoters);
      if (pendingCancelledVoters.length === 0) {
        message.warning('لا توجد بيانات مشطوبة معلقة لتأكيدها!');
        return;
      }

      let removedVoters = 0;
      const updatedData = data.map((wilaya) => ({
        ...wilaya,
        jamaat: wilaya.jamaat.map((jamaa) => ({
          ...jamaa,
          dawair: jamaa.dawair.map((daira) => ({
            ...daira,
            makatib: daira.makatib.map((maktab) => {
              const votersBefore = maktab.voters.length;
              const updatedVoters = maktab.voters.filter((voter) => {
                const shouldKeep = !pendingCancelledVoters.some((pending) => {
                  const match =
                    normalizeValue(pending.cin) === normalizeValue(voter.cin) &&
                    normalizeValue(pending.serialNumber) === normalizeValue(voter.serialNumber) &&
                    normalizeValue(pending.maktabName) === normalizeValue(maktab.name) &&
                    normalizeValue(pending.registrationNumber) === normalizeValue(voter.registrationNumber);
                  if (match) {
                    console.log(`Removing voter: CIN=${voter.cin}, Serial=${voter.serialNumber}, Maktab=${maktab.name}, RegNo=${voter.registrationNumber}`);
                  }
                  return match;
                });
                return shouldKeep;
              });
              const votersAfter = updatedVoters.length;
              removedVoters += votersBefore - votersAfter;
              console.log(`Maktab ${maktab.name}: ${votersBefore} voters before, ${votersAfter} after`);
              return { ...maktab, voters: updatedVoters };
            }),
          })),
        })),
      }));

      console.log(`Total voters removed: ${removedVoters}`);
      console.log('Data after removing pending voters:', updatedData);

      setCancelledVoters([...cancelledVoters, ...pendingCancelledVoters]);
      setPendingCancelledVoters([]);
      setData(updatedData);
      console.log('Updated cancelledVoters:', [...cancelledVoters, ...pendingCancelledVoters]);
      message.success('تم تأكيد تشطيب جميع الناخبين بنجاح!');
    } catch (error) {
      console.error('Error confirming all cancellations:', error);
      message.error('حدث خطأ أثناء تأكيد التشطيب!');
    }
  };

  const columns = [
    { title: 'الإسم الشخصي', dataIndex: 'firstName', key: 'firstName', sorter: (a, b) => a.firstName.localeCompare(b.firstName) },
    { title: 'الإسم العائلي', dataIndex: 'lastName', key: 'lastName', sorter: (a, b) => a.lastName.localeCompare(b.lastName) },
    { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
    { title: 'الرقم الترتيبي', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'رقم التسجيل', dataIndex: 'registrationNumber', key: 'registrationNumber' },
    { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
    { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
    { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
    { title: 'الحالة', dataIndex: 'status', key: 'status' },
  ];

  return (
    <StyledContainer>
      <Title level={3}>لائحة الناخبين المشطوبين</Title>
      <Upload
        accept=".xlsx,.xls"
        showUploadList={false}
        beforeUpload={handleUploadCancellation}
        style={{ marginBottom: 20 }}
      >
        <Button icon={<UploadOutlined />}>رفع ملف التشطيب</Button>
      </Upload>
      <Button
        type="primary"
        onClick={handleConfirmAllCancellations}
        style={{ marginBottom: 20, marginRight: 10 }}
        disabled={pendingCancelledVoters.length === 0}
      >
        تأكيد الكل
      </Button>
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey="serialNumber"
        pagination={{ pageSize: 10 }}
        bordered
        locale={{ emptyText: 'لا توجد بيانات مشطوبة' }}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export default CancellationList;