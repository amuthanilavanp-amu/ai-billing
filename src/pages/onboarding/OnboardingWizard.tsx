import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  Coffee,
  Cake,
  ShoppingCart,
  Store,
  Layers,
  ShoppingBag,
  Pill,
  Hospital,
  Activity,
  Shirt,
  Footprints,
  Laptop,
  Smartphone,
  Hammer,
  Sparkles,
  Scissors,
  Wrench,
  Cog,
  Factory,
  Armchair,
  Book,
  Wheat,
  Dog,
  Dumbbell,
  Globe,
  GraduationCap,
  Briefcase,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Search,
  Check,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useBusiness } from '../../context/BusinessContext';
import { BusinessCategory, CatalogueCategory, CatalogueItem } from '../../types';
import Logo from '../../components/common/Logo';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hotel_restaurant: Utensils,
  cafe_coffee: Coffee,
  bakery_sweets: Cake,
  supermarket: ShoppingCart,
  grocery_provision: Store,
  wholesale: Layers,
  retail: ShoppingBag,
  pharmacy: Pill,
  hospital_clinic: Hospital,
  medical_supplies: Activity,
  clothing: Shirt,
  footwear: Footprints,
  electronics: Laptop,
  mobile_accessories: Smartphone,
  hardware: Hammer,
  cosmetics: Sparkles,
  salon_beauty: Scissors,
  automobile_workshop: Wrench,
  spare_parts: Cog,
  manufacturing: Factory,
  furniture: Armchair,
  stationery: Book,
  agriculture: Wheat,
  pet_supplies: Dog,
  sports_fitness: Dumbbell,
  ecommerce: Globe,
  education: GraduationCap,
  professional_services: Briefcase,
  repair_maintenance: Wrench,
  other: Sliders,
};

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { company, createCompany, completeOnboarding, categories } = useBusiness();

  const [step, setStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory>('hotel_restaurant');

  // Business info form
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Catalogue starter selection
  const [catalogueCategories, setCatalogueCategories] = useState<CatalogueCategory[]>([]);
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [activeCatFilter, setActiveCatFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [onboardingChoice, setOnboardingChoice] = useState<'catalogue' | 'import' | 'blank'>('catalogue');

  // Load starter catalogue when category changes
  useEffect(() => {
    const loadCatalogue = async () => {
      try {
        const catRes = await apiClient.get('/catalogue/categories', {
          params: { business_category: selectedCategory },
        });
        setCatalogueCategories(catRes.data);

        const itemsRes = await apiClient.get('/catalogue/items', {
          params: { business_category: selectedCategory, page_size: 200 },
        });
        setCatalogueItems(itemsRes.data.items);

        // Pre-select popular items by default
        const initialSelected = new Set<number>(itemsRes.data.items.slice(0, 15).map((i: CatalogueItem) => i.id));
        setSelectedItemIds(initialSelected);
      } catch (e) {
        console.error('Error loading catalogue:', e);
      }
    };

    if (step === 3 && onboardingChoice === 'catalogue') {
      loadCatalogue();
    }
  }, [step, selectedCategory, onboardingChoice]);

  const handleSelectAllInCat = (catId: number) => {
    const itemsInCat = catalogueItems.filter((i) => i.category_id === catId);
    const newSelected = new Set(selectedItemIds);
    const allSelected = itemsInCat.every((i) => newSelected.has(i.id));

    itemsInCat.forEach((i) => {
      if (allSelected) {
        newSelected.delete(i.id);
      } else {
        newSelected.add(i.id);
      }
    });
    setSelectedItemIds(newSelected);
  };

  const toggleItem = (id: number) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
  };

  const handleNextStep1 = () => {
    if (!selectedCategory) return;
    setStep(2);
  };

  const handleNextStep2 = async () => {
    if (!companyName.trim()) {
      alert('Please enter your business or company name.');
      return;
    }

    try {
      if (!company) {
        await createCompany({
          name: companyName,
          business_category: selectedCategory,
          phone,
          gstin,
          city,
          state,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
        });
      }
      setStep(3);
    } catch (e: any) {
      alert('Failed to save business info: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleFinalizeOnboarding = async () => {
    setIsImporting(true);
    try {
      if (onboardingChoice === 'catalogue' && selectedItemIds.size > 0) {
        await apiClient.post('/products/import-from-catalogue', {
          catalogue_item_ids: Array.from(selectedItemIds),
          default_selling_price: 0,
        });
      }

      await completeOnboarding();
      if (onboardingChoice === 'import') {
        navigate('/bulk-import');
      } else {
        navigate('/dashboard');
      }
    } catch (e: any) {
      alert('Onboarding completion error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsImporting(false);
    }
  };

  const filteredItems = catalogueItems.filter((item) => {
    const matchesCat = activeCatFilter === null || item.category_id === activeCatFilter;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Wizard Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="compact" size="md" />
            <div>
              <h1 className="text-xl font-bold text-white">SmartBiz AI Setup Wizard</h1>
              <p className="text-xs text-slate-400 mt-1">
                Configure your business catalogue, tax profile, and starting product inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={`px-3 py-1 rounded-full ${
                step >= 1 ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1. Category
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={`px-3 py-1 rounded-full ${
                step >= 2 ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2. Details
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={`px-3 py-1 rounded-full ${
                step >= 3 ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3. Products
            </span>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-8 flex-1 overflow-y-auto max-h-[75vh]">
          {/* STEP 1: BUSINESS CATEGORY SELECTION */}
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Select Your Business Category</h2>
                <p className="text-sm text-slate-400">
                  This determines your industry-specific starter catalogue, product fields, units, and billing workflows.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.value] || Sliders;
                  const isSelected = selectedCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <Icon size={24} className={isSelected ? 'text-orange-400' : 'text-slate-400'} />
                      <span className="mt-2 text-xs font-semibold leading-snug">{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={handleNextStep1} className="btn btn-primary btn-lg flex items-center gap-2">
                  <span>Continue to Business Details</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY DETAILS */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Business Details & Profile</h2>
                <p className="text-sm text-slate-400">
                  Enter your shop or company information to display on invoices and receipts.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business / Store Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Annapoorna Restaurant or Apex Supermarket"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai, Bangalore, Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Tamil Nadu, Karnataka"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Code</label>
                    <input
                      type="text"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="btn btn-secondary flex items-center gap-2">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button onClick={handleNextStep2} className="btn btn-primary btn-lg flex items-center gap-2">
                  <span>Save & Continue to Products</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PRODUCT ONBOARDING METHOD */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">How do you want to set up your products?</h2>
                <p className="text-sm text-slate-400">
                  Select your preferred onboarding method. You can always import or add more products later.
                </p>
              </div>

              {/* 3 Onboarding Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                  onClick={() => setOnboardingChoice('catalogue')}
                  className={`p-5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    onboardingChoice === 'catalogue'
                      ? 'bg-orange-500/15 border-orange-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                      <CheckCircle2 size={22} />
                    </div>
                    <h3 className="font-bold text-white text-sm">Browse & Select Starter Items</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose from our rich category-tailored starter catalogue with 1-click checkboxes.
                    </p>
                  </div>
                  <span className="badge badge-orange mt-4 self-start">Recommended</span>
                </button>

                <button
                  onClick={() => setOnboardingChoice('import')}
                  className={`p-5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    onboardingChoice === 'import'
                      ? 'bg-orange-500/15 border-orange-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                      <Upload size={22} />
                    </div>
                    <h3 className="font-bold text-white text-sm">Bulk Import Excel / CSV</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload thousands of existing products with automatic column mapping and validation.
                    </p>
                  </div>
                  <span className="badge badge-green mt-4 self-start">For existing lists</span>
                </button>

                <button
                  onClick={() => setOnboardingChoice('blank')}
                  className={`p-5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    onboardingChoice === 'blank'
                      ? 'bg-orange-500/15 border-orange-500 shadow-md'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                      <Store size={22} />
                    </div>
                    <h3 className="font-bold text-white text-sm">Start from Scratch</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Begin with an empty catalogue and manually add items directly during billing or inventory.
                    </p>
                  </div>
                  <span className="badge badge-yellow mt-4 self-start">Blank Canvas</span>
                </button>
              </div>

              {/* If catalogue chosen: show interactive starter picker */}
              {onboardingChoice === 'catalogue' && (
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="search-bar flex-1">
                      <Search size={16} className="text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search starter menu items or products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      Selected: <span className="text-orange-400 font-bold">{selectedItemIds.size}</span> items
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                    <button
                      onClick={() => setActiveCatFilter(null)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                        activeCatFilter === null
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      All Categories ({catalogueItems.length})
                    </button>
                    {catalogueCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCatFilter(cat.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                          activeCatFilter === cat.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {cat.name} ({cat.item_count})
                      </button>
                    ))}
                  </div>

                  {/* Items Grid with checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItemIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition ${
                            isSelected
                              ? 'bg-orange-500/10 border-orange-500/50 text-white'
                              : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div click
                              className="rounded border-slate-700 text-orange-500 focus:ring-0"
                            />
                            <div className="truncate">
                              <div className="text-xs font-medium text-slate-200 truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-500">Unit: {item.default_unit}</div>
                            </div>
                          </div>
                          {item.is_vegetarian !== null && (
                            <span
                              className={`badge text-[10px] ${
                                item.is_vegetarian ? 'badge-veg' : 'badge-nonveg'
                              }`}
                            >
                              {item.is_vegetarian ? 'VEG' : 'NON-VEG'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(2)} className="btn btn-secondary flex items-center gap-2">
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleFinalizeOnboarding}
                  disabled={isImporting}
                  className="btn btn-primary btn-lg flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <span className="loading-spinner" />
                      <span>Configuring Business...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {onboardingChoice === 'catalogue'
                          ? `Add ${selectedItemIds.size} Products & Open Dashboard`
                          : onboardingChoice === 'import'
                          ? 'Proceed to File Uploader'
                          : 'Open Blank Dashboard'}
                      </span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
