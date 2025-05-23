import React, { useState } from 'react';
import { Select, Typography, Input, Button, Table, message, DatePicker } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { scheherazadeFontVFS } from './scheherazade-font';
import moment from 'moment';

// التحقق من الـ VFS
console.log('Scheherazade VFS:', scheherazadeFontVFS);

// دالة لإعداد الـ vfs و fonts
const configurePdfMake = () => {
    pdfMake.vfs = scheherazadeFontVFS;
    pdfMake.fonts = {
        Scheherazade: {
            normal: 'Scheherazade-Regular.ttf',
            bold: 'Scheherazade-Regular.ttf',
            italics: 'Scheherazade-Regular.ttf',
            bolditalics: 'Scheherazade-Regular.ttf'
        }
    };
};

const { Title, Text } = Typography;
const { Option } = Select;

// Function to reverse Arabic text word order with Thin Space
const reverseArabicText = (text) => {
    if (!text) return text;
    return text.split(' ').reverse().join('\u2009');
};

// Function to validate table data consistency
const validateTableData = (uiData, pdfData) => {
    if (uiData.length !== pdfData.length) {
        message.error('عدد الصفوف في الجدولين غير متطابق!');
        return false;
    }
    return uiData.every((uiRow, index) => {
        const pdfRow = pdfData[index];
        return (
            uiRow.daira === pdfRow.daira &&
            uiRow.males === pdfRow.males &&
            uiRow.females === pdfRow.females &&
            uiRow.total === pdfRow.total
        );
    });
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
            if (!jamaaName) {
                message.warning('يرجى اختيار جماعة!');
                return stats;
            }
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
                                    daira: daira.name || 'غير معروف',
                                    males: maleCount,
                                    females: femaleCount,
                                    total: maleCount + femaleCount
                                });
                            });
                        }
                    });
                }
            });
            if (!stats.length) {
                message.warning('لم يتم العثور على بيانات للجماعة المختارة!');
            }
            return stats;
        } catch (error) {
            console.error('Error in getDairaStats:', error);
            message.error('حدث خطأ أثناء استرجاع إحصائيات الدوائر!');
            return [];
        }
    };

    const generateCertificatePDF = () => {
        if (!selectedJamaa || !caïdName || !caïdPosition || !certificateDate) {
            message.warning('يرجى إكمال جميع الحقول المطلوبة!');
            return;
        }

        configurePdfMake();

        const dairaStats = getDairaStats(selectedJamaa);
        const uiTableData = getDairaStats(selectedJamaa);
        if (!dairaStats.length) {
            message.warning('لم يتم العثور على بيانات للدوائر المختارة!');
            return;
        }

        if (!validateTableData(uiTableData, dairaStats)) {
            message.error('البيانات في الجدول في الواجهة وفي ملف PDF غير متطابقة!');
            return;
        }

        const totalMales = dairaStats.reduce((sum, stat) => sum + (stat.males || 0), 0);
        const totalFemales = dairaStats.reduce((sum, stat) => sum + (stat.females || 0), 0);
        const totalVoters = totalMales + totalFemales;

        const formattedDate = certificateDate.format('DD/MM/YYYY');

        const tableBody = [
            [
                { text: reverseArabicText('عدد المسجلين'), style: 'tableHeader', alignment: 'center', colSpan: 3 },
                {},
                {},
                { text: reverseArabicText('الدائرة'), style: 'tableHeader', alignment: 'center', rowSpan: 2 }
            ],
            [
                { text: reverseArabicText('مجموع'), style: 'tableSubHeader', alignment: 'center' },
                { text: reverseArabicText('نساء'), style: 'tableSubHeader', alignment: 'center' },
                { text: reverseArabicText('رجال'), style: 'tableSubHeader', alignment: 'center' },
                {}
            ],
            ...dairaStats.map(stat => [
                { text: (stat.total ?? 0).toString(), alignment: 'center', style: 'tableCell' },
                { text: (stat.females ?? 0).toString(), alignment: 'center', style: 'tableCell' },
                { text: (stat.males ?? 0).toString(), alignment: 'center', style: 'tableCell' },
                { text: reverseArabicText(stat.daira || 'غير معروف'), alignment: 'center', style: 'tableCell' }
            ]),
            [
                { text: (totalVoters ?? 0).toString(), style: 'tableFooter', alignment: 'center', fillColor: '#f0f0f0' },
                { text: (totalFemales ?? 0).toString(), style: 'tableFooter', alignment: 'center', fillColor: '#f0f0f0' },
                { text: (totalMales ?? 0).toString(), style: 'tableFooter', alignment: 'center', fillColor: '#f0f0f0' },
                { text: reverseArabicText('المجموع'), style: 'tableFooter', alignment: 'center', fillColor: '#f0f0f0' }
            ]
        ];

        const documentDefinition = {
            content: [
                {
                    stack: [
                        // Header Section
                        {
                            stack: [
                                { text: reverseArabicText('المملكة المغربية'), style: 'header' },
                                { text: reverseArabicText('وزارة الداخلية'), style: 'header' },
                                { text: reverseArabicText('عمالة اقليم الرحامنة'), style: 'header' },
                                { text: reverseArabicText('قسم الشؤون الداخلية'), style: 'header' },
                                { text: reverseArabicText('مصلحة الشؤون الإنتخابية'), style: 'header' }
                            ],
                            alignment: 'right',
                            margin: [0, 10, 10, 10]
                        },
                        // Title Section
                        {
                            stack: [
                                { text: reverseArabicText('إشهاد'), style: 'title', alignment: 'center' },
                                {
                                    canvas: [
                                        {
                                            type: 'line',
                                            x1: 0,
                                            y1: 5,
                                            x2: 60,
                                            y2: 5,
                                            lineWidth: 1,
                                            lineColor: 'black'
                                        }
                                    ],
                                    alignment: 'center',
                                    margin: [0, 0, 0, 10]
                                }
                            ],
                            margin: [0, 10, 0, 10] // فراغ صغير فوق وتحت العنوان
                        },
                        // Body Text Section
                        {
                            columns: [
                                {
                                    width: 480, // عرض ثابت متطابق مع الجدول
                                    stack: [
                                        {
                                            text: reverseArabicText(
                                                `أشهد أنا الموقع أسفله السيد ${caïdName}، قائد قيادة ${caïdPosition} أن مضمون القرص المدمج رفقته`
                                            ),
                                            style: 'body'
                                        },
                                        {
                                            text: reverseArabicText(
                                                `مطـابق للائحــة الانتخابيــة النهائيـة التـي تـم حصـرها مـن طـرف اللجنـة الإداريـة`
                                            ),
                                            style: 'body'
                                        },
                                        {
                                            text: reverseArabicText(
                                                `بتاريخ ${formattedDate} و المتعلقة بجماعة ${selectedJamaa} التابعة للنفوذ الترابي للقيادة أعلاه و هي كما`
                                            ),
                                            style: 'body'
                                        },
                                        {
                                            text: reverseArabicText(`يلي:`),
                                            style: 'body'
                                        }
                                    ],
                                    alignment: 'right', // النص يبدا من أقصى اليمين
                                    margin: [10, 5, 10, 5], // فراغ صغير للنص
                                    unbreakable: true // النصوص ما تتفرقش
                                }
                            ]
                        },
                        // Jamaa Title
                        {
                            text: reverseArabicText(`جماعة ${selectedJamaa}`),
                            style: 'jamaaTitle',
                            alignment: 'center',
                            margin: [10, 10, 10, 5],
                            width: 480 // نفس عرض النصوص والجدول
                        },
                        // Table
                        {
                            table: {
                                headerRows: 2,
                                widths: ['*', '*', '*', '*'],
                                body: tableBody
                            },
                            layout: {
                                hLineWidth: (i) => (i === 0 || i === 1 || i === tableBody.length ? 2 : 1),
                                vLineWidth: () => 1,
                                hLineColor: () => 'black',
                                vLineColor: () => 'black',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 4,
                                paddingBottom: () => 4,
                                fillColor: (rowIndex) => {
                                    return (rowIndex === 0 || rowIndex === 1 || rowIndex === tableBody.length - 1) ? '#f0f0f0' : null;
                                }
                            },
                            style: 'table',
                            margin: [10, 5, 10, 10], // نفس margins ديال النصوص
                            width: 480 // عرض الجدول متطابق مع النصوص
                        },
                        // Signature
                        {
                            text: reverseArabicText('الإمضاء'),
                            style: 'signature',
                            alignment: 'left',
                            margin: [10, 10, 0, 0]
                        }
                    ]
                }
            ],
            styles: {
                header: {
                    fontSize: 9, // حجم صغير لأول 5 جمل
                    bold: true,
                    margin: [0, 1, 0, 1], // فراغ صغير بين الجمل
                    font: 'Scheherazade',
                    color: 'black'
                },
                title: {
                    fontSize: 18,
                    bold: true,
                    font: 'Scheherazade',
                    color: 'black'
                },
                body: {
                    fontSize: 14, // حجم أكبر شوية للنص
                    bold: false,
                    lineHeight: 1.2, // أسطر متجمعة
                    font: 'Scheherazade',
                    color: 'black'
                },
                jamaaTitle: {
                    fontSize: 13,
                    bold: true,
                    font: 'Scheherazade',
                    color: 'black',
                    lineHeight: 1.2
                },
                table: {
                    fontSize: 10
                },
                tableHeader: {
                    bold: true,
                    fillColor: '#f0f0f0',
                    color: 'black',
                    font: 'Scheherazade',
                    fontSize: 10
                },
                tableSubHeader: {
                    bold: true,
                    fillColor: '#f0f0f0',
                    color: 'black',
                    font: 'Scheherazade',
                    fontSize: 10
                },
                tableCell: {
                    font: 'Scheherazade',
                    margin: [4, 4, 4, 4],
                    color: 'black',
                    fontSize: 10
                },
                tableFooter: {
                    bold: true,
                    font: 'Scheherazade',
                    fillColor: '#f0f0f0',
                    color: 'black',
                    fontSize: 10
                },
                signature: {
                    fontSize: 12,
                    bold: true,
                    font: 'Scheherazade',
                    color: '#5F9EA0'
                }
            },
            defaultStyle: {
                font: 'Scheherazade',
                alignment: 'right',
                direction: 'rtl'
            },
            pageMargins: [10, 40, 10, 40] // margins صغار باش النص يبدا من أقصى اليمين
        };

        try {
            pdfMake.createPdf(documentDefinition).download(`certificate_${selectedJamaa}.pdf`);
            message.success('تم إنشاء الإشهاد بنجاح!');
        } catch (error) {
            console.error('PDF Generation Error:', error);
            message.error('حدث خطأ أثناء إنشاء الإشهاد! يرجى المحاولة مرة أخرى.');
        }
    };

    const tableColumns = [
        { title: 'الدائرة', dataIndex: 'daira', key: 'daira', align: 'center' },
        {
            title: 'عدد المسجلين',
            children: [
                { title: 'رجال', dataIndex: 'males', key: 'males', align: 'center' },
                { title: 'نساء', dataIndex: 'females', key: 'females', align: 'center' },
                { title: 'مجموع', dataIndex: 'total', key: 'total', align: 'center' }
            ]
        }
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
                            أشهد   أنا   الموقع   أسفله   السيد {' '}
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
                            أن  مضمون  القرص  المدمج  رفقتهمطــــابق للائحــة الانتخابيـــة النهائيـــة التــــي تـــم حصــــرها مـــن طـــــرف اللجنــــة الإداريــــة بتاريخ                     <DatePicker
                                style={{ width: 200, display: 'inline-block' }}
                                placeholder="اختر تاريخ الإشهاد"
                                format="DD/MM/YYYY"
                                onChange={(date) => setCertificateDate(date)}
                                value={certificateDate}
                            />{' '}
                            و المتعلقة  بجماعة {selectedJamaa} التابعة  للنفوذ  الترابي  للقيادة  أعلاه  و  هي  كما  يلي:
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
                            const totalMales = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + (stat.males || 0), 0);
                            const totalFemales = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + (stat.females || 0), 0);
                            const totalVoters = getDairaStats(selectedJamaa).reduce((sum, stat) => sum + (stat.total || 0), 0);
                            return (
                                <Table.Summary.Row style={{ background: '#f0f0f0' }}>
                                    <Table.Summary.Cell align="center">المجموع</Table.Summary.Cell>
                                    <Table.Summary.Cell align="center">{totalMales}</Table.Summary.Cell>
                                    <Table.Summary.Cell align="center">{totalFemales}</Table.Summary.Cell>
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
        color: rgb(90, 147, 252);
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
        background: #f0f0f0;
        color: black;
        font-weight: bold;
        text-align: center;
    }
    .ant-table-tbody > tr > td {
        text-align: center;
    }
    .ant-table-tbody > tr > td:first-child {
        text-align: center;
    }
    .ant-table-summary > tr > td {
        font-weight: bold;
        text-align: center;
        background: #f0f0f0;
    }
    .ant-table-summary > tr > td:first-child {
        text-align: center;
    }
`;

const SignatureSection = styled.div`
    margin-top: 30px;
    text-align: right;
    font-size: 16px;
    color: #5F9EA0;
`;

export default Certificate;