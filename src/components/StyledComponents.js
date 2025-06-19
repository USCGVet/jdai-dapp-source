import styled from 'styled-components';

export const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

export const Header = styled.header`
  background: rgba(26, 26, 26, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #333;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

export const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 2rem;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    text-align: center;
  }
  
  /* Right-align the last child (wallet section) */
  > div:last-child {
    justify-self: end;
    
    @media (max-width: 1024px) {
      justify-self: center;
    }
  }
`;

export const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(45deg, #ffd700, #ffed4a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.05);
      filter: brightness(1.2);
    }
  }
  
  .subtitle {
    font-size: 0.8rem;
    color: #888;
    margin-top: -0.2rem;
  }
`;

export const WalletButton = styled.button`
  background: ${props => props.$connected 
    ? 'linear-gradient(45deg, #10b981, #059669)' 
    : 'linear-gradient(45deg, #ffd700, #f59e0b)'};
  color: #000;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const NetworkBadge = styled.div`
  background: ${props => props.$correct ? '#10b981' : '#ef4444'};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-left: 1rem;
`;

export const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
`;

export const Card = styled.div`
  background: rgba(26, 26, 26, 0.8);
  border: 1px solid #333;
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #444;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  
  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #ffd700;
  }
`;

export const RefreshButton = styled.button`
  background: transparent;
  border: 1px solid #444;
  color: #888;
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #ffd700;
    color: #ffd700;
  }
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

export const StatCard = styled.div`
  background: rgba(16, 16, 16, 0.5);
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  
  .label {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .value {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${props => {
      if (props.type === 'danger') return '#ef4444';
      if (props.type === 'warning') return '#f59e0b';
      if (props.type === 'success') return '#10b981';
      return '#ffd700';
    }};
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 500;
  color: #ccc;
`;

export const Input = styled.input`
  background: rgba(16, 16, 16, 0.8);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #ffd700;
    box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
  }
  
  &::placeholder {
    color: #666;
  }
`;

export const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'variant',
})`
  background: ${props => {
    if (props.variant === 'danger') return 'linear-gradient(45deg, #ef4444, #dc2626)';
    if (props.variant === 'secondary') return 'transparent';
    return 'linear-gradient(45deg, #ffd700, #f59e0b)';
  }};
  color: ${props => props.variant === 'secondary' ? '#ffd700' : '#000'};
  border: ${props => props.variant === 'secondary' ? '1px solid #ffd700' : 'none'};
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Alert = styled.div`
  background: ${props => {
    if (props.type === 'danger') return 'rgba(239, 68, 68, 0.1)';
    if (props.type === 'warning') return 'rgba(245, 158, 11, 0.1)';
    if (props.type === 'success') return 'rgba(16, 185, 129, 0.1)';
    return 'rgba(59, 130, 246, 0.1)';
  }};
  border: 1px solid ${props => {
    if (props.type === 'danger') return '#ef4444';
    if (props.type === 'warning') return '#f59e0b';
    if (props.type === 'success') return '#10b981';
    return '#3b82f6';
  }};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  
  .title {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: ${props => {
      if (props.type === 'danger') return '#ef4444';
      if (props.type === 'warning') return '#f59e0b';
      if (props.type === 'success') return '#10b981';
      return '#3b82f6';
    }};
  }
  
  .message {
    color: #ccc;
    font-size: 0.9rem;
  }
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #333;
  border-radius: 50%;
  border-top-color: #ffd700;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const HealthBar = styled.div.withConfig({
  shouldForwardProp: (prop) => !['ratio'].includes(prop),
})`
  width: 100%;
  height: 8px;
  background: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
  
  .fill {
    height: 100%;
    background: ${props => {
      if (props.ratio < 1.2) return 'linear-gradient(90deg, #ef4444, #dc2626)';
      if (props.ratio < 1.5) return 'linear-gradient(90deg, #f59e0b, #d97706)';
      return 'linear-gradient(90deg, #10b981, #059669)';
    }};
    width: ${props => Math.min(100, (props.ratio / 3) * 100)}%;
    transition: all 0.3s ease;
  }
`;
