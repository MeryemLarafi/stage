import React, { useState } from 'react';
import { Select, Button, message, Typography, DatePicker } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { amiriFontVFS } from './amiri-font';
import moment from 'moment';

pdfMake.vfs = amiriFontVFS;
pdfMake.fonts = { Amiri: { normal: 'Amiri-Regular.ttf', bold: 'Amiri-Regular.ttf', italics: 'Amiri-Regular.ttf', bolditalics: 'Amiri-Regular.ttf' } };

// إعداد moment لاستخدام أسماء الأشهر بالعربية
moment.defineLocale('ar', {
  months: 'يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر'.split('_'),
  monthsShort: 'يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر'.split('_'),
  weekdays: 'الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت'.split('_'),
  weekdaysShort: 'أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت'.split('_'),
  weekdaysMin: 'ح_ن_ث_ر_خ_ج_س'.split('_'),
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'DD/MM/YYYY',
    LL: 'D MMMM YYYY',
    LLL: 'D MMMM YYYY HH:mm',
    LLLL: 'dddd D MMMM YYYY HH:mm',
  },
  meridiemParse: /ص|م/,
  isPM: function (input) {
    return input === 'م';
  },
  meridiem: function (hour, minute, isLower) {
    if (hour < 12) {
      return 'ص';
    } else {
      return 'م';
    }
  },
  calendar: {
    sameDay: '[اليوم على الساعة] LT',
    nextDay: '[غدا على الساعة] LT',
    nextWeek: 'dddd [على الساعة] LT',
    lastDay: '[أمس على الساعة] LT',
    lastWeek: 'dddd [على الساعة] LT',
    sameElse: 'L',
  },
  relativeTime: {
    future: 'في %s',
    past: 'منذ %s',
    s: 'ثوان',
    ss: '%d ثانية',
    m: 'دقيقة',
    mm: '%d دقائق',
    h: 'ساعة',
    hh: '%d ساعات',
    d: 'يوم',
    dd: '%d أيام',
    M: 'شهر',
    MM: '%d أشهر',
    y: 'سنة',
    yy: '%d سنوات',
  },
  week: {
    dow: 6, // Saturday is the first day of the week.
    doy: 12, // The week that contains Jan 12th is the first week of the year.
  },
});

const { Title } = Typography;
const { Option } = Select;

const normalizeValue = (value) => !value ? '' : String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const standardizeMaktabName = (name) => !name ? 'غير معروف' : /^\d+$/.test(String(name).trim()) ? `مكتب ${name}` : name;

const reverseText = (text) => {
  if (!text) return text;
  let reversed = text.split(' ').reverse().join(' ').replace(/\)ة\(/g, '(ة)').replace(/\)(.*?)\(/g, '($1)');
  return reversed;
};

const numberToArabicWords = (number) => {
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف'];

  if (number === 0) return 'صفر';
  if (number < 0) return `ناقص ${numberToArabicWords(Math.abs(number))}`;

  let words = '';
  if (number >= 1000) {
    const thousandCount = Math.floor(number / 1000);
    if (thousandCount < 10) {
      words += thousands[thousandCount];
    } else {
      words += numberToArabicWords(thousandCount) + ' ألف';
    }
    number %= 1000;
    if (number > 0) words += ' و';
  }
  if (number >= 100) {
    words += hundreds[Math.floor(number / 100)];
    number %= 100;
    if (number > 0) words += ' و';
  }
  if (number >= 20) {
    words += tens[Math.floor(number / 10)];
    number %= 10;
    if (number > 0) words += ' و';
  } else if (number >= 10) {
    words += teens[number - 10];
    return words.trim();
  }
  if (number > 0) {
    words += units[number];
  }
  return words.trim();
};

