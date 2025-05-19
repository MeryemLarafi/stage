import React, { useState, useContext } from 'react';
import { Form, Input, Button, Typography, message, Tabs } from 'antd';
import styled from 'styled-components';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

// Logo (provided URL)
const logo = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSN9k1zLCZhFGlllPsCoppFr7VPfMpfDi6wzA&s';

const { Title } = Typography;
const { TabPane } = Tabs;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const onLoginFinish = async (values) => {
    setLoading(true);
    try {
      const success = await login(values.email, values.password);
      if (success) {
        message.success('تم تسجيل الدخول بنجاح!');
        navigate('/');
      } else {
        message.error('الإيميل أو كلمة المرور غير صحيحة!');
      }
    } catch (error) {
      message.error('حدث خطأ أثناء تسجيل الدخول!');
    }
    setLoading(false);
  };

  const onRegisterFinish = async (values) => {
    setLoading(true);
    try {
      if (values.password !== values.confirmPassword) {
        message.error('كلمتا المرور غير متطابقتين!');
        setLoading(false);
        return;
      }
      const success = await register(values.email, values.password);
      if (success) {
        message.success('تم التسجيل بنجاح!');
        navigate('/');
      } else {
        message.error('الإيميل مستخدم بالفعل أو حدث خطأ!');
      }
    } catch (error) {
      message.error('حدث خطأ أثناء التسجيل!');
    }
    setLoading(false);
  };

  return (
    <StyledPageWrapper>
      <StyledContainer className="mx-auto">
        <Logo src={logo} alt="شعار المغرب" />
        <Title level={3} className="text-white mb-6">
          تسجيل الدخول أو التسجيل
        </Title>
        <Tabs defaultActiveKey="login" className="text-white">
          <TabPane tab="تسجيل الدخول" key="login">
            <Form
              name="login"
              onFinish={onLoginFinish}
              layout="vertical"
              className="max-w-md mx-auto"
            >
              <Form.Item
                label={<span className="text-white">الإيميل</span>}
                name="email"
                rules={[
                  { required: true, message: 'الرجاء إدخال الإيميل!' },
                  { type: 'email', message: 'الإيميل غير صالح!' },
                ]}
              >
                <StyledInput
                  placeholder="أدخل الإيميل"
                  aria-label="الإيميل"
                  disabled={loading}
                  className="text-black" // Changed to black
                />
              </Form.Item>
              <Form.Item
                label={<span className="text-white">كلمة المرور</span>}
                name="password"
                rules={[{ required: true, message: 'الرجاء إدخال كلمة المرور!' }]}
              >
                <StyledInput.Password
                  placeholder="أدخل كلمة المرور"
                  aria-label="كلمة المرور"
                  disabled={loading}
                  className="text-black" // Changed to black
                />
              </Form.Item>
              <Form.Item>
                <StyledButton
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  block
                  className="text-white"
                >
                  تسجيل الدخول
                </StyledButton>
              </Form.Item>
            </Form>
          </TabPane>
          <TabPane tab="التسجيل" key="register">
            <Form
              name="register"
              onFinish={onRegisterFinish}
              layout="vertical"
              className="max-w-md mx-auto"
            >
              <Form.Item
                label={<span className="text-white">الإيميل</span>}
                name="email"
                rules={[
                  { required: true, message: 'الرجاء إدخال الإيميل!' },
                  { type: 'email', message: 'الإيميل غير صالح!' },
                ]}
              >
                <StyledInput
                  placeholder="أدخل الإيميل"
                  aria-label="الإيميل"
                  disabled={loading}
                  className="text-black" // Changed to black
                />
              </Form.Item>
              <Form.Item
                label={<span className="text-white">كلمة المرور</span>}
                name="password"
                rules={[
                  { required: true, message: 'الرجاء إدخال كلمة المرور!' },
                  { min: 6, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل!' },
                ]}
              >
                <StyledInput.Password
                  placeholder="أدخل كلمة المرور"
                  aria-label="كلمة المرور"
                  disabled={loading}
                  className="text-black" // Changed to black
                />
              </Form.Item>
              <Form.Item
                label={<span className="text-white">تأكيد كلمة المرور</span>}
                name="confirmPassword"
                rules={[{ required: true, message: 'الرجاء تأكيد كلمة المرور!' }]}
              >
                <StyledInput.Password
                  placeholder="تأكيد كلمة المرور"
                  aria-label="تأكيد كلمة المرور"
                  disabled={loading}
                  className="text-black" // Changed to black
                />
              </Form.Item>
              <Form.Item>
                <StyledButton
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  block
                  className="text-white"
                >
                  التسجيل
                </StyledButton>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </StyledContainer>
    </StyledPageWrapper>
  );
};

// Styled Components
const StyledPageWrapper = styled.div`
  background-image: url('https://ar.le360.ma/resizer/v2/https%3A%2F%2Fcloudfront-eu-central-1.images.arcpublishing.com%2Fle360%2F32Z7XVDLENAGLBF3XKCBWVTR4Q.jpg?auth=1e9dd3699a9d1d764ea7eabb765bc9fe29d9020ae0092854d6b696e3e0fe1ea7&width=1216');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
`;

const StyledContainer = styled.div`
  padding: 2rem;
  background: rgba(255, 255, 255, 0.3); /* Slightly less transparent */
  border-radius: 1rem;
  backdrop-filter: blur(20px); /* Strong glassmorphism effect */
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  max-width: 28rem;
  width: 100%;
  text-align: center;
  @media (max-width: 640px) {
    padding: 1rem;
    margin: 1rem;
  }
`;

const Logo = styled.img`
  width: 6rem; /* Prominent size */
  height: 6rem; /* Ensure circular shape */
  border-radius: 50%; /* Circular logo */
  background: rgba(255, 255, 255, 0.2); /* Glassmorphism background for blending */
  padding: 0.5rem; /* Subtle padding for effect */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  margin-bottom: 1.5rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
  object-fit: cover; /* Ensure image fits within circle */
`;

const StyledInput = styled(Input)`
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #000; /* Black text */
  &::placeholder {
    color: rgba(0, 0, 0, 0.6); /* Dark placeholder */
  }
`;

const StyledButton = styled(Button)`
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-weight: 600;
  height: auto;
  background: #3b82f6; /* Tailwind blue-500 */
  border-color: #3b82f6;
  transition: all 0.3s ease;
  &:hover,
  &:focus {
    background: #2563eb; /* Tailwind blue-600 */
    border-color: #2563eb;
    transform: translateY(-2px);
  }
`;

export default Login;