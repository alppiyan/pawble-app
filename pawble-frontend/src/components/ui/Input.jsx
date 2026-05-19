import { forwardRef } from 'react';

const Input = forwardRef(function Input({ icon, className = '', ...rest }, ref) {
  if (icon) {
    return (
      <div className="relative">
        <i className={`fas ${icon} absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} />
        <input ref={ref} className={`input pl-11 ${className}`} {...rest} />
      </div>
    );
  }
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export default Input;
