import React, { useState } from 'react';
import { Select, Button, message, Typography, DatePicker } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { scheherazadeFontVFS } from './scheherazade-font'; 
import moment from 'moment';

pdfMake.vfs = scheherazadeFontVFS;
pdfMake.fonts = { Scheherazade: { normal: 'Scheherazade-Regular.ttf', bold: 'Scheherazade-Regular.ttf', italics: 'Scheherazade-Regular.ttf', bolditalics: 'Scheherazade-Regular.ttf' } };

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
    dow: 6,
    doy: 12,
  },
});

const { Title } = Typography;
const { Option } = Select;

const normalizeValue = (value) => !value ? '' : String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const standardizeMaktabName = (name) => !name ? 'غير معروف' : /^\d+$/.test(String(name).trim()) ? `مكتب ${name}` : name;
const getMaktabNumber = (name) => {
  if (!name) return 'غير معروف';
  const match = String(name).match(/\d+/);
  return match ? match[0] : name;
};

const reverseText = (text) => {
  if (!text) return text;
  const words = text.split(' ').filter(word => word);
  let reversed = words.reverse().join(' ');
  reversed = reversed.replace(/\)ة\(/g, '(ة)').replace(/\)(.*?)\(/g, '($1)');
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

const getDocumentDefinition = (jamaaName, dairaData, selectedDate, selectedDaira, selectedMaktab) => {
  const customDate = selectedDate ? moment(selectedDate).locale('ar').format('D MMMM YYYY') : '19 مايو 2025';
  const place = jamaaName;

  const content = [];

  content.push({
    stack: [
      {
        text: reverseText('إقليم الرحامنة'.split(' ').join('         ')),
        style: 'headerRightUnderlined',
        alignment: 'right',
        margin: [0, 0, 0, 2]
      },
      {
        text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
        style: 'subheaderRightUnderlined',
        alignment: 'right',
        margin: [0, 0, 0, 60]
      },
      {
        text: selectedMaktab
          ? reverseText('اللائحة الانتخابية العامة'.split(' ').join('         '))
          : reverseText(`اللائحة الانتخابية العامة الخاصة بجماعة: ${jamaaName}`.split(' ').join('         ')),
        style: 'mainTitleUnderlined',
        alignment: 'center',
        margin: [0, 150, 0, 20]
      },
    ],
    margin: [40, 40, 40, 40],
    pageBreak: 'after',
  });

  if (selectedMaktab) {
    const maktabNumber = getMaktabNumber(selectedMaktab);
    dairaData.forEach(({ dairaName, voters }) => {
      content.push({
        stack: [
          {
            columns: [
              {
                text: reverseText(`الدائرة الإنتخابية الجماعية رقم: ${dairaName}`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'left',
                width: 'auto'
              },
              {
                text: '',
                width: '*'
              },
              {
                text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
                style: 'subheaderUnderlinedRight',
                alignment: 'right',
                width: 'auto'
              },
            ],
            margin: [0, 5, 0, 120]
          },
          {
            text: reverseText(`لائحة المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          },
          {
            text: reverseText(`مكتب التصويت رقم: ${maktabNumber}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 10, 0, 0]
          },
        ],
        margin: [40, 40, 40, 40],
        pageBreak: 'after',
      });

      const votersPerPage = 20;
      const totalPages = Math.ceil(voters.length / votersPerPage);

      for (let page = 0; page < totalPages; page++) {
        const start = page * votersPerPage;
        const end = Math.min(start + votersPerPage, voters.length);
        const pageVoters = voters.slice(start, end);

        content.push({
          stack: [
            {
              columns: [
                {
                  text: reverseText(`مكتب التصويت رقم: ${maktabNumber}`.split(' ').join('         ')),
                  style: 'subheader',
                  alignment: 'left',
                  width: 'auto'
                },
                {
                  text: reverseText(`لائحة المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
                  style: 'subheader',
                  alignment: 'center',
                  width: '*'
                },
                {
                  text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
                  style: 'subheaderUnderlined',
                  alignment: 'right',
                  width: 'auto'
                },
              ],
              margin: [0, 20, 0, 10]
            },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: reverseText('ملاحظات'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('رقم الناخب'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('وثيقة التعريف'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('تاريخ الازدياد'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('العنوان'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('الاسم الكامل'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('رقم الترتيبي'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                  ],
                  ...pageVoters.map((voter, idx) => [
                    reverseText(''),
                    reverseText(String(voter.serialNumber || 'غير متوفر')),
                    reverseText(voter.cin || 'غير متوفر'),
                    reverseText(voter.birthDate || 'غير متوفر'),
                    reverseText(voter.address || 'غير متوفر'),
                    reverseText(`${voter.firstName || ''} ${voter.lastName || ''}`),
                    reverseText(String(start + idx + 1)),
                  ]),
                ],
              },
              layout: {
                hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: () => 0,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
              },
              style: 'table',
              margin: [0, 10, 0, 20]
            },
            {
              text: reverseText(`${page + 1}/${totalPages}`.split(' ').join('         ')),
              style: 'pageNumber',
              absolutePosition: { x: 40, y: 750 },
            }
          ],
          alignment: 'right',
          margin: [0, 30, 0, 0],
          pageBreak: page < totalPages - 1 ? 'after' : undefined,
        });
      }
    });
  } else {
    dairaData.forEach(({ dairaName, voters }, index) => {
      const dairaVotersCount = voters.length;
      const dairaVotersInWords = numberToArabicWords(dairaVotersCount);

      content.push({
        stack: [
          {
            columns: [
              {
                text: reverseText(`لائحة المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'left',
                width: 'auto'
              },
              {
                text: '',
                width: '*'
              },
              {
                text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
                style: 'subheaderUnderlinedRight',
                alignment: 'right',
                width: 'auto'
              },
            ],
            margin: [0, 5, 0, 120]
          },
          {
            text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          {
            text: reverseText(`الدائرة الإنتخابية الجماعية رقم: ${dairaName}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 10, 0, 0]
          },
        ],
        margin: [40, 40, 40, 40],
        pageBreak: 'after',
      });

      const votersPerPage = 20;
      const totalPages = Math.ceil(voters.length / votersPerPage);

      for (let page = 0; page < totalPages; page++) {
        const start = page * votersPerPage;
        const end = Math.min(start + votersPerPage, voters.length);
        const pageVoters = voters.slice(start, end);

        content.push({
          stack: [
            {
              columns: [
                {
                  text: reverseText(`لائحة المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
                  style: 'subheader',
                  alignment: 'left',
                  width: 'auto'
                },
                {
                  text: '',
                  width: '*'
                },
                {
                  text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
                  style: 'subheaderUnderlined',
                  alignment: 'right',
                  width: 'auto'
                },
              ],
              margin: [0, 20, 0, 10]
            },
            {
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: reverseText('ملاحظات'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('رقم الناخب'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('وثيقة التعريف'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('العنوان'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('تاريخ الازدياد'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('الاسم الكامل'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                    { text: reverseText('الترتيب'.split(' ').join('         ')), style: 'tableHeader', alignment: 'right', fillColor: 'white' },
                  ],
                  ...pageVoters.map((voter, idx) => [
                    reverseText(''),
                    reverseText(String(voter.serialNumber || 'غير متوفر')),
                    reverseText(voter.cin || 'غير متوفر'),
                    reverseText(voter.address || 'غير متوفر'),
                    reverseText(voter.birthDate || 'غير متوفر'),
                    reverseText(`${voter.firstName || ''} ${voter.lastName || ''}`),
                    reverseText(String(start + idx + 1)),
                  ]),
                ],
              },
              layout: {
                hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: () => 0,
                hLineColor: () => '#000000',
                vLineColor: () => '#000000',
              },
              style: 'table',
              margin: [0, 10, 0, 20]
            },
            {
              text: reverseText(`${page + 1}/${totalPages}`.split(' ').join('         ')),
              style: 'pageNumber',
              absolutePosition: { x: 40, y: 750 },
            }
          ],
          alignment: 'right',
          margin: [0, 30, 0, 0],
          pageBreak: page < totalPages - 1 ? 'after' : 'after',
        });
      }

      content.push({
        stack: [
          {
            columns: [
              {
                text: reverseText(`لائحة المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'left',
                width: 'auto'
              },
              {
                text: '',
                width: '*'
              },
              {
                text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
                style: 'subheaderUnderlinedRight',
                alignment: 'right',
                width: 'auto'
              },
            ],
            margin: [0, 0, 0, 100],
            direction: 'rtl'
          },
          {
            text: reverseText(`حصر عدد المسجلين على صعيد الدائرة الانتخابية رقم: ${dairaName}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 30, 0, 30]
          },
          {
            columns: [
              {
                text: reverseText(`في: ${dairaVotersCount} ناخبا`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'left',
                width: 'auto'
              },
              {
                text: '',
                width: '*'
              },
              {
                text: reverseText(`لجماعة: ${jamaaName}`.split(' ').join('         ')),
                style: 'subheaderUnderlinedRight',
                alignment: 'right',
                width: 'auto'
              }
            ],
            margin: [0, 30, 0, 30],
            direction: 'rtl'
          },
          {
            text: reverseText(`أي: ${dairaVotersInWords.split(' ').join('         ')} ناخبا`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 30, 0, 30]
          },
          {
            text: reverseText(`وحرر ب ${place} في: ${customDate}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 30, 0, 80]
          },
          {
            text: reverseText('رئيس اللجنة الإدارية'.split(' ').join('         ')),
            style: 'signatureUnderlinedCentered',
            alignment: 'center',
            margin: [0, 80, 0, 0]
          }
        ],
        alignment: 'right',
        direction: 'rtl',
        margin: [40, 40, 40, 40],
        pageBreak: 'after',
      });
    });

    if (!selectedDaira) {
      const totalVotersCount = dairaData.reduce((sum, { voters }) => sum + voters.length, 0);
      const totalVotersInWords = numberToArabicWords(totalVotersCount);

      content.push({
        stack: [
          {
            text: reverseText(`جماعة: ${jamaaName}`.split(' ').join('         ')),
            style: 'subheaderRightUnderlined',
            alignment: 'right',
            margin: [0, 0, 0, 80]
          },
          {
            columns: [
              {
                text: reverseText(`في: ${totalVotersCount} ناخبا`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'center',
                width: 'auto'
              },
              {
                text: '',
                width: '*'
              },
              {
                text: reverseText(`حصر عدد المسجلين على صعيد لجماعة: ${jamaaName}`.split(' ').join('         ')),
                style: 'subheader',
                alignment: 'right',
                width: 'auto',
                margin: [0, 0, 20, 0]
              }
            ],
            margin: [0, 30, 0, 30],
            direction: 'rtl'
          },
          {
            text: reverseText(`أي: ${totalVotersInWords.split(' ').join('         ')} ناخبا`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 30, 0, 30]
          },
          {
            text: reverseText(`وحرر ب ${place} في: ${customDate}`.split(' ').join('         ')),
            style: 'subheader',
            alignment: 'center',
            margin: [0, 30, 0, 80]
          },
          {
            text: reverseText('رئيس اللجنة الإدارية'.split(' ').join('         ')),
            style: 'signatureUnderlinedCentered',
            alignment: 'center',
            margin: [0, 80, 0, 0]
          }
        ],
        alignment: 'right',
        direction: 'rtl',
        margin: [40, 40, 40, 40]
      });
    }
  }

  return {
    content,
    styles: {
      header: { fontSize: 18, bold: true, font: 'Scheherazade', margin: [0, 0, 0, 10] },
      headerRight: { fontSize: 14, bold: true, font: 'Scheherazade', decoration: 'underline' },
      subheader: { fontSize: 14, bold: true, font: 'Scheherazade', margin: [0, 5, 0, 5] },
      subheaderRight: { fontSize: 12, bold: true, font: 'Scheherazade' },
      mainTitle: { fontSize: 16, bold: true, font: 'Scheherazade' },
      headerRightUnderlined: { fontSize: 14, bold: true, font: 'Scheherazade', decoration: 'underline' },
      subheaderRightUnderlined: { fontSize: 14, bold: true, font: 'Scheherazade', decoration: 'underline', alignment: 'right' },
      mainTitleUnderlined: { fontSize: 16, bold: true, font: 'Scheherazade', decoration: 'underline' },
      subheaderUnderlinedRight: { fontSize: 14, bold: true, font: 'Scheherazade', decoration: 'underline', alignment: 'right' },
      subheaderUnderlined: { fontSize: 14, bold: true, font: 'Scheherazade', decoration: 'underline' },
      subheaderPage4Jamaa: { fontSize: 14, bold: true, font: 'Scheherazade', margin: [0, 0, 0, 10] },
      titleUnderlined: { fontSize: 16, bold: true, font: 'Scheherazade', margin: [0, 10, 0, 10], color: 'rgb(90, 147, 252)', decoration: 'underline' },
      titleNoUnderline: { fontSize: 16, bold: true, font: 'Scheherazade', margin: [0, 10, 0, 10], color: 'rgb(90, 147, 252)' },
      tableHeader: { bold: true, color: 'black', alignment: 'right', font: 'Scheherazade', margin: [0, 0, 5, 0] },
      table: { fontSize: 12, font: 'Scheherazade', margin: [0, 10, 0, 10] },
      signatureUnderlinedCentered: { fontSize: 12, bold: true, font: 'Scheherazade', margin: [0, 20, 0, 0], decoration: 'underline', alignment: 'center' },
      pageNumber: { fontSize: 10, font: 'Scheherazade', alignment: 'left' }
    },
    defaultStyle: { font: 'Scheherazade', alignment: 'right', direction: 'rtl' },
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
      let dairaData = [];
      (data || []).forEach((wilaya) => {
        (wilaya.jamaat || []).forEach((jamaa) => {
          if (jamaa.name === selectedJamaa) {
            (jamaa.dawair || []).forEach((daira) => {
              if (!selectedDaira || daira.name === selectedDaira) {
                let dairaVoters = [];
                if (selectedMaktab) {
                  (daira.makatib || []).forEach((maktab) => {
                    if (standardizeMaktabName(maktab.name) === standardizeMaktabName(selectedMaktab)) {
                      dairaVoters = [...(maktab.voters || [])];
                    }
                  });
                  if (dairaVoters.length > 0) {
                    dairaVoters.sort((a, b) =>
                      (a.serialNumber && /^\d+$/.test(String(a.serialNumber)) ? String(a.serialNumber) : '0').localeCompare(
                        b.serialNumber && /^\d+$/.test(String(b.serialNumber)) ? String(b.serialNumber) : '0',
                        undefined,
                        { numeric: true }
                      )
                    );
                    dairaData.push({ dairaName: daira.name, voters: dairaVoters });
                  }
                } else {
                  (daira.makatib || []).forEach((maktab) => {
                    dairaVoters = [...dairaVoters, ...(maktab.voters || [])];
                  });
                  if (dairaVoters.length > 0) {
                    dairaVoters.sort((a, b) =>
                      (a.serialNumber && /^\d+$/.test(String(a.serialNumber)) ? String(a.serialNumber) : '0').localeCompare(
                        b.serialNumber && /^\d+$/.test(String(b.serialNumber)) ? String(b.serialNumber) : '0',
                        undefined,
                        { numeric: true }
                      )
                    );
                    dairaData.push({ dairaName: daira.name, voters: dairaVoters });
                  }
                }
              }
            });
          }
        });
      });

      if (dairaData.length === 0) {
        message.error('لا توجد بيانات ناخبين لهذه الجماعة أو الدائرة أو مكتب التصويت المختار!');
        return;
      }

      dairaData.sort((a, b) => {
        const nameA = String(a.dairaName).replace(/\D/g, '');
        const nameB = String(b.dairaName).replace(/\D/g, '');
        return parseInt(nameA) - parseInt(nameB);
      });

      pdfMake.createPdf(getDocumentDefinition(selectedJamaa, dairaData, selectedDate, selectedDaira, selectedMaktab)).download(
        `general_elections_${selectedJamaa}${selectedDaira ? '_Daira_' + selectedDaira : ''}${selectedMaktab ? '_Maktab_' + getMaktabNumber(selectedMaktab) : ''}.pdf`
      );
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