const getDocumentDefinition = (jamaaName, dairaData, selectedDate) => {
  const customDate = selectedDate ? moment(selectedDate).locale('ar').format('D MMMM YYYY') : '19 مايو 2025';
  const place = jamaaName;

  // بناء محتوى الـ PDF
  const content = [];

  // Page 1: العنوان في الأعلى
  content.push({
    stack: [
      { text: 'إقليم الرحامنة', style: 'header' },
      { text: `جماعة: ${jamaaName}             لائحة عدد المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaData[0].dairaName}`, style: 'title' },
    ],
    alignment: 'center',
    margin: [0, 50, 0, 0],
    pageBreak: 'after',
  });

  // 3 صفحات لكل دائرة
  dairaData.forEach(({ dairaName, voters }, index) => {
    const dairaVotersCount = voters.length;
    const dairaVotersInWords = numberToArabicWords(dairaVotersCount);

    // Page 2: معلومات الدائرة مع العنوان في الأعلى
    content.push({
      stack: [
        { text: `جماعة: ${jamaaName}             لائحة عدد المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`, style: 'title' },
        { text: `جماعة: ${jamaaName}`, style: 'subheader' },
        { text: `الدائرة الإنتخابية الجماعية رقم: ${dairaName}`, style: 'subheader' },
      ],
      alignment: 'center',
      margin: [0, 50, 0, 0],
      pageBreak: 'after',
    });

    // Page 3: جدول الناخبين مع رأس بإطار
    content.push({
      stack: [
        { text: `جماعة: ${jamaaName}             لائحة عدد المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`, style: 'title', alignment: 'right', margin: [0, 20, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*', 'auto'],
            body: [
              [
                { text: 'ملاحظات', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'رقم الناخب', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'وثيقة التعريف', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'العنوان', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'تاريخ الازدياد', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'الاسم الكامل', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                { text: 'الترتيب', style: 'tableHeader', alignment: 'right', fillColor: 'white' },
              ],
              ...voters.map((voter, index) => [
                '', // ملاحظات فارغة
                voter.serialNumber || 'غير متوفر',
                voter.cin || 'غير متوفر',
                voter.address || 'غير متوفر',
                voter.birthDate || 'غير متوفر',
                `${voter.firstName} ${voter.lastName}`,
                String(index + 1),
              ]),
            ],
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5, // إطار كامل حول الرأس
            vLineWidth: (i) => 1, // خطوط عمودية
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
          },
          style: 'table',
        },
      ],
      alignment: 'right',
      margin: [0, 20, 0, 0],
      pageBreak: 'after',
    });

    // Page 4: إحصائيات مع العنوان في الأعلى
    content.push({
      stack: [
        { text: `جماعة: ${jamaaName}             لائحة عدد المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`, style: 'title', alignment: 'center' },
        { text: `حصر عدد المسجلين على صعيد الدائرة الانتخابية رقم :${dairaName}`, style: 'subheader', alignment: 'center', margin: [0, 20, 0, 10] },
        { text: `لجماعة: ${jamaaName}                           في: ${dairaVotersCount}        ناخبا.`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 10] },
        { text: `أي: ${dairaVotersInWords}                                               ناخبا.`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 10] },
        { text: `وحرر ب${place} في: ${customDate}`, style: 'subheader', alignment: 'center', margin: [0, 10, 0, 0] },
        { text: 'رئيس اللجنة الإدارية', style: 'signature', alignment: 'center', margin: [0, 20, 0, 0] },
      ],
      alignment: 'center',
      margin: [0, 20, 0, 0],
      pageBreak: dairaData.length - 1 === index ? undefined : 'after', // لا نضيف pageBreak لآخر دائرة
    });
  });

  return {
    content,
    styles: {
      header: { fontSize: 18, bold: true, font: 'Amiri', margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, font: 'Amiri', margin: [0, 5, 0, 5] },
      title: { fontSize: 16, bold: true, font: 'Amiri', margin: [0, 10, 0, 10], color: 'rgb(90, 147, 252)' },
      table: { fontSize: 12, font: 'Amiri', margin: [0, 10, 0, 10] },
      tableHeader: { bold: true, color: 'black', alignment: 'right', font: 'Amiri' },
      signature: { fontSize: 12, bold: true, font: 'Amiri', margin: [0, 20, 0, 0] },
    },
    defaultStyle: { font: 'Amiri', alignment: 'right' },
    pageMargins: [40, 40, 40, 40],
  };
};

