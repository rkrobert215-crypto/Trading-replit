import RiskCalculator from "@/components/RiskCalculator";

type TabType = 'equity' | 'options' | 'futures' | 'journal' | 'dashboard';

const Index = ({ initialTab = 'equity' }: { initialTab?: TabType }) => {
  return <RiskCalculator initialTab={initialTab} />;
};

export default Index;
