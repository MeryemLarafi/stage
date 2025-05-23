import React, { useState, useEffect } from 'react';
import { Table, Select, Typography, Button, Modal, message, Input } from 'antd';
import styled from 'styled-components';
import pdfMake from 'pdfmake/build/pdfmake';
import { ArabswellFontVFS } from './Arabswell'; // تأكدي من المسار

// التحقق من الـ VFS
console.log('VFS:', ArabswellFontVFS);

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const normalizeValue = (value) => !value ? '' : String(value).trim().replace(/\s+/g, ' ').toLowerCase();
const standardizeMaktabName = (name) => !name ? 'غير معروف' : /^\d+$/.test(String(name).trim()) ? `مكتب ${name}` : name;
const reverseText = (text) => {
    if (!text) return text;
    return text.split(' ').reverse().join(' ').replace(/\((.*?)\)/g, ') $1 (').replace(/\)ة\(/g, ')ة(');
};
const formatCurrentDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} من ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// دالة لإعداد الـ vfs و fonts
const configurePdfMake = () => {
    pdfMake.vfs = ArabswellFontVFS;
    pdfMake.fonts = {
        Arabswell: {
            normal: 'Arabswell.ttf',
            bold: 'Arabswell.ttf',
            italics: 'Arabswell.ttf',
            bolditalics: 'Arabswell.ttf'
        }
    };
};

