import React, { useState, useEffect } from 'react';
import { Table, Typography, Button, Upload, message, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import * as XLSX from 'xlsx';
import stringSimilarity from 'string-similarity';
import moment from 'moment';

const { Title } = Typography;
const { Search } = Input;

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

const standardizeMaktabName = (name) => {
  if (!name) return 'غير معروف';
  const trimmed = String(name).trim();
  return /^\d+$/.test(trimmed) ? `مكتب ${trimmed}` : trimmed;
};

const CancellationList = ({ data, setData, cancelledVoters, setCancelledVoters, pendingCancelledVoters, setPendingCancelledVoters }) => {
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [searchCIN, setSearchCIN] = useState('');

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
  ];

  useEffect(() => {
    console.log('Current pendingCancelledVoters:', pendingCancelledVoters);
    console.log('Current cancelledVoters:', cancelledVoters);
    const formattedData = [...pendingCancelledVoters, ...cancelledVoters]
      .filter((voter) =>
        !searchCIN || normalizeValue(voter.cin) === normalizeValue(searchCIN)
      )
      .map((voter) => ({
        key: `${voter.cin || 'unknown'}-${voter.serialNumber || '0'}-${voter.maktabName || 'unknown'}`,
        firstName: voter.firstName || 'غير متوفر',
        lastName: voter.lastName || 'غير متوفر',
        cin: voter.cin || 'غير متوفر',
        serialNumber: voter.serialNumber || 'غير متوفر',
        address: voter.address || 'غير متوفر',
        gender: voter.gender || 'غير متوفر',
        birthDate: voter.birthDate || 'غير متوفر',
        status: pendingCancelledVoters.some(
          (p) =>
            normalizeValue(p.cin) === normalizeValue(voter.cin) &&
            normalizeValue(p.serialNumber) === normalizeValue(voter.serialNumber) &&
            normalizeValue(standardizeMaktabName(p.maktabName)) === normalizeValue(standardizeMaktabName(voter.maktabName))
        )
          ? 'معلق'
          : 'مشطوب',
      }))
      .sort((a, b) => {
        const serialA = a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0';
        const serialB = b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0';
        return serialA.localeCompare(serialB, undefined, { numeric: true });
      });
    setTableData(formattedData);
    console.log('Updated and sorted tableData for CancellationList:', formattedData);

    if (searchCIN && formattedData.length === 0) {
      message.error('لا يوجد هذا الناخب.');
    }
  }, [pendingCancelledVoters, cancelledVoters, searchCIN]);

  const handleSearch = (value) => {
    setSearchCIN(value);
  };

  const handleUploadCancellation = (file) => {
    setFileList([{ uid: file.uid, name: file.name, status: 'uploading' }]);
    console.log('Uploading cancellation file:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const excelData = new Uint8Array(e.target.result);
        const workbook = XLSX.read(excelData, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

        if (!jsonData.length) {
          setFileList([{ uid: file.uid, name: file.name, status: 'error' }]);
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

        const requiredColumns = ['بطاقة التعريف', 'الرقم الترتيبي', 'مكتب التصويت'];
        const missingColumns = requiredColumns.filter(
          (col) => !columnMap[normalizeColumnName(col)]
        );
        if (missingColumns.length > 0) {
          setFileList([{ uid: file.uid, name: file.name, status: 'error' }]);
          message.error(`الأعمدة المطلوبة مفقودة: ${missingColumns.join(', ')}`);
          console.log('Missing required columns:', missingColumns);
          return;
        }

        const transformedPendingVoters = jsonData.map((row) => {
          let birthDateRaw = row[columnMap[normalizeColumnName('تاريخ الازدياد')]] || '';
          console.log(`Raw birthDate value: "${birthDateRaw}" (length: ${String(birthDateRaw).length}, type: ${typeof birthDateRaw})`);
          
          let birthDate = 'غير متوفر';
          if (birthDateRaw) {
            try {
              birthDateRaw = String(birthDateRaw).trim();
              const parsedDate = moment(birthDateRaw, [
                'YYYY-MM-DD',
                'YYYY/MM/DD',
                'DD/MM/YYYY',
                'MM/DD/YYYY',
                'DD-MM-YYYY',
                'MM-DD-YYYY',
                'M/D/YYYY',
                'D/M/YYYY',
              ], true);
              if (parsedDate.isValid()) {
                birthDate = parsedDate.format('YYYY-MM-DD');
                console.log(`Valid date detected: ${birthDate}`);
              } else {
                const excelSerial = parseFloat(birthDateRaw);
                if (!isNaN(excelSerial) && excelSerial > 0) {
                  const jsDate = XLSX.SSF.parse_date_code(excelSerial);
                  birthDate = moment({
                    year: jsDate.y,
                    month: jsDate.m - 1,
                    date: jsDate.d
                  }).format('YYYY-MM-DD');
                  console.log(`Converted Excel serial date ${birthDateRaw} to: ${birthDate}`);
                } else {
                  console.warn(`Invalid date format for value: "${birthDateRaw}", row:`, row);
                  birthDate = 'غير صالح';
                }
              }
            } catch (e) {
              console.warn('Date processing error:', e.message, 'for value:', birthDateRaw);
              birthDate = 'غير صالح';
            }
          }

          const maktab = standardizeMaktabName(row[columnMap[normalizeColumnName('مكتب التصويت')]] || '');
          const serialNumber = normalizeValue(row[columnMap[normalizeColumnName('الرقم الترتيبي')]]);
          const cin = normalizeValue(row[columnMap[normalizeColumnName('بطاقة التعريف')]]);
          
          if (!serialNumber || !/^\d+$/.test(serialNumber)) {
            console.warn(`Invalid serialNumber: ${serialNumber}, row:`, row);
          }

          return {
            key: `${cin || 'unknown'}-${serialNumber || '0'}-${maktab || 'unknown'}`,
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
          };
        });

        console.log('Transformed Pending Voters:', transformedPendingVoters);

        setPendingCancelledVoters([...pendingCancelledVoters, ...transformedPendingVoters]);
        setFileList([{ uid: file.uid, name: file.name, status: 'done' }]);
        console.log('Updated pendingCancelledVoters with:', transformedPendingVoters);
        message.success('تم تحميل بيانات التشطيب بنجاح!');
      } catch (error) {
        setFileList([{ uid: file.uid, name: file.name, status: 'error' }]);
        console.error('Error processing cancellation Excel file:', error.message);
        message.error('حدث خطأ أثناء تحميل ملف التشطيب: ' + error.message);
      }
    };
    reader.onerror = () => {
      setFileList([{ uid: file.uid, name: file.name, status: 'error' }]);
      message.error('خطأ في قراءة الملف!');
      console.error('FileReader error');
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmAllCancellations = () => {
    try {
      console.log('Confirming all cancellations. Pending voters:', pendingCancelledVoters);
      console.log('Data before cancellation:', JSON.stringify(data, null, 2));
      if (pendingCancelledVoters.length === 0) {
        message.warning('ماكايناش بيانات مشطوبة معلقة باش نأكدها!');
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
                    normalizeValue(standardizeMaktabName(pending.maktabName)) === normalizeValue(standardizeMaktabName(maktab.name));
                  if (match) {
                    console.log(`Removing voter: CIN=${voter.cin}, Serial=${voter.serialNumber}, Maktab=${maktab.name}`);
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
      console.log('Data after cancellation:', JSON.stringify(updatedData, null, 2));

      setCancelledVoters([...cancelledVoters, ...pendingCancelledVoters]);
      setPendingCancelledVoters([]);
      setData(updatedData);
      setFileList([]);
      message.success('تم تأكيد تشطيب جميع الناخبين بنجاح!');
    } catch (error) {
      console.error('Error confirming all cancellations:', error.message);
      message.error('خطأ أثناء تأكيد التشطيب: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'الإسم الشخصي',
      dataIndex: 'firstName',
      key: 'firstName',
      sorter: (a, b) => (a.firstName || '').localeCompare(b.firstName || ''),
    },
    {
      title: 'الإسم العائلي',
      dataIndex: 'lastName',
      key: 'lastName',
      sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || ''),
    },
    { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
    {
      title: 'الرقم الترتيبي',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      sorter: (a, b) => {
        const serialA = a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0';
        const serialB = b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0';
        return serialA.localeCompare(serialB, undefined, { numeric: true });
      },
      defaultSortOrder: 'ascend',
    },
    { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
    { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
    { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
    { title: 'الحالة', dataIndex: 'status', key: 'status' },
  ];

  const uploadProps = {
    accept: '.xlsx,.xls',
    fileList,
    beforeUpload: handleUploadCancellation,
    onRemove: (file) => {
      setFileList(fileList.filter((item) => item.uid !== file.uid));
      return true;
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
    },
  };

  return (
    <StyledContainer>
      <Title level={3}>لائحة الناخبين المشطوبين</Title>
      <SearchSection>
        <Search
          placeholder="ابحث برقم البطاقة الوطنية (CIN)"
          onSearch={handleSearch}
          style={{ width: 300 }}
          enterButton="بحث"
          allowClear
          aria-label="البحث عن ناخب مشطوب برقم البطاقة الوطنية"
        />
      </SearchSection>
      <ButtonSection>
        <Upload {...uploadProps}>
          <StyledButton
            icon={<UploadOutlined />}
            aria-label="رفع ملف التشطيب"
          >
            رفع ملف التشطيب
          </StyledButton>
        </Upload>
        <StyledButton
          type="primary"
          onClick={handleConfirmAllCancellations}
          disabled={pendingCancelledVoters.length === 0}
          aria-label="تأكيد تشطيب جميع الناخبين المعلقين"
        >
          تأكيد الكل
        </StyledButton>
      </ButtonSection>
      <StyledTable
        columns={columns}
        dataSource={tableData}
        rowKey={(record) => `${record.cin || 'unknown'}-${record.serialNumber || '0'}-${record.maktabName || 'unknown'}`}
        pagination={{ pageSize: 10 }}
        bordered
        locale={{ emptyText: 'لا توجد بيانات مشطوبة' }}
        aria-label="جدول الناخبين المشطوبين"
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin: 16px auto;
  max-width: 1200px;
  width: 100%;
`;

const SearchSection = styled.div`
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  .ant-input-search { min-width: 300px; transition: all 0.3s ease; }
  .ant-input-search-button {
    background: rgb(90, 147, 252);
    border-color: rgb(90, 147, 252);
    color: white;
    border-radius: 8px;
    &:hover, &:focus { background: rgb(70, 127, 232); border-color: rgb(70, 127, 232); }
  }
`;

const ButtonSection = styled.div`
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const StyledButton = styled(Button)`
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
  height: auto;
  line-height: 1.5;
  &.ant-btn-primary {
    background: rgb(90, 147, 252);
    border-color: rgb(90, 147, 252);
    box-shadow: 0 2px 8px rgba(90, 147, 252, 0.2);
    &:hover, &:focus { background: rgb(70, 127, 232); border-color: rgb(70, 127, 232); box-shadow: 0 4px 12px rgba(90, 147, 252, 0.3); transform: translateY(-1px); }
  }
  &.ant-btn-default {
    border-color: #d9d9d9;
    color: #333;
    &:hover, &:focus { border-color: rgb(90, 147, 252); color: rgb(90, 147, 252); box-shadow: 0 4px 12px rgba(90, 147, 252, 0.2); }
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
`;

const StyledTable = styled(Table)`
  .ant-table { border-radius: 8px; overflow: hidden; background: #ffffff; }
  .ant-table-thead > tr > th { background: #f1f1f8; color: #000; font-weight: 600; padding: 12px 16px; border-bottom: 2px solid #90A4AE; }
  .ant-table-tbody > tr { transition: all 0.3s ease; &:hover { background: #f0faff; transform: scale(1.01); } }
  .ant-table-tbody > tr > td { padding: 12px 16px; border-bottom: 1px solid #e8e8e8; }
  .ant-table-container { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
`;

export default CancellationList;