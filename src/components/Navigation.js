import React, { useState, useRef, useContext } from 'react';
import { Layout, Menu, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { UploadOutlined, MenuOutlined, UserOutlined, DashboardOutlined, FileTextOutlined, DeleteOutlined, GlobalOutlined, LogoutOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AuthContext } from '../AuthContext';

const { Sider } = Layout;

const Navigation = ({ handleUpload, onCollapse }) => {
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef(null);
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    onCollapse(!collapsed);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <StyledSider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} width={250}>
      <ToggleButton onClick={toggleCollapsed}>
        <MenuOutlined />
      </ToggleButton>
      <Logo collapsed={collapsed}>نظام لائحة الناخبين</Logo>
      <StyledMenu mode="inline" defaultSelectedKeys={['1']} collapsed={collapsed}>
        {isAuthenticated ? (
          <>
            <Menu.Item key="1" icon={<UserOutlined />}>
              <Link to="/">قائمة الناخبين</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<DashboardOutlined />}>
              <Link to="/dashboard">لوحة التحكم</Link>
            </Menu.Item>
            <Menu.Item key="3" icon={<FileTextOutlined />}>
              <Link to="/certificate">إشهاد</Link>
            </Menu.Item>
            <Menu.Item key="4" icon={<UploadOutlined />} onClick={handleUploadClick}>
              رفع ملف Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files[0])}
              />
            </Menu.Item>
            <Menu.Item key="5" icon={<DeleteOutlined />}>
              <Link to="/cancellation">لائحة التشطيب</Link>
            </Menu.Item>
            <Menu.Item key="6" icon={<GlobalOutlined />}>
              <Link to="/general-elections">انتخابات عامة</Link>
            </Menu.Item>
            <Menu.Item key="7" icon={<LogoutOutlined />} onClick={handleLogout}>
              تسجيل الخروج
            </Menu.Item>
          </>
        ) : (
          <Menu.Item key="8" icon={<UserOutlined />}>
            <Link to="/login">تسجيل الدخول</Link>
          </Menu.Item>
        )}
      </StyledMenu>
    </StyledSider>
  );
};

const StyledSider = styled(Sider)`
  background: #001529;
  height: 100vh;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1000;
  transition: all 0.3s ease;
  overflow: auto;

  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
  }

  &.ant-layout-sider-collapsed {
    width: 80px !important;
    max-width: 80px !important;
    min-width: 80px !important;
  }
`;

const ToggleButton = styled(Button)`
  margin: 16px;
  background: #003a8c;
  border: none;
  color: white;
  &:hover {
    background: #40a9ff;
    color: white;
  }
`;

const Logo = styled.div`
  color: white;
  font-size: 20px;
  font-weight: bold;
  padding: 16px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  ${({ collapsed }) => collapsed && 'display: none;'}
`;

const StyledMenu = styled(Menu)`
  background: #001529;
  color: white;
  flex: 1;
  border-right: none;

  .ant-menu-item {
    color: white;
    font-size: 16px;
    margin: 8px 0;
    padding-right: 24px !important;
    display: flex;
    align-items: center;

    &:hover {
      background: #003a8c;
      color: #40a9ff;
    }

    .anticon {
      margin-left: 12px;
    }
  }

  .ant-menu-item-selected {
    background: #003a8c;
    color: #40a9ff;
  }

  .ant-menu-item a {
    color: white;
    &:hover {
      color: #40a9ff;
    }
  }
`;

export default Navigation;