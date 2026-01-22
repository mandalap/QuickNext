import { AlertTriangle, Clock, Crown } from 'lucide-react';
import {
  formatRemainingTime,
  getTimeStatusColor,
} from '../../utils/timeFormatter';
import { Badge } from '../ui/badge';

const SubscriptionBadge = ({ subscription }) => {
  if (!subscription) {
    return (
      <Badge
        variant='outline'
        className='bg-gray-100 text-gray-600 border-gray-300'
      >
        <AlertTriangle className='w-3 h-3 mr-1' />
        No Subscription
      </Badge>
    );
  }

  const { status, is_trial, days_remaining, plan_name } = subscription;

  // Calculate days remaining
  const getDaysText = () => {
    if (days_remaining === null || days_remaining === undefined) return '';
    if (days_remaining < 0) return 'Expired';
    return formatRemainingTime(days_remaining);
  };

  // Determine badge variant and styling based on status
  const getBadgeStyle = () => {
    if (status !== 'active') {
      return {
        className: 'bg-red-100 text-red-700 border-red-300',
        icon: <AlertTriangle className='w-3 h-3 mr-1' />,
        label: 'Expired',
      };
    }

    if (is_trial) {
      return {
        className: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: <Clock className='w-3 h-3 mr-1' />,
        label: 'Trial',
      };
    }

    // Determine urgency based on days remaining
    if (days_remaining <= 7) {
      return {
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: <Crown className='w-3 h-3 mr-1' />,
        label: plan_name || 'Premium',
      };
    }

    return {
      className: 'bg-green-100 text-green-700 border-green-300',
      icon: <Crown className='w-3 h-3 mr-1' />,
      label: plan_name || 'Premium',
    };
  };

  const badgeStyle = getBadgeStyle();
  const daysText = getDaysText();

  return (
    <div className='flex items-center gap-2'>
      <Badge
        variant='outline'
        className={`${badgeStyle.className} font-medium`}
      >
        {badgeStyle.icon}
        {badgeStyle.label}
      </Badge>

      {daysText && status === 'active' && (
        <span
          className={`text-xs font-medium ${getTimeStatusColor(
            days_remaining
          )}`}
        >
          {daysText}
        </span>
      )}
    </div>
  );
};

export default SubscriptionBadge;