const getDocumentDefinition = (voter, jamaaName = 'غير متوفر', maktabName = 'غير متوفر') => ({
    content: [
        {
            stack: [
                { text: reverseText('المملكة المغربية'), style: 'header', margin: [0, 0, 0, 2] },
                { text: reverseText('وزارة الداخلية'), style: 'header', margin: [0, 0, 0, 2] },
                { text: reverseText('إقليم الرحامنة'), style: 'header', margin: [0, 0, 0, 2] },
            ],
            alignment: 'right',
            margin: [0, 0, 20, 30],
        },
        { text: reverseText('الانتخابات الجماعية'), style: 'title', alignment: 'center', color: 'rgb(90, 147, 252)' },
        { text: reverseText('إشعار بمكان التصويت'), style: 'titleSecondary', alignment: 'center', color: 'rgb(90, 147, 252)' },
        {
            table: {
                widths: [280, 30, 180],
                body: [
                    [
                        { text: reverseText(`${voter.firstName} ${voter.lastName}`), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('الاسم الشخصي والعائلي للناخب)ة('), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(voter.address || 'غير متوفر'), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('العنوان'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(jamaaName), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('جماعة'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(voter.cin || 'غير متوفر'), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('رقم البطاقة الوطنية للتعريف'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(voter.maktabAddress || 'غير متوفر'), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('عنوان مكتب التصويت'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(maktabName), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('رقم مكتب التصويت'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(voter.serialNumber || 'غير متوفر'), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('الرقم الترتيبي في لائحة الناخبين'), style: 'infoLabel', alignment: 'right' },
                    ],
                    [
                        { text: reverseText(formatCurrentDateTime()), style: 'infoValue', alignment: 'right' },
                        { text: ':', style: 'infoColon', alignment: 'right' },
                        { text: reverseText('تاريخ وساعة الاقتراع'), style: 'infoLabel', alignment: 'right' },
                    ],
                ],
            },
            layout: 'noBorders',
            margin: [0, 40, 20, 15],
        },
        {
            stack: [
                {
                    text: reverseText('ملحوظة: لا يعتبر هذا الإشعار ضروريا للتصويت. ويتعين على الناخب)ة( الإدلاء بالبطاقة الوطنية للتعريف عند التصويت.'),
                    style: 'note',
                    alignment: 'right',
                    margin: [0, 10, 20, 10],
                    textDirection: 'rtl',
                },
                {
                    canvas: [
                        {
                            type: 'line',
                            x1: 505, // بداية الخط (مضبوط مع بداية كلمة "ملحوظة")
                            y1: 0, // ملاصق تمامًا للنص
                            x2: 405, // نهاية الخط (مضبوط مع نهاية كلمة "ملحوظة")
                            y2: 0,
                            lineWidth: 0.7, // سماكة أرفع لمظهر أقرب لـ underline
                            lineColor: 'black',
                        },
                    ],
                    absolutePosition: { x: 30, y: 460 }, // موقع أقرب للنص
                },
            ],
            alignment: 'right',
        },
        {
            stack: [
                { text: reverseText('طابع'), style: 'footer', alignment: 'left', margin: [50, 0, 0, 5] },
                { text: reverseText('السلطة الإدارية المحلية'), style: 'footer', alignment: 'left', margin: [10, 0, 0, 5] },
            ],
            absolutePosition: { x: 30, y: 550 },
        },
    ],
    styles: {
        header: { fontSize: 16, bold: false, color: '#1a1a1a', margin: [0, 0, 0, 0], font: 'Arabswell', lineHeight: 1 },
        title: { fontSize: 20, bold: false, margin: [0, 10, 0, 5], font: 'Arabswell', color: 'rgb(90, 147, 252)' },
        titleSecondary: { fontSize: 18, bold: false, margin: [0, 5, 0, 10], font: 'Arabswell', color: 'rgb(90, 147, 252)' },
        infoLabel: { fontSize: 14, bold: false, font: 'Arabswell', lineHeight: 1.5, color: '#000000' },
        infoValue: { fontSize: 14, bold: false, font: 'Arabswell', lineHeight: 1.5, color: '#000000' },
        infoColon: { fontSize: 14, bold: false, font: 'Arabswell', lineHeight: 1.5, color: '#000000' },
        note: { fontSize: 12, bold: false, font: 'Arabswell', lineHeight: 1.2 },
        footer: { fontSize: 14, bold: false, font: 'Arabswell', lineHeight: 1.2, color: '#000000' },
    },
    defaultStyle: { font: 'Arabswell', alignment: 'right', bold: false, textDirection: 'rtl' },
    pageMargins: [30, 30, 30, 30],
});

const VotersFilter = ({ data, setData, cancelledVoters, setCancelledVoters }) => {
    const [selectedWilaya, setSelectedWilaya] = useState('');
    const [selectedJamaa, setSelectedJamaa] = useState('');
    const [selectedDaira, setSelectedDaira] = useState('');
    const [selectedMaktab, setSelectedMaktab] = useState('');
    const [searchCIN, setSearchCIN] = useState('');
    const [searchCancelledCIN, setSearchCancelledCIN] = useState('');
    const [filteredVoters, setFilteredVoters] = useState([]);
    const [isCancelledModalVisible, setIsCancelledModalVisible] = useState(false);

    useEffect(() => {
        let voters = [];
        try {
            if (searchCIN) {
                (data || []).forEach((wilaya) => {
                    (wilaya.jamaat || []).forEach((jamaa) => {
                        (jamaa.dawair || []).forEach((daira) => {
                            (daira.makatib || []).forEach((maktab) => {
                                const matchingVoters = (maktab.voters || []).filter((voter) =>
                                    normalizeValue(voter.cin) === normalizeValue(searchCIN)
                                );
                                voters = [...voters, ...matchingVoters];
                            });
                        });
                    });
                });
                if (voters.length === 0) {
                    const isCancelled = (cancelledVoters || []).some((voter) =>
                        normalizeValue(voter.cin) === normalizeValue(searchCIN)
                    );
                    if (isCancelled) {
                        message.warning('الناخب موجود في قائمة المشطوبين، تحقق من لائحة التشطيب.');
                    } else {
                        message.error('الناخب غير موجود.');
                    }
                }
            } else {
                (data || []).forEach((wilaya) => {
                    if (!selectedWilaya || wilaya.wilaya === selectedWilaya) {
                        (wilaya.jamaat || []).forEach((jamaa) => {
                            if (!selectedJamaa || jamaa.name === selectedJamaa) {
                                (jamaa.dawair || []).forEach((daira) => {
                                    if (!selectedDaira || daira.name === selectedDaira) {
                                        (daira.makatib || []).forEach((maktab) => {
                                            if (!selectedMaktab || standardizeMaktabName(maktab.name) === standardizeMaktabName(selectedMaktab)) {
                                                voters = [...voters, ...(maktab.voters || [])];
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            voters.sort((a, b) =>
                (a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0').localeCompare(
                    b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0',
                    undefined,
                    { numeric: true }
                )
            );
            setFilteredVoters(voters);
        } catch (error) {
            message.error('خطأ في تصفية الناخبين!');
        }
    }, [data, cancelledVoters, selectedWilaya, selectedJamaa, selectedDaira, selectedMaktab, searchCIN]);

    const handleSearch = (value) => {
        setSearchCIN(value);
    };

    const handleCancelledSearch = (value) => {
        setSearchCancelledCIN(value);
    };

    const showCancelledVoters = () => setIsCancelledModalVisible(true);

    const handleRestore = (voter) => {
        try {
            const updatedCancelled = cancelledVoters.filter((v) =>
                !(normalizeValue(v.cin) === normalizeValue(voter.cin) &&
                  normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
                  normalizeValue(standardizeMaktabName(v.maktabName)) === normalizeValue(standardizeMaktabName(voter.maktabName)))
            );
            setCancelledVoters(updatedCancelled);

            let voterAdded = false;
            const updatedData = data.map((wilaya) => ({
                ...wilaya,
                jamaat: wilaya.jamaat.map((jamaa) => ({
                    ...jamaa,
                    dawair: jamaa.dawair.map((daira) => ({
                        ...daira,
                        makatib: daira.makatib.map((maktab) => {
                            if (normalizeValue(standardizeMaktabName(maktab.name)) === normalizeValue(standardizeMaktabName(voter.maktabName)) && !voterAdded) {
                                voterAdded = true;
                                return { ...maktab, voters: [...maktab.voters, voter] };
                            }
                            return maktab;
                        }),
                    })),
                })),
            }));

            setData(updatedData);
            message.success('تم استرجاع الناخب بنجاح!');
        } catch (error) {
            message.error('خطأ في استرجاع الناخب!');
        }
    };

    const handleRestoreAll = () => {
        try {
            let votersAdded = new Set();
            const updatedData = data.map((wilaya) => ({
                ...wilaya,
                jamaat: wilaya.jamaat.map((jamaa) => ({
                    ...jamaa,
                    dawair: jamaa.dawair.map((daira) => ({
                        ...daira,
                        makatib: daira.makatib.map((maktab) => {
                            const votersToAdd = cancelledVoters.filter((voter) =>
                                normalizeValue(standardizeMaktabName(voter.maktabName)) === normalizeValue(standardizeMaktabName(maktab.name)) &&
                                !votersAdded.has(`${voter.cin}-${voter.serialNumber}-${voter.maktabName}`)
                            );
                            votersToAdd.forEach((voter) => votersAdded.add(`${voter.cin}-${voter.serialNumber}-${voter.maktabName}`));
                            return { ...maktab, voters: [...maktab.voters, ...votersToAdd] };
                        }),
                    })),
                })),
            }));

            setData(updatedData);
            setCancelledVoters([]);
            setIsCancelledModalVisible(false);
            message.success('تم استرجاع جميع الناخبين بنجاح!');
        } catch (error) {
            message.error('خطأ في استرجاع جميع الناخبين!');
        }
    };

    const generatePDF = (voter) => {
        try {
            configurePdfMake();
            let jamaaName = 'غير متوفر', maktabName = 'غير متوفر';
            (data || []).forEach((wilaya) => {
                (wilaya.jamaat || []).forEach((jamaa) => {
                    (jamaa.dawair || []).forEach((daira) => {
                        (daira.makatib || []).forEach((maktab) => {
                            if ((maktab.voters || []).some((v) =>
                                normalizeValue(v.cin) === normalizeValue(voter.cin) &&
                                normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
                                normalizeValue(standardizeMaktabName(v.maktabName)) === normalizeValue(standardizeMaktabName(voter.maktabName))
                            )) {
                                jamaaName = jamaa.name;
                                maktabName = maktab.name;
                            }
                        });
                    });
                });
            });
            pdfMake.createPdf(getDocumentDefinition(voter, jamaaName, maktabName)).download(`${voter.firstName}_${voter.lastName}_voting_notice.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            message.error('خطأ في توليد PDF!');
        }
    };

    const generateAllPDFs = () => {
        if (!filteredVoters || filteredVoters.length === 0) return message.warning('لا توجد بيانات ناخبين لتوليد PDF!');
        message.loading({ content: 'جاري توليد PDF...', key: 'pdfGeneration', duration: 0 });
        try {
            configurePdfMake();
            const content = filteredVoters.map((voter, index) => {
                let jamaaName = 'غير متوفر', maktabName = 'غير متوفر';
                (data || []).forEach((wilaya) => {
                    (wilaya.jamaat || []).forEach((jamaa) => {
                        (jamaa.dawair || []).forEach((daira) => {
                            (daira.makatib || []).forEach((maktab) => {
                                if ((maktab.voters || []).some((v) =>
                                    normalizeValue(v.cin) === normalizeValue(voter.cin) &&
                                    normalizeValue(v.serialNumber) === normalizeValue(voter.serialNumber) &&
                                    normalizeValue(standardizeMaktabName(v.maktabName)) === normalizeValue(standardizeMaktabName(voter.maktabName))
                                )) {
                                    jamaaName = jamaa.name;
                                    maktabName = maktab.name;
                                }
                            });
                        });
                    });
                });
                const voterContent = getDocumentDefinition(voter, jamaaName, maktabName).content;
                return index < filteredVoters.length - 1 ? [...voterContent, { text: '', pageBreak: 'after' }] : voterContent;
            }).flat();

            pdfMake.createPdf({
                content,
                styles: getDocumentDefinition({}).styles,
                defaultStyle: { font: 'Arabswell', alignment: 'right', bold: false, textDirection: 'rtl' },
                pageMargins: [30, 30, 30, 30]
            }).download('all_voters_voting_notices.pdf');
            message.success({ content: 'تمت عملية التنزيل بنجاح', key: 'pdfGeneration' });
        } catch (error) {
            console.error('Error generating all PDFs:', error);
            message.error({ content: 'هناك خطأ في عملية تنزيل الناخبين', key: 'pdfGeneration' });
        }
    };

    const voterColumns = [
        { title: 'الإسم الشخصي', dataIndex: 'firstName', key: 'firstName', sorter: (a, b) => (a.firstName || '').localeCompare(b.firstName || '') },
        { title: 'الإسم العائلي', dataIndex: 'lastName', key: 'lastName', sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || '') },
        { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
        { title: 'الرقم الترتيبي', dataIndex: 'serialNumber', key: 'serialNumber', sorter: (a, b) => (a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0').localeCompare(b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0', undefined, { numeric: true }), defaultSortOrder: 'ascend' },
        { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
        { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
        { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
        { title: 'إجراء', key: 'action', render: (_, record) => <StyledButton type="primary" onClick={() => generatePDF(record)} aria-label="تحميل إشعار التصويت للناخب)ة(">تحميل PDF</StyledButton> },
    ];

    const cancelledColumns = [
        { title: 'الإسم الشخصي', dataIndex: 'firstName', key: 'firstName', sorter: (a, b) => (a.firstName || '').localeCompare(b.firstName || '') },
        { title: 'الإسم العائلي', dataIndex: 'lastName', key: 'lastName', sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || '') },
        { title: 'بطاقة التعريف', dataIndex: 'cin', key: 'cin' },
        { title: 'الرقم الترتيبي', dataIndex: 'serialNumber', key: 'serialNumber', sorter: (a, b) => (a.serialNumber && /^\d+$/.test(a.serialNumber) ? a.serialNumber : '0').localeCompare(b.serialNumber && /^\d+$/.test(b.serialNumber) ? b.serialNumber : '0', undefined, { numeric: true }), defaultSortOrder: 'ascend' },
        { title: 'العنوان بدقة', dataIndex: 'address', key: 'address' },
        { title: 'الجنس', dataIndex: 'gender', key: 'gender' },
        { title: 'تاريخ الازدياد', dataIndex: 'birthDate', key: 'birthDate' },
        { title: 'الحالة', dataIndex: 'status', key: 'status' },
        { title: 'إجراء', key: 'action', render: (_, record) => <StyledButton type="primary" onClick={() => handleRestore(record)} aria-label="استرجاع الناخب)ة( المشطوب">استرجاع</StyledButton> },
    ];

    const cancelledTableData = (cancelledVoters || [])
        .filter((voter) =>
            !searchCancelledCIN || normalizeValue(voter.cin) === normalizeValue(searchCancelledCIN)
        )
        .map((voter) => ({ ...voter, status: 'مشطوب' }));

    useEffect(() => {
        if (searchCancelledCIN && cancelledTableData.length === 0) {
            message.error('لا يوجد هذا الناخب');
        }
    }, [searchCancelledCIN, cancelledTableData]);

    return (
        <StyledContainer>
            {(!data || data.length === 0) ? (
                <EmptyMessage>لا توجد بيانات لعرضها</EmptyMessage>
            ) : (
                <>
                    <Title level={3}>تصفية الناخبين</Title>
                    <SearchSection>
                        <Search
                            placeholder="ابحث برقم البطاقة الوطنية (CIN)"
                            onSearch={handleSearch}
                            style={{ width: 300 }}
                            enterButton="بحث"
                            allowClear
                            aria-label="البحث عن الناخب برقم البطاقة الوطنية"
                        />
                    </SearchSection>
                    <FilterSection>
                        <Select placeholder="اختر العمالة" onChange={setSelectedWilaya} style={{ width: 200 }} allowClear aria-label="تحديد العمالة">
                            {(data || []).map((wilaya) => <Option key={wilaya.wilaya} value={wilaya.wilaya}>{wilaya.wilaya}</Option>)}
                        </Select>
                        <Select placeholder="اختر الجماعة" onChange={setSelectedJamaa} style={{ width: 200 }} allowClear disabled={!selectedWilaya} aria-label="تحديد الجماعة">
                            {(data || []).filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya).flatMap((wilaya) => wilaya.jamaat || []).map((jamaa) => <Option key={jamaa.name} value={jamaa.name}>{jamaa.name}</Option>)}
                        </Select>
                        <Select placeholder="اختر الدائرة" onChange={setSelectedDaira} style={{ width: 200 }} allowClear disabled={!selectedJamaa} aria-label="تحديد الدائرة">
                            {(data || []).filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya).flatMap((wilaya) => wilaya.jamaat || []).filter((jamaa) => !selectedJamaa || jamaa.name === selectedJamaa).flatMap((jamaa) => jamaa.dawair || []).map((daira) => <Option key={daira.name} value={daira.name}>{daira.name}</Option>)}
                        </Select>
                        <Select placeholder="اختر مكتب التصويت" onChange={setSelectedMaktab} style={{ width: 200 }} allowClear disabled={!selectedDaira} aria-label="تحديد مكتب التصويت">
                            {(data || []).filter((wilaya) => !selectedWilaya || wilaya.wilaya === selectedWilaya).flatMap((wilaya) => wilaya.jamaat || []).filter((jamaa) => !selectedJamaa || jamaa.name === selectedJamaa).flatMap((jamaa) => jamaa.dawair || []).filter((daira) => !selectedDaira || daira.name === selectedDaira).flatMap((daira) => daira.makatib || []).map((maktab) => <Option key={maktab.name} value={maktab.name}>{maktab.name}</Option>)}
                        </Select>
                    </FilterSection>
                    <ButtonSection>
                        <StyledButton type="primary" onClick={showCancelledVoters} disabled={cancelledVoters.length === 0} aria-label="عرض لائحة الناخبين المشطوبين">عرض لائحة التشطيب</StyledButton>
                        <StyledButton type="primary" onClick={generateAllPDFs} disabled={!filteredVoters || filteredVoters.length === 0} aria-label="تحميل إشعارات التصويت لجميع الناخبين">تحميل PDF للجميع</StyledButton>
                    </ButtonSection>
                    <StyledTable
                        columns={voterColumns}
                        dataSource={filteredVoters}
                        rowKey={(record) => `${record.cin || 'unknown'}-${record.serialNumber || '0'}-${record.maktabName || 'unknown'}`}
                        pagination={{ pageSize: 10 }}
                        bordered
                        locale={{ emptyText: 'لا توجد بيانات مطابقة' }}
                        aria-label="جدول الناخبين المصفاة"
                    />
                    <StyledModal
                        title="لائحة الناخبين المشطوبين"
                        open={isCancelledModalVisible}
                        onCancel={() => setIsCancelledModalVisible(false)}
                        footer={[
                            <StyledButton key="restoreAll" type="primary" onClick={handleRestoreAll} disabled={cancelledVoters.length === 0} aria-label="استرجاع جميع الناخبين المشطوبين">استرجاع الكل</StyledButton>,
                            <StyledButton key="cancel" type="default" onClick={() => setIsCancelledModalVisible(false)} aria-label="إغلاق نافذة الناخبين المشطوبين">إغلاق</StyledButton>,
                        ]}
                        width={1200}
                    >
                        <SearchSection>
                            <Search
                                placeholder="ابحث برقم البطاقة الوطنية (CIN)"
                                onSearch={handleCancelledSearch}
                                style={{ width: 300 }}
                                enterButton="بحث"
                                allowClear
                                aria-label="البحث عن الناخب مشطوب برقم البطاقة الوطنية"
                            />
                        </SearchSection>
                        <StyledTable
                            columns={cancelledColumns}
                            dataSource={cancelledTableData}
                            rowKey={(record) => `${record.cin || 'unknown'}-${record.serialNumber || '0'}-${record.maktabName || 'unknown'}`}
                            pagination={false}
                            bordered
                            locale={{ emptyText: 'لا توجد بيانات مشطوبة' }}
                            aria-label="جدول الناخبين المشطوبين"
                        />
                    </StyledModal>
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

const FilterSection = styled.div`
    margin-bottom: 24px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    .ant-select { min-width: 200px; transition: all 0.3s ease; &:hover { box-shadow: 0 0 0 2px rgba(90, 147, 252, 0.1); } }
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

const StyledModal = styled(Modal)`
    .ant-modal-content { border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); min-height: 600px; }
    .ant-modal-header { border-bottom: 1px solid #e8e8e8; padding: 16px 24px; }
    .ant-modal-title { color: #000; font-weight: 600; }
    .ant-modal-body { padding: 24px; }
    .ant-modal-footer { border-top: 1px solid #e8e8e8; padding: 16px 24px; display: flex; justify-content: flex-end; gap: 16px; }
`;

export default VotersFilter;