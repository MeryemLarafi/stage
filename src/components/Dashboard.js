import React, { useState, useEffect } from 'react';
import { Card, Select, Typography, Row, Col, Statistic, Button } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import styled from 'styled-components';
import { ManOutlined, WomanOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const normalizeValue = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};

// دالة لحساب العمر من تاريخ الازدياد
const calculateAge = (birthDate) => {
  try {
    if (!birthDate || typeof birthDate !== 'string') {
      console.log('Missing or invalid birth date type:', birthDate);
      return null;
    }
    // فحص صيغة YYYY/MM/DD
    if (!/^\d{4}\/\d{2}\/\d{2}$/.test(birthDate)) {
      console.log('Invalid birth date format (not YYYY/MM/DD):', birthDate);
      return null;
    }
    // استبعاد placeholder
    if (birthDate === '1900/01/01') {
      console.log('Placeholder birth date detected:', birthDate);
      return null;
    }
    const today = new Date('2025-05-17'); // التاريخ الحالي
    const birth = new Date(birthDate.replace(/\//g, '-')); // تحويل YYYY/MM/DD إلى YYYY-MM-DD للتحليل
    if (isNaN(birth.getTime())) {
      console.log('Invalid birth date (cannot parse):', birthDate);
      return null;
    }
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    if (age < 18) {
      console.log('Age too young:', age, 'for birth date:', birthDate);
      return null;
    }
    if (age > 100) {
      console.log('Age too old:', age, 'for birth date:', birthDate);
      return null;
    }
    return age;
  } catch (error) {
    console.error('Error calculating age:', error, 'Birth date:', birthDate);
    return null;
  }
};

// دالة لتحديد الفئة العمرية
const getAgeGroup = (age) => {
  if (age >= 18 && age <= 25) return '18-25';
  if (age >= 26 && age <= 35) return '26-35';
  if (age >= 36 && age <= 45) return '36-45';
  if (age >= 46 && age <= 50) return '46-50';
  if (age >= 51) return '51+';
  return null;
};

const Dashboard = ({ data, cancelledVoters }) => {
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [selectedJamaa, setSelectedJamaa] = useState('');
  const [selectedDaira, setSelectedDaira] = useState('');
  const [selectedMaktab, setSelectedMaktab] = useState('');
  const [genderData, setGenderData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [largestAgeGroup, setLargestAgeGroup] = useState(null);
  const [currentPage, setCurrentPage] = useState('gender');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    let voters = [];
    try {
      console.log('Input data:', data);
      console.log('Cancelled voters:', cancelledVoters);

      // تصفية الناخبين حسب الاختيارات
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

      // استثناء الناخبين المشطوبين
      const activeVoters = voters.filter((voter) => {
        return !(cancelledVoters || []).some((cancelled) =>
          normalizeValue(cancelled.cin) === normalizeValue(voter.cin) &&
          normalizeValue(cancelled.serialNumber) === normalizeValue(voter.serialNumber) &&
          normalizeValue(cancelled.maktabName) === normalizeValue(voter.maktabName) &&
          normalizeValue(cancelled.registrationNumber) === normalizeValue(voter.registrationNumber)
        );
      });

      console.log('Active voters:', activeVoters);
      console.log('Raw birth dates from Excel:', activeVoters.map((voter) => ({
        cin: voter.cin,
        birthDate: voter.birthDate
      })));

      // حساب إحصائيات الجنس
      const genderCounts = activeVoters.reduce(
        (acc, voter) => {
          const genderValue = normalizeValue(voter.gender);
          if (['h'].includes(genderValue)) {
            acc.male += 1;
          } else if (['f'].includes(genderValue)) {
            acc.female += 1;
          } else {
            acc.male += 1; // افتراضيا
          }
          return acc;
        },
        { male: 0, female: 0 }
      );

      const total = genderCounts.male + genderCounts.female;
      setTotalVoters(total);

      // تحضير بيانات المخطط للجنس
      const chartData = [
        { name: 'رجال', value: genderCounts.male, percentage: total ? ((genderCounts.male / total) * 100).toFixed(1) : 0 },
        { name: 'نساء', value: genderCounts.female, percentage: total ? ((genderCounts.female / total) * 100).toFixed(1) : 0 },
      ].filter(item => item.value > 0);
      setGenderData(chartData);

      // حساب إحصائيات الفئات العمرية
      const ageGroupCounts = {
        '18-25': 0,
        '26-35': 0,
        '36-45': 0,
        '46-50': 0,
        '51+': 0,
      };
      let invalidBirthDates = 0;
      let missingBirthDates = 0;
      let tooYoung = 0;
      let tooOld = 0;
      let placeholders = 0;

      activeVoters.forEach((voter) => {
        if (!voter.birthDate) {
          missingBirthDates++;
          console.log('Missing birth date for voter:', voter.cin);
          return;
        }
        const age = calculateAge(voter.birthDate);
        if (!age) {
          if (voter.birthDate === '1900/01/01') {
            placeholders++;
          } else {
            invalidBirthDates++;
          }
          return;
        }
        if (age < 18) {
          tooYoung++;
          return;
        }
        if (age > 100) {
          tooOld++;
          return;
        }
        const ageGroup = getAgeGroup(age);
        if (ageGroup) {
          ageGroupCounts[ageGroup]++;
        }
      });

      // تحضير بيانات المخطط للفئات العمرية
      const ageChartData = [
        { name: '18-25', value: ageGroupCounts['18-25'], percentage: total ? ((ageGroupCounts['18-25'] / total) * 100).toFixed(1) : 0 },
        { name: '26-35', value: ageGroupCounts['26-35'], percentage: total ? ((ageGroupCounts['26-35'] / total) * 100).toFixed(1) : 0 },
        { name: '36-45', value: ageGroupCounts['36-45'], percentage: total ? ((ageGroupCounts['36-45'] / total) * 100).toFixed(1) : 0 },
        { name: '46-50', value: ageGroupCounts['46-50'], percentage: total ? ((ageGroupCounts['46-50'] / total) * 100).toFixed(1) : 0 },
        { name: '51+', value: ageGroupCounts['51+'], percentage: total ? ((ageGroupCounts['51+'] / total) * 100).toFixed(1) : 0 },
      ];

      if (ageChartData.every(item => item.value === 0)) {
        let errorMsg = 'لا توجد بيانات أعمار صالحة لعرضها. التفاصيل:\n';
        if (missingBirthDates > 0) errorMsg += `- ${missingBirthDates} ناخب بدون تاريخ ازدياد.\n`;
        if (invalidBirthDates > 0) errorMsg += `- ${invalidBirthDates} تاريخ ازدياد غير صالح.\n`;
        if (placeholders > 0) errorMsg += `- ${placeholders} تاريخ ازدياد placeholder (1900/01/01).\n`;
        if (tooYoung > 0) errorMsg += `- ${tooYoung} ناخب بعمر أقل من 18 سنة.\n`;
        if (tooOld > 0) errorMsg += `- ${tooOld} ناخب بعمر أكبر من 100 سنة.\n`;
        console.warn('No valid age data available for chart:', errorMsg);
        setErrorDetails(errorMsg);
      } else {
        setErrorDetails('');
      }

      setAgeData(ageChartData);

      // إيجاد الفئة العمرية الأكثر شيوعا
      const maxAgeGroup = ageChartData.reduce((max, item) => item.value > max.value ? item : max, ageChartData[0]);
      setLargestAgeGroup(maxAgeGroup);

      console.log('Gender Counts:', genderCounts);
      console.log('Age Group Chart Data:', ageChartData);
      console.log('Most Common Age Group:', maxAgeGroup);
      console.log('Birth date errors:', { missingBirthDates, invalidBirthDates, placeholders, tooYoung, tooOld });
    } catch (error) {
      console.error('Error calculating statistics:', error);
    }
  }, [data, cancelledVoters, selectedWilaya, selectedJamaa, selectedDaira, selectedMaktab]);

  const COLORS = ['#1890ff', '#ff4d4f'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const handleResetFilters = () => {
    setSelectedWilaya('');
    setSelectedJamaa('');
    setSelectedDaira('');
    setSelectedMaktab('');
  };

  // الصفحة الأولى: إحصائيات الجنس
  if (currentPage === 'gender') {
    return (
      <StyledContainer>
        <Title level={3}>لوحة إحصائيات الناخبين</Title>
        <FilterSection>
          <Select
            placeholder="اختر العمالة"
            onChange={setSelectedWilaya}
            style={{ width: 200, marginRight: 10 }}
            allowClear
            value={selectedWilaya}
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
            value={selectedJamaa}
            disabled={!selectedWilaya}
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
            value={selectedDaira}
            disabled={!selectedJamaa}
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
            style={{ width: 200, marginRight: 10 }}
            allowClear
            value={selectedMaktab}
            disabled={!selectedDaira}
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
          <Button type="default" onClick={handleResetFilters}>
            إعادة تعيين
          </Button>
        </FilterSection>
        {totalVoters === 0 ? (
          <EmptyMessage>لا توجد بيانات ناخبين لعرضها</EmptyMessage>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <StyledCard title="إحصائيات الجنس">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </StyledCard>
              </Col>
              <Col xs={24} md={12}>
                <StyledCard title="ملخص إحصائيات الجنس">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="إجمالي الناخبين"
                        value={totalVoters}
                        prefix={<ManOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="عدد الرجال"
                        value={genderData.find((d) => d.name === 'رجال')?.value || 0}
                        suffix={`(${genderData.find((d) => d.name === 'رجال')?.percentage || 0}%)`}
                        prefix={<ManOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="عدد النساء"
                        value={genderData.find((d) => d.name === 'نساء')?.value || 0}
                        suffix={`(${genderData.find((d) => d.name === 'نساء')?.percentage || 0}%)`}
                        prefix={<WomanOutlined />}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Col>
                  </Row>
                </StyledCard>
              </Col>
            </Row>
            <Button
              type="primary"
              style={{ marginTop: 16 }}
              onClick={() => setCurrentPage('age')}
            >
              التالي
            </Button>
          </>
        )}
      </StyledContainer>
    );
  }

  // الصفحة الثانية: إحصائيات الفئات العمرية
  return (
    <StyledContainer>
      <Title level={3}>لوحة إحصائيات الناخبين</Title>
      <FilterSection>
        <Select
          placeholder="اختر العمالة"
          onChange={setSelectedWilaya}
          style={{ width: 200, marginRight: 10 }}
          allowClear
          value={selectedWilaya}
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
          value={selectedJamaa}
          disabled={!selectedWilaya}
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
          value={selectedDaira}
          disabled={!selectedJamaa}
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
          style={{ width: 200, marginRight: 10 }}
          allowClear
          value={selectedMaktab}
          disabled={!selectedDaira}
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
        <Button type="default" onClick={handleResetFilters}>
          إعادة تعيين
        </Button>
      </FilterSection>
      {totalVoters === 0 || ageData.every(item => item.value === 0) ? (
        <EmptyMessage>
          لا توجد بيانات أعمار صالحة لعرضها.
          {errorDetails ? (
            <pre style={{ textAlign: 'right', whiteSpace: 'pre-wrap' }}>{errorDetails}</pre>
          ) : (
            ' الرجاء التحقق من تواريخ الازدياد في البيانات.'
          )}
        </EmptyMessage>
      ) : (
        <>
          <StyledCard title="توزيع الناخبين حسب الفئات العمرية" style={{ width: '100%', maxWidth: '900px' }}>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart
                data={ageData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecef" />
                <XAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 14, fill: '#4a5568' }}
                  label={{ value: 'الفئات العمرية', position: 'insideBottom', offset: -10, fill: '#4a5568', fontSize: 16 }}
                />
                <YAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 14, fill: '#4a5568' }}
                  label={{ value: 'النسبة المئوية', angle: -90, position: 'insideLeft', offset: -10, fill: '#4a5568', fontSize: 16 }}
                />
                <Tooltip
                  formatter={(value, name, props) => [`${value}% (${props.payload.value} ناخب)`, 'الناخبين']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e8ecef' }}
                />
                <Bar
                  dataKey="percentage"
                  fill="#1890ff"
                  barSize={50}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </StyledCard>
          <StyledCard title="ملخص إحصائيات الفئات العمرية" style={{ width: '100%', maxWidth: '900px', marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              {ageData.map((group) => (
                <Col xs={12} sm={8} md={6} key={group.name}>
                  <Statistic
                    title={`فئة ${group.name} سنة`}
                    value={group.value}
                    suffix={`(${group.percentage}%)`}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
              ))}
              <Col xs={24} sm={12} md={8}>
                <Statistic
                  title="الفئة العمرية الأكثر شيوعًا"
                  value={largestAgeGroup ? `${largestAgeGroup.name} (${largestAgeGroup.percentage}%)` : 'غير معروف'}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </StyledCard>
          <Button
            type="primary"
            style={{ marginTop: 20, padding: '8px 24px', fontSize: '16px' }}
            onClick={() => setCurrentPage('gender')}
          >
            رجوع
          </Button>
        </>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FilterSection = styled.div`
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  background: #fff;
  width: 100%;
  max-width: 900px;
  .ant-card-head {
    background: #fafafa;
    border-bottom: 1px solid #e8ecef;
    padding: 16px 24px;
  }
  .ant-card-head-title {
    font-size: 18px;
    font-weight: 600;
    color: #4a5568;
  }
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #6b7280;
  padding: 32px;
  font-size: 18px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  max-width: 600px;
  margin: 0 auto;
`;

export default Dashboard;