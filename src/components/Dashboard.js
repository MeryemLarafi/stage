import React, { useState, useEffect } from 'react';
import { Card, Select, Typography, Row, Col, Statistic, Button } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import styled from 'styled-components';
import { ManOutlined, WomanOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

const normalizeValue = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
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
  const [currentPage, setCurrentPage] = useState('gender'); // للتحكم في الصفحات

  useEffect(() => {
    let voters = [];
    try {
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

      // استثناء الناخبين المشطوبين
      const activeVoters = voters.filter((voter) => {
        return !(cancelledVoters || []).some((cancelled) =>
          normalizeValue(cancelled.cin) === normalizeValue(voter.cin) &&
          normalizeValue(cancelled.serialNumber) === normalizeValue(voter.serialNumber) &&
          normalizeValue(cancelled.maktabName) === normalizeValue(voter.maktabName) &&
          normalizeValue(cancelled.registrationNumber) === normalizeValue(voter.registrationNumber)
        );
      });

      // طباعة القيم الخام للجنس والعمر
      console.log('Raw gender values:', activeVoters.map((voter) => voter.gender));
      console.log('Raw age values:', activeVoters.map((voter) => voter.age));

      // جمع القيم الغير معروفة للجنس
      const unknownGenders = activeVoters
        .filter((voter) => {
          const genderValue = normalizeValue(voter.gender);
          return !['h', 'f'].includes(genderValue);
        })
        .map((voter) => voter.gender);
      console.log('Unknown gender values:', [...new Set(unknownGenders)]);

      // حساب إحصائيات الجنس
      const genderCounts = activeVoters.reduce(
        (acc, voter) => {
          const genderValue = normalizeValue(voter.gender);
          if (['h'].includes(genderValue)) {
            acc.male += 1;
          } else if (['f'].includes(genderValue)) {
            acc.female += 1;
          } else {
            acc.male += 1; // افتراضيا، أي قيمة أخرى تحسب كرجال
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

      // حساب إحصائيات العمر
      const ageGroups = [
        { range: '18-25', min: 18, max: 25, count: 0 },
        { range: '26-35', min: 26, max: 35, count: 0 },
        { range: '36-50', min: 36, max: 50, count: 0 },
        { range: '>50', min: 51, max: Infinity, count: 0 },
      ];

      activeVoters.forEach((voter) => {
        const age = parseInt(voter.age, 10);
        if (isNaN(age) || age < 18) return; // تجاهل الأعمار غير الصالحة
        for (const group of ageGroups) {
          if (age >= group.min && age <= group.max) {
            group.count += 1;
            break;
          }
        }
      });

      // تحضير بيانات المخطط للعمر
      const ageChartData = ageGroups.map((group) => ({
        name: group.range,
        value: group.count,
        percentage: total ? ((group.count / total) * 100).toFixed(1) : 0,
      })).filter(item => item.value > 0);
      setAgeData(ageChartData);

      // إيجاد الفئة العمرية الأكبر
      const maxGroup = ageGroups.reduce((max, group) => group.count > max.count ? group : max, ageGroups[0]);
      setLargestAgeGroup(maxGroup);

      console.log('Gender Counts:', genderCounts);
      console.log('Age Chart Data:', ageChartData);
      console.log('Largest Age Group:', maxGroup);
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

  // الصفحة الأولى: إحصائيات الجنس وملخص
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
        <Button type="default" onClick={() => setCurrentPage('gender')} style={{ marginLeft: 10 }}>
          رجوع
        </Button>
      </FilterSection>
      {totalVoters === 0 ? (
        <EmptyMessage>لا توجد بيانات ناخبين لعرضها</EmptyMessage>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <StyledCard title="توزيع الناخبين حسب الفئات العمرية">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, 'الناخبين']} />
                  <Bar dataKey="value" fill="#52c41a" />
                </BarChart>
              </ResponsiveContainer>
            </StyledCard>
          </Col>
          <Col xs={24} md={12}>
            <StyledCard title="ملخص الفئات العمرية">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Statistic
                    title="الفئة العمرية الأكبر"
                    value={largestAgeGroup ? `${largestAgeGroup.range} (${largestAgeGroup.count} ناخب)` : 'غير متوفر'}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                {ageData.map((group) => (
                  <Col span={12} key={group.name}>
                    <Statistic
                      title={`فئة ${group.name}`}
                      value={group.value}
                      suffix={`(${group.percentage}%)`}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                ))}
              </Row>
            </StyledCard>
          </Col>
        </Row>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FilterSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const StyledCard = styled(Card)`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #fff;
  width: 100%;
  max-width: 1200px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #888;
  padding: 20px;
  font-size: 16px;
`;

export default Dashboard;