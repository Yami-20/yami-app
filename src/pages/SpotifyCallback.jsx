import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SpotifyCallback() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/spotify', { replace: true }); }, [navigate]);
  return null;
}
