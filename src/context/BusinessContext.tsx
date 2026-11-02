import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Company, BusinessCategory } from '../types';
import { useAuth } from './AuthContext';

interface BusinessContextType {
  company: Company | null;
  isLoading: boolean;
  reloadCompany: () => Promise<void>;
  createCompany: (data: Partial<Company>) => Promise<Company>;
  updateCompany: (data: Partial<Company>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  categories: Array<{ value: BusinessCategory; label: string }>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ value: BusinessCategory; label: string }>>([]);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/companies/categories');
      setCategories(res.data);
    } catch {
      // ignore
    }
  };

  const reloadCompany = async () => {
    if (!token) {
      setCompany(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/companies/current');
      setCompany(res.data);
    } catch {
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (token) {
      reloadCompany();
    } else {
      setCompany(null);
      setIsLoading(false);
    }
  }, [token, user?.company_id]);

  const createCompany = async (data: Partial<Company>): Promise<Company> => {
    const res = await apiClient.post('/companies', data);
    await reloadCompany();
    return res.data;
  };

  const updateCompany = async (data: Partial<Company>) => {
    await apiClient.put('/companies/current', data);
    await reloadCompany();
  };

  const completeOnboarding = async () => {
    await apiClient.post('/companies/complete-onboarding');
    await reloadCompany();
  };

  return (
    <BusinessContext.Provider
      value={{
        company,
        isLoading,
        reloadCompany,
        createCompany,
        updateCompany,
        completeOnboarding,
        categories,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within BusinessProvider');
  return context;
};
