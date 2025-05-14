import React, { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styled from 'styled-components';
import moment from 'moment';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = ({ data }) => {
  const [selectedJamaa, setSelectedJamaa] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Flatten jamaat list
  const jamaatList = data.reduce((acc, wilaya) => [
    ...acc,
    ...wilaya.jamaat.map((jamaa) => ({ wilaya: wilaya.wilaya, name: jamaa.name })),
  ], []);

  // Calculate stats for selected jamaa
  const getJamaaStats = () => {
    if (!selectedJamaa || !data) {
      return {
        totalMen: 0,
        totalWomen: 0,
        ageData: {
          labels: ['غير معروف'],
          datasets: [{
            label: 'توزيع حسب الفئة العمرية',
            data: [0],
            backgroundColor: ['#ccc'],
            borderColor: ['#ccc'],
            borderWidth: 1
          }]
        }
      };
    }

    const jamaaData = data
      .flatMap((wilaya) =>
        wilaya.jamaat
          .filter((j) => `${wilaya.wilaya} - ${j.name}` === selectedJamaa)
          .flatMap((j) =>
            j.dawair.flatMap((d) => d.makatib.flatMap((m) => m.voters || []))
          )
      );

    const totalMen = jamaaData.filter(voter => voter.gender === 'ذكر').length;
    const totalWomen = jamaaData.filter(voter => voter.gender === 'أنثى').length;

    const votersByAgeGroup = jamaaData.reduce((acc, voter) => {
      if (voter.birthDate && voter.birthDate !== 'غير صالح') {
        const age = moment().diff(moment(voter.birthDate, 'YYYY-MM-DD'), 'years');
        if (age >= 18 && age <= 25) {
          acc['18-25'] = (acc['18-25'] || 0) + 1;
        } else if (age >= 26 && age <= 35) {
          acc['26-35'] = (acc['26-35'] || 0) + 1;
        } else if (age >= 36 && age <= 50) {
          acc['36-50'] = (acc['36-50'] || 0) + 1;
        } else if (age >= 51 && age <= 65) {
          acc['51-65'] = (acc['51-65'] || 0) + 1;
        } else if (age > 65) {
          acc['65+'] = (acc['65+'] || 0) + 1;
        }
      }
      return acc;
    }, {});

    const ageData = {
      labels: Object.keys(votersByAgeGroup).length ? Object.keys(votersByAgeGroup) : ['غير معروف'],
      datasets: [
        {
          label: 'توزيع حسب الفئة العمرية',
          data: Object.keys(votersByAgeGroup).length ? Object.values(votersByAgeGroup) : [0],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    return { totalMen, totalWomen, ageData };
  };

  const { totalMen, totalWomen, ageData } = getJamaaStats();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'توزيع حسب الفئة العمرية', font: { size: 16 } },
    },
  };

  const handleNext = () => {
    if (currentPage === 1) setCurrentPage(2);
  };

  const handlePrevious = () => {
    if (currentPage === 2) setCurrentPage(1);
  };

  return (
    <StyledContainer>
      <StyledTitle>لوحة التحكم</StyledTitle>
      <SelectWrapper>
        <select
          value={selectedJamaa}
          onChange={(e) => { setSelectedJamaa(e.target.value); setCurrentPage(1); }}
        >
          <option value="">اختر الجماعة</option>
          {jamaatList.map((jamaa) => (
            <option key={`${jamaa.wilaya} - ${jamaa.name}`} value={`${jamaa.wilaya} - ${jamaa.name}`}>
              {`${jamaa.wilaya} - ${jamaa.name}`}
            </option>
          ))}
        </select>
      </SelectWrapper>

      {currentPage === 1 && (
        <Row>
          <Col>
            <StyledCard>
              <h3>عدد الرجال</h3>
              <h2>{totalMen || 0}</h2>
            </StyledCard>
          </Col>
          <Col>
            <StyledCard>
              <h3>عدد النساء</h3>
              <h2>{totalWomen || 0}</h2>
            </StyledCard>
          </Col>
        </Row>
      )}

      {currentPage === 2 && (
        <Row>
          <Col>
            <StyledCard>
              <h3>توزيع حسب الفئة العمرية</h3>
              <ChartContainer>
                {ageData.labels.length > 0 && ageData.datasets[0].data.some(d => d > 0) ? (
                  <Pie data={ageData} options={chartOptions} />
                ) : (
                  <p>غير معروف</p>
                )}
              </ChartContainer>
            </StyledCard>
          </Col>
        </Row>
      )}

      <ButtonWrapper>
        {currentPage === 2 && (
          <NavButton onClick={handlePrevious}>السابق</NavButton>
        )}
        {currentPage === 1 && (
          <NavButton onClick={handleNext} disabled={!selectedJamaa}>التالي</NavButton>
        )}
      </ButtonWrapper>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 20px;
  background: #f0f2f5;
  text-align: center;
  min-height: 100vh;
`;

const StyledTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 20px;
`;

const SelectWrapper = styled.div`
  margin-bottom: 20px;
  select {
    width: 300px;
    padding: 8px;
    font-size: 16px;
    border-radius: 4px;
    border: 1px solid #d9d9d9;
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
`;

const Col = styled.div`
  flex: 1;
  min-width: 300px;
  max-width: 400px;
`;

const StyledCard = styled.div`
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 16px;
  text-align: center;
  h3 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  h2 {
    font-size: 24px;
    color: #1890ff;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
`;

const ButtonWrapper = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
`;

const NavButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 4px;
  border: none;
  background-color: #1890ff;
  color: white;
  cursor: pointer;
  &:disabled {
    background-color: #d9d9d9;
    cursor: not-allowed;
  }
`;

export default Dashboard;