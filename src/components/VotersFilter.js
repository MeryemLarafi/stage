import React, { useState, useEffect } from 'react';
import { Table, Select, Typography, Button, Modal, message } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { amiriFontVFS } from './amiri-font';

pdfMake.vfs = amiriFontVFS;
pdfMake.fonts = {
  Amiri: {
    normal: 'Amiri-Regular.ttf',
    bold: 'Amiri-Regular.ttf',
    italics: 'Amiri-Regular.ttf',
    bolditalics: 'Amiri-Regular.ttf',
  },
};

const { Title } = Typography;
const { Option } = Select;

const reverseText = (text) => {
  if (!text) return text;
  let reversed = text.split(' ').reverse().join(' ');
  reversed = reversed.replace(/\)ة\(/g, '(ة)');
  reversed = reversed.replace(/\)(.*?)\(/g, '($1)');
  return reversed;
};

const formatCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} من ${hours}:${minutes}`;
};

const normalizeValue = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

const VotersFilter = ({ data, setData, cancelledVoters, setCancelledVoters }) => {
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedJamaa, setSelectedJamaa] = useState('');
  const [selectedDaira, setSelectedDaira] = useState('');
  const [selectedMaktab, setSelectedMaktab] = useState('');
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [isCancelledModalVisible, setIsCancelledModalVisible] = useState(false);

  useEffect(() => {
    let voters = [];
    try {
      (data || []).forEach((wilaya) => {
        if (!selectedWilaya || wilaya.wilaya === selectedWilaya) {
          (wilaya.jamaat || []).forEach((jamaa) => {
            if (!selectedJamaa || jamaa.name === selectedJamaa) {
              (jamaa.dawair || []).forEach((daira) => {
                if (!selectedDaira || daira.name === selectedDaira) {
                  (daira.makatib || []).forEach((maktab) => {
                    if (!selectedMaktab || maktab.name === selectedMaktab) {
                      voters = [...voters, ...(maktab.voters || [])];
                    }
                  });
                }
              });
            }
          });
        }
      });
      console.log('Filtered voters:', voters);
      setFilteredVoters(voters);
    } catch (error) {
      console.error('Error in filtering voters:', error);
      message.error('خطأ في تصفية الناخبين!');
    }
  }, [data, selectedWilaya, selectedJamaa, selectedDaira, selectedMaktab]);

  const showCancelledVoters = () => {
    console.log('Opening cancelled voters modal. Cancelled:', cancelledVoters);
    setIsCancelledModalVisible(true);
  };

  const handleRestore = (voter) => {
    try {
      const updatedCancelled = (cancelledVoters || []).filter((v) =>
        !(
          normalizeValue(v.cin) === normalizeValue(voter.cin) &&
          normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
          normalizeValue(v.maktabName) === normalizeValue(voter.maktabName) &&
          normalizeValue(v.registrationNumber) === normalizeValue(voter.registrationNumber)
        )
      );
      setCancelledVoters(updatedCancelled);

      let voterAdded = false;
      const updatedData = (data || []).map((wilaya) => ({
        ...wilaya,
        jamaat: (wilaya.jamaat || []).map((jamaa) => ({
          ...jamaa,
          dawair: (jamaa.dawair || []).map((daira) => ({
            ...daira,
            makatib: (daira.makatib || []).map((maktab) => {
              if (normalizeValue(maktab.name) === normalizeValue(voter.maktabName) && !voterAdded) {
                voterAdded = true;
                console.log(`Restoring voter: CIN=${voter.cin}, Serial=${voter.serialNumber}, Maktab=${voter.maktabName}, RegNo=${voter.registrationNumber}`);
                return { ...maktab, voters: [...(maktab.voters || []), voter] };
              }
              return maktab;
            }),
          })),
        })),
      }));

      setData(updatedData);
      message.success('تم استرجاع الناخب بنجاح!');
    } catch (error) {
      console.error('Error restoring voter:', error);
      message.error('خطأ في استرجاع الناخب!');
    }
  };

  const handleRestoreAll = () => {
    try {
      let updatedData = [...(data || [])];
      let restoredCount = 0;
      (cancelledVoters || []).forEach((voter) => {
        let voterAdded = false;
        updatedData = updatedData.map((wilaya) => ({
          ...wilaya,
          jamaat: (wilaya.jamaat || []).map((jamaa) => ({
            ...jamaa,
            dawair: (jamaa.dawair || []).map((daira) => ({
              ...daira,
              makatib: (daira.makatib || []).map((maktab) => {
                if (normalizeValue(maktab.name) === normalizeValue(voter.maktabName) && !voterAdded) {
                  voterAdded = true;
                  restoredCount++;
                  console.log(`Restoring voter: CIN=${voter.cin}, Serial=${voter.serialNumber}, Maktab=${voter.maktabName}, RegNo=${voter.registrationNumber}`);
                  return { ...maktab, voters: [...(maktab.voters || []), voter] };
                }
                return maktab;
              }),
            })),
          })),
        }));
      });

      setData(updatedData);
      setCancelledVoters([]);
      setIsCancelledModalVisible(false);
      console.log(`Restored ${restoredCount} voters`);
      message.success('تم استرجاع جميع الناخبين المشطوبين بنجاح!');
    } catch (error) {
      console.error('Error restoring all voters:', error);
      message.error('خطأ في استرجاع جميع الناخبين!');
    }
  };

  const generatePDF = (voter) => {
    let jamaaName = 'غير متوفر';
    let maktabName = 'غير متوفر';
    try {
      (data || []).forEach((wilaya) => {
        (wilaya.jamaat || []).forEach((jamaa) => {
          (jamaa.dawair || []).forEach((daira) => {
            (daira.makatib || []).forEach((maktab) => {
              if (
                (maktab.voters || []).some((v) =>
                  normalizeValue(v.cin) === normalizeValue(voter.cin) &&
                  normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
                  normalizeValue(v.maktabName) === normalizeValue(voter.maktabName) &&
                  normalizeValue(v.registrationNumber) === normalizeValue(voter.registrationNumber)
                )
              ) {
                jamaaName = jamaa.name;
                maktabName = maktab.name;
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('Error finding jamaa/maktab:', error);
    }

    const documentDefinition = {
      content: [
        {
          stack: [
            { text: reverseText('المملكة المغربية'), style: 'decoratedHeader' },
            { text: reverseText('وزارة الداخلية'), style: 'decoratedHeader' },
            { text: reverseText('إقليم الرحامنة'), style: 'decoratedHeader' },
          ],
          alignment: 'right',
          margin: [0, 0, 40, 10],
        },
        { text: reverseText('الانتخابات الجماعية'), style: 'title', alignment: 'center', color: '#0066cc' },
        { text: reverseText('إشعار بمكان التصويت'), style: 'titleSecondary', alignment: 'center', color: '#0066cc' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [
                { text: reverseText('التفاصيل'), style: 'tableHeader', alignment: 'right' },
                { text: reverseText('المعلومة'), style: 'tableHeader', alignment: 'right' },
              ],
              [
                { text: reverseText(`${voter.firstName} ${voter.lastName}`), alignment: 'right' },
                { text: reverseText('الاسم الشخصي والعائلي للناخب(ة):'), alignment: 'right' },
              ],
              [
                { text: reverseText(voter.address || 'غير متوفر'), alignment: 'right' },
                { text: reverseText('العنوان:'), alignment: 'right' },
              ],
              [
                { text: reverseText(jamaaName), alignment: 'right' },
                { text: reverseText('جماعة:'), alignment: 'right' },
              ],
              [
                { text: voter.cin || 'غير متوفر', alignment: 'right' },
                { text: reverseText('رقم البطاقة الوطنية للتعريف:'), alignment: 'right' },
              ],
              [
                { text: reverseText(voter.maktabAddress || 'غير متوفر'), alignment: 'right' },
                { text: reverseText('عنوان مكتب التصويت:'), alignment: 'right' },
              ],
              [
                { text: reverseText(maktabName), alignment: 'right' },
                { text: reverseText('رقم مكتب التصويت:'), alignment: 'right' },
              ],
              [
                { text: voter.serialNumber || 'غير متوفر', alignment: 'right' },
                { text: reverseText('الرقم الترتيبي في لائحة الناخبين:'), alignment: 'right' },
              ],
              [
                { text: voter.registrationNumber || 'غير متوفر', alignment: 'right' },
                { text: reverseText('رقم التسجيل:'), alignment: 'right' },
              ],
              [
                { text: formatCurrentDateTime(), alignment: 'right' },
                { text: reverseText('تاريخ وساعة الاقتراع:'), alignment: 'right' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          style: 'table',
        },
        {
          text: reverseText('ملحوظة: لا يعتبر هذا الإشعار ضروريا للتصويت. ويتعين على الناخب الإدلاء بالبطاقة الوطنية للتعريف عند التصويت.'),
          style: 'note',
          color: 'red',
          alignment: 'right',
        },
        {
          stack: [
            { text: reverseText('طابع'), style: 'footerStamp', alignment: 'center' },
            { text: reverseText('السلطة الإدارية المحلية'), style: 'footer', alignment: 'center' },
          ],
          alignment: 'left',
          margin: [40, 10, 0, 0],
        },
      ],
      styles: {
        decoratedHeader: {
          fontSize: 13,
          bold: true,
          color: '#1a1a1a',
          margin: [0, 0, 0, 2],
          lineHeight: 1.0,
          font: 'Amiri',
        },
        title: { fontSize: 16, bold: true, margin: [0, 10, 0, 2], font: 'Amiri' },
        titleSecondary: { fontSize: 16, bold: true, margin: [0, 2, 0, 10], font: 'Amiri' },
        table: { margin: [0, 10, 0, 10], fontSize: 12, font: 'Amiri' },
        tableHeader: { bold: true, fillColor: '#0066cc', color: 'white', alignment: 'right', font: 'Amiri' },
        note: { fontSize: 10, margin: [0, 10, 0, 10], font: 'Amiri' },
        footer: { fontSize: 12, bold: true, font: 'Amiri' },
        footerStamp: { fontSize: 12, bold: true, font: 'Amiri', margin: [0, 0, 0, 2] },
      },
      defaultStyle: {
        font: 'Amiri',
        alignment: 'right',
      },
      pageMargins: [40, 40, 40, 40],
    };

    try {
      pdfMake.createPdf(documentDefinition).download(`${voter.firstName}_${voter.lastName}_voting_notice.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      message.error('خطأ في توليد PDF!');
    }
  };

  const generateAllPDFs = () => {
    if (!filteredVoters || filteredVoters.length === 0) {
      message.warning('لا توجد بيانات ناخبين لتوليد PDF!');
      return;
    }

    const content = filteredVoters.map((voter, index) => {
      let jamaaName = 'غير متوفر';
      let maktabName = 'غير متوفر';
      try {
        (data || []).forEach((wilaya) => {
          (wilaya.jamaat || []).forEach((jamaa) => {
            (jamaa.dawair || []).forEach((daira) => {
              (daira.makatib || []).forEach((maktab) => {
                if (
                  (maktab.voters || []).some((v) =>
                    normalizeValue(v.cin) === normalizeValue(voter.cin) &&
                    normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
                    normalizeValue(v.maktabName) === normalizeValue(voter.maktabName) &&
                    normalizeValue(v.registrationNumber) === normalizeValue(voter.registrationNumber)
                  )
                ) {
                  jamaaName = jamaa.name;
                  maktabName = maktab.name;
                }
              });
            });
          });
        });
      } catch (error) {
        console.error('Error finding jamaa/maktab:', error);
      }

      const voterContent = [
        {
          stack: [
            { text: reverseText('المملكة المغربية'), style: 'decoratedHeader' },
            { text: reverseText('وزارة الداخلية'), style: 'decoratedHeader' },
            { text: reverseText('إقليم الرحامنة'), style: 'decoratedHeader' },
          ],
          alignment: 'right',
          margin: [0, 0, 40, 10],
        },
        { text: reverseText('الانتخابات الجماعية'), style: 'title', alignment: 'center', color: '#0066cc' },
        { text: reverseText('إشعار بمكان التصويت'), style: 'titleSecondary', alignment: 'center', color: '#0066cc' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [
                { text: reverseText('التفاصيل'), style: 'tableHeader', alignment: 'right' },
                { text: reverseText('المعلومة'), style: 'tableHeader', alignment: 'right' },
              ],
              [
                { text: reverseText(`${voter.firstName} ${voter.lastName}`), alignment: 'right' },
                { text: reverseText('الاسم الشخصي والعائلي للناخب:'), alignment: 'right' },
              ],
              [
                { text: reverseText(voter.address || 'غير متوفر'), alignment: 'right' },
                { text: reverseText('العنوان:'), alignment: 'right' },
              ],
              [
                { text: reverseText(jamaaName), alignment: 'right' },
                { text: reverseText('جماعة:'), alignment: 'right' },
              ],
              [
                { text: voter.cin || 'غير متوفر', alignment: 'right' },
                { text: reverseText('رقم البطاقة الوطنية للتعريف:'), alignment: 'right' },
              ],
              [
                { text: reverseText(voter.maktabAddress || 'غير متوفر'), alignment: 'right' },
                { text: reverseText('عنوان مكتب التصويت:'), alignment: 'right' },
              ],
              [
                { text: reverseText(maktabName), alignment: 'right' },
                { text: reverseText('رقم مكتب التصويت:'), alignment: 'right' },
              ],
              [
                { text: voter.serialNumber || 'غير متوفر', alignment: 'right' },
                { text: reverseText('الرقم الترتيبي في لائحة الناخبين:'), alignment: 'right' },
              ],
              [
                { text: voter.registrationNumber || 'غير متوفر', alignment: 'right' },
                { text: reverseText('رقم التسجيل:'), alignment: 'right' },
              ],
              [
                { text: formatCurrentDateTime(), alignment: 'right' },
                { text: reverseText('تاريخ وساعة الاقتراع:'), alignment: 'right' },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
          style: 'table',
        },
        {
          text: reverseText('ملحوظة: لا يعتبر هذا الإشعار ضروريا للتصويت. ويتعين على الناخب الإدلاء بالبطاقة الوطنية للتعريف عند التصويت.'),
          style: 'note',
          color: 'red',
          alignment: 'right',
        },
        {
          stack: [
            { text: reverseText('طابع'), style: 'footerStamp', alignment: 'center' },
            { text: reverseText('السلطة الإدارية المحلية'), style: 'footer', alignment: 'center' },
          ],
          alignment: 'left',
          margin: [40, 10, 0, 0],
        },
      ];

      return index < filteredVoters.length - 1
        ? [...voterContent, { text: '', pageBreak: 'after' }]
        : voterContent;
    }).flat();

    const documentDefinition = {
      content,
      styles: {
        decoratedHeader: {
          fontSize: 13,
          bold: true,
          color: '#1a1a1a',
          margin: [0, 0, 0, 2],
          lineHeight: 1.0,
          font: 'Amiri',
        },
        title: { fontSize: 16, bold: true, margin: [0, 10, 0, 2], font: 'Amiri' },
        titleSecondary: { fontSize: 16, bold: true, margin: [0, 2, 0, 10], font: 'Amiri' },
        table: { margin: [0, 10, 0, 10], fontSize: 12, font: 'Amiri' },
        tableHeader: { bold: true, fillColor: '#0066cc', color: 'white', alignment: 'right', font: 'Amiri' },
        note: { fontSize: 10, margin: [0, 10, 0, 10], font: 'Amiri' },
        footer: { fontSize: 12, bold: true, font: 'Amiri' },
        footerStamp: { fontSize: 12, bold: true, font: 'Amiri', margin: [0, 0, 0, 2] },
      },
      defaultStyle: {
        font: 'Amiri',
        alignment: 'right',
      },
      pageMargins: [40, 40, 40, 40],
    };

    try {
      pdfMake.createPdf(documentDefinition).download('all_voters_voting_notices.pdf');
    } catch (error) {
      console.error('All PDFs Generation Error:', error);
      message.error('خطأ في توليد PDF لجميع الناخبين!');
    }
  };

  const voterColumns = [
    { title: 'الإسم الشخصي', dataIndex: 'firstName', key: 'firstName', sorter: (a, b) => (a.firstName || '').localeCompare(b.firstName || '') },
    { title: 'الإسم العائلي', dataIndex: 'lastName', key: 'lastName', sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || '') },
    { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
    { title: 'الرقم الترتيبي', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'رقم التسجيل', dataIndex: 'registrationNumber', key: 'registrationNumber' },
    { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
    { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
    { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
    {
      title: 'إجراء',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => generatePDF(record)}>
          تحميل PDF
        </Button>
      ),
    },
  ];

  const cancelledColumns = [
    { title: 'الإسم الشخصي', dataIndex: 'firstName', key: 'firstName' },
    { title: 'الإسم العائلي', dataIndex: 'lastName', key: 'lastName' },
    { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
    { title: 'الرقم الترتيبي', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'رقم التسجيل', dataIndex: 'registrationNumber', key: 'registrationNumber' },
    { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
    { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
    { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
    { title: 'الحالة', dataIndex: 'status', key: 'status' },
    {
      title: 'إجراء',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleRestore(record)}>
          استرجاع
        </Button>
      ),
    },
  ];

  const cancelledTableData = (cancelledVoters || []).map((voter) => ({
    ...voter,
    status: 'مشطوب',
  }));

  return (
    <StyledContainer>
      {(!data || data.length === 0) ? (
        <EmptyMessage>لا توجد بيانات لعرضها</EmptyMessage>
      ) : (
        <>
          <Title level={3}>تصفية الناخبين</Title>
          <FilterSection>
            <Select
              placeholder="اختر العمالة"
              onChange={setSelectedWilaya}
              style={{ width: 200, marginRight: 10 }}
              allowClear
              aria-label="تحديد العمالة"
            >
              {(data || []).map((wilaya) => (
                <Option key={wilaya.wilaya} value={wilaya.wilaya}>
                  {wilaya.wilaya}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="اختر الجماعة"
              onChange={setSelectedJamaa}
              style={{ width: 200, marginRight: 10 }}
              allowClear
              disabled={!selectedWilaya}
              aria-label="تحديد الجماعة"
            >
              {(data || [])
                .filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya)
                .flatMap((wilaya) => wilaya.jamaat || [])
                .map((jamaa) => (
                  <Option key={jamaa.name} value={jamaa.name}>
                    {jamaa.name}
                  </Option>
                ))}
            </Select>
            <Select
              placeholder="اختر الدائرة"
              onChange={setSelectedDaira}
              style={{ width: 200, marginRight: 10 }}
              allowClear
              disabled={!selectedJamaa}
              aria-label="تحديد الدائرة"
            >
              {(data || [])
                .filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya)
                .flatMap((wilaya) => wilaya.jamaat || [])
                .filter((jamaa) => !selectedJamaa || jamaa.name === selectedJamaa)
                .flatMap((jamaa) => jamaa.dawair || [])
                .map((daira) => (
                  <Option key={daira.name} value={daira.name}>
                    {daira.name}
                  </Option>
                ))}
            </Select>
            <Select
              placeholder="اختر مكتب التصويت"
              onChange={setSelectedMaktab}
              style={{ width: 200 }}
              allowClear
              disabled={!selectedDaira}
              aria-label="تحديد مكتب التصويت"
            >
              {(data || [])
                .filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya)
                .flatMap((wilaya) => wilaya.jamaat || [])
                .filter((jamaa) => !selectedJamaa || jamaa.name === selectedJamaa)
                .flatMap((jamaa) => jamaa.dawair || [])
                .filter((daira) => !selectedDaira || daira.name === selectedDaira)
                .flatMap((daira) => daira.makatib || [])
                .map((maktab) => (
                  <Option key={maktab.name} value={maktab.name}>
                    {maktab.name}
                  </Option>
                ))}
            </Select>
          </FilterSection>
          <Button
            type="primary"
            onClick={showCancelledVoters}
            style={{ marginBottom: 20, marginRight: 10 }}
            disabled={cancelledVoters.length === 0}
          >
            عرض لائحة التشطيب
          </Button>
          <Button
            type="primary"
            onClick={generateAllPDFs}
            style={{ marginBottom: 20 }}
            disabled={!filteredVoters || filteredVoters.length === 0}
          >
            تحميل PDF للجميع
          </Button>
          <Table
            columns={voterColumns}
            dataSource={filteredVoters}
            rowKey={(record) => `${record.cin}-${record.serialNumber}-${record.maktabName}-${record.registrationNumber}`}
            pagination={{ pageSize: 10 }}
            bordered
            locale={{ emptyText: 'لا توجد بيانات مطابقة' }}
          />
          <Modal
            title="لائحة الناخبين المشطوبين"
            open={isCancelledModalVisible}
            onCancel={() => setIsCancelledModalVisible(false)}
            footer={[
              <Button key="restoreAll" type="primary" onClick={handleRestoreAll} disabled={cancelledVoters.length === 0}>
                استرجاع الكل
              </Button>,
              <Button key="cancel" onClick={() => setIsCancelledModalVisible(false)}>
                إغلاق
              </Button>,
            ]}
            width={800}
          >
            <Table
              columns={cancelledColumns}
              dataSource={cancelledTableData}
              rowKey={(record) => `${record.cin}-${record.serialNumber}-${record.maktabName}-${record.registrationNumber}`}
              pagination={{ pageSize: 10 }}
              bordered
              locale={{ emptyText: 'لا توجد بيانات مشطوبة' }}
            />
          </Modal>
        </>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #888;
  padding: 20px;
`;

const FilterSection = styled.div`
  margin-bottom: 20px;
`;

export default VotersFilter;