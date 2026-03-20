import React from 'react';
import { FaStar, FaCrown, FaGem } from 'react-icons/fa';

const TIER_CONFIG = {
  basic: {
    label: 'Basic',
    icon: <FaStar size={10} />,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  pro: {
    label: 'Pro',
    icon: <FaCrown size={10} />,
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  },
  elite: {
    label: 'Elite',
    icon: <FaGem size={10} />,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
};

const TierBadge = ({ tier, showLabel = true, className = "" }) => {
  const config = TIER_CONFIG[tier.toLowerCase()];
  if (!config) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] uppercase font-black tracking-tighter ${config.color} ${className}`}>
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default TierBadge;
