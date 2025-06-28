import React from 'react';
import { Tree } from 'antd';
import { FixedSizeList as List } from 'react-window';
import styled from 'styled-components';

const DataTree = ({ data }) => {
  // Transform data l-tree structure
  const treeData = data.map((wilaya) => ({
    title: wilaya.wilaya,
    key: wilaya.wilaya,
    children: wilaya.jamaat.map((jamaa) => ({
      title: jamaa.name,
      key: `${wilaya.wilaya}-${jamaa.name}`,
      children: jamaa.dawair.map((daira) => ({
        title: daira.name,
        key: `${wilaya.wilaya}-${jamaa.name}-${daira.name}`,
        children: daira.makatib.map((maktab) => ({
          title: `${maktab.name} (${maktab.adresse}, ${maktab.makan})`,
          key: `${wilaya.wilaya}-${jamaa.name}-${daira.name}-${maktab.name}`,
          children: maktab.motrachihin.map((motrachih) => ({
            title: `${motrachih.smiya} (${motrachih.cin})`,
            key: `${wilaya.wilaya}-${jamaa.name}-${daira.name}-${maktab.name}-${motrachih.cin}`,
          })),
        })),
      })),
    })),
  }));

  const renderTreeNode = ({ index, style }) => (
    <div style={style}>
      <Tree
        treeData={[treeData[index]]}
        showLine
        blockNode
        defaultExpandAll={false}
      />
    </div>
  );

  return (
    <StyledTree>
      {treeData.length > 0 ? (
        <List
          height={600} 
          itemCount={treeData.length} 
          itemSize={35} 
          width="100%"
        >
          {renderTreeNode}
        </List>
      ) : (
        <EmptyMessage>لا توجد بيانات لعرضها</EmptyMessage>
      )}
    </StyledTree>
  );
};

const StyledTree = styled.div`
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #888;
  padding: 20px;
`;

export default DataTree;