const GeneralElections = ({ data }) => {
  const [selectedJamaa, setSelectedJamaa] = useState('');
  const [selectedDaira, setSelectedDaira] = useState('');
  const [selectedMaktab, setSelectedMaktab] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const generatePDF = () => {
    if (!selectedJamaa) {
      message.error('يرجى اختيار جماعة!');
      return;
    }
    if (!selectedDate) {
      message.error('يرجى اختيار تاريخ!');
      return;
    }

    try {
      // جمع بيانات الدوائر
      let dairaData = [];
      (data || []).forEach((wilaya) => {
        (wilaya.jamaat || []).forEach((jamaa) => {
          if (jamaa.name === selectedJamaa) {
            (jamaa.dawair || []).forEach((daira) => {
              let dairaVoters = [];
              (daira.makatib || []).forEach((maktab) => {
                if (!selectedMaktab || standardizeMaktabName(maktab.name) === standardizeMaktabName(selectedMaktab)) {
                  dairaVoters = [...dairaVoters, ...(maktab.voters || [])];
                }
              });
              // نضيف الدائرة فقط إذا كانت تحتوي على ناخبين
              if (dairaVoters.length > 0) {
                dairaVoters.sort((a, b) =>
                  (a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0').localeCompare(
                    b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0',
                    undefined,
                    { numeric: true }
                  )
                );
                dairaData.push({ dairaName: daira.name, voters: dairaVoters });
              }
            });
          }
        });
      });

      if (dairaData.length === 0) {
        message.error('لا توجد بيانات ناخبين لهذه الجماعة!');
        return;
      }

      // ترتيب الدوائر حسب الاسم
      dairaData.sort((a, b) => a.dairaName.localeCompare(b.dairaName, undefined, { numeric: true }));

      pdfMake.createPdf(getDocumentDefinition(selectedJamaa, dairaData, selectedDate)).download(`general_elections_${selectedJamaa}.pdf`);
      message.success('تم تنزيل ملف PDF بنجاح!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('حدث خطأ أثناء توليد PDF!');
    }
  };

  return (
    <StyledContainer>
      {(!data || data.length === 0) ? (
        <EmptyMessage>لا توجد بيانات لعرضها، يرجى رفع ملف Excel أولاً!</EmptyMessage>
      ) : (
        <>
          <Title level={3}>انتخابات عامة</Title>
          <FilterSection>
            <Select
              placeholder="اختر الجماعة"
              onChange={(value) => {
                setSelectedJamaa(value);
                setSelectedDaira('');
                setSelectedMaktab('');
              }}
              style={{ width: 200 }}
              allowClear
              aria-label="تحديد الجماعة"
            >
              {(data || [])
                .flatMap((wilaya) => wilaya.jamaat || [])
                .filter((jamaa, index, self) => self.findIndex((j) => j.name === jamaa.name) === index)
                .map((jamaa) => (
                  <Option key={jamaa.name} value={jamaa.name}>
                    {jamaa.name}
                  </Option>
                ))}
            </Select>
            <Select
              placeholder="اختر الدائرة"
              onChange={(value) => {
                setSelectedDaira(value);
                setSelectedMaktab('');
              }}
              style={{ width: 200 }}
              allowClear
              disabled={!selectedJamaa}
              aria-label="تحديد الدائرة"
            >
              {(data || [])
                .flatMap((wilaya) => wilaya.jamaat || [])
                .filter((jamaa) => jamaa.name === selectedJamaa)
                .flatMap((jamaa) => jamaa.dawair || [])
                .filter((daira, index, self) => self.findIndex((d) => d.name === daira.name) === index)
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
                .flatMap((wilaya) => wilaya.jamaat || [])
                .filter((jamaa) => jamaa.name === selectedJamaa)
                .flatMap((jamaa) => jamaa.dawair || [])
                .filter((daira) => daira.name === selectedDaira)
                .flatMap((daira) => daira.makatib || [])
                .filter((maktab, index, self) => self.findIndex((m) => m.name === maktab.name) === index)
                .map((maktab) => (
                  <Option key={maktab.name} value={maktab.name}>
                    {maktab.name}
                  </Option>
                ))}
            </Select>
            <DatePicker
              placeholder="اختر التاريخ"
              onChange={(date, dateString) => setSelectedDate(date)}
              style={{ width: 200 }}
              format="DD MMMM YYYY"
              aria-label="تحديد التاريخ"
            />
            <StyledButton type="primary" onClick={generatePDF} disabled={!selectedJamaa || !selectedDate}>
              تنزيل PDF
            </StyledButton>
          </FilterSection>
        </>
      )}
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

const EmptyMessage = styled.div`
  text-align: center;
  color: #666;
  padding: 32px;
  font-size: 16px;
  background: #f5f5f5;
  border-radius: 8px;
`;

const FilterSection = styled.div`
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  .ant-select, .ant-picker {
    min-width: 200px;
    transition: all 0.3s ease;
    &:hover {
      box-shadow: 0 0 0 2px rgba(90, 147, 252, 0.1);
    }
  }
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
    &:hover,
    &:focus {
      background: rgb(70, 127, 232);
      border-color: rgb(70, 127, 232);
      box-shadow: 0 4px 12px rgba(90, 147, 252, 0.3);
      transform: translateY(-1px);
    }
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export default GeneralElections;