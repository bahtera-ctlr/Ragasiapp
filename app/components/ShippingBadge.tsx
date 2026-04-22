interface ShippingBadgeProps {
  shippingRequest?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const shippingConfig = {
  'OTS': {
    label: 'OTS',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    badgeColor: 'bg-red-600',
    description: 'Over Time Supply'
  },
  'REGULER': {
    label: 'REGULER',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    badgeColor: 'bg-blue-600',
    description: 'Regular Shipping'
  },
  'EXPRESS': {
    label: 'EXPRESS',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeColor: 'bg-green-600',
    description: 'Express Shipping'
  }
};

export default function ShippingBadge({ shippingRequest, size = 'md' }: ShippingBadgeProps) {
  if (!shippingRequest) {
    return null;
  }

  const config = shippingConfig[shippingRequest as keyof typeof shippingConfig];
  if (!config) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div
      className={`inline-flex items-center gap-2 ${config.bgColor} ${config.textColor} border ${config.borderColor} rounded-lg font-semibold ${sizeClasses[size]} transition-all duration-200 hover:shadow-md`}
      title={config.description}
    >
      <span className={`w-2 h-2 ${config.badgeColor} rounded-full inline-block`}></span>
      {config.label}
    </div>
  );
}
