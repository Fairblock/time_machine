'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type HowItWorksState = {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
};

const HowItWorksContext = createContext<HowItWorksState | undefined>(undefined);

export const HowItWorksProvider = ({ children }: { children: ReactNode }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <HowItWorksContext.Provider value={{ showModal, setShowModal }}>
      {children}
    </HowItWorksContext.Provider>
  );
};

export const useHowItWorksContext = () => {
  const context = useContext(HowItWorksContext);
  if (!context) throw new Error('useHowItWorksContext must be used within HowItWorksProvider');
  return context;
};
