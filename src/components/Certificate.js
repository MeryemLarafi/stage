import React, { useState } from 'react';
import { Select, Typography, Input, Button, Table, message, DatePicker } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { amiriFontVFS } from './amiri-font';
import moment from 'moment';

// Register the font's virtual file system
pdfMake.vfs = amiriFontVFS;

// Register the font family
pdfMake.fonts = {
  Amiri: {
    normal: 'Amiri-Regular.ttf',
    bold: 'Amiri-Regular.ttf',
    italics: 'Amiri-Regular.ttf',
    bolditalics: 'Amiri-Regular.ttf'
  }
};

const { Title, Text } = Typography;
const { Option } = Select;

// Function to reverse Arabic text word order
const reverseArabicText = (text) => {
  if (!text) return text;
  return text.split(' ').reverse().join(' ');
};

const Certificate = ({ data }) => {
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedJamaa, setSelectedJamaa] = useState('');
  const [caïdName, setCaïdName] = useState('');
  const [caïdPosition, setCaïdPosition] = useState('');
  const [certificateDate, setCertificateDate] = useState(null);

  const getDairaStats = (jamaaName) => {
    let stats = [];
    try {
      data.forEach((wilaya) => {
        if (!selectedWilaya || wilaya.wilaya === selectedWilaya) {
          wilaya.jamaat.forEach((jamaa) => {
            if (jamaa.name === jamaaName) {
              jamaa.dawair.forEach((daira) => {
                let maleCount = 0;
                let femaleCount = 0;
                daira.makatib.forEach((maktab) => {
                  maktab.voters.forEach((voter) => {
                    const gender = voter.gender ? voter.gender.toLowerCase().trim() : '';
                    if (gender === 'ذكر' || gender.includes('male') || gender === 'h') {
                      maleCount++;
                    } else if (gender === 'أنثى' || gender.includes('female') || gender === 'f') {
                      femaleCount++;
                    }
                  });
                });
                stats.push({
                  daira: daira.name,
                  males: maleCount,
                  females: femaleCount,
                  total: maleCount + femaleCount
                });
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in getDairaStats:', error);
      message.error('خطأ في استرجاع إحصائيات الدوائر!');
    }
    return stats;
  };

  const generateCertificatePDF = () => {
    if (!selectedJamaa) {
      message.warning('يرجى اختيار جماعة!');
      return;
    }
    if (!caïdName || !caïdPosition) {
      message.warning('يرجى إدخال اسم القائد وقيادته!');
      return;
    }
    if (!certificateDate) {
      message.warning('يرجى اختيار تاريخ الإشهاد!');
      return;
    }

    const dairaStats = getDairaStats(selectedJamaa);
    if (!dairaStats.length) {
      message.warning('لا توجد بيانات للدوائر المختارة!');
      return;
    }

    const totalMales = dairaStats.reduce((sum, stat) => sum + stat.males, 0);
    const totalFemales = dairaStats.reduce((sum, stat) => sum + stat.females, 0);
    const totalVoters = totalMales + totalFemales;

    const formattedDate = certificateDate.format('DD/MM/YYYY');

    const documentDefinition = {
      content: [
        {
          stack: [
            {
              stack: [
                { text: reverseArabicText('المملكة المغربية'), style: 'header' },
                { text: reverseArabicText('وزارة الداخلية'), style: 'header' },
                { text: reverseArabicText('قسم الشؤون الداخلية'), style: 'header' },
                { text: reverseArabicText('مصلحة الشؤون الإنتخابية'), style: 'header' }
              ],
              absolutePosition: { x: 40, y: 40 },
              alignment: 'right',
              lineHeight: 1.1
            },
            { text: reverseArabicText('إشهاد'), style: 'title', alignment: 'center', margin: [0, 120, 0, 20] },
            {
              stack: [
                { text: reverseArabicText(`أشهد أنا الموقع أسفله السيد ${caïdName} قائد قيادة ${caïdPosition}`), style: 'body' },
                { text: reverseArabicText(`أن مضمون القرص المدمج رفقته مطابق للائحة الانتخابية النهائية التي تم حصرها من طرف اللجنة الإدارية`), style: 'body' },
                { text: reverseArabicText(`بتاريخ ${formattedDate} والمتعلقة بجماعة ${selectedJamaa} التابعة للنفوذ الترابي للقيادة أعلاه وهي كما يلي:`), style: 'body' }
              ],
              alignment: 'right',
              margin: [40, 0, 40, 10],
              lineHeight: 1.5
            },
            {
              text: reverseArabicText(`جماعة ${selectedJamaa}`),
              style: 'jamaaTitle',
              alignment: 'center',
              margin: [40, 0, 40, 10]
            }
          ]
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', '*'],
            body: [
              [
                { text: 'المجموع', style: 'tableHeader', alignment: 'center' },
                { text: 'الإناث', style: 'tableHeader', alignment: 'center' },
                { text: 'الذكور', style: 'tableHeader', alignment: 'center' },
                { text: 'الدائرة', style: 'tableHeader', alignment: 'center' }
              ],
              ...dairaStats.map(stat => [
                { text: stat.total.toString(), alignment: 'center' },
                { text: stat.females.toString(), alignment: 'center' },
                { text: stat.males.toString(), alignment: 'center' },
                { text: stat.daira, alignment: 'right' }
              ]),
              [
                { text: totalVoters.toString(), style: 'tableFooter', alignment: 'center' },
                { text: totalFemales.toString(), style: 'tableFooter', alignment: 'center' },
                { text: totalMales.toString(), style: 'tableFooter', alignment: 'center' },
                { text: 'المجموع', style: 'tableFooter', alignment: 'right' }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          style: 'table',
          margin: [40, 10, 40, 20]
        },
        {
          stack: [
            { text: reverseArabicText('الإمضاء'), style: 'signature', alignment: 'right' }
          ],
          margin: [0, 20, 40, 0]
        }
      ],
      styles: {
        header: { fontSize: 14, bold: true, margin: [0, 0, 0, 1], font: 'Amiri' },
        title: { fontSize: 18, bold: true, font: 'Amiri' },
        body: { fontSize: 12, lineHeight: 1.5, font: 'Amiri' },
        jamaaTitle: { fontSize: 14, bold: true, font: 'Amiri' },
        table: { fontSize: 12, font: 'Amiri' },
        tableHeader: { bold: true, fillColor: '#0066cc', color: 'white', font: 'Amiri' },
        tableFooter: { bold: true, font: 'Amiri' },
        signature: { fontSize: 12, bold: true, font: 'Amiri', margin: [0, 5, 0, 0] }
      },
      defaultStyle: {
        font: 'Amiri',
        alignment: 'right',
        direction: 'rtl'
      },
      pageMargins: [40, 40, 40, 40]
    };

    try {
      pdfMake.createPdf(documentDefinition).download(`certificate_${selectedJamaa}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      message.error('حدث خطأ أثناء توليد الإشهاد!');
    }
  };

  const tableColumns = [
    { title: 'الدائرة', dataIndex: 'daira', key: 'daira', align: 'center' },
    { title: 'الإناث', dataIndex: 'females', key: 'females', align: 'center' },
    { title: 'الذكور', dataIndex: 'males', key: 'males', align: 'center' },
    { title: 'المجموع', dataIndex: 'total', key: 'total', align: 'center' }
  ];

  return (
    <StyledContainer>
      <Title level={3}>إصدار إشهاد</Title>
      <FilterSection>
        <Select
          placeholder="اختر العمالة"
          onChange={setSelectedWilaya}
          style={{ width: 250 }}
          allowClear
        >
          {data.map((wilaya) => (
            <Option key={wilaya.wilaya} value={wilaya.wilaya}>
              {wilaya.wilaya}
            </Option>
          ))}
        </Select>
        <Select
          placeholder="اختر الجماعة"
          onChange={setSelectedJamaa}
          style={{ width: 250 }}
          allowClear
          disabled={!selectedWilaya}
        >
          {data
            .filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya)
            .flatMap((wilaya) => wilaya.jamaat)
            .map((jamaa) => (
              <Option key={jamaa.name} value={jamaa.name}>
                {jamaa.name}
              </Option>
            ))}
        </Select>
      </FilterSection>
      {selectedJamaa && (
        <CertificateSection>
          <Text strong>نص الإشهاد:</Text>
          <CertificateText>
            <p>
              أشهد أنا الموقع أسفله السيد{' '}
              <Input
                style={{ width: 200, display: 'inline-block' }}
                placeholder="اسم القائد"
                value={caïdName}
                onChange={(e) => setCaïdName(e.target.value)}
              />{' '}
              قائد قيادة{' '}
              <Input
                style={{ width: 200, display: 'inline-block' }}
                placeholder="القيادة"
                value={caïdPosition}
                onChange={(e) => setCaïdPosition(e.target.value)}
              />{' '}
              أن مضمون القرص المدمج رفقته مطابق للائحة الانتخابية النهائية التي تم حصرها من طرف اللجنة الإدارية بتاريخ{' '}
              <DatePicker
                style={{ width: 200, display: 'inline-block' }}
                placeholder="اختر تاريخ الإشهاد"
                format="DD/MM/YYYY"
                onChange={(date) => setCertificateDate(date)}
                value={certificateDate}
              />{' '}
              والمتعلقة بجماعة {selectedJamaa} التابعة للنفوذ الترابي للقيادة أعلاه وهي كما يلي:
            </p>
            <h2 style={{ textAlign: 'center', color: '#0066cc' }}>إشهاد</h2>
            <p>جماعة {selectedJamaa}</p>
          </CertificateText>
          <StyledTable
            columns={tableColumns}
            dataSource={getDairaStats(selectedJamaa)}
            pagination={false}
            bordered
            summary={() => {
              const totalMales = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + stat.males, 0);
              const totalFemales = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + stat.females, 0);
              const totalVoters = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + stat.total, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell align="right">المجموع</Table.Summary.Cell>
                  <Table.Summary.Cell align="center">{totalFemales}</Table.Summary.Cell>
                  <Table.Summary.Cell align="center">{totalMales}</Table.Summary.Cell>
                  <Table.Summary.Cell align="center">{totalVoters}</Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
          <SignatureSection>
            <Text strong>{`إمضاء: ${caïdName || 'غير محدد'} قائد قيادة ${caïdPosition || 'غير محدد'}`}</Text>
          </SignatureSection>
          <Button type="primary" onClick={generateCertificatePDF} style={{ marginTop: 20, width: 200 }}>
            تحميل PDF
          </Button>
        </CertificateSection>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 30px;
  background: #ffffff;
  border-radius: 12px;
  max-width: 1200px;
  margin: 20px auto;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const CertificateSection = styled.div`
  padding: 20px;
`;

const CertificateText = styled.div`
  margin: 20px 0;
  text-align: right;
  line-height: 2;
  font-size: 16px;
  p {
    margin: 10px 0;
  }
  h2 {
    text-align: center;
    color:rgb(90, 147, 252);
    margin: 20px 0;
    font-size: 24px;
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    border-radius: 8px;
    overflow: hidden;
  }
  .ant-table-thead > tr > th {
    background:rgb(241, 241, 248);
    color: black;
    font-weight: bold;
    text-align: center;
  }
  .ant-table-tbody > tr > td {
    text-align: center;
  }
  .ant-table-tbody > tr > td:first-child {
    text-align: right;
  }
  .ant-table-summary > tr > td {
    font-weight: bold;
    text-align: center;
  }
  .ant-table-summary > tr > td:first-child {
    text-align: right;
  }
`;

const SignatureSection = styled.div`
  margin-top: 30px;
  text-align: right;
  font-size: 16px;
  color: #5F9EA0;
`;

export default Certificate;