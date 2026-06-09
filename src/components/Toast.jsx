import { useYami } from '../context/YamiContext';
import { RiHeartFill, RiAddLine, RiCheckLine } from 'react-icons/ri';

export default function Toast() {
  const { toast } = useYami();
  if (!toast) return null;
  const icon = toast.type === 'add' ? <RiHeartFill /> : toast.type === 'remove' ? <RiCheckLine /> : <RiAddLine />;
  return (
    <div className={`toast toast-${toast.type}`} key={toast.id}>
      <span className="toast-icon">{icon}</span>
      {toast.msg}
    </div>
  );
}
