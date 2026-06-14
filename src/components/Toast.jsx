import { useYami } from '../context/YamiContext';
import { RiHeartFill, RiHeartLine, RiInformationLine, RiCheckLine } from 'react-icons/ri';

export default function Toast() {
  const { toast } = useYami();
  if (!toast) return null;
  const icon =
    toast.type === 'add'    ? <RiHeartFill /> :
    toast.type === 'remove' ? <RiHeartLine /> :
    toast.type === 'info'   ? <RiInformationLine /> :
    <RiCheckLine />;
  return (
    <div className={`toast-wrap toast-${toast.type}`} key={toast.id}>
      <span className="toast-icon">{icon}</span>
      {toast.msg}
    </div>
  );
}
