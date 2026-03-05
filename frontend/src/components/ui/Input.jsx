import { cn } from '../../utils/cn';

export const Input = ({ 
  label,
  error,
  icon: Icon,
  className,
  containerClassName,
  ...props 
}) => {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          className={cn(
            'block w-full rounded-lg border-gray-300 shadow-sm',
            'focus:border-brand-500 focus:ring-brand-500',
            'disabled:bg-gray-50 disabled:text-gray-500',
            'transition-colors duration-200',
            Icon && 'pl-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;