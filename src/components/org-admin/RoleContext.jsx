import React, { createContext, useContext, useState } from 'react';

const RoleContext = createContext();

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }) {
  const [role, setRole] = useState('Admin');
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